use std::future::Future;
use std::path::{Path, PathBuf};

use super::*;
use crate::{lock_projects_for_mutation, ProjectMutationLocks};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RestProjectChangeVcsResponse {
    owner_name: String,
    project_name: String,
    current_vcs: String,
    next_vcs: String,
    viewer_can_change: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    redirect_path: Option<String>,
}

fn rest_next_project_vcs(current: &str) -> String {
    if current == "GIT" {
        "Subversion".to_string()
    } else {
        "GIT".to_string()
    }
}

fn rest_project_change_vcs_response(
    authorization: &persistence::ProjectAuthorizationRecord,
    redirect_path: Option<String>,
) -> Result<RestProjectChangeVcsResponse, RestRouteError> {
    let viewer_can_change =
        project_update_allowed(authorization).map_err(RestRouteError::from_connect_error)?;
    Ok(RestProjectChangeVcsResponse {
        owner_name: authorization.project.owner_name.clone(),
        project_name: authorization.project.project_name.clone(),
        current_vcs: authorization.project.vcs.clone(),
        next_vcs: rest_next_project_vcs(&authorization.project.vcs),
        viewer_can_change,
        redirect_path,
    })
}

pub(crate) struct ProjectStorageLayout {
    pub(crate) git_path: PathBuf,
    pub(crate) svn_path: PathBuf,
}

fn vcs_path_error(error: yoram_vcs::VcsPathError) -> RestRouteError {
    RestRouteError::from_connect_error(internal_error(error))
}

pub(crate) fn project_storage_layout(
    service: &PilotServiceImpl,
    owner_name: &str,
    project_name: &str,
) -> Result<ProjectStorageLayout, RestRouteError> {
    Ok(ProjectStorageLayout {
        git_path: yoram_vcs::repository_path(&service.data_root, owner_name, project_name)
            .map_err(vcs_path_error)?,
        svn_path: yoram_vcs::svn_repository_path(&service.data_root, owner_name, project_name)
            .map_err(vcs_path_error)?,
    })
}

/// Alternate-VCS coexistence policy: an active project must never own BOTH
/// canonical stores. Rename / transfer / VCS change fail BEFORE mutation and
/// report the inconsistent state; only project deletion may remove both.
pub(crate) fn ensure_single_storage_layout(
    layout: &ProjectStorageLayout,
) -> Result<(), RestRouteError> {
    if layout.git_path.exists() && layout.svn_path.exists() {
        return Err(RestRouteError::from_connect_error(
            ConnectError::already_exists("project.storage.inconsistent"),
        ));
    }
    Ok(())
}

fn move_dir(source: &Path, destination: &Path) -> Result<(), RestRouteError> {
    if let Some(parent) = destination.parent() {
        std::fs::create_dir_all(parent).map_err(|error| {
            RestRouteError::from_connect_error(internal_error(error.to_string()))
        })?;
    }
    std::fs::rename(source, destination)
        .map_err(|error| RestRouteError::from_connect_error(internal_error(error.to_string())))
}

fn new_staging_operation_id() -> String {
    let bytes = rand::random::<[u8; 16]>();
    bytes.iter().map(|byte| format!("{byte:02x}")).collect()
}

pub(crate) fn begin_storage_staging(service: &PilotServiceImpl) -> Result<PathBuf, RestRouteError> {
    let staging_dir = service
        .data_root
        .join("repo")
        .join(".staging")
        .join(new_staging_operation_id());
    std::fs::create_dir_all(&staging_dir)
        .map_err(|error| RestRouteError::from_connect_error(internal_error(error.to_string())))?;
    Ok(staging_dir)
}

/// Moves `source` into `staging_dir/{label}`. Returns false when the source
/// does not exist (nothing staged).
fn stage_dir(staging_dir: &Path, label: &str, source: &Path) -> Result<bool, RestRouteError> {
    if !source.exists() {
        return Ok(false);
    }
    move_dir(source, &staging_dir.join(label))?;
    Ok(true)
}

fn restore_staged(staging_dir: &Path, label: &str, destination: PathBuf) {
    let staged = staging_dir.join(label);
    if !staged.exists() || destination.exists() {
        return;
    }
    if let Some(parent) = destination.parent() {
        let _ = std::fs::create_dir_all(parent);
    }
    if std::fs::rename(&staged, &destination).is_err() {
        tracing::error!(
            staged = %staged.display(),
            destination = %destination.display(),
            "could not restore repository from repo/.staging; manual recovery required"
        );
    }
}

fn discard_storage_staging(staging_dir: &Path) {
    if staging_dir.exists() {
        let _ = std::fs::remove_dir_all(staging_dir);
    }
}

pub(crate) async fn delete_project_repository_storage<Fut, T>(
    service: &PilotServiceImpl,
    project_id: i64,
    owner_name: &str,
    project_name: &str,
    delete_db: Fut,
) -> Result<T, RestRouteError>
where
    Fut: Future<Output = Result<T, RestRouteError>>,
{
    let _locks = lock_projects_for_mutation(vec![project_id]).await;
    let layout = project_storage_layout(service, owner_name, project_name)?;
    let git_existed = layout.git_path.exists();
    let svn_existed = layout.svn_path.exists();
    let staging_dir = begin_storage_staging(service)?;
    stage_dir(&staging_dir, "git", &layout.git_path)?;
    stage_dir(&staging_dir, "svn", &layout.svn_path)?;
    if git_existed && svn_existed {
        tracing::warn!(
            owner = %owner_name,
            project = %project_name,
            "deleting project with BOTH canonical Git and SVN repositories present"
        );
    }
    match delete_db.await {
        Ok(value) => {
            discard_storage_staging(&staging_dir);
            Ok(value)
        }
        Err(error) => {
            restore_staged(&staging_dir, "git", layout.git_path.clone());
            restore_staged(&staging_dir, "svn", layout.svn_path.clone());
            discard_storage_staging(&staging_dir);
            Err(error)
        }
    }
}

/// Stages the old active store, provisions the new-layout store, and lets the
/// caller run the DB VCS-type transaction in between. Dropping without
/// [`Self::commit`] removes the new store and restores the old one.
pub(super) struct ProjectVcsSwap {
    _locks: ProjectMutationLocks,
    staging_dir: Option<PathBuf>,
    old_label: &'static str,
    old_destination: PathBuf,
    new_repo_path: PathBuf,
    committed: bool,
}

impl ProjectVcsSwap {
    pub(super) async fn begin(
        service: &PilotServiceImpl,
        project_id: i64,
        current_vcs: &str,
        next_vcs: &str,
        owner_name: &str,
        project_name: &str,
    ) -> Result<Self, RestRouteError> {
        let _locks = lock_projects_for_mutation(vec![project_id]).await;
        let layout = project_storage_layout(service, owner_name, project_name)?;
        ensure_single_storage_layout(&layout)?;
        let staging_dir = begin_storage_staging(service)?;
        let (old_label, old_destination) = if current_vcs == "Subversion" {
            ("svn", layout.svn_path.clone())
        } else {
            ("git", layout.git_path.clone())
        };
        stage_dir(&staging_dir, old_label, &old_destination)?;
        let create_result = if next_vcs == "Subversion" {
            yoram_vcs::create_svn_repository(&layout.svn_path)
        } else {
            yoram_vcs::create_bare_repository(&layout.git_path)
        };
        if let Err(error) = create_result {
            restore_staged(&staging_dir, old_label, old_destination.clone());
            discard_storage_staging(&staging_dir);
            return Err(RestRouteError::from_connect_error(code_browser_error(
                error,
            )));
        }
        let new_repo_path = if next_vcs == "Subversion" {
            layout.svn_path.clone()
        } else {
            layout.git_path.clone()
        };
        Ok(Self {
            _locks,
            staging_dir: Some(staging_dir),
            old_label,
            old_destination,
            new_repo_path,
            committed: false,
        })
    }

    pub(super) fn commit(mut self) {
        self.committed = true;
        if let Some(staging_dir) = self.staging_dir.take() {
            discard_storage_staging(&staging_dir);
        }
    }

    fn revert(&mut self) {
        yoram_vcs::delete_repository(&self.new_repo_path).ok();
        if let Some(staging_dir) = &self.staging_dir {
            restore_staged(staging_dir, self.old_label, self.old_destination.clone());
            discard_storage_staging(staging_dir);
        }
        self.staging_dir = None;
    }
}

impl Drop for ProjectVcsSwap {
    fn drop(&mut self) {
        if !self.committed {
            self.revert();
        }
    }
}

/// Rename relocation: moves the active-VCS directory to the new canonical
/// path before the DB rename transaction; dropping without [`Self::commit`]
/// moves it back.
pub(crate) struct ProjectStorageRename {
    _locks: ProjectMutationLocks,
    old_path: PathBuf,
    new_path: PathBuf,
    committed: bool,
}

impl ProjectStorageRename {
    pub(crate) async fn begin(
        service: &PilotServiceImpl,
        project_id: i64,
        vcs: &str,
        owner_name: &str,
        old_project_name: &str,
        new_project_name: &str,
    ) -> Result<Self, ConnectError> {
        let route_error = |error: RestRouteError| internal_error(error);
        let _locks = lock_projects_for_mutation(vec![project_id]).await;
        let old_layout =
            project_storage_layout(service, owner_name, old_project_name).map_err(route_error)?;
        let new_layout =
            project_storage_layout(service, owner_name, new_project_name).map_err(route_error)?;
        if old_layout.git_path.exists() && old_layout.svn_path.exists() {
            return Err(ConnectError::already_exists("project.storage.inconsistent"));
        }
        let (old_path, new_path) = if vcs == "Subversion" {
            (old_layout.svn_path, new_layout.svn_path)
        } else {
            (old_layout.git_path, new_layout.git_path)
        };
        if !old_path.exists() {
            return Err(ConnectError::not_found("repository not found"));
        }
        if new_path.exists() {
            return Err(ConnectError::already_exists("project.name.duplicate"));
        }
        move_dir(&old_path, &new_path).map_err(route_error)?;
        Ok(Self {
            _locks,
            old_path,
            new_path,
            committed: false,
        })
    }

    pub(crate) fn commit(mut self) {
        self.committed = true;
    }
}

impl Drop for ProjectStorageRename {
    fn drop(&mut self) {
        if !self.committed
            && self.new_path.exists()
            && !self.old_path.exists()
            && std::fs::rename(&self.new_path, &self.old_path).is_err()
        {
            tracing::error!(
                from = %self.new_path.display(),
                to = %self.old_path.display(),
                "could not restore repository directory after failed rename"
            );
        }
    }
}

/// Organization rename relocation. Prefers renaming whole owner directories
/// (`repo/git/{old-org}` -> `repo/git/{new-org}`, same for svn) when the
/// destination is absent, else moves each repository individually. Dropping
/// without [`Self::commit`] restores the previous directory names.
pub(crate) struct OrganizationStorageRename {
    _locks: ProjectMutationLocks,
    data_root: PathBuf,
    old_owner: String,
    new_owner: String,
    whole_moved: Vec<&'static str>,
    per_repo_moved: Vec<(String, String, &'static str)>,
    committed: bool,
}

impl OrganizationStorageRename {
    pub(crate) async fn begin(
        service: &PilotServiceImpl,
        owned_projects: &[persistence::ProjectRecord],
        old_owner: &str,
        new_owner: &str,
    ) -> Result<Self, RestRouteError> {
        let _locks =
            lock_projects_for_mutation(owned_projects.iter().map(|project| project.id).collect())
                .await;
        let mut rename = Self {
            _locks,
            data_root: service.data_root.clone(),
            old_owner: old_owner.to_string(),
            new_owner: new_owner.to_string(),
            whole_moved: Vec::new(),
            per_repo_moved: Vec::new(),
            committed: false,
        };

        for (namespace, label) in [("git", "git" as &'static str), ("svn", "svn")] {
            let old_dir = service
                .data_root
                .join("repo")
                .join(namespace)
                .join(old_owner);
            if !old_dir.exists() {
                continue;
            }
            let new_dir = service
                .data_root
                .join("repo")
                .join(namespace)
                .join(new_owner);
            if !new_dir.exists() {
                move_dir(&old_dir, &new_dir)?;
                rename.whole_moved.push(label);
                continue;
            }
            // Destination owner directory exists: move each repository individually.
            for project in owned_projects {
                let file_name = if label == "svn" {
                    project.project_name.clone()
                } else {
                    format!("{}.git", project.project_name)
                };
                let source = old_dir.join(&file_name);
                let destination = new_dir.join(&file_name);
                if source.exists() && !destination.exists() {
                    move_dir(&source, &destination)?;
                    rename.per_repo_moved.push((
                        project.project_name.clone(),
                        project.owner_name.clone(),
                        label,
                    ));
                }
            }
        }
        Ok(rename)
    }
    pub(crate) fn commit(mut self) {
        self.committed = true;
    }
}

impl Drop for OrganizationStorageRename {
    fn drop(&mut self) {
        if self.committed {
            return;
        }
        for (project_name, owner_name, label) in self.per_repo_moved.iter().rev() {
            let namespace = if *label == "svn" { "svn" } else { "git" };
            let file_name = if *label == "svn" {
                project_name.clone()
            } else {
                format!("{project_name}.git")
            };
            let destination = self
                .data_root
                .join("repo")
                .join(namespace)
                .join(owner_name)
                .join(&file_name);
            let source = self
                .data_root
                .join("repo")
                .join(namespace)
                .join(&self.new_owner)
                .join(&file_name);
            if source.exists() && !destination.exists() {
                let _ = std::fs::rename(&source, &destination);
            }
        }
        for label in self.whole_moved.iter().rev() {
            let namespace = if *label == "svn" { "svn" } else { "git" };
            let from = self
                .data_root
                .join("repo")
                .join(namespace)
                .join(&self.new_owner);
            let to = self
                .data_root
                .join("repo")
                .join(namespace)
                .join(&self.old_owner);
            if from.exists() && !to.exists() {
                let _ = std::fs::rename(&from, &to);
            }
        }
    }
}

pub(super) async fn rest_read_project_change_vcs(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let actor_id = service
        .session_manager
        .read_session_from_headers(&headers)
        .and_then(|session| session.user_id);
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project change VCS requires repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, actor_id).await?;
    Ok(Json(rest_project_change_vcs_response(&authorization, None)?).into_response())
}

pub(super) async fn rest_change_project_vcs(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Result<Response, RestRouteError> {
    let session = require_session(&service.session_manager, &headers)
        .map_err(RestRouteError::from_connect_error)?;
    require_valid_csrf(&service.session_manager, &headers, &session)
        .map_err(RestRouteError::from_connect_error)?;
    let actor_id = session.user_id.ok_or_else(|| {
        RestRouteError::from_connect_error(ConnectError::unauthenticated(
            "missing authenticated session",
        ))
    })?;
    let PilotBackend::Repository(repository) = &service.backend else {
        return Err(RestRouteError::not_implemented(
            "project change VCS requires repository backend",
        ));
    };
    let authorization =
        rest_require_project_update(repository, &owner_name, &project_name, Some(actor_id)).await?;
    let next_vcs = rest_next_project_vcs(&authorization.project.vcs);
    if next_vcs == "Subversion" {
        yoram_vcs::ensure_svnadmin_available()
            .map_err(code_browser_error)
            .map_err(RestRouteError::from_connect_error)?;
    }
    let swap = ProjectVcsSwap::begin(
        &service,
        authorization.project.id,
        &authorization.project.vcs,
        &next_vcs,
        &authorization.project.owner_name,
        &authorization.project.project_name,
    )
    .await?;
    let changed = repository
        .change_project_vcs(authorization.project.id)
        .await
        .map_err(internal_error)
        .map_err(RestRouteError::from_connect_error)?
        .ok_or_else(|| RestRouteError::not_found("project not found"))?;
    swap.commit();
    let mut changed_authorization = authorization;
    changed_authorization.project = changed;
    Ok(Json(rest_project_change_vcs_response(
        &changed_authorization,
        Some(format!("/{owner_name}/{project_name}")),
    )?)
    .into_response())
}

pub(super) async fn direct_change_project_vcs(
    headers: HeaderMap,
    owner_name: String,
    project_name: String,
    service: PilotServiceImpl,
) -> Response {
    match rest_change_project_vcs(headers, owner_name.clone(), project_name.clone(), service).await
    {
        Ok(_) => (
            StatusCode::NO_CONTENT,
            [("Location", format!("/{owner_name}/{project_name}"))],
        )
            .into_response(),
        Err(error) => error.into_response(),
    }
}
