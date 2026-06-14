use super::project_export_mapper::{
    map_project_export_json_to_yobi_data_with_attachment_content_base64, ProjectExportMapError,
    YobiDataSnapshot,
};
use base64::engine::general_purpose;
use base64::Engine;
use std::collections::BTreeMap;
use std::path::{Path, PathBuf};

#[derive(Debug)]
pub enum YonaExportAdapterError {
    InvalidAttachmentDirectoryName(PathBuf),
    Io(std::io::Error),
    Map(ProjectExportMapError),
}

impl std::fmt::Display for YonaExportAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidAttachmentDirectoryName(path) => {
                write!(
                    formatter,
                    "invalid yona-export attachment id directory: {}",
                    path.display()
                )
            }
            Self::Io(error) => write!(formatter, "failed to read yona-export data: {error}"),
            Self::Map(error) => write!(formatter, "{error}"),
        }
    }
}

impl std::error::Error for YonaExportAdapterError {}

impl From<std::io::Error> for YonaExportAdapterError {
    fn from(error: std::io::Error) -> Self {
        Self::Io(error)
    }
}

impl From<ProjectExportMapError> for YonaExportAdapterError {
    fn from(error: ProjectExportMapError) -> Self {
        Self::Map(error)
    }
}

pub fn map_yona_export_project_directory_to_yobi_data(
    project_export_json_path: impl AsRef<Path>,
    project_export_directory: impl AsRef<Path>,
) -> Result<YobiDataSnapshot, YonaExportAdapterError> {
    let payload = std::fs::read_to_string(project_export_json_path)?;
    let attachment_content_base64 =
        read_yona_export_attachment_content_base64(project_export_directory.as_ref())?;
    Ok(
        map_project_export_json_to_yobi_data_with_attachment_content_base64(
            &payload,
            &attachment_content_base64,
        )?,
    )
}

pub fn read_yona_export_attachment_content_base64(
    project_export_directory: impl AsRef<Path>,
) -> Result<BTreeMap<i64, String>, YonaExportAdapterError> {
    let files_directory = project_export_directory.as_ref().join("files");
    let mut attachment_content_base64 = BTreeMap::new();
    if !files_directory.exists() {
        return Ok(attachment_content_base64);
    }

    let mut attachment_directories =
        std::fs::read_dir(&files_directory)?.collect::<Result<Vec<_>, _>>()?;
    attachment_directories.sort_by_key(|entry| entry.path());
    for attachment_directory in attachment_directories {
        if !attachment_directory.file_type()?.is_dir() {
            continue;
        }
        let attachment_id = attachment_directory
            .file_name()
            .to_string_lossy()
            .parse::<i64>()
            .map_err(|_| {
                YonaExportAdapterError::InvalidAttachmentDirectoryName(attachment_directory.path())
            })?;
        let mut files = std::fs::read_dir(attachment_directory.path())?
            .filter_map(|entry| entry.ok())
            .filter(|entry| {
                entry
                    .file_type()
                    .map(|file_type| file_type.is_file())
                    .unwrap_or(false)
            })
            .collect::<Vec<_>>();
        files.sort_by_key(|entry| entry.path());
        let Some(file) = files.first() else {
            continue;
        };
        let bytes = std::fs::read(file.path())?;
        attachment_content_base64.insert(attachment_id, general_purpose::STANDARD.encode(bytes));
    }

    Ok(attachment_content_base64)
}
