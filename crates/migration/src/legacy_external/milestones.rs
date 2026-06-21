use super::{EndpointDescriptor, EndpointStatus, LegacySource};
use serde_json::Value;
use std::collections::BTreeSet;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum AuthRequirement {
    MilestoneCreatePermission,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MigrationDirection {
    AppOwned,
    Import,
}

impl MigrationDirection {
    pub const fn endpoint_status(self) -> EndpointStatus {
        match self {
            Self::AppOwned => EndpointStatus::AppOwned,
            Self::Import => EndpointStatus::MigratorImport,
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct FixtureShape {
    pub path_fields: &'static [&'static str],
    pub query_fields: &'static [&'static str],
    pub header_fields: &'static [&'static str],
    pub body_fields: &'static [&'static str],
    pub response_fields: &'static [&'static str],
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct MilestoneEndpointFixture {
    pub method: &'static str,
    pub path: &'static str,
    pub legacy_controller: &'static str,
    pub legacy_action: &'static str,
    pub direction: MigrationDirection,
    pub auth: AuthRequirement,
    pub request: FixtureShape,
    pub response: FixtureShape,
    pub payload: LegacyPayloadFixture,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct LegacyPayloadFixture {
    pub sample_path: &'static str,
    pub request_json: &'static str,
    pub success_status: u16,
    pub success_json: &'static str,
    pub alternate_status: Option<u16>,
    pub alternate_json: Option<&'static str>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MilestoneState {
    Open,
    Closed,
}

impl MilestoneState {
    pub const fn as_legacy_str(self) -> &'static str {
        match self {
            Self::Open => "open",
            Self::Closed => "closed",
        }
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum MilestoneImportAction {
    Create,
    DuplicateExisting,
    DuplicateEarlierInBatch,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct NormalizedMilestoneImport {
    pub source_index: usize,
    pub title: String,
    pub description: String,
    pub state: MilestoneState,
    pub due_on: Option<String>,
    pub due_date_end_of_day: Option<String>,
    pub action: MilestoneImportAction,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MilestoneImportBatch {
    pub endpoint_method: &'static str,
    pub endpoint_path: &'static str,
    pub owner: String,
    pub project_name: String,
    pub entries: Vec<NormalizedMilestoneImport>,
}

impl MilestoneImportBatch {
    pub fn creatable_entries(&self) -> impl Iterator<Item = &NormalizedMilestoneImport> {
        self.entries
            .iter()
            .filter(|entry| entry.action == MilestoneImportAction::Create)
    }

    pub fn duplicate_entries(&self) -> impl Iterator<Item = &NormalizedMilestoneImport> {
        self.entries
            .iter()
            .filter(|entry| entry.action != MilestoneImportAction::Create)
    }
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MilestoneAdapterError {
    InvalidJson(String),
    InvalidPath(String),
    MissingMilestonesArray,
    InvalidMilestoneItem { index: usize },
    InvalidDueOn { title: String, value: String },
}

impl std::fmt::Display for MilestoneAdapterError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidJson(error) => write!(formatter, "invalid milestone import JSON: {error}"),
            Self::InvalidPath(path) => write!(
                formatter,
                "invalid milestone import path `{path}`; expected /-_-api/v1/owners/:owner/projects/:projectName/milestones"
            ),
            Self::MissingMilestonesArray => write!(
                formatter,
                "No milestones key exists or value wasn't array!"
            ),
            Self::InvalidMilestoneItem { index } => {
                write!(formatter, "milestone item at index {index} must be a JSON object")
            }
            Self::InvalidDueOn { title, value } => write!(
                formatter,
                "invalid due_on `{value}` for milestone `{title}`; expected YYYY-MM-DD"
            ),
        }
    }
}

impl std::error::Error for MilestoneAdapterError {}

pub fn fixtures() -> &'static [MilestoneEndpointFixture] {
    MILESTONE_ENDPOINT_FIXTURES
}

pub fn find_fixture(method: &str, path: &str) -> Option<&'static MilestoneEndpointFixture> {
    MILESTONE_ENDPOINT_FIXTURES
        .iter()
        .find(|fixture| fixture.method == method && fixture.path == path)
}

pub fn parse_milestone_import_request(
    sample_path: &str,
    request_json: &str,
    existing_titles: &[&str],
) -> Result<MilestoneImportBatch, MilestoneAdapterError> {
    let (owner, project_name) = parse_milestone_path(sample_path)?;
    let payload: Value = serde_json::from_str(request_json)
        .map_err(|error| MilestoneAdapterError::InvalidJson(error.to_string()))?;
    let milestones = find_value(&payload, "milestones")
        .and_then(Value::as_array)
        .ok_or(MilestoneAdapterError::MissingMilestonesArray)?;
    let mut seen_titles: BTreeSet<String> = existing_titles
        .iter()
        .map(|title| (*title).to_string())
        .collect();
    let existing_title_set = seen_titles.clone();
    let mut entries = Vec::with_capacity(milestones.len());

    for (source_index, milestone) in milestones.iter().enumerate() {
        if !milestone.is_object() {
            return Err(MilestoneAdapterError::InvalidMilestoneItem {
                index: source_index,
            });
        }

        let title = text_field(milestone, "title").unwrap_or_else(|| "No title".to_string());
        let description = text_field(milestone, "description").unwrap_or_default();
        let state = match text_field(milestone, "state") {
            Some(state) if state.eq_ignore_ascii_case("closed") => MilestoneState::Closed,
            _ => MilestoneState::Open,
        };
        let due_on = text_field(milestone, "due_on").filter(|due_on| !due_on.is_empty());
        let due_date_end_of_day = match due_on.as_deref() {
            Some(due_on) => Some(normalize_due_on(&title, due_on)?),
            None => None,
        };
        let action = if existing_title_set.contains(&title) {
            MilestoneImportAction::DuplicateExisting
        } else if seen_titles.contains(&title) {
            MilestoneImportAction::DuplicateEarlierInBatch
        } else {
            MilestoneImportAction::Create
        };

        seen_titles.insert(title.clone());
        entries.push(NormalizedMilestoneImport {
            source_index,
            title,
            description,
            state,
            due_on,
            due_date_end_of_day,
            action,
        });
    }

    Ok(MilestoneImportBatch {
        endpoint_method: "POST",
        endpoint_path: "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
        owner,
        project_name,
        entries,
    })
}

fn parse_milestone_path(path: &str) -> Result<(String, String), MilestoneAdapterError> {
    let parts: Vec<&str> = path.split('/').filter(|part| !part.is_empty()).collect();
    match parts.as_slice() {
        ["-_-api", "v1", "owners", owner, "projects", project_name, "milestones"] => {
            Ok(((*owner).to_string(), (*project_name).to_string()))
        }
        _ => Err(MilestoneAdapterError::InvalidPath(path.to_string())),
    }
}

fn text_field(value: &Value, key: &str) -> Option<String> {
    find_value(value, key).and_then(|value| match value {
        Value::Null => None,
        Value::String(text) => Some(text.clone()),
        Value::Bool(flag) => Some(flag.to_string()),
        Value::Number(number) => Some(number.to_string()),
        other => Some(other.to_string()),
    })
}

fn find_value<'a>(value: &'a Value, key: &str) -> Option<&'a Value> {
    match value {
        Value::Object(map) => {
            if let Some(found) = map.get(key) {
                return Some(found);
            }
            map.values().find_map(|nested| find_value(nested, key))
        }
        Value::Array(values) => values.iter().find_map(|nested| find_value(nested, key)),
        _ => None,
    }
}

fn normalize_due_on(title: &str, due_on: &str) -> Result<String, MilestoneAdapterError> {
    if is_yyyy_mm_dd(due_on) {
        Ok(format!("{due_on}T23:59:59"))
    } else {
        Err(MilestoneAdapterError::InvalidDueOn {
            title: title.to_string(),
            value: due_on.to_string(),
        })
    }
}

fn is_yyyy_mm_dd(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 10
        && bytes[4] == b'-'
        && bytes[7] == b'-'
        && bytes[..4].iter().all(u8::is_ascii_digit)
        && bytes[5..7].iter().all(u8::is_ascii_digit)
        && bytes[8..].iter().all(u8::is_ascii_digit)
}

const fn source(controller: &'static str, action: &'static str) -> LegacySource {
    LegacySource { controller, action }
}

const fn shape(
    path_fields: &'static [&'static str],
    query_fields: &'static [&'static str],
    header_fields: &'static [&'static str],
    body_fields: &'static [&'static str],
    response_fields: &'static [&'static str],
) -> FixtureShape {
    FixtureShape {
        path_fields,
        query_fields,
        header_fields,
        body_fields,
        response_fields,
    }
}

pub const ENDPOINT_DESCRIPTORS: &[EndpointDescriptor] = &[EndpointDescriptor {
    method: "POST",
    path: "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
    source: source("controllers.api.MilestoneApi", "newMilestone"),
    status: EndpointStatus::AppOwned,
}];

const MILESTONE_ENDPOINT_FIXTURES: &[MilestoneEndpointFixture] = &[MilestoneEndpointFixture {
    method: "POST",
    path: "/-_-api/v1/owners/:owner/projects/:projectName/milestones",
    legacy_controller: "controllers.api.MilestoneApi",
    legacy_action: "newMilestone",
    direction: MigrationDirection::AppOwned,
    auth: AuthRequirement::MilestoneCreatePermission,
    request: shape(
        &["owner", "projectName"],
        &[],
        &[],
        &["milestones", "title", "description", "due_on", "state"],
        &["message"],
    ),
    response: shape(
        &[],
        &[],
        &[],
        &[],
        &[
            "id",
            "title",
            "state",
            "description",
            "due_on",
            "milestone",
            "message",
        ],
    ),
    payload: MILESTONE_CREATE_PAYLOAD,
}];

const MILESTONE_CREATE_PAYLOAD: LegacyPayloadFixture = LegacyPayloadFixture {
    sample_path: "/-_-api/v1/owners/alice/projects/demo/milestones",
    request_json: r##"{
  "import": {
    "milestones": [
      {
        "meta": {
          "title": "Legacy Milestone",
          "state": "closed"
        },
        "body": {
          "description": "legacy milestone body"
        },
        "schedule": {
          "due_on": "2026-07-15"
        }
      },
      {
        "body": {
          "description": "fallback title body"
        }
      }
    ]
  }
}"##,
    success_status: 201,
    success_json: r##"[
  {
    "id": 7,
    "title": "Legacy Milestone",
    "state": "closed",
    "description": "legacy milestone body",
    "due_on": "2026-07-15"
  },
  {
    "id": 8,
    "title": "No title",
    "state": "open",
    "description": "fallback title body"
  }
]"##,
    alternate_status: Some(201),
    alternate_json: Some(
        r##"[
  {
    "milestone": {
      "title": "Legacy Milestone",
      "description": "duplicate milestone body"
    },
    "message": "This milestone title already exists. Please enter a different title."
  }
]"##,
    ),
};
