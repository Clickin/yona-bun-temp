import * as React from "react";

export const LEGACY_DEFAULT_LANGUAGE = "en-US";

export const LEGACY_LANGUAGE_CODES = ["en-US", "ko-KR", "ja-JP", "ru-RU", "uz-UZ"] as const;

export type LegacyLanguageCode = (typeof LEGACY_LANGUAGE_CODES)[number];

type LegacyMessageDictionary = Record<string, string>;

export interface TranslateOptions {
  args?: Array<number | string>;
  fallback?: string;
}

export interface LegacyI18nContextValue {
  language: LegacyLanguageCode;
  setLanguage: (nextLanguage: string) => void;
  supportedLanguages: LegacyLanguageCode[];
  t: (key: string, options?: TranslateOptions) => string;
}

const LEGACY_MESSAGES: Record<LegacyLanguageCode, LegacyMessageDictionary> = {
  "en-US": {
    "app.description": "Web-based platform for collaborative software development",
    "app.warn.support.social.login.only": "Only allow sign-in via social login",
    "button.close": "Close",
    "button.commentAndNextState.closed": "Comment & Close issue",
    "button.add": "Add",
    "button.cancel": "Cancel",
    "button.confirm": "Confirm",
    "button.cancel.enrollment": "Cancel sign-up request",
    "button.delete": "Delete",
    "button.edit": "Edit",
    "button.list": "List",
    "button.login": "Log in",
    "button.nextPage": "Next page",
    "button.new.enrollment": "Send sign-up request",
    "button.no": "No",
    "button.prevPage": "Previous page",
    "button.save": "Save",
    "button.selectAll": "Select all",
    "button.submitForm": "Submit form",
    "button.user.make.guest.mode": "Make Guest",
    "button.user.make.normal.mode": "Make Normal",
    "button.user.makeAccountUnlock.false": "Lock account",
    "button.user.makeAccountUnlock.true": "Unlock account",
    "button.user.revoke.site.admin.role": "Revoke site admin role",
    "button.user.upgrade.to.site.admin": "Upgrade to Site admin",
    "button.yes": "Yes",
    "common.loading": "Loading",
    "common.order.all": "All",
    "common.order.comments": "Comments",
    "common.order.completionRate": "Completion Rate",
    "common.order.date": "Created",
    "common.order.dueDate": "Due Date",
    "common.order.updatedDate": "Updated",
    "error.badrequest": "The request cannot be fulfilled due to bad syntax",
    "error.forbidden": "You are not authorized",
    "error.internalServerError": "Server error occurred; service is not available",
    "error.notfound": "Page not found",
    "issue.menu.new": "New issue",
    "issue.assignee": "Assignee",
    "issue.author": "Author",
    "issue.downloadAsExcel": "Download as Excel file",
    "issue.dueDate": "Due date",
    "issue.is.empty": "No issue found",
    "issue.list.all.closed": "Closed",
    "issue.list.all.open": "Open",
    "issue.list.assignedToMe": "Assigned",
    "issue.list.authoredByMe": "Created",
    "issue.list.commentedByMe": "Commented",
    "issue.myIssue": "My Issues",
    "issue.noAssignee": "No assignee",
    "issue.noAuthor": "No author",
    "issue.noMilestone": "No milestone",
    "issue.state.all": "All",
    "issue.state.closed": "Closed",
    "issue.state.open": "Open",
    label: "Label",
    "label.dueDate": "Due Date",
    "label.manage": "Manage label",
    "label.select": "Select label",
    "menu.admin": "Project configuration",
    "menu.board": "Board",
    "menu.code": "Code",
    "menu.home": "Home",
    "menu.issue": "Issue",
    "menu.pullRequest": "Pull request",
    "menu.review": "Review",
    milestone: "Milestone",
    "milestone.close": "Close milestone",
    "milestone.delete": "Delete milestone",
    "milestone.form.dueDate": "Choose due date",
    "milestone.form.state": "Milestone status",
    "milestone.is.empty": "No milestone entered.",
    "milestone.menu.new": "New milestone",
    "milestone.open": "Open",
    "milestone.searchPlaceholder": "search at current milestone",
    "milestone.state.all": "All",
    "milestone.state.closed": "Closed",
    "milestone.state.open": "Open",
    "organization.delete": "Group Delete",
    "organization.member": "Group member",
    "organization.member.enrollment.help.after":
      "You can be a member if the members of this group accept this request.",
    "organization.member.enrollment.help.before":
      "Admins of this group can check your enrollment request.",
    "organization.member.enrollment.title": "Member enrollment request",
    "organization.settingFrom": "Setting",
    "organization.you.may.want.to.be.a.member": "You may want to be a member of {0} group.",
    "organization.you.want.to.be.a.member": "You want to be a member of {0} group.",
    "post.write": "New post",
    "post.is.empty": "No post has been added.",
    "project.projects": "projects",
    "project.created": "Created date",
    "project.description": "Description",
    "project.name": "Project name",
    "project.searchPlaceholder": "Search current project",
    "project.setting": "Settings",
    "search.menu.board.comments": "Post Comments",
    "search.menu.boards": "Posts",
    "search.menu.issue.comments": "Issue Comments",
    "search.menu.issues": "Issues",
    "search.menu.milestones": "Milestones",
    "search.menu.projects": "Projects",
    "search.menu.reviews": "Code Reviews",
    "search.menu.users": " Users",
    "search.result.title": "Found <strong>{0}</strong> result(s) in {1}",
    "search.title": "Search",
    "pullRequest.is.empty": "No pull requests have been received",
    "pullRequest.new": "pull request",
    "pullRequest.sender": "Sender",
    "pullRequest.sent": "Sent code",
    "pullRequest.state.closed": "Closed",
    "pullRequest.state.conflict": "Conflict",
    "pullRequest.state.merged": "Merged",
    "pullRequest.state.open": "Open",
    site: "Site",
    "site.data.export": "Export",
    "site.data.export.info": "All data read from DB will be exported to a file.",
    "site.data.import": "Import",
    "site.data.import.info": "Replace existing data with exported yobi data file.",
    "site.data.warning1":
      "Before importing or exporting data, you should block other user's access and only allow the site admin.",
    "site.data.warning2":
      "After clicking the export button please wait until the file download finishes.",
    "site.data.warning3":
      "Please backup database before import data, in some cases you can lose existing data.",
    "site.diagnostic.errorFound": "{0} errors were found",
    "site.diagnostic.errorNotFound": "No errors were found",
    "site.mail.body": "Body",
    "site.mail.fail": "Failed to send mail.",
    "site.mail.from": "From",
    "site.mail.fromPlaceholder": "sender@mail.com",
    "site.mail.notConfigured":
      "Mailer has not been configured. Set following properties in conf/application.conf.",
    "site.mail.send": "Send",
    "site.mail.sended": "Mail has been sent.",
    "site.mail.subject": "Subject",
    "site.mail.to": "To",
    "site.mail.toPlaceholder": "receipient@mail.com",
    "site.mail.write": "Write",
    "site.massMail.loading": "Loading...",
    "site.massMail.toAll": "To all",
    "site.massMail.toProjects": "To members of a specific project",
    "site.project.delete": "Delete project",
    "site.project.deleteConfirm": "Do you really want to delete this project?",
    "site.project.filter": "Search by keyword",
    "site.resetPasswordEmail.invalidRequest": "Invalid password reset request",
    "site.resetPasswordEmail.wrongUrl": "Wrong url to reset password.",
    "site.search": "Site search",
    "site.sidebar": "Site management",
    "site.sidebar.data": "Data",
    "site.sidebar.diagnostics": "Diagnostics",
    "site.sidebar.issueList": "Issues",
    "site.sidebar.mailSend": "Send email",
    "site.sidebar.massMail": "Send mass emails",
    "site.sidebar.postList": "Posts",
    "site.sidebar.projectList": "Projects",
    "site.sidebar.update": "Software Update",
    "site.sidebar.userList": "Users",
    "site.update.currentVersion": "Current version is Yona {0}",
    "site.update.download": "Download",
    "site.update.error": "Failed to check for updates because of the following error:",
    "site.update.isAvailable": "Yona {0} is available",
    "site.update.isNotNecessary": "You are using the latest version",
    "site.user.delete": "Delete user",
    "site.user.deleteConfirm": "Are you sure you want this user to leave?",
    "site.userList.deleted": "Deleted user",
    "site.userList.guest": "Guest User",
    "site.userList.locked": "Locked user",
    "site.userList.search": "Find user by login ID, user name or email",
    "site.userList.siteAdmin": "Site admin",
    "site.userList.unlocked": "Unlocked user",
    "title.boardList": "Posting List",
    "title.forgotpassword": "Password forgotten?",
    "title.issueDetail": "Issue details",
    "title.issueList": "Issue list",
    "title.keymap": "Keyboard shortcuts",
    "title.login": "Log in",
    "title.loginFor": 'Log in to <span class="highlight">{0}</span>',
    "title.organizationHome": "Group Home",
    "title.or": "or",
    "title.projectHome": "Project home",
    "title.rememberMe": "Stay logged in",
    "title.resetPassword": "Reset password",
    "title.resetPasswordFor": 'Reset password for <span class="highlight">{0}</span>',
    "title.sendMail": "Send email",
    "title.signup": "Sign up",
    "title.signupConfirmDesc": "Administrator admission is required for activation.",
    "title.signupFor": 'Sign up for <span class="highlight">{0}</span>',
    "title.massMail": "Send mass mails",
    "title.siteSetting": "Site settings",
    "user.email": "Email address",
    "user.enroll.failed":
      "Failed to sign-up. A server error may have occurred or the request may be invalid.",
    "user.enroll.failed.client":
      "Failed to sign-up. The request is invalid.\\nPlease ask site admin.",
    "user.enroll.failed.network":
      "Failed to sign-up because of network trouble.\\nPlease ask site admin.",
    "user.enroll.failed.server":
      "Failed to sign-up because a server error has occurred.\\nPlease ask site admin.",
    "user.isAlreadySignupUser": "Already signed up?",
    "user.login.failed":
      "Failed to log in. A serve error may have occurred or the request may be invalid.",
    "user.login.failed.client":
      "Failed to log in. The request is invalid.\\nPlease ask site admin.",
    "user.login.failed.network":
      "Failed to log in because of network trouble.\\nPlease ask site admin.",
    "user.login.failed.server":
      "Failed to log in because a server error has occurred.\\nPlease ask site admin.",
    "user.login.key": "Login ID or E-mail",
    "user.loginId": "Login ID",
    "user.name": "Name",
    "user.newPassword": "New password",
    "user.password": "Password",
    "user.menu": "User menu",
    "user.signupBtn": "Sign up",
    "user.signupId": "User ID (lower case)",
    "userinfo.profile": "Profile",
    "userinfo.leave": "Date of leaving",
    "userinfo.since": "Member since",
    "user.verified": "Verified User",
    "user.verified.detail": "User is verified. Try logging in.",
    "validation.retypePassword": "Password confirmation",
  },
  "ko-KR": {
    "app.description": "21세기 소프트웨어 개발 플랫폼",
    "app.warn.support.social.login.only": "소셜 로그인을 통한 로그인만 가능합니다.",
    "button.close": "닫기",
    "button.commentAndNextState.closed": "댓글 입력하고 이슈 닫기",
    "button.add": "추가",
    "button.cancel": "취소",
    "button.confirm": "확인",
    "button.cancel.enrollment": "멤버 등록 요청 취소하기",
    "button.delete": "삭제",
    "button.edit": "수정",
    "button.list": "목록",
    "button.login": "로그인",
    "button.nextPage": "다음 페이지",
    "button.new.enrollment": "멤버 등록 요청하기",
    "button.no": "아니요",
    "button.prevPage": "이전 페이지",
    "button.save": "저장",
    "button.selectAll": "전체 선택",
    "button.submitForm": "폼 전송",
    "button.user.make.guest.mode": "게스트로 전환",
    "button.user.make.normal.mode": "일반으로 전환",
    "button.user.makeAccountUnlock.false": "계정잠그기",
    "button.user.makeAccountUnlock.true": "잠김해제",
    "button.user.revoke.site.admin.role": "사이트 어드민 권한 회수",
    "button.user.upgrade.to.site.admin": "사이트 어드민으로 지정",
    "button.yes": "예",
    "common.loading": "불러오는 중",
    "common.order.all": "전체",
    "common.order.comments": "댓글많은순",
    "common.order.completionRate": "완료율순",
    "common.order.date": "날짜순",
    "common.order.dueDate": "기한순",
    "common.order.updatedDate": "변경순",
    "error.badrequest": "잘못된 요청입니다",
    "error.forbidden": "권한이 없습니다",
    "error.internalServerError": "서버 오류가 발생하여 서비스를 이용할 수 없습니다",
    "error.notfound": "페이지를 찾을 수 없습니다",
    "issue.menu.new": "새 이슈",
    "issue.assignee": "담당자",
    "issue.author": "등록자",
    "issue.downloadAsExcel": "엑셀파일로 다운받기",
    "issue.dueDate": "목표 완료일",
    "issue.is.empty": "등록된 이슈가 없습니다.",
    "issue.list.all.closed": "닫힌 이슈",
    "issue.list.all.open": "열린 이슈",
    "issue.list.assignedToMe": "할당된 이슈",
    "issue.list.authoredByMe": "작성한 이슈",
    "issue.list.commentedByMe": "댓글 남긴 이슈",
    "issue.myIssue": "내 이슈",
    "issue.noAssignee": "담당자 없음",
    "issue.noAuthor": "작성자 없음",
    "issue.noMilestone": "마일스톤 없음",
    "issue.state.all": "전체",
    "issue.state.closed": "닫힘",
    "issue.state.open": "열림",
    label: "라벨",
    "label.dueDate": "기한",
    "label.manage": "라벨 관리",
    "label.select": "라벨 선택",
    "menu.admin": "프로젝트 설정",
    "menu.board": "게시판",
    "menu.code": "코드",
    "menu.home": "홈",
    "menu.issue": "이슈",
    "menu.pullRequest": "코드 주고받기",
    "menu.review": "리뷰",
    milestone: "마일스톤",
    "milestone.close": "마일스톤 종료",
    "milestone.delete": "마일스톤 삭제",
    "milestone.form.dueDate": "기한을 선택하세요",
    "milestone.form.state": "마일스톤 상태",
    "milestone.is.empty": "등록된 마일스톤이 없습니다",
    "milestone.menu.new": "새 마일스톤",
    "milestone.open": "진행중으로 변경",
    "milestone.searchPlaceholder": "현재 마일스톤에서 검색",
    "milestone.state.all": "전체",
    "milestone.state.closed": "종료",
    "milestone.state.open": "진행중",
    "organization.delete": "그룹 삭제",
    "organization.member": "그룹 멤버",
    "organization.member.enrollment.help.after": "그룹 관리자가 승인하면 그룹 멤버로 등록됩니다.",
    "organization.member.enrollment.help.before":
      "그룹에 멤버 등록 요청을 보내면 그룹 관리자가 확인 할 수 있습니다.",
    "organization.member.enrollment.title": "멤버등록요청",
    "organization.settingFrom": "설정",
    "organization.you.may.want.to.be.a.member": "{0} 그룹 멤버로 등록 요청을 할 수 있습니다.",
    "organization.you.want.to.be.a.member": "{0} 그룹 멤버로 등록 요청했습니다.",
    "post.write": "새 글쓰기",
    "post.is.empty": "등록된 게시물이 없습니다.",
    "project.projects": "프로젝트",
    "project.created": "생성일",
    "project.description": "설명",
    "project.name": "프로젝트 이름",
    "project.searchPlaceholder": "현재 프로젝트에서 검색",
    "project.setting": "설정",
    "search.menu.board.comments": "게시판 댓글",
    "search.menu.boards": "게시판",
    "search.menu.issue.comments": "이슈 댓글",
    "search.menu.issues": "이슈",
    "search.menu.milestones": "마일스톤",
    "search.menu.projects": "프로젝트",
    "search.menu.reviews": "코드 리뷰",
    "search.menu.users": " 사용자",
    "search.result.title": "{1}에서 <strong>{0}</strong> 건이 검색 되었습니다",
    "search.title": "검색",
    "pullRequest.is.empty": "등록된 코드 주고 받기가 없습니다.",
    "pullRequest.new": "새 코드 보내기",
    "pullRequest.sender": "보낸 사람",
    "pullRequest.sent": "보낸 코드",
    "pullRequest.state.closed": "닫힘",
    "pullRequest.state.conflict": "충돌",
    "pullRequest.state.merged": "병합",
    "pullRequest.state.open": "열림",
    site: "사이트",
    "site.data.export": "Export",
    "site.data.export.info": "DB에 들어있는 모든 데이터를 파일로 내려받습니다.",
    "site.data.import": "Import",
    "site.data.import.info": "내려받은 요비 데이터 파일로 기존 데이터를 교체합니다.",
    "site.data.warning1":
      "이 기능을 사용할 때는 반드시 다른 사용자의 접근을 막은 상태에서 오직 사이트 관리자만 접근하여 작업할 것을 권장합니다.",
    "site.data.warning2":
      "데이터 Export 버튼을 클릭한 이후 파일 다운로드가 완전히 끝날 때까지 잠시 기다려 주시기 바랍니다.",
    "site.data.warning3":
      "데이터 Import 기능을 사용할 경우 기존 데이터를 모두 손실할 수 있으니 Import 하기 전에 반드시 데이터베이스를 백업해 둘 것을 권장합니다.",
    "site.diagnostic.errorFound": "{0}개의 문제점이 발견되었습니다.",
    "site.diagnostic.errorNotFound": "아무런 문제가 발견되지 않았습니다.",
    "site.mail.body": "본문",
    "site.mail.fail": "메일 발송에 실패했습니다.",
    "site.mail.from": "보내는 메일 주소",
    "site.mail.fromPlaceholder": "sender@mail.com",
    "site.mail.notConfigured":
      "메일러가 설정되지 않았습니다. conf/application.conf에서 다음의 속성을 설정해주세요.",
    "site.mail.send": "발송",
    "site.mail.sended": "메일을 발송하였습니다.",
    "site.mail.subject": "제목",
    "site.mail.to": "받는 사람",
    "site.mail.toPlaceholder": "recipient@mail.com",
    "site.mail.write": "메일 쓰기",
    "site.massMail.loading": "불러오는중...",
    "site.massMail.toAll": "모두에게",
    "site.massMail.toProjects": "특정 프로젝트의 멤버들에게",
    "site.project.delete": "프로젝트 삭제",
    "site.project.deleteConfirm": "정말로 해당 프로젝트를 사이트에서 삭제하겠습니까?",
    "site.project.filter": "키워드로 프로젝트 찾기",
    "site.resetPasswordEmail.invalidRequest": "잘못된 비밀번호 재 설정 요청입니다.",
    "site.resetPasswordEmail.wrongUrl": "비밀번호 재설정 URL이 잘못되었습니다.",
    "site.search": "사이트 검색",
    "site.sidebar": "사이트 관리",
    "site.sidebar.data": "데이터",
    "site.sidebar.diagnostics": "시스템 진단",
    "site.sidebar.issueList": "이슈",
    "site.sidebar.mailSend": "메일 발송",
    "site.sidebar.massMail": "대량 메일 발송",
    "site.sidebar.postList": "게시물",
    "site.sidebar.projectList": "프로젝트",
    "site.sidebar.update": "업데이트",
    "site.sidebar.userList": "사용자",
    "site.update.currentVersion": "현재 버전은 {0} 입니다",
    "site.update.download": "다운로드",
    "site.update.error": "다음과 같이 에러가 발생하여 업데이트 할 버전을 확인하지 못했습니다.",
    "site.update.isAvailable": "Yona {0} 버전으로 업데이트 할 수 있습니다",
    "site.update.isNotNecessary": "현재 최신 버전을 사용중입니다",
    "site.user.delete": "사용자 삭제",
    "site.user.deleteConfirm": "정말로 해당 사용자를 사이트에서 탈퇴시키겠습니까?",
    "site.userList.deleted": "삭제된 사용자",
    "site.userList.guest": "게스트 사용자",
    "site.userList.locked": "계정이 잠긴 사용자",
    "site.userList.search": "찾으려는 사용자의 ID, 이름 또는 이메일을 입력하세요",
    "site.userList.siteAdmin": "사이트 어드민",
    "site.userList.unlocked": "활성화된 사용자",
    "title.boardList": "게시글 목록",
    "title.forgotpassword": "비밀번호를 잊어버리셨나요?",
    "title.issueDetail": "이슈 상세보기",
    "title.issueList": "이슈 목록",
    "title.keymap": "단축키 안내",
    "title.login": "로그인",
    "title.loginFor": '<span class="highlight">{0}</span> 로그인',
    "title.organizationHome": "홈",
    "title.or": "or",
    "title.projectHome": "홈",
    "title.rememberMe": "로그인 유지하기",
    "title.resetPassword": "비밀번호 재설정",
    "title.resetPasswordFor": '<span class="highlight">{0}</span> 비밀번호 재설정',
    "title.sendMail": "메일 발송",
    "title.signup": "멤버 가입",
    "title.signupConfirmDesc": "가입 후 사용을 위해서는 관리자의 승인이 필요합니다",
    "title.signupFor": '<span class="highlight">{0}</span> 멤버 가입',
    "title.massMail": "대량 메일 발송",
    "title.siteSetting": "사이트 설정",
    "user.email": "이메일",
    "user.enroll.failed":
      "멤버 등록 요청에 실패하였습니다. 서버에 문제가 있거나 올바른 요청이 아닐 수 있습니다.",
    "user.enroll.failed.client":
      "멤버 등록 요청에 실패하였습니다. 올바른 요청이 아닙니다.\\n관리자에게 문의해주세요.",
    "user.enroll.failed.network":
      "네트워크 문제로 인해 멤버 등록 요청에 실패하였습니다.\\n관리자에게 문의해주세요.",
    "user.enroll.failed.server":
      "서버의 문제로 인해 멤버 등록 요청에 실패하였습니다.\\n관리자에게 문의해주세요.",
    "user.isAlreadySignupUser": "이미 가입하셨나요?",
    "user.login.failed":
      "로그인에 실패하였습니다. 서버에 문제가 있거나 올바른 요청이 아닐 수 있습니다.",
    "user.login.failed.client":
      "로그인에 실패하였습니다. 올바른 요청이 아닙니다.\\n관리자에게 문의해주세요.",
    "user.login.failed.network":
      "네트워크 문제로 인해 로그인에 실패하였습니다.\\n관리자에게 문의해주세요.",
    "user.login.failed.server":
      "서버의 문제로 인해 로그인에 실패하였습니다.\\n관리자에게 문의해주세요.",
    "user.login.key": "아이디 또는 이메일",
    "user.loginId": "아이디",
    "user.name": "이름",
    "user.newPassword": "신규 비밀번호",
    "user.password": "비밀번호",
    "user.menu": "사용자 메뉴",
    "user.signupBtn": "참여하기",
    "user.signupId": "아이디",
    "userinfo.profile": "프로필 페이지",
    "userinfo.leave": "탈퇴일",
    "userinfo.since": "가입일",
    "user.verified": "확인된 사용자",
    "user.verified.detail": "사용자 정보가 확인되었습니다. 다시 로그인 해주세요",
    "validation.retypePassword": "비밀번호를 한 번 더 입력해 주세요.",
  },
  "ja-JP": {
    "app.description": "ウェブ基盤のソフト開発プラットフォーム",
    "button.confirm": "確認",
    "button.cancel.enrollment": "メンバー申請取り消す",
    "button.edit": "修正",
    "button.list": "目録",
    "button.login": "ログイン",
    "button.nextPage": "次のページ",
    "button.new.enrollment": "メンバー追加申請",
    "button.prevPage": "以前ページ",
    "button.selectAll": "全部選択",
    "button.submitForm": "フォーム送信",
    "common.loading": "読み込み中",
    "error.badrequest": "間違った要請です",
    "error.forbidden": "権限がありません",
    "error.internalServerError": "サーバエラーでサービスを利用できません",
    "error.notfound": "存在しないページです",
    "issue.menu.new": "イシュー投稿",
    "issue.noAuthor": "登録者 無し",
    "label.dueDate": "完了予定",
    "menu.admin": "設定",
    "menu.board": "掲示板",
    "menu.code": "コード",
    "menu.home": "ホーム",
    "menu.issue": "イシュー",
    "menu.pullRequest": "プルリクエスト",
    "menu.review": "review",
    milestone: "マイルストーン",
    "post.write": "スレッド投稿",
    "project.projects": "プロジェクト",
    "project.setting": "設定",
    site: "サイト",
    "site.mail.fail": "メール送信に失敗しました",
    "site.mail.sended": "メールを送信しました",
    "site.resetPasswordEmail.invalidRequest": "間違ったパスワード再設定要請です。",
    "site.search": "サイト検索",
    "title.boardList": "掲示板",
    "title.forgotpassword": "パスワードをお忘れました？",
    "title.issueDetail": "イシュー",
    "title.issueList": "イシュー目録",
    "title.keymap": "ホットキー",
    "title.login": "ログイン",
    "title.loginFor": '<span class="highlight">{0}</span> ログイン',
    "title.projectHome": "ホーム",
    "title.rememberMe": "ログインしたままにする",
    "title.resetPassword": "パスワード再設定",
    "title.resetPasswordFor": '<span class="highlight">{0}</span> パスワード再設定',
    "title.signup": "新規取得",
    "title.signupFor": '<span class="highlight">{0}</span> 新規取得',
    "user.email": "メール",
    "user.isAlreadySignupUser": "アカウントを持っている",
    "user.login.failed": "IDまたはパスワードが間違っています",
    "user.loginId": "ID",
    "user.name": "名前",
    "user.password": "パスワード",
    "user.signupBtn": "新規取得",
    "user.signupId": "ID",
    "userinfo.profile": "プロフィル",
    "validation.retypePassword": "パスワードをもう一回入力してください",
  },
  "ru-RU": {
    "app.description": "Веб-платформа для совместной разработки программного обеспечения",
    "app.warn.support.social.login.only": "Разрешить только вход через социальный логин",
    "button.close": "Закрыть",
    "button.commentAndNextState.closed": "Комментарий & Close вопрос",
    "button.confirm": "подтвердить",
    "button.cancel.enrollment": "Отменить запрос знаковый вверх",
    "button.edit": "редактировать",
    "button.list": "Список",
    "button.login": "Авторизоваться",
    "button.nextPage": "Следущая страница",
    "button.new.enrollment": "Отправить запрос знаковый вверх",
    "button.prevPage": "Предыдущая страница",
    "button.selectAll": "Выбрать все",
    "button.submitForm": "Отправить форму",
    "common.loading": "загрузка",
    "error.badrequest": "Запрос не может быть выполнен из-за плохой синтаксис",
    "error.forbidden": "Вы не авторизованы",
    "error.internalServerError": "Произошла ошибка сервера; Услуга не предоставляется",
    "error.notfound": "Страница не найдена",
    "issue.menu.new": "Новый выпуск",
    "issue.myIssue": "Мои вопросы",
    "issue.noAuthor": "Нет автора",
    "label.dueDate": "Срок",
    "menu.admin": "конфигурация проекта",
    "menu.board": "доска",
    "menu.code": "Код",
    "menu.home": "Главная",
    "menu.issue": "вопрос",
    "menu.pullRequest": "запрос Прицепные",
    "menu.review": "Обзор",
    milestone: "веха",
    "organization.delete": "Группа Удалить",
    "organization.member": "член группы",
    "organization.member.enrollment.help.after":
      "Вы можете быть членом, если члены этой группы принимают этот запрос.",
    "organization.member.enrollment.help.before":
      "Администраторы этой группы могут проверить ваш запрос регистрации.",
    "organization.member.enrollment.title": "Запрос на регистрацию Участника",
    "organization.settingFrom": "настройка",
    "organization.you.may.want.to.be.a.member": "Вы можете быть членом {0} группы.",
    "organization.you.want.to.be.a.member": "Вы хотите быть членом {0} группы.",
    "post.write": "Новый пост",
    "project.projects": "проектов",
    "project.setting": "настройки",
    "search.menu.board.comments": "Комментарии к сообщению",
    "search.menu.boards": "Сообщений",
    "search.menu.issue.comments": "выпуск Комментарии",
    "search.menu.issues": "вопросы",
    "search.menu.milestones": "Основные этапы",
    "search.menu.projects": "проектов",
    "search.menu.reviews": "Код Отзывы",
    "search.menu.users": "пользователей",
    "search.result.title": "Найдено <strong>{0}</strong> результат (ы) в {1}",
    "search.title": "",
    site: "сайт",
    "site.mail.fail": "Не удалось отправить почту.",
    "site.mail.sended": "Письмо было отправлено.",
    "site.resetPasswordEmail.invalidRequest": "Запрос сброса Неверный пароль",
    "site.resetPasswordEmail.wrongUrl": "Неправильный URL для сброса пароля.",
    "site.search": "поиск по сайту",
    "title.boardList": "Список проводок",
    "title.issueDetail": "подробнее Issue",
    "title.issueList": "список Issue",
    "title.keymap": "Горячие клавиши",
    "title.login": "Авторизоваться",
    "title.organizationHome": "Группа Home",
    "title.projectHome": "Проект дома",
    "title.rememberMe": "Оставаться в системе",
    "title.resetPassword": "Сброс пароля",
    "title.signup": "зарегистрироваться",
    "user.email": "Адрес электронной почты",
    "user.enroll.failed":
      "Не удалось регистрации. Ошибка сервера может иметь место или запрос может быть недействительным.",
    "user.enroll.failed.client":
      "Не удалось регистрации. Запрос недействителен. \\N Пожалуйста задать администратору сайта.",
    "user.enroll.failed.network":
      "Не удалось зарегистрироваться, потому что проблемы сети. \\N Пожалуйста задать администратору сайта.",
    "user.enroll.failed.server":
      "Не удались Регистрации потому произошла ошибка сервера. \\N Пожалуйста задать администратор сайта.",
    "user.isAlreadySignupUser": "Уже зарегистрировались?",
    "user.login.failed":
      "Не удалось войти в систему. Ошибка сервера может иметь место или запрос может быть недействительным.",
    "user.login.failed.client":
      "Не удалось войти в систему. Запрос недействителен. \\N Пожалуйста задать администратору сайта.",
    "user.login.failed.network":
      "Не удалось войти из-за проблемы сети. \\N Пожалуйста задать администратору сайта.",
    "user.login.failed.server":
      "Не удалось войти в систему, потому что произошла ошибка сервера. \\N Пожалуйста задать администратору сайта.",
    "user.login.key": "Логин ID или адрес электронной почты",
    "user.loginId": "Логин ID",
    "user.name": "имя",
    "user.password": "пароль",
    "user.signupBtn": "зарегистрироваться",
    "user.signupId": "Идентификатор пользователя (в нижнем регистре)",
    "userinfo.profile": "Мой профайл",
    "user.verified": "Проверенный Пользователь",
    "user.verified.detail": "Пользователь проверяется. Попробуйте логин.",
    "validation.retypePassword": "Подтверждение пароля",
  },
  "uz-UZ": {
    "app.description": "Hamkorlik bilan dastur yaratish uchun Webga asoslangan platforma",
    "app.warn.support.social.login.only": "Faqat ijtimoiy tarmoqlar orqali kirish mumkin",
    "button.close": "Yopish",
    "button.commentAndNextState.closed": "Sharhni yozib itshuni yopish",
    "button.confirm": "Tasdiqlash",
    "button.cancel.enrollment": "Ro‘yxatdan o‘tkazishni so`rovini bekor qilish",
    "button.edit": "O`zgartirish",
    "button.list": "Ro`yxat",
    "button.login": "Kirish",
    "button.nextPage": "Keyingi sahifa",
    "button.new.enrollment": "Ro‘yxatdan o‘tish bo`yicha ma`lumot jo`natish",
    "button.prevPage": "Oldingi sahifa",
    "button.selectAll": "Hammasini tanlash",
    "button.submitForm": "Formani yuborish",
    "common.loading": "Yuklanmoqda",
    "error.badrequest": "So`rov yomon sintaksisi tufayli bajo bo`lmaydi",
    "error.forbidden": "Siz vakolatli emas",
    "error.internalServerError": "Server xato ro`y berdi; xizmati bo`lmaydi",
    "error.notfound": "Sahifa topilmadi",
    "issue.menu.new": "Yangi itshu",
    "issue.myIssue": "Mening itshuimlar",
    "issue.noAuthor": "Muallifi yo`q",
    "label.dueDate": "Maqsad muddati",
    "menu.admin": "Loyiha sozlamalari",
    "menu.board": "Taxta",
    "menu.code": "Kod",
    "menu.home": "Bosh sahifa",
    "menu.issue": "Itshu",
    "menu.pullRequest": "Pul-so`rovi",
    "menu.review": "Ko`rik",
    milestone: "Maqsadi belgisi",
    "organization.delete": "Guruhni o`chirish",
    "organization.member": "Guruh a`zosi",
    "organization.member.enrollment.help.after":
      "Guruhning admindan ruxsat olsangiz guruhning a`zosi bo`lishi mumkin.",
    "organization.member.enrollment.help.before":
      "Guruhning a`zo bo`lish talabni jo`natsangiz guruhning admin uni tekshirish mumkin.",
    "organization.member.enrollment.title": "A`zo bo`lish so`ruv",
    "organization.settingFrom": "Sozlash",
    "organization.you.may.want.to.be.a.member": "Siz {0} guruhining a`zosi bo`lishi mumkin.",
    "organization.you.want.to.be.a.member": "{0} guruhi a`zosi bo`lish so`rovni jo`natgan.",
    "post.write": "Yangi yozuv",
    "project.projects": "Loyihalar",
    "project.setting": "Sozlamalar",
    "search.menu.board.comments": "Yozuvlarning sharh",
    "search.menu.boards": "Yozuvlar taxta",
    "search.menu.issue.comments": "Itshuning sharh",
    "search.menu.issues": "Itshu",
    "search.menu.milestones": "Maqsadning belgisi",
    "search.menu.projects": "Loyihalar",
    "search.menu.reviews": "Kodi ko`rik",
    "search.menu.users": "Foydalanuvchilar",
    "search.result.title": "{1}dan <strong>{0}</ strong>ta topgan",
    "search.title": "Qidirish",
    site: "Sayt",
    "site.mail.fail": "Elektron pochta yuborish bo`lmadi.",
    "site.mail.sended": "Elektron pochta yuborildi.",
    "site.resetPasswordEmail.invalidRequest": "Noto`g`ri parolni qayta tiklash uchun talabdir.",
    "site.resetPasswordEmail.wrongUrl": "Noto`g`ri parolni qayta tiklash uchun URL to`g`ri emas.",
    "site.search": "Sayt qidrash",
    "title.boardList": "Yozuvlar ro`yxati",
    "title.issueDetail": "Itshu tafsilotlari",
    "title.issueList": "Itshu ro`yxati",
    "title.keymap": "Klaviatura orqali terish",
    "title.login": "Kirish",
    "title.organizationHome": "Guruh bosh sahifa",
    "title.projectHome": "Loyiha bosh sahifa",
    "title.rememberMe": "Kirgan holatda qolish",
    "title.resetPassword": "Parolni qayta tiklash",
    "title.signup": "Ro`yxatdan o`tish",
    "user.email": "Elektron pochta manzili",
    "user.enroll.failed":
      "Kirish bo`lmadi. Serverda muammo borish mumkin, yoki talab noto`g`ri bo`lishi mumkin.",
    "user.enroll.failed.client": "Kirish bo`lmadi. So`rov noto`g`ri.\\n Sayt adminga so`rang.",
    "user.enroll.failed.network":
      "Kirish bo`lmadi. tarmoqda muammo borish mumkin.\\n Sayt adminga so`rang.",
    "user.enroll.failed.server":
      "Kirish bo`lmadi. Serverda muammo borish mumkin.\\n Sayt adminga so`rang.",
    "user.isAlreadySignupUser": "Allaqachon ro`yxatga o`tgansiz?",
    "user.login.failed":
      "Kirish bo`lmadi. Serverda muammo ro`y berdi, yoki talabda muammo bo`lishi mumkin.",
    "user.login.failed.client":
      "Kirish bo`lmadi. Talabda muammo bo`lishi mumkin.\\n Sayt adminga so`rang.",
    "user.login.failed.network":
      "Kirish bo`lmadi. Tarmoqda muammo bo`lishi mumkin.\\n Sayt adminga so`rang.",
    "user.login.failed.server":
      "Kirish bo`lmadi. Serverda muammo bo`lishi mumkin.\\n Sayt adminga so`rang.",
    "user.login.key": "Kirish ID yoki Elektron pochta",
    "user.loginId": "Kirsh ID",
    "user.name": "Ismi",
    "user.password": "Parol",
    "user.signupBtn": "Ro`yxatdan o`tish",
    "user.signupId": "Kirish ID (Kichik harf bilan)",
    "userinfo.profile": "Mening ma`lumotnoma",
    "user.verified": "Tasdiqlangan foydalanuvchi",
    "user.verified.detail": "Foydalanuvchi tekshirilgan. Yana kirib ko`ring.",
    "validation.retypePassword": "Parolni tasdiqlanishi",
  },
};

export function normalizeLegacyLanguageCode(input: string): LegacyLanguageCode | null {
  const trimmed = input.trim();
  if (trimmed === "") {
    return null;
  }

  const normalized = trimmed.replace(/_/g, "-").toLowerCase();
  const exactMatch = LEGACY_LANGUAGE_CODES.find((code) => code.toLowerCase() === normalized);
  if (exactMatch) {
    return exactMatch;
  }

  const languageOnlyMatch = LEGACY_LANGUAGE_CODES.find(
    (code) => code.slice(0, 2).toLowerCase() === normalized,
  );
  return languageOnlyMatch ?? null;
}

export function normalizeSupportedLanguages(input: string[] | string | null | undefined): string[] {
  const values = Array.isArray(input) ? input : (input ?? "").split(",");
  const normalized = values.flatMap((value) => {
    const language = normalizeLegacyLanguageCode(value);
    return language ? [language] : [];
  });
  const deduped = Array.from(new Set(normalized));
  return deduped.length > 0 ? deduped : [...LEGACY_LANGUAGE_CODES];
}

export function resolveInitialLanguage(
  supportedLanguages: readonly string[] | null | undefined,
  preferredLanguages: readonly string[] | null | undefined = readBrowserPreferredLanguages(),
): LegacyLanguageCode {
  const supported = normalizeSupportedLanguages([...(supportedLanguages ?? [])]);
  const supportedSet = new Set(supported);
  for (const preferredLanguage of preferredLanguages ?? []) {
    const normalized = normalizeLegacyLanguageCode(preferredLanguage);
    if (normalized && supportedSet.has(normalized)) {
      return normalized;
    }
  }
  return (supported[0] as LegacyLanguageCode | undefined) ?? LEGACY_DEFAULT_LANGUAGE;
}

export function switchLegacyLanguage(
  currentLanguage: LegacyLanguageCode,
  nextLanguage: string,
  supportedLanguages: readonly string[] | null | undefined,
): LegacyLanguageCode {
  const supported = normalizeSupportedLanguages([...(supportedLanguages ?? [])]);
  const normalized = normalizeLegacyLanguageCode(nextLanguage);
  return normalized && supported.includes(normalized) ? normalized : currentLanguage;
}

export function lookupLegacyMessage(
  language: LegacyLanguageCode,
  key: string,
  options: TranslateOptions = {},
): string {
  const raw =
    LEGACY_MESSAGES[language][key] ??
    LEGACY_MESSAGES[LEGACY_DEFAULT_LANGUAGE][key] ??
    options.fallback ??
    key;
  return formatLegacyMessage(raw, options.args);
}

export function createLegacyI18nRuntime(
  supportedLanguages: readonly string[] | null | undefined,
  preferredLanguages: readonly string[] | null | undefined = [],
): LegacyI18nContextValue {
  const normalizedSupportedLanguages = normalizeSupportedLanguages([
    ...(supportedLanguages ?? []),
  ]) as LegacyLanguageCode[];
  let currentLanguage = resolveInitialLanguage(normalizedSupportedLanguages, preferredLanguages);
  return {
    get language() {
      return currentLanguage;
    },
    setLanguage(nextLanguage: string) {
      currentLanguage = switchLegacyLanguage(
        currentLanguage,
        nextLanguage,
        normalizedSupportedLanguages,
      );
    },
    supportedLanguages: normalizedSupportedLanguages,
    t(key, options) {
      return lookupLegacyMessage(currentLanguage, key, options);
    },
  };
}

export function formatLegacyMessage(
  template: string,
  args: readonly (number | string)[] | undefined,
): string {
  if (!args || args.length === 0) {
    return template;
  }

  return template.replace(/\{(\d+)}/g, (placeholder, index) => {
    const value = args[Number(index)];
    return value === undefined ? placeholder : String(value);
  });
}

const fallbackI18n: LegacyI18nContextValue = {
  language: LEGACY_DEFAULT_LANGUAGE,
  setLanguage: () => {},
  supportedLanguages: [...LEGACY_LANGUAGE_CODES],
  t: (key, options) => formatLegacyMessage(options?.fallback ?? key, options?.args),
};

const LegacyI18nContext = React.createContext<LegacyI18nContextValue>(fallbackI18n);

export function LegacyI18nProvider({
  children,
  supportedLanguages,
}: React.PropsWithChildren<{ supportedLanguages?: readonly string[] | null }>) {
  const normalizedSupportedLanguages = React.useMemo(
    () => normalizeSupportedLanguages([...(supportedLanguages ?? [])]) as LegacyLanguageCode[],
    [supportedLanguages],
  );
  const [language, setLanguageState] = React.useState<LegacyLanguageCode>(() =>
    resolveInitialLanguage(normalizedSupportedLanguages),
  );

  React.useEffect(() => {
    setLanguageState((current) =>
      normalizedSupportedLanguages.includes(current) ? current : normalizedSupportedLanguages[0],
    );
  }, [normalizedSupportedLanguages]);

  const setLanguage = React.useCallback(
    (nextLanguage: string) => {
      setLanguageState((current) =>
        switchLegacyLanguage(current, nextLanguage, normalizedSupportedLanguages),
      );
    },
    [normalizedSupportedLanguages],
  );

  const value = React.useMemo<LegacyI18nContextValue>(
    () => ({
      language,
      setLanguage,
      supportedLanguages: normalizedSupportedLanguages,
      t: (key, options) => lookupLegacyMessage(language, key, options),
    }),
    [language, normalizedSupportedLanguages, setLanguage],
  );

  return <LegacyI18nContext.Provider value={value}>{children}</LegacyI18nContext.Provider>;
}

export function useLegacyMessages(): LegacyI18nContextValue {
  return React.use(LegacyI18nContext);
}

function readBrowserPreferredLanguages(): string[] {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return [];
  }
  const languages = Array.isArray(navigator.languages) ? navigator.languages : [];
  return languages.length > 0 ? [...languages] : navigator.language ? [navigator.language] : [];
}

export function renderLegacyHighlightedMessage(message: string): React.ReactNode {
  const match = /^(.*)<span class="highlight">([\s\S]*)<\/span>(.*)$/.exec(message);
  if (!match) {
    return message;
  }

  return (
    <>
      {match[1]}
      <span className="highlight">{match[2]}</span>
      {match[3]}
    </>
  );
}
