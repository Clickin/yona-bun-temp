use super::*;

pub(super) fn normalize_identity(value: &str) -> String {
    value.trim().to_ascii_lowercase()
}

pub(super) fn mailbox_message_id_left_local(message_id: &str) -> Option<String> {
    let left_angle = message_id.find('<')?;
    let at_sign = message_id[left_angle + 1..]
        .find('@')
        .map(|offset| left_angle + 1 + offset)?;
    let left = message_id[left_angle + 1..at_sign].trim();
    let left = left.strip_prefix('/').unwrap_or(left).to_string();
    (!left.is_empty()).then_some(left)
}

pub(super) fn mailbox_project_detail_local(detail: &str) -> Option<(String, String)> {
    let mut parts = detail.split('/');
    let owner_name = parts.next()?;
    let project_name = parts.next()?;
    if owner_name.is_empty() || project_name.is_empty() {
        return None;
    }
    Some((owner_name.to_string(), project_name.to_string()))
}

pub(super) fn mailbox_resource_path_from_detail_local(detail: &str) -> Option<&str> {
    let mut parts = detail.splitn(3, '/');
    parts.next()?;
    parts.next()?;
    let resource_path = parts.next()?;
    (!resource_path.is_empty()).then_some(resource_path)
}

pub(super) fn mailbox_execution_record(
    action: &MailboxResourceActionRecord,
    status: &str,
) -> MailboxActionExecutionRecord {
    MailboxActionExecutionRecord {
        action: action.action.clone(),
        owner_name: action.owner_name.clone(),
        project_name: action.project_name.clone(),
        resource_id: action.resource_id,
        resource_type: action.resource_type.clone(),
        status: status.to_string(),
    }
}

pub(super) fn mailbox_canonical_resource_type(resource_type: &str) -> String {
    let resource_type = resource_type.trim();
    match resource_type {
        "ISSUE_POST" => "issue_post",
        "ISSUE_COMMENT" => "issue_comment",
        "BOARD_POST" => "board_post",
        "NONISSUE_COMMENT" => "nonissue_comment",
        "COMMENT_THREAD" => "comment_thread",
        "REVIEW_COMMENT" => "review_comment",
        "PULL_REQUEST" => "pull_request",
        value => return value.to_ascii_lowercase(),
    }
    .to_string()
}

pub(super) fn login_id_matches_configured_guest_prefix(login_id: &str) -> bool {
    let normalized_login_id = normalize_identity(login_id);
    if normalized_login_id.is_empty() {
        return false;
    }
    let Ok(prefixes) = std::env::var("YONA_GUEST_LOGIN_PREFIX") else {
        return false;
    };
    prefixes
        .replace(' ', "")
        .split(',')
        .map(normalize_identity)
        .filter(|prefix| !prefix.is_empty())
        .any(|prefix| normalized_login_id.starts_with(&prefix))
}

pub(super) fn normalize_optional(value: Option<&str>) -> Option<String> {
    value
        .map(normalize_identity)
        .filter(|item| !item.is_empty())
}

pub(super) fn empty_to_none(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

pub(super) fn user_state_from_confirmed(is_confirmed: bool) -> Option<String> {
    Some(if is_confirmed { "active" } else { "locked" }.to_string())
}

pub(super) fn finish_ranked_search_items(
    mut ranked_items: Vec<(u32, usize, SearchItemRecord)>,
) -> Vec<SearchItemRecord> {
    ranked_items.sort_by(|left, right| right.0.cmp(&left.0).then_with(|| left.1.cmp(&right.1)));
    ranked_items.into_iter().map(|(_, _, item)| item).collect()
}

pub(super) fn issue_assignable_user_matches(
    user: &n4user::Model,
    query: &str,
    search_type: &str,
) -> bool {
    let query = query.trim();
    let normalized_query = normalize_identity(query);
    match search_type {
        "loginId" => {
            normalize_optional(user.login_id.as_deref()).as_deref()
                == Some(normalized_query.as_str())
        }
        "name" => user
            .name
            .as_deref()
            .is_some_and(|value| value.trim().eq_ignore_ascii_case(query)),
        "englishName" => user
            .english_name
            .as_deref()
            .is_some_and(|value| value.trim().eq_ignore_ascii_case(query)),
        _ => {
            let contains_query = |value: Option<&str>| {
                normalize_optional(value)
                    .is_some_and(|value| value.contains(normalized_query.as_str()))
            };
            contains_query(user.login_id.as_deref())
                || contains_query(user.name.as_deref())
                || contains_query(user.english_name.as_deref())
        }
    }
}

pub(super) fn issue_assignable_user_record(user: n4user::Model) -> IssueAssignableUserRecord {
    let login_id = user.login_id.unwrap_or_default();
    let display_name = user.name.unwrap_or_else(|| login_id.clone());
    let pure_name_only = pure_user_name(&display_name);
    IssueAssignableUserRecord {
        avatar_url: String::new(),
        display_name,
        item_type: "user".to_string(),
        login_id,
        pure_name_only,
    }
}

pub(super) fn issue_assignable_custom_user_record(
    user: &n4user::Model,
    display_name: &str,
) -> IssueAssignableUserRecord {
    IssueAssignableUserRecord {
        avatar_url: String::new(),
        display_name: display_name.to_string(),
        item_type: "user".to_string(),
        login_id: user.login_id.clone().unwrap_or_default(),
        pure_name_only: display_name.to_string(),
    }
}

pub(super) fn issue_assignable_no_assignee_record() -> IssueAssignableUserRecord {
    IssueAssignableUserRecord {
        avatar_url: String::new(),
        display_name: "issue.noAssignee".to_string(),
        item_type: "user".to_string(),
        login_id: LEGACY_ANONYMOUS_LOGIN_ID.to_string(),
        pure_name_only: "issue.noAssignee".to_string(),
    }
}

pub(super) fn issue_sharable_project_record(project: ProjectRecord) -> IssueAssignableUserRecord {
    let display_name = format!("{}/{}", project.owner_name, project.project_name);
    IssueAssignableUserRecord {
        avatar_url: String::new(),
        display_name: display_name.clone(),
        item_type: "project".to_string(),
        login_id: project.id.to_string(),
        pure_name_only: display_name,
    }
}

pub(super) fn n4user_is_active(user: &n4user::Model) -> bool {
    normalize_optional(user.state.as_deref()).as_deref() == Some("active")
}

pub(super) const SITE_USER_PAGE_SIZE: usize = 30;
pub(super) const LEGACY_ANONYMOUS_LOGIN_ID: &str = "anonymous";

pub(super) fn usize_to_u32_saturating(value: usize) -> u32 {
    u32::try_from(value).unwrap_or(u32::MAX)
}

pub(super) fn site_user_state_label(user: &n4user::Model) -> String {
    normalize_optional(user.state.as_deref())
        .unwrap_or_else(|| "pending".to_string())
        .to_ascii_uppercase()
}

pub(super) fn site_user_query_matches(user: &n4user::Model, query: &str) -> bool {
    let normalized_query = normalize_identity(query);
    if normalized_query.is_empty() {
        return true;
    }
    let contains_query = |value: Option<&str>| {
        normalize_optional(value).is_some_and(|value| value.contains(&normalized_query))
    };
    contains_query(user.login_id.as_deref())
        || contains_query(user.name.as_deref())
        || contains_query(user.english_name.as_deref())
        || contains_query(user.email.as_deref())
}

pub(super) fn site_user_state_matches(
    user: &n4user::Model,
    state: &str,
    site_admin_ids: &HashSet<i64>,
) -> bool {
    match state {
        "GUEST" => user.is_guest.unwrap_or_default() != 0,
        "SITE_ADMIN" => site_admin_ids.contains(&user.id),
        _ => site_user_state_label(user) == state,
    }
}

pub(super) fn site_user_filter_state(state: &str) -> Result<String, DbErr> {
    let normalized = normalize_identity(state).to_ascii_uppercase();
    let normalized = if normalized.is_empty() {
        "ACTIVE".to_string()
    } else {
        normalized
    };
    match normalized.as_str() {
        "ACTIVE" | "LOCKED" | "DELETED" | "GUEST" | "SITE_ADMIN" => Ok(normalized),
        _ => Err(DbErr::Custom("invalid site user state".to_string())),
    }
}

pub(super) fn site_user_record_from_model(
    user: n4user::Model,
    is_site_admin: bool,
) -> SiteUserRecord {
    let state = site_user_state_label(&user);
    SiteUserRecord {
        created_at: user.created_date,
        display_name: user.name.unwrap_or_default(),
        email_address: user.email.unwrap_or_default(),
        id: user.id,
        is_guest: user.is_guest.unwrap_or_default() != 0,
        is_site_admin,
        last_state_modified_at: user.last_state_modified_date,
        login_id: user.login_id.unwrap_or_default(),
        state,
    }
}

pub(super) fn issue_mention_user_record(user: n4user::Model) -> IssueMentionUserRecord {
    let login_id = user.login_id.unwrap_or_default();
    let display_name = user.name.unwrap_or_else(|| login_id.clone());
    let search_text = format!("{display_name}{login_id}");
    IssueMentionUserRecord {
        avatar_url: String::new(),
        display_name,
        login_id,
        search_text,
        item_type: "user".to_string(),
    }
}

pub(super) fn mention_text_matches(record: &IssueMentionUserRecord, query: &str) -> bool {
    let normalized = normalize_identity(query);
    normalized.is_empty()
        || normalize_identity(&record.login_id).contains(&normalized)
        || normalize_identity(&record.display_name).contains(&normalized)
        || normalize_identity(&record.search_text).contains(&normalized)
}

pub(super) fn project_issue_reference_record(model: &issue::Model) -> ProjectIssueReferenceRecord {
    ProjectIssueReferenceRecord {
        issue_number: model.number.unwrap_or_default(),
        state: issue_state_from_raw(model.state),
        title: model.title.clone().unwrap_or_default(),
    }
}

pub(super) fn push_unique_user_id(
    user_ids: &mut Vec<i64>,
    seen: &mut HashSet<i64>,
    user_id: Option<i64>,
) {
    if let Some(user_id) = user_id {
        if seen.insert(user_id) {
            user_ids.push(user_id);
        }
    }
}

pub(super) fn extract_mention_tokens(text: &str) -> Vec<String> {
    let chars = text.char_indices().collect::<Vec<_>>();
    let mut tokens = Vec::new();
    let mut index = 0;
    while index < chars.len() {
        let (_, ch) = chars[index];
        if ch != '@' {
            index += 1;
            continue;
        }
        if index > 0 {
            let previous_ch = chars[index - 1].1;
            if previous_ch.is_ascii_alphanumeric() || matches!(previous_ch, '-' | '_' | '.') {
                index += 1;
                continue;
            }
        }
        let start = index + 1;
        let mut end = start;
        while end < chars.len() {
            let (_, token_ch) = chars[end];
            if token_ch.is_ascii_alphanumeric() || matches!(token_ch, '-' | '_' | '.' | '/') {
                end += 1;
            } else {
                break;
            }
        }
        if end > start {
            let byte_start = chars[start].0;
            let byte_end = chars
                .get(end)
                .map(|(byte_index, _)| *byte_index)
                .unwrap_or(text.len());
            let token = text[byte_start..byte_end].trim_matches('/').to_string();
            if !token.is_empty() {
                tokens.push(token);
            }
        }
        index = end.max(index + 1);
    }
    tokens
}

pub(super) fn pure_user_name(display_name: &str) -> String {
    let bracket_index = ["[", "("]
        .iter()
        .filter_map(|marker| display_name.find(marker))
        .min()
        .unwrap_or(display_name.len());
    display_name[..bracket_index].trim().to_string()
}

pub(super) fn issue_state_to_raw(value: &str) -> i32 {
    if normalize_identity(value) == "open" {
        0
    } else {
        1
    }
}

pub(super) const WORKSPACE_NOTIFICATION_TYPES: &[(&str, &str)] = &[
    ("NEW_ISSUE", "New issue"),
    ("NEW_POSTING", "New post"),
    ("NEW_PULL_REQUEST", "New pull request"),
    ("ISSUE_STATE_CHANGED", "Issue state changed"),
    ("ISSUE_ASSIGNEE_CHANGED", "Issue assignee changed"),
    ("PULL_REQUEST_STATE_CHANGED", "Pull request state changed"),
    ("NEW_COMMENT", "New comment"),
    ("NEW_REVIEW_COMMENT", "New simple comment"),
    ("MEMBER_ENROLL_REQUEST", "Member enroll request"),
    ("PULL_REQUEST_MERGED", "Pull request merged"),
    ("ISSUE_REFERRED_FROM_COMMIT", "Issue referred from commit"),
    ("PULL_REQUEST_COMMIT_CHANGED", "Pull request commit changed"),
    ("NEW_COMMIT", "New commit"),
    (
        "PULL_REQUEST_REVIEW_STATE_CHANGED",
        "Pull request review action changed",
    ),
    (
        "ISSUE_REFERRED_FROM_PULL_REQUEST",
        "Issue referred from pull request",
    ),
    ("ISSUE_BODY_CHANGED", "Issue body changed"),
    ("REVIEW_THREAD_STATE_CHANGED", "Review state changed"),
    (
        "ORGANIZATION_MEMBER_ENROLL_REQUEST",
        "Organization member enroll request",
    ),
    ("COMMENT_UPDATED", "Comment updated"),
    ("ISSUE_MOVED", "Issue moved"),
    ("ISSUE_SHARER_CHANGED", "Issue sharer changed"),
    ("ISSUE_LABEL_CHANGED", "Issue label changed"),
    ("ISSUE_MILESTONE_CHANGED", "Milestone changed"),
    ("POSTING_BODY_CHANGED", "Posting body changed"),
    ("RESOURCE_DELETED", "Resource deleted"),
    ("MEMBER_ENROLL_ACCEPT", "Member enroll accept"),
    (
        "ORGANIZATION_MEMBER_ENROLL_ACCEPT",
        "Organization member enroll accept",
    ),
];

pub(super) const PASSWORD_RESET_VERIFICATION_PREFIX: &str = "password-reset:";
pub(super) const SIGNUP_VERIFICATION_PREFIX: &str = "signup:";
pub(super) const ISSUE_EVENT_DRAFT_TIME_IN_MILLIS: i64 = 30_000;
pub(super) const NOTIFICATION_DRAFT_TIME_IN_MILLIS: i64 = 30_000;
pub(super) const PROJECT_PUSHED_BRANCH_DRAFT_TIME_IN_MILLIS: i64 = 60 * 60 * 1000;
pub(super) const USER_ATTACHMENT_CONTAINER: &str = "USER";
pub(super) const USER_AVATAR_ATTACHMENT_CONTAINER: &str = "USER_AVATAR";
pub(super) const PROJECT_ATTACHMENT_CONTAINER: &str = "PROJECT";
pub(super) const ORGANIZATION_ATTACHMENT_CONTAINER: &str = "ORGANIZATION";
pub(super) const ISSUE_ATTACHMENT_CONTAINER: &str = "ISSUE_POST";
pub(super) const RUST_ISSUE_ATTACHMENT_CONTAINER: &str = "ISSUE";
pub(super) const ISSUE_COMMENT_ATTACHMENT_CONTAINER: &str = "ISSUE_COMMENT";
pub(super) const BOARD_POST_ATTACHMENT_CONTAINER: &str = "BOARD_POST";
pub(super) const BOARD_COMMENT_ATTACHMENT_CONTAINER: &str = "NONISSUE_COMMENT";
pub(super) const RUST_BOARD_COMMENT_ATTACHMENT_CONTAINER: &str = "BOARD_POST_COMMENT";
pub(super) const MILESTONE_ATTACHMENT_CONTAINER: &str = "MILESTONE";
pub(super) const PULL_REQUEST_ATTACHMENT_CONTAINER: &str = "PULL_REQUEST";
pub(super) const REVIEW_COMMENT_ATTACHMENT_CONTAINER: &str = "REVIEW_COMMENT";

pub(super) fn notification_draft_time_in_millis() -> i64 {
    std::env::var("YONA_NOTIFICATION_DRAFT_TIME")
        .ok()
        .and_then(|value| parse_legacy_duration_ms(&value))
        .unwrap_or(NOTIFICATION_DRAFT_TIME_IN_MILLIS)
}

pub(super) fn issue_event_draft_time_in_millis() -> i64 {
    std::env::var("YONA_ISSUE_EVENT_DRAFT_TIME")
        .ok()
        .and_then(|value| parse_legacy_duration_ms(&value))
        .unwrap_or(ISSUE_EVENT_DRAFT_TIME_IN_MILLIS)
}

pub(super) fn parse_legacy_duration_ms(value: &str) -> Option<i64> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }
    let (number, multiplier) = if let Some(number) = trimmed.strip_suffix("ms") {
        (number.trim(), 1)
    } else if let Some(number) = trimmed.strip_suffix('s') {
        (number.trim(), 1_000)
    } else if let Some(number) = trimmed.strip_suffix('m') {
        (number.trim(), 60_000)
    } else if let Some(number) = trimmed.strip_suffix('h') {
        (number.trim(), 3_600_000)
    } else {
        (trimmed, 1)
    };
    number.parse::<i64>().ok()?.checked_mul(multiplier)
}

pub(super) enum PostingMentionNotificationMode {
    All,
    NewOnly,
}

pub(super) fn attachment_container_aliases(container_type: &str) -> Vec<&str> {
    match container_type {
        ISSUE_ATTACHMENT_CONTAINER => {
            vec![ISSUE_ATTACHMENT_CONTAINER, RUST_ISSUE_ATTACHMENT_CONTAINER]
        }
        BOARD_COMMENT_ATTACHMENT_CONTAINER => {
            vec![
                BOARD_COMMENT_ATTACHMENT_CONTAINER,
                RUST_BOARD_COMMENT_ATTACHMENT_CONTAINER,
            ]
        }
        _ => vec![container_type],
    }
}

pub(super) fn can_bind_attachment(
    current_container_type: &str,
    current_container_id: i64,
    target_container_type: &str,
    target_container_id: i64,
    actor_id: Option<i64>,
) -> bool {
    let target_aliases = attachment_container_aliases(target_container_type);
    let already_bound_to_target = current_container_id == target_container_id
        && target_aliases.contains(&current_container_type);
    let actor_owns_temporary_upload = actor_id.is_some_and(|actor_id| {
        current_container_type == USER_ATTACHMENT_CONTAINER && current_container_id == actor_id
    });
    actor_id.is_none() || already_bound_to_target || actor_owns_temporary_upload
}

pub(super) fn workspace_notification_enabled_by_default(event_type: &str) -> bool {
    !matches!(event_type, "NEW_COMMENT")
}

pub(super) fn notification_message(event_type: &str, old_value: &str, new_value: &str) -> String {
    match event_type {
        "ISSUE_SHARER_CHANGED" if !new_value.trim().is_empty() => {
            format!("Issue is shared with {}", new_value.trim())
        }
        "ISSUE_SHARER_CHANGED" if !old_value.trim().is_empty() => {
            "Issue sharing state is changed".to_string()
        }
        "ISSUE_STATE_CHANGED" => issue_state_notification_message(new_value),
        "NEW_ISSUE" | "NEW_POSTING" | "NEW_PULL_REQUEST" | "NEW_COMMIT" | "COMMENT_UPDATED"
            if !new_value.trim().is_empty() =>
        {
            new_value.to_string()
        }
        "NEW_COMMENT" if !new_value.is_empty() || !old_value.is_empty() => {
            format!("{new_value}{old_value}")
        }
        "ISSUE_BODY_CHANGED" => "Issue body changed".to_string(),
        "COMMENT_UPDATED" => "COMMENT_UPDATED".to_string(),
        "NEW_REVIEW_COMMENT" if !new_value.trim().is_empty() => new_value.to_string(),
        "PULL_REQUEST_STATE_CHANGED" | "PULL_REQUEST_MERGED" => {
            pull_request_state_notification_message(new_value)
        }
        "PULL_REQUEST_REVIEW_STATE_CHANGED" => {
            if normalize_identity(new_value) == "done" {
                "notification.pullrequest.reviewed".to_string()
            } else {
                "notification.pullrequest.unreviewed".to_string()
            }
        }
        "REVIEW_THREAD_STATE_CHANGED" => {
            if normalize_identity(new_value) == "closed" {
                "notification.reviewthread.closed".to_string()
            } else {
                "notification.reviewthread.reopened".to_string()
            }
        }
        "PULL_REQUEST_COMMIT_CHANGED" if !new_value.trim().is_empty() => new_value.to_string(),
        _ => event_type.to_string(),
    }
}

pub(super) fn issue_state_notification_message(new_value: &str) -> String {
    if normalize_identity(new_value) == "closed" {
        "notification.issue.closed".to_string()
    } else {
        "notification.issue.reopened".to_string()
    }
}

pub(super) fn notification_type_icon(event_type: &str, state: &str) -> &'static str {
    let normalized_state = normalize_identity(state);
    match event_type {
        "NEW_COMMENT" | "NEW_REVIEW_COMMENT" | "REVIEW_THREAD_STATE_CHANGED" => "comment2",
        "NEW_ISSUE" | "ISSUE_STATE_CHANGED" if normalized_state == "closed" => "list-alt closed",
        "NEW_ISSUE" | "ISSUE_STATE_CHANGED" => "list-alt",
        "ISSUE_ASSIGNEE_CHANGED" => "friends changed",
        "NEW_POSTING" => "edit2",
        "NEW_PULL_REQUEST"
        | "PULL_REQUEST_COMMIT_CHANGED"
        | "PULL_REQUEST_STATE_CHANGED"
        | "PULL_REQUEST_MERGED"
            if normalized_state == "closed" =>
        {
            "merge closed"
        }
        "NEW_PULL_REQUEST"
        | "PULL_REQUEST_COMMIT_CHANGED"
        | "PULL_REQUEST_STATE_CHANGED"
        | "PULL_REQUEST_MERGED"
            if normalized_state == "merged" =>
        {
            "merge merged"
        }
        "NEW_PULL_REQUEST"
        | "PULL_REQUEST_COMMIT_CHANGED"
        | "PULL_REQUEST_STATE_CHANGED"
        | "PULL_REQUEST_MERGED" => "merge",
        "MEMBER_ENROLL_REQUEST" | "ORGANIZATION_MEMBER_ENROLL_REQUEST"
            if normalized_state == "accept" =>
        {
            "addfriend closed"
        }
        "MEMBER_ENROLL_REQUEST" | "ORGANIZATION_MEMBER_ENROLL_REQUEST"
            if normalized_state == "cancel" =>
        {
            "addfriend rejected"
        }
        "MEMBER_ENROLL_REQUEST" | "ORGANIZATION_MEMBER_ENROLL_REQUEST" => "addfriend",
        "NEW_COMMIT" => "push",
        "PULL_REQUEST_REVIEW_STATE_CHANGED" => "preview changed",
        "ISSUE_BODY_CHANGED" | "COMMENT_UPDATED" => "ellipsis-horizontal",
        _ => "megaphone",
    }
}

pub(super) fn notification_unwatch_resource_types(resource_type: &str) -> Vec<String> {
    let normalized = normalize_identity(resource_type);
    let mut resource_types = match normalized.as_str() {
        "issue" | "issue_post" => vec![
            normalized.clone(),
            "issue".to_string(),
            "issue_post".to_string(),
            "ISSUE".to_string(),
        ],
        "posting" | "board_post" => vec![
            normalized.clone(),
            "posting".to_string(),
            "board_post".to_string(),
            "POSTING".to_string(),
        ],
        "pull_request" => vec![normalized.clone(), "PULL_REQUEST".to_string()],
        "project" => vec![normalized.clone(), "PROJECT".to_string()],
        _ => vec![normalized.clone()],
    };
    resource_types.sort();
    resource_types.dedup();
    resource_types
}

pub(super) fn pull_request_state_notification_message(new_value: &str) -> String {
    let state = normalize_identity(new_value);
    if state == "open" {
        "notification.pullrequest.reopened".to_string()
    } else if state.is_empty() {
        "notification.pullrequest".to_string()
    } else {
        format!("notification.pullrequest.{state}")
    }
}

pub(super) fn notification_mail_is_due(
    created: Option<DateTime>,
    now: DateTime,
    delay_ms: i64,
) -> bool {
    let Some(created) = created else {
        return false;
    };
    now.signed_duration_since(created).num_milliseconds() >= delay_ms.max(0)
}

pub(super) fn notification_event_uses_draft_merge(event_type: &str) -> bool {
    !matches!(
        event_type,
        "ISSUE_SHARER_CHANGED"
            | "MEMBER_ENROLL_REQUEST"
            | "MEMBER_ENROLL_ACCEPT"
            | "ORGANIZATION_MEMBER_ENROLL_REQUEST"
            | "ORGANIZATION_MEMBER_ENROLL_ACCEPT"
    )
}

pub(super) fn issue_event_uses_draft_merge(event_type: &str) -> bool {
    notification_event_uses_draft_merge(event_type)
}

pub(super) fn random_workspace_token() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(32)
        .map(char::from)
        .collect()
}

pub(super) fn random_transfer_confirm_key() -> String {
    rand::thread_rng()
        .sample_iter(&Alphanumeric)
        .take(50)
        .map(char::from)
        .collect()
}

pub(super) fn prefixed_verification_code(prefix: &str) -> String {
    format!("{prefix}{}", random_workspace_token())
}

pub(super) fn current_datetime() -> DateTime {
    DateTimeUtc::from(SystemTime::now()).naive_utc()
}

pub(super) fn current_timestamp_millis() -> i64 {
    SystemTime::now()
        .duration_since(SystemTime::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

pub(super) fn days_ago_datetime(days: u64) -> DateTime {
    let seconds = days.saturating_mul(24 * 60 * 60);
    let cutoff = SystemTime::now()
        .checked_sub(Duration::from_secs(seconds))
        .unwrap_or(SystemTime::UNIX_EPOCH);
    DateTimeUtc::from(cutoff).naive_utc()
}

pub(super) fn format_workspace_date_label(value: Option<DateTime>) -> String {
    value
        .map(|value| value.format("%Y-%m-%d").to_string())
        .unwrap_or_default()
}

pub(super) fn format_legacy_datetime_title(value: Option<DateTime>) -> String {
    value
        .map(|value| value.format("%Y-%m-%d %-I:%M:%S %p").to_string())
        .unwrap_or_default()
}

pub(super) fn looks_like_email_address(value: &str) -> bool {
    let trimmed = value.trim();
    let Some((local, domain)) = trimmed.split_once('@') else {
        return false;
    };
    !local.is_empty()
        && !domain.is_empty()
        && !domain.starts_with('.')
        && !domain.ends_with('.')
        && domain.contains('.')
}

pub(super) fn issue_state_from_raw(value: Option<i32>) -> String {
    if value.unwrap_or(0) == 0 {
        "open".to_string()
    } else {
        "closed".to_string()
    }
}

pub(super) fn child_issue_state_order(state: &str) -> u8 {
    match normalize_identity(state).as_str() {
        "draft" => 0,
        "open" => 1,
        "closed" => 2,
        _ => 3,
    }
}

pub(super) fn sort_issue_models_for_organization(
    items: &mut [(issue::Model, ProjectRecord)],
    order_by: &str,
    order_dir: &str,
) {
    let descending = normalize_identity(order_dir) != "asc";
    let normalized_order = normalize_identity(order_by);
    items.sort_by(|(left, _), (right, _)| {
        let ordering = match normalized_order.as_str() {
            "duedate" => left.due_date.cmp(&right.due_date),
            "updateddate" => left.updated_date.cmp(&right.updated_date),
            "numofcomments" => left
                .num_of_comments
                .unwrap_or_default()
                .cmp(&right.num_of_comments.unwrap_or_default()),
            _ => left.created_date.cmp(&right.created_date),
        }
        .then_with(|| left.id.cmp(&right.id));

        if descending {
            ordering.reverse()
        } else {
            ordering
        }
    });
}

pub(super) fn sort_posting_models(
    items: &mut [(posting::Model, ProjectRecord)],
    order_by: &str,
    order_dir: &str,
) {
    let descending = normalize_identity(order_dir) != "asc";
    let normalized_order = normalize_identity(order_by);
    items.sort_by(|(left, _), (right, _)| {
        let ordering = match normalized_order.as_str() {
            "updateddate" => left.updated_date.cmp(&right.updated_date),
            "numofcomments" => left
                .num_of_comments
                .unwrap_or_default()
                .cmp(&right.num_of_comments.unwrap_or_default()),
            _ => left.created_date.cmp(&right.created_date),
        }
        .then_with(|| left.number.cmp(&right.number))
        .then_with(|| left.id.cmp(&right.id));

        if descending {
            ordering.reverse()
        } else {
            ordering
        }
    });
}

pub(super) fn bool_to_i16(value: bool) -> i16 {
    if value {
        1
    } else {
        0
    }
}

pub(super) fn all_project_menu_settings_enabled() -> ProjectMenuSettingsRecord {
    ProjectMenuSettingsRecord {
        board: true,
        code: true,
        issue: true,
        milestone: true,
        pull_request: true,
        review: true,
    }
}

pub(super) fn configured_project_default_menu_settings() -> ProjectMenuSettingsRecord {
    let Some(configured) = std::env::var("YONA_PROJECT_DEFAULT_MENUS")
        .ok()
        .filter(|value| !value.trim().is_empty())
    else {
        return all_project_menu_settings_enabled();
    };

    let mut settings = ProjectMenuSettingsRecord {
        board: false,
        code: false,
        issue: false,
        milestone: false,
        pull_request: false,
        review: false,
    };

    for menu in configured.split(',').map(normalize_project_menu_config_key) {
        match menu.as_str() {
            "board" => settings.board = true,
            "code" => settings.code = true,
            "issue" => settings.issue = true,
            "milestone" => settings.milestone = true,
            "pullrequest" => settings.pull_request = true,
            "review" => settings.review = true,
            _ => {}
        }
    }

    settings
}

pub(super) fn normalize_project_menu_config_key(value: &str) -> String {
    value
        .chars()
        .filter(|ch| !ch.is_whitespace() && *ch != '_' && *ch != '-')
        .collect::<String>()
        .to_ascii_lowercase()
}

pub(super) fn is_unique_posting_number_conflict(error: &DbErr) -> bool {
    let message = error.to_string().to_ascii_lowercase();
    (message.contains("unique") || message.contains("duplicate"))
        && message.contains("posting")
        && (message.contains("number") || message.contains("uq_posting_1"))
}

pub(super) fn issue_label_category_record(
    row: issue_label_category::Model,
) -> IssueLabelCategoryRecord {
    IssueLabelCategoryRecord {
        id: row.id,
        is_exclusive: row.is_exclusive.unwrap_or_default() != 0,
        name: row.name.unwrap_or_default(),
    }
}

pub(super) fn sql_placeholders(backend: DatabaseBackend, count: usize) -> Vec<String> {
    match backend {
        DatabaseBackend::Postgres => (1..=count).map(|index| format!("${index}")).collect(),
        _ => (0..count).map(|_| "?".to_string()).collect(),
    }
}

pub(super) fn pull_request_state_from_raw(value: Option<i32>, is_conflict: Option<i16>) -> String {
    if is_conflict.unwrap_or_default() != 0 {
        return "conflict".to_string();
    }

    pull_request_lifecycle_state(value)
}

pub(super) fn pull_request_lifecycle_state(value: Option<i32>) -> String {
    match value.unwrap_or(1) {
        6 => "merged".to_string(),
        2 => "closed".to_string(),
        _ => "open".to_string(),
    }
}

pub(super) fn pull_request_open_condition() -> Condition {
    Condition::any()
        .add(pull_request::Column::State.eq(Some(1)))
        .add(pull_request::Column::State.is_null())
}

pub(super) fn pull_request_closed_condition() -> Condition {
    Condition::any()
        .add(pull_request::Column::State.eq(Some(2)))
        .add(pull_request::Column::State.eq(Some(6)))
}

pub(super) fn review_thread_state(value: Option<&str>) -> String {
    match value.map(normalize_identity).as_deref() {
        Some("closed") => "closed".to_string(),
        _ => "open".to_string(),
    }
}

pub(super) fn review_thread_side(value: Option<&str>) -> Option<String> {
    match value.map(str::trim).filter(|side| !side.is_empty()) {
        Some(side) if side.eq_ignore_ascii_case("a") => Some("A".to_string()),
        Some(side) if side.eq_ignore_ascii_case("b") => Some("B".to_string()),
        _ => None,
    }
}

pub(super) fn review_thread_open_condition() -> Condition {
    Condition::any()
        .add(comment_thread::Column::State.is_null())
        .add(
            Condition::all()
                .add(comment_thread::Column::State.ne(Some("closed".to_string())))
                .add(comment_thread::Column::State.ne(Some("CLOSED".to_string()))),
        )
}

pub(super) fn review_thread_closed_condition() -> Condition {
    Condition::any()
        .add(comment_thread::Column::State.eq(Some("closed".to_string())))
        .add(comment_thread::Column::State.eq(Some("CLOSED".to_string())))
}

#[derive(Debug, FromQueryResult)]
pub(super) struct ProjectRow {
    pub(super) created_date: Option<DateTime>,
    pub(super) default_reviewer_count: Option<i32>,
    pub(super) id: i64,
    pub(super) is_code_accessible_member_only: Option<i16>,
    pub(super) is_using_reviewer_count: Option<i16>,
    pub(super) last_pushed_date: Option<DateTime>,
    pub(super) name: Option<String>,
    pub(super) original_project_id: Option<i64>,
    pub(super) overview: Option<String>,
    pub(super) owner: Option<String>,
    pub(super) organization_id: Option<i64>,
    pub(super) previous_name: Option<String>,
    pub(super) previous_name_changed_time: Option<i64>,
    pub(super) previous_owner_login_id: Option<String>,
    pub(super) project_scope: Option<String>,
    pub(super) vcs: Option<String>,
}

pub(super) fn next_project_vcs(current: &str) -> String {
    if current == "GIT" {
        "Subversion".to_string()
    } else {
        "GIT".to_string()
    }
}

pub(super) fn project_webhook_record_from_model(row: webhook::Model) -> ProjectWebhookRecord {
    ProjectWebhookRecord {
        git_push: row.git_push.unwrap_or_default() != 0,
        id: row.id,
        payload_url: row.payload_url.unwrap_or_default(),
        secret: row.secret.unwrap_or_default(),
        webhook_type: row.webhook_type.unwrap_or_default(),
    }
}

pub(super) fn webhook_thread_record_from_model(row: webhook_thread::Model) -> WebhookThreadRecord {
    WebhookThreadRecord {
        created_at: row.created_at,
        id: row.id,
        resource_id: row.resource_id.unwrap_or_default(),
        resource_type: row.resource_type.unwrap_or_default(),
        thread_id: row.thread_id.unwrap_or_default(),
        webhook_id: row.webhook_id.unwrap_or_default(),
    }
}

pub(super) fn project_webhook_delivery_record_from_model(
    row: webhook_delivery::Model,
) -> ProjectWebhookDeliveryRecord {
    ProjectWebhookDeliveryRecord {
        created_at: row.created_at,
        error_message: row.error_message,
        event_type: row.event_type.unwrap_or_default(),
        id: row.id,
        payload_url: row.payload_url.unwrap_or_default(),
        request_body: row.request_body.unwrap_or_default(),
        response_body: row.response_body,
        status: row.status.unwrap_or_default(),
        webhook_id: row.webhook_id.unwrap_or_default(),
        webhook_type: row.webhook_type.unwrap_or_default(),
    }
}

pub(super) fn append_posting_history(
    existing_history: Option<&str>,
    old_body: &str,
    new_body: &str,
) -> Option<String> {
    let mut history = existing_history.unwrap_or_default().trim().to_string();
    if old_body != new_body && !old_body.trim().is_empty() {
        if !history.is_empty() {
            history.push_str("\n\n---\n\n");
        }
        history.push_str(old_body);
    }
    if history.is_empty() {
        None
    } else {
        Some(history)
    }
}

pub(super) fn project_transfer_record_from_model(
    row: project_transfer::Model,
) -> Option<ProjectTransferRecord> {
    Some(ProjectTransferRecord {
        accepted: row.accepted.unwrap_or_default() != 0,
        confirm_key: row.confirm_key?,
        destination: row.destination?,
        id: row.id,
        new_project_name: row.new_project_name?,
        project_id: row.project_id?,
        requested: row.requested,
        sender_id: row.sender_id?,
    })
}
