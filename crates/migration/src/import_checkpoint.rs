use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::error::Error;
use std::fmt;

#[derive(Debug)]
pub enum ImportCheckpointSummaryError {
    Json(serde_json::Error),
    MalformedCheckpoint(String),
    MissingCheckpoint,
    UnsupportedCheckpointVersion(u32),
}

impl fmt::Display for ImportCheckpointSummaryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Self::Json(error) => write!(formatter, "failed to parse import report JSON: {error}"),
            Self::MalformedCheckpoint(message) => {
                write!(formatter, "malformed import checkpoint: {message}")
            }
            Self::MissingCheckpoint => write!(formatter, "import report is missing checkpoint"),
            Self::UnsupportedCheckpointVersion(version) => {
                write!(
                    formatter,
                    "unsupported import checkpoint version: {version}"
                )
            }
        }
    }
}

impl Error for ImportCheckpointSummaryError {}

impl From<serde_json::Error> for ImportCheckpointSummaryError {
    fn from(error: serde_json::Error) -> Self {
        Self::Json(error)
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SiteImportReport {
    #[serde(default)]
    dry_run: bool,
    checkpoint: Option<ImportCheckpoint>,
    #[serde(default)]
    unsupported_sections: Vec<String>,
    #[serde(default)]
    validation_errors: Vec<ImportValidationError>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ImportValidationError {
    #[allow(dead_code)]
    field: String,
    #[allow(dead_code)]
    index: u32,
    #[allow(dead_code)]
    message: String,
    #[allow(dead_code)]
    section: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCheckpoint {
    pub failure: Option<ImportCheckpointFailure>,
    pub sections: Vec<ImportCheckpointSection>,
    pub version: u32,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportCheckpointFailure {
    pub index: u32,
    pub message: String,
    pub resource_key: String,
    pub section: String,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportCheckpointSection {
    pub completed: u32,
    pub next_index: u32,
    pub resource_keys: Vec<String>,
    pub resource_keys_truncated: bool,
    pub section: String,
    pub skipped: u32,
    pub total: u32,
    pub validated: u32,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportCheckpointSummary {
    pub version: u32,
    pub dry_run: bool,
    pub status: ImportCheckpointSummaryStatus,
    pub complete: bool,
    pub failed: bool,
    pub truncated: bool,
    pub failure: Option<ImportCheckpointFailure>,
    pub counters: ImportCheckpointCounters,
    pub validation_error_count: u32,
    pub unsupported_sections: Vec<String>,
    pub next_retry: Option<ImportCheckpointRetryPoint>,
    pub next_resource_keys: BTreeMap<String, String>,
    pub resumable_sections: Vec<ImportCheckpointSectionSummary>,
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ImportCheckpointSummaryStatus {
    Complete,
    DryRunComplete,
    Failed,
    Incomplete,
}

#[derive(Default, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportCheckpointCounters {
    pub total: u32,
    pub validated: u32,
    pub completed: u32,
    pub skipped: u32,
    pub remaining: u32,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportCheckpointSectionSummary {
    pub section: String,
    pub total: u32,
    pub validated: u32,
    pub completed: u32,
    pub skipped: u32,
    pub remaining: u32,
    pub next_index: u32,
    pub next_resource_key: Option<String>,
    pub resource_keys_truncated: bool,
    pub complete: bool,
    pub resumable: bool,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportCheckpointRetryPoint {
    pub section: String,
    pub index: u32,
    pub resource_key: Option<String>,
    pub reason: ImportCheckpointRetryReason,
}

#[derive(Clone, Copy, Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum ImportCheckpointRetryReason {
    Failure,
    Resume,
}

pub fn summarize_site_import_report_json(
    input: &str,
) -> Result<ImportCheckpointSummary, ImportCheckpointSummaryError> {
    let report: SiteImportReport = serde_json::from_str(input)?;
    let checkpoint = report
        .checkpoint
        .ok_or(ImportCheckpointSummaryError::MissingCheckpoint)?;
    summarize_site_import_checkpoint(
        report.dry_run,
        checkpoint,
        report.validation_errors.len() as u32,
        report.unsupported_sections,
    )
}

pub fn summarize_site_import_checkpoint(
    dry_run: bool,
    checkpoint: ImportCheckpoint,
    validation_error_count: u32,
    unsupported_sections: Vec<String>,
) -> Result<ImportCheckpointSummary, ImportCheckpointSummaryError> {
    if checkpoint.version != 1 {
        return Err(ImportCheckpointSummaryError::UnsupportedCheckpointVersion(
            checkpoint.version,
        ));
    }

    validate_checkpoint(&checkpoint)?;

    let mut counters = ImportCheckpointCounters::default();
    let mut truncated = false;
    let mut next_resource_keys = BTreeMap::new();
    let mut resumable_sections = Vec::new();
    let mut next_retry = checkpoint
        .failure
        .as_ref()
        .map(|failure| ImportCheckpointRetryPoint {
            section: failure.section.clone(),
            index: failure.index,
            resource_key: if failure.resource_key.is_empty() {
                None
            } else {
                Some(failure.resource_key.clone())
            },
            reason: ImportCheckpointRetryReason::Failure,
        });

    for section in checkpoint.sections {
        counters.total = counters.total.saturating_add(section.total);
        counters.validated = counters.validated.saturating_add(section.validated);
        counters.completed = counters.completed.saturating_add(section.completed);
        counters.skipped = counters.skipped.saturating_add(section.skipped);
        truncated |= section.resource_keys_truncated;

        let finished = section.completed.saturating_add(section.skipped);
        let remaining = section.total.saturating_sub(finished);
        counters.remaining = counters.remaining.saturating_add(remaining);

        let next_resource_key = next_key(&section);
        if let Some(next_resource_key) = &next_resource_key {
            next_resource_keys.insert(section.section.clone(), next_resource_key.clone());
        }
        if next_retry.is_none() && remaining > 0 {
            next_retry = Some(ImportCheckpointRetryPoint {
                section: section.section.clone(),
                index: section.next_index,
                resource_key: next_resource_key.clone(),
                reason: ImportCheckpointRetryReason::Resume,
            });
        }

        resumable_sections.push(ImportCheckpointSectionSummary {
            complete: remaining == 0,
            completed: section.completed,
            next_index: section.next_index,
            next_resource_key,
            remaining,
            resource_keys_truncated: section.resource_keys_truncated,
            resumable: remaining > 0 || section.resource_keys_truncated,
            section: section.section,
            skipped: section.skipped,
            total: section.total,
            validated: section.validated,
        });
    }

    let failed = checkpoint.failure.is_some();
    let complete = if failed {
        false
    } else if dry_run {
        counters.validated >= counters.total
    } else {
        counters.remaining == 0
    };
    let status = if failed {
        ImportCheckpointSummaryStatus::Failed
    } else if dry_run && complete {
        ImportCheckpointSummaryStatus::DryRunComplete
    } else if complete {
        ImportCheckpointSummaryStatus::Complete
    } else {
        ImportCheckpointSummaryStatus::Incomplete
    };

    Ok(ImportCheckpointSummary {
        version: checkpoint.version,
        dry_run,
        status,
        complete,
        failed,
        truncated,
        failure: checkpoint.failure,
        counters,
        validation_error_count,
        unsupported_sections,
        next_retry,
        next_resource_keys,
        resumable_sections,
    })
}

fn validate_checkpoint(checkpoint: &ImportCheckpoint) -> Result<(), ImportCheckpointSummaryError> {
    let mut seen_sections = BTreeMap::new();
    for section in &checkpoint.sections {
        if section.section.trim().is_empty() {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(
                "section name must not be empty".to_string(),
            ));
        }
        if seen_sections.insert(section.section.as_str(), ()).is_some() {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                "duplicate section `{}`",
                section.section
            )));
        }
        if section.validated > section.total {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                "section `{}` validated count {} exceeds total {}",
                section.section, section.validated, section.total
            )));
        }
        if section.completed > section.total {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                "section `{}` completed count {} exceeds total {}",
                section.section, section.completed, section.total
            )));
        }
        if section.skipped > section.total {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                "section `{}` skipped count {} exceeds total {}",
                section.section, section.skipped, section.total
            )));
        }
        if section.completed.saturating_add(section.skipped) > section.total {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                "section `{}` completed+skipped exceeds total {}",
                section.section, section.total
            )));
        }
        if section.next_index > section.total {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                "section `{}` nextIndex {} exceeds total {}",
                section.section, section.next_index, section.total
            )));
        }
        if section.resource_keys.len() as u32 > section.total {
            return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                "section `{}` resourceKeys count {} exceeds total {}",
                section.section,
                section.resource_keys.len(),
                section.total
            )));
        }
    }

    if let Some(failure) = &checkpoint.failure {
        if failure.section != "import" {
            let exact_section = checkpoint
                .sections
                .iter()
                .find(|section| section.section == failure.section);
            if let Some(section) = exact_section {
                if failure.index >= section.total {
                    return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                        "failure index {} exceeds section `{}` total {}",
                        failure.index, failure.section, section.total
                    )));
                }
            } else {
                let base_section = failure
                    .section
                    .split_once('.')
                    .map(|(base_section, _)| base_section);
                let has_base_section = base_section.is_some_and(|base_section| {
                    checkpoint
                        .sections
                        .iter()
                        .any(|section| section.section == base_section)
                });
                if !has_base_section {
                    return Err(ImportCheckpointSummaryError::MalformedCheckpoint(format!(
                        "failure references unknown section `{}`",
                        failure.section
                    )));
                }
            }
        }
    }

    Ok(())
}

fn next_key(section: &ImportCheckpointSection) -> Option<String> {
    section
        .resource_keys
        .get(section.next_index as usize)
        .cloned()
        .or_else(|| {
            if section.resource_keys_truncated && section.next_index < section.total {
                Some(format!(
                    "{}:<truncated:{}>",
                    section.section, section.next_index
                ))
            } else {
                None
            }
        })
}
