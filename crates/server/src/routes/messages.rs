use axum::{response::IntoResponse, routing::get, Router};

pub(crate) fn routes() -> Router {
    Router::new().route("/messages.js", get(legacy_js_messages))
}

async fn legacy_js_messages() -> impl IntoResponse {
    let messages = [
        ("app.name", "Yona"),
        ("button.cancel", "Cancel"),
        ("button.confirm", "Confirm"),
        ("button.delete", "Delete"),
        ("button.login", "Log in"),
        (
            "button.commentAndNextState.closed",
            "Comment & Close issue",
        ),
        (
            "button.commentAndNextState.open",
            "Comment & Reopen issue",
        ),
        ("button.nextPage", "Next page"),
        ("button.nextState.closed", "Close issue"),
        ("button.nextState.open", "Reopen issue"),
        ("button.no", "No"),
        ("button.prevPage", "Previous page"),
        ("button.save", "Save"),
        ("button.download", "Download a file"),
        ("button.upload", "File upload"),
        ("button.yes", "Yes"),
        (
            "common.attach.attachIfYouSave",
            "Selected file will be attached when your comment is saved.",
        ),
        ("common.attach.clickToPost", "Click to post"),
        ("common.attach.clickbutton", "Click upload button"),
        (
            "common.attach.dropFilesHere",
            "Drag & Drop files here to upload.",
        ),
        (
            "common.attach.drophere",
            "Drag & Drop files to attach here or",
        ),
        (
            "common.attach.error.delete",
            "Failed to delete file. <br>{1} ({0})",
        ),
        (
            "common.attach.error.upload",
            "Failed to upload. <br>{1} ({0})",
        ),
        ("common.attach.pastehere", "Paste the clipboard image"),
        ("common.attachment", "Attachment"),
        ("common.comment.delete", "Delete comment"),
        (
            "common.comment.beforeunload.confirm",
            " Would you like to exit this page without submitting comment?",
        ),
        ("code.closeCommentBox", "Close comment box"),
        ("code.copyUrl.copied", "URL is copied"),
        ("code.isBinary", "Binary file is not shown"),
        ("code.openCommentBox", "Open comment box"),
        (
            "error.badrequest",
            "The request cannot be fulfilled due to bad syntax",
        ),
        ("error.failedTo", "Failed to {0}<br>({1} {2})"),
        ("error.forbidden", "You are not authorized"),
        ("error.notfound", "Page not found"),
        (
            "error.toolargefile",
            "Wow, that's huge!<br>Please submit file smaller than {0}.",
        ),
        (
            "issue.favorite.added",
            "Added as a favorite issue. See it on the My Issues page",
        ),
        ("issue.favorite.deleted", "Removed from favorite issues"),
        (
            "issue.error.beforeunload",
            "Issue is not saved yet. Would you like to exit this page without saving?",
        ),
        (
            "issue.error.emptyTitle",
            "Issue title is a required field.",
        ),
        (
            "issue.error.invalid.duedate",
            "Issue due date is not valid date type.",
        ),
        ("issue.menu.new", "New issue"),
        ("issue.unwatch", "Unsubscribe from this issue"),
        (
            "issue.unwatch.start",
            "You will no longer get notifications about this issue",
        ),
        ("issue.update.assignee.id", "Update assignee"),
        ("issue.update.attachLabel", "Attach label"),
        ("issue.update.detachLabel", "Detach label"),
        ("issue.update.dueDate", "Update due date"),
        ("issue.update.labelIds", "Update label"),
        ("issue.update.milestone.id", "Update milestone"),
        ("issue.update.state", "Update status"),
        ("issue.watch", "Subscribe"),
        (
            "issue.watch.start",
            "Now you will get notifications about this issue",
        ),
        ("label.add", "Add label"),
        (
            "label.category.new.confirm",
            "{0} is a new category.<br>In this category, you can choose",
        ),
        ("label.category.option", "In this category, you can choose"),
        ("label.category.option.multiple", "multiple labels"),
        ("label.category.option.single", "only a single label"),
        (
            "label.confirm.delete",
            "Once you delete this label, instances of this label attached to issues will also be removed. Do you still want to delete this label?",
        ),
        ("label.error.color", "Please define the label color using HEX or RGB values."),
        (
            "label.error.creationFailed",
            "Failed to create a new label. A server error may have occurred or the request may be invalid.",
        ),
        (
            "label.error.duplicated",
            "Failed to create a new label. The label may already exist.",
        ),
        (
            "label.error.duplicated.in.category",
            "A label with the same name already exists in the category {0}.",
        ),
        (
            "label.error.empty",
            "Category, Color, and Name are required fields.",
        ),
        ("label.failedTo", "Failed to {0}."),
        ("menu.home", "Home"),
        (
            "milestone.error.content",
            "Milestone description is a required field",
        ),
        (
            "milestone.error.duedateFormat",
            "Invalid format. Enter the due date in YYYY-MM-DD format.",
        ),
        (
            "milestone.error.title",
            "Milestone title is a required field.",
        ),
        ("milestone.state.all", "All"),
        ("milestone.state.closed", "Closed"),
        ("milestone.state.open", "Open"),
        (
            "organization.name.alert",
            "Enter the group name in alphanumerical or symbol characters(_-.)",
        ),
        (
            "organization.name.duplicate",
            "Already existent user's login id or group name.",
        ),
        (
            "organization.member.leave.unknownerror",
            "Failed to leave this group. Please ask site admin",
        ),
        ("organization.member.unknownOrganization", "Non existent group"),
        (
            "post.error.beforeunload",
            "This post has not been saved yet. Would you like to exit this page without saving?",
        ),
        ("post.error.emptyTitle", "Title is a required field."),
        ("post.unwatch", "Stop watching"),
        (
            "post.unwatch.start",
            "Notifications about this post has been muted",
        ),
        ("post.watch", "Watch"),
        (
            "post.watch.start",
            "You will receive notifications about this post",
        ),
        ("project.is.empty", "Project is non existent"),
        (
            "project.changeVCS.alert",
            "You should agree with changing the repository type.",
        ),
        ("project.changeVCS.error", "Can't change repository type"),
        (
            "project.delete.alert",
            "You should agree to delete this project.",
        ),
        (
            "project.delete.error",
            "Error occurred while deleting a project.",
        ),
        (
            "project.import.error.empty.url",
            "Please type the Git repository URL.",
        ),
        ("project.logo.alert", "This is not an image file."),
        (
            "project.member.deleteConfirm",
            "Are you sure you want this user to leave this project?",
        ),
        (
            "project.member.ownerCannotLeave",
            "Project owner cannot leave his own project.",
        ),
        ("project.member.notExist", "User does not exist."),
        (
            "project.webhook.payloadUrl.empty",
            "Payload URL is a required field.",
        ),
        (
            "project.name.alert",
            "Enter name in alphabetnumerical or symbol characters(_-.)",
        ),
        (
            "project.name.duplicate",
            "This project name already exists.",
        ),
        ("project.name.reserved.alert", "You can't use reserved names."),
        (
            "project.transfer.alert",
            "You should agree with the transfer of this project.",
        ),
        (
            "project.transfer.error",
            " User or group not available. Please check whether the user's login id or the gorup's name is correct.",
        ),
        ("project.unwatch", "Unwatch"),
        ("project.watch", "Watch"),
        (
            "pullRequest.body.required",
            "Enter pull request description.",
        ),
        (
            "pullRequest.diff.noChanges",
            "No changes have been made.",
        ),
        (
            "pullRequest.fromBranch.required",
            "Select branch that contains the code to be sent.",
        ),
        (
            "pullRequest.ignore.conflict",
            "This code seems to have conflicts when merging. Do you really want to continue?",
        ),
        (
            "pullRequest.is.merging",
            "We are checking if the code is safe. Please wait for a while to complete this process.",
        ),
        (
            "pullRequest.is.not.safe",
            "A conflict occurred when merging. This pull request cannot be merged safely.",
        ),
        (
            "pullRequest.is.safe",
            "This pull request can be merged safely.",
        ),
        (
            "pullRequest.title.required",
            "Title is a required field.",
        ),
        (
            "pullRequest.toBranch.required",
            "Select branch that will receive code to be sent.",
        ),
        (
            "pullRequest.unwatch.start",
            "Notifications of this pull request are muted",
        ),
        (
            "pullRequest.watch.start",
            "You will receive notifications of this pull request",
        ),
        ("post.comment.empty", "Comment should not be empty. "),
        ("site.mail.sended", "Mail has been sent."),
        (
            "site.resetPasswordEmail.invalidRequest",
            "Invalid password reset request",
        ),
        ("title.help", "Help"),
        ("title.login", "Log in"),
        ("title.logout", "Log out"),
        ("title.no.results", "No results"),
        ("title.resetPassword", "Reset password"),
        ("title.signup", "Sign up"),
        (
            "user.login.failed",
            "Failed to log in. A serve error may have occurred or the request may be invalid.",
        ),
        (
            "user.login.failed.client",
            "Failed to log in. The request is invalid.\nPlease ask site admin.",
        ),
        (
            "user.login.failed.network",
            "Failed to log in because of network trouble.\nPlease ask site admin.",
        ),
        (
            "user.login.failed.server",
            "Failed to log in because a server error has occurred.\nPlease ask site admin.",
        ),
        (
            "user.avatar.fileSizeAlert",
            "Images should be less than 1MB in size..",
        ),
        (
            "user.avatar.onlyImage",
            "Only image files are allowed to be uploaded.",
        ),
        (
            "user.avatar.uploadError",
            "Failed to upload. Please ask site admin",
        ),
        (
            "user.enroll.failed",
            "Failed to sign-up. A server error may have occurred or the request may be invalid.",
        ),
        (
            "user.enroll.failed.client",
            "Failed to sign-up. The request is invalid.\nPlease ask site admin.",
        ),
        (
            "user.enroll.failed.network",
            "Failed to sign-up because of network trouble.\nPlease ask site admin.",
        ),
        (
            "user.enroll.failed.server",
            "Failed to sign-up because a server error has occurred.\nPlease ask site admin.",
        ),
        (
            "user.login.invalid",
            "Your log in ID, E-mail or password is not valid.",
        ),
        ("user.loginId.duplicate", "This log in ID already exists."),
        (
            "user.login.required",
            "Login ID or E-mail and password is required field.",
        ),
        ("user.password", "Password"),
        ("user.email.duplicate", "Email address already exists"),
        ("user.wrongPassword.alert", "Wrong password!"),
        ("user.wrongloginId.alert", "Enter Valid ID"),
        ("userinfo.changeNotifications", "Notification settings"),
        ("userinfo.leaveProject.confirm", "Are you sure to leave {0}?"),
        (
            "validation.allowedCharsForLoginId",
            "Login ID may contain alphanumeric characters as well as dashes, underscores or dots, but cannot begin or end with underscores or dots.",
        ),
        ("validation.duplicated", "Already exists!"),
        ("validation.invalidEmail", "Enter valid email address!"),
        ("validation.passwordMismatch", "Retyped password doesn't match"),
        ("validation.required", "Required field!"),
        ("validation.reservedWord", "This is a reserved system word."),
        (
            "validation.tooShortPassword",
            "Password must be at least 4 characters in length.",
        ),
        ("watchers.more", "and {0} others"),
    ];
    let mut entries = String::new();
    for (key, value) in messages {
        entries.push_str("    ");
        entries.push_str(&js_string_literal(key));
        entries.push_str(": ");
        entries.push_str(&js_string_literal(value));
        entries.push_str(",\n");
    }
    let body = format!(
        r#"(function(global) {{
  var _messages = {{
{entries}  }};
  function format(message, args) {{
    return String(message).replace(/\{{(\d+)\}}/g, function(match, index) {{
      return Object.prototype.hasOwnProperty.call(args, index) ? args[index] : match;
    }});
  }}
  function Messages(key) {{
    var value = Object.prototype.hasOwnProperty.call(_messages, key) ? _messages[key] : key;
    return arguments.length > 1 ? format(value, Array.prototype.slice.call(arguments, 1)) : value;
  }}
  Messages._messages = _messages;
  global.Messages = Messages;
}})(this);
"#
    );
    (
        [(
            axum::http::header::CONTENT_TYPE,
            "application/javascript; charset=utf-8",
        )],
        body,
    )
        .into_response()
}

fn js_string_literal(value: &str) -> String {
    let mut escaped = String::with_capacity(value.len() + 2);
    escaped.push('"');
    for ch in value.chars() {
        match ch {
            '\\' => escaped.push_str("\\\\"),
            '"' => escaped.push_str("\\\""),
            '\n' => escaped.push_str("\\n"),
            '\r' => escaped.push_str("\\r"),
            '\t' => escaped.push_str("\\t"),
            '\u{08}' => escaped.push_str("\\b"),
            '\u{0c}' => escaped.push_str("\\f"),
            c if c.is_control() => {
                escaped.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => escaped.push(c),
        }
    }
    escaped.push('"');
    escaped
}
