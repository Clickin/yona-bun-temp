//! Canonical search ownership placeholder for search query and snippet slices.

use serde::Serialize;

/// Returns the crate ownership label used by foundation tests and future packet wiring.
pub const CRATE_OWNER: &str = "search";

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize)]
pub enum SearchType {
    Auto,
    Issue,
    User,
    Project,
    Post,
    Milestone,
    IssueComment,
    PostComment,
    Review,
}

impl SearchType {
    pub fn as_wire(self) -> &'static str {
        match self {
            Self::Auto => "auto",
            Self::Issue => "issue",
            Self::User => "user",
            Self::Project => "project",
            Self::Post => "post",
            Self::Milestone => "milestone",
            Self::IssueComment => "issue_comment",
            Self::PostComment => "post_comment",
            Self::Review => "review",
        }
    }

    pub fn from_wire(value: &str) -> Option<Self> {
        match value {
            "auto" => Some(Self::Auto),
            "issue" => Some(Self::Issue),
            "user" => Some(Self::User),
            "project" => Some(Self::Project),
            "post" => Some(Self::Post),
            "milestone" => Some(Self::Milestone),
            "issue_comment" => Some(Self::IssueComment),
            "post_comment" => Some(Self::PostComment),
            "review" => Some(Self::Review),
            _ => None,
        }
    }
}

#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct SearchTypeCounts {
    pub issues: u32,
    pub users: u32,
    pub projects: u32,
    pub posts: u32,
    pub milestones: u32,
    pub issue_comments: u32,
    pub post_comments: u32,
    pub reviews: u32,
}

pub fn resolve_search_type(
    requested: SearchType,
    counts: &SearchTypeCounts,
    include_projects: bool,
) -> SearchType {
    if requested != SearchType::Auto {
        return requested;
    }

    if counts.issues > 0 {
        return SearchType::Issue;
    }
    if counts.users > 0 {
        return SearchType::User;
    }
    if include_projects && counts.projects > 0 {
        return SearchType::Project;
    }
    if counts.posts > 0 {
        return SearchType::Post;
    }
    if counts.milestones > 0 {
        return SearchType::Milestone;
    }
    if counts.issue_comments > 0 {
        return SearchType::IssueComment;
    }
    if counts.post_comments > 0 {
        return SearchType::PostComment;
    }
    if counts.reviews > 0 {
        return SearchType::Review;
    }

    SearchType::Issue
}

pub fn keyword_matches(value: &str, keyword: &str) -> bool {
    let keyword = keyword.trim();
    !keyword.is_empty() && value.to_lowercase().contains(&keyword.to_lowercase())
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchHighlight {
    pub start: usize,
    pub end: usize,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchSnippet {
    pub text: String,
    pub highlights: Vec<SearchHighlight>,
}

#[derive(Clone, Copy, Debug)]
struct Window {
    begin: usize,
    end: usize,
}

pub fn make_snippets(contents: &str, keyword: &str, threshold: usize) -> Vec<SearchSnippet> {
    let chars = contents.chars().collect::<Vec<_>>();
    let keyword_chars = keyword.trim().chars().count();
    if chars.is_empty() || keyword_chars == 0 || keyword_chars > chars.len() {
        return Vec::new();
    }

    let lower_keyword = keyword.trim().to_lowercase();
    let mut matches = Vec::new();
    let mut index = 0;
    while index + keyword_chars <= chars.len() {
        let candidate = chars[index..index + keyword_chars]
            .iter()
            .collect::<String>()
            .to_lowercase();
        if candidate == lower_keyword {
            matches.push(Window {
                begin: index,
                end: index + keyword_chars,
            });
            index += keyword_chars;
        } else {
            index += 1;
        }
    }

    let mut windows: Vec<Window> = Vec::new();
    for matched in &matches {
        let current = Window {
            begin: matched.begin.saturating_sub(threshold),
            end: (matched.end + threshold).min(chars.len()),
        };
        if let Some(previous) = windows.last_mut() {
            if previous.end >= current.begin {
                previous.end = current.end;
                continue;
            }
        }
        windows.push(current);
    }

    windows
        .into_iter()
        .map(|window| {
            let text = chars[window.begin..window.end].iter().collect::<String>();
            let highlights = matches
                .iter()
                .filter(|matched| matched.begin >= window.begin && matched.end <= window.end)
                .map(|matched| SearchHighlight {
                    start: matched.begin - window.begin,
                    end: matched.end - window.begin,
                })
                .collect();
            SearchSnippet { text, highlights }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn auto_resolution_follows_legacy_type_order_and_project_scope_skips_project() {
        let mut counts = SearchTypeCounts::default();
        counts.projects = 3;
        counts.posts = 2;
        assert_eq!(
            resolve_search_type(SearchType::Auto, &counts, true),
            SearchType::Project
        );
        assert_eq!(
            resolve_search_type(SearchType::Auto, &counts, false),
            SearchType::Post
        );

        counts.issues = 1;
        assert_eq!(
            resolve_search_type(SearchType::Auto, &counts, false),
            SearchType::Issue
        );
    }

    #[test]
    fn search_type_parses_legacy_wire_values_and_rejects_unknown_values() {
        assert_eq!(
            SearchType::from_wire("issue_comment"),
            Some(SearchType::IssueComment)
        );
        assert_eq!(
            SearchType::from_wire("post_comment"),
            Some(SearchType::PostComment)
        );
        assert_eq!(SearchType::from_wire("not available"), None);
        assert_eq!(SearchType::from_wire(""), None);
    }

    #[test]
    fn snippets_merge_overlapping_windows_and_return_highlight_offsets() {
        let snippets = make_snippets("alpha keyword beta keyword gamma", "keyword", 8);
        assert_eq!(snippets.len(), 1);
        assert_eq!(snippets[0].text, "alpha keyword beta keyword gamma");
        assert_eq!(
            snippets[0].highlights,
            vec![
                SearchHighlight { start: 6, end: 13 },
                SearchHighlight { start: 19, end: 26 },
            ]
        );
    }

    #[test]
    fn keyword_matching_is_case_insensitive_without_regex_interpretation() {
        assert!(keyword_matches("Use [literal] Search", "[LITERAL]"));
        assert!(!keyword_matches("Use literal Search", "[literal]"));
    }
}
