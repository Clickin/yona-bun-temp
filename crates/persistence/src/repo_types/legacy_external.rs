#[derive(Clone, Debug, PartialEq, Eq)]
pub struct IssueCommentNotificationReceiverRecord {
    pub avatar_url: String,
    pub display_name: String,
    pub email_address: String,
    pub login_id: String,
    pub pure_name_only: String,
}
