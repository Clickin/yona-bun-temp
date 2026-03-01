import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
	project: {
		n4usersViaAssignee: r.many.n4user({
			from: r.project.id.through(r.assignee.projectId),
			to: r.n4user.id.through(r.assignee.userId),
			alias: "project_id_n4user_id_via_assignee"
		}),
		pullRequestsViaCommentThread: r.many.pullRequest({
			from: r.project.id.through(r.commentThread.projectId),
			to: r.pullRequest.id.through(r.commentThread.pullRequestId),
			alias: "project_id_pullRequest_id_via_commentThread"
		}),
		commitComments: r.many.commitComment(),
		n4usersViaFavoriteProject: r.many.n4user({
			from: r.project.id.through(r.favoriteProject.projectId),
			to: r.n4user.id.through(r.favoriteProject.userId),
			alias: "project_id_n4user_id_via_favoriteProject"
		}),
		issues: r.many.issue(),
		issueLabelCategoriesViaIssueLabel: r.many.issueLabelCategory({
			alias: "issueLabelCategory_id_project_id_via_issueLabel"
		}),
		issueLabelCategoriesProjectId: r.many.issueLabelCategory({
			alias: "issueLabelCategory_projectId_project_id"
		}),
		milestones: r.many.milestone(),
		postings: r.many.posting(),
		organizations: r.many.organization(),
		labels: r.many.label(),
		projectMenuSettings: r.many.projectMenuSetting(),
		projectPushedBranches: r.many.projectPushedBranch(),
		n4usersViaProjectTransfer: r.many.n4user({
			from: r.project.id.through(r.projectTransfer.projectId),
			to: r.n4user.id.through(r.projectTransfer.senderId),
			alias: "project_id_n4user_id_via_projectTransfer"
		}),
		projectUsers: r.many.projectUser(),
		recentlyVisitedProjects: r.many.recentlyVisitedProjects({
			from: r.project.id.through(r.projectVisitation.projectId),
			to: r.recentlyVisitedProjects.id.through(r.projectVisitation.recentlyVisitedProjectsId)
		}),
		pullRequestsFromProjectId: r.many.pullRequest({
			alias: "pullRequest_fromProjectId_project_id"
		}),
		pullRequestsToProjectId: r.many.pullRequest({
			alias: "pullRequest_toProjectId_project_id"
		}),
		recentProjects: r.many.recentProject(),
		titleHeads: r.many.titleHead(),
		n4usersViaUserEnrolledProject: r.many.n4user({
			alias: "n4user_id_project_id_via_userEnrolledProject"
		}),
		n4usersViaUserProjectNotification: r.many.n4user({
			from: r.project.id.through(r.userProjectNotification.projectId),
			to: r.n4user.id.through(r.userProjectNotification.userId),
			alias: "project_id_n4user_id_via_userProjectNotification"
		}),
		webhooks: r.many.webhook(),
	},
	n4user: {
		projectsViaAssignee: r.many.project({
			alias: "project_id_n4user_id_via_assignee"
		}),
		commentThreads: r.many.commentThread(),
		emails: r.many.email(),
		issuesViaFavoriteIssue: r.many.issue({
			alias: "issue_id_n4user_id_via_favoriteIssue"
		}),
		organizationsViaFavoriteOrganization: r.many.organization({
			alias: "organization_id_n4user_id_via_favoriteOrganization"
		}),
		projectsViaFavoriteProject: r.many.project({
			alias: "project_id_n4user_id_via_favoriteProject"
		}),
		issueComments: r.many.issueComment(),
		issuesViaIssueSharer: r.many.issue({
			alias: "issue_id_n4user_id_via_issueSharer"
		}),
		issuesViaIssueVoter: r.many.issue({
			alias: "issue_id_n4user_id_via_issueVoter"
		}),
		mentions: r.many.mention(),
		notificationEvents: r.many.notificationEvent({
			from: r.n4user.id.through(r.notificationEventN4user.n4userId),
			to: r.notificationEvent.id.through(r.notificationEventN4user.notificationEventId)
		}),
		organizationUsers: r.many.organizationUser(),
		projectsViaProjectTransfer: r.many.project({
			alias: "project_id_n4user_id_via_projectTransfer"
		}),
		projectUsers: r.many.projectUser(),
		pullRequestsContributorId: r.many.pullRequest({
			alias: "pullRequest_contributorId_n4user_id"
		}),
		pullRequestsReceiverId: r.many.pullRequest({
			alias: "pullRequest_receiverId_n4user_id"
		}),
		pullRequestsViaPullRequestReviewers: r.many.pullRequest({
			from: r.n4user.id.through(r.pullRequestReviewers.userId),
			to: r.pullRequest.id.through(r.pullRequestReviewers.pullRequestId),
			alias: "n4user_id_pullRequest_id_via_pullRequestReviewers"
		}),
		recentlyVisitedProjects: r.many.recentlyVisitedProjects(),
		issuesViaRecentIssue: r.many.issue({
			alias: "issue_id_n4user_id_via_recentIssue"
		}),
		siteAdmins: r.many.siteAdmin(),
		unwatches: r.many.unwatch(),
		userCredentials: r.many.userCredential(),
		organizationsViaUserEnrolledOrganization: r.many.organization({
			from: r.n4user.id.through(r.userEnrolledOrganization.userId),
			to: r.organization.id.through(r.userEnrolledOrganization.organizationId),
			alias: "n4user_id_organization_id_via_userEnrolledOrganization"
		}),
		projectsViaUserEnrolledProject: r.many.project({
			from: r.n4user.id.through(r.userEnrolledProject.userId),
			to: r.project.id.through(r.userEnrolledProject.projectId),
			alias: "n4user_id_project_id_via_userEnrolledProject"
		}),
		projectsViaUserProjectNotification: r.many.project({
			alias: "project_id_n4user_id_via_userProjectNotification"
		}),
		userSettings: r.many.userSetting(),
		userVerifications: r.many.userVerification(),
		watches: r.many.watch(),
	},
	pullRequest: {
		projects: r.many.project({
			alias: "project_id_pullRequest_id_via_commentThread"
		}),
		n4userContributorId: r.one.n4user({
			from: r.pullRequest.contributorId,
			to: r.n4user.id,
			alias: "pullRequest_contributorId_n4user_id"
		}),
		projectFromProjectId: r.one.project({
			from: r.pullRequest.fromProjectId,
			to: r.project.id,
			alias: "pullRequest_fromProjectId_project_id"
		}),
		n4userReceiverId: r.one.n4user({
			from: r.pullRequest.receiverId,
			to: r.n4user.id,
			alias: "pullRequest_receiverId_n4user_id"
		}),
		projectToProjectId: r.one.project({
			from: r.pullRequest.toProjectId,
			to: r.project.id,
			alias: "pullRequest_toProjectId_project_id"
		}),
		pullRequestCommits: r.many.pullRequestCommit(),
		pullRequestEvents: r.many.pullRequestEvent(),
		n4users: r.many.n4user({
			alias: "n4user_id_pullRequest_id_via_pullRequestReviewers"
		}),
	},
	commentThread: {
		n4users: r.many.n4user({
			from: r.commentThread.id.through(r.commentThreadN4user.commentThreadId),
			to: r.n4user.id.through(r.commentThreadN4user.n4userId)
		}),
		reviewComments: r.many.reviewComment(),
	},
	commitComment: {
		project: r.one.project({
			from: r.commitComment.projectId,
			to: r.project.id
		}),
	},
	email: {
		n4user: r.one.n4user({
			from: r.email.userId,
			to: r.n4user.id
		}),
	},
	issue: {
		n4usersViaFavoriteIssue: r.many.n4user({
			from: r.issue.id.through(r.favoriteIssue.issueId),
			to: r.n4user.id.through(r.favoriteIssue.userId),
			alias: "issue_id_n4user_id_via_favoriteIssue"
		}),
		assignee: r.one.assignee({
			from: r.issue.assigneeId,
			to: r.assignee.id
		}),
		milestone: r.one.milestone({
			from: r.issue.milestoneId,
			to: r.milestone.id
		}),
		issue: r.one.issue({
			from: r.issue.parentId,
			to: r.issue.id,
			alias: "issue_parentId_issue_id"
		}),
		issues: r.many.issue({
			alias: "issue_parentId_issue_id"
		}),
		project: r.one.project({
			from: r.issue.projectId,
			to: r.project.id
		}),
		issueComments: r.many.issueComment({
			from: r.issue.id.through(r.issueComment.issueId),
			to: r.issueComment.id.through(r.issueComment.parentCommentId)
		}),
		issueEvents: r.many.issueEvent(),
		issueLabels: r.many.issueLabel({
			from: r.issue.id.through(r.issueIssueLabel.issueId),
			to: r.issueLabel.id.through(r.issueIssueLabel.issueLabelId)
		}),
		n4usersViaIssueSharer: r.many.n4user({
			from: r.issue.id.through(r.issueSharer.issueId),
			to: r.n4user.id.through(r.issueSharer.userId),
			alias: "issue_id_n4user_id_via_issueSharer"
		}),
		n4usersViaIssueVoter: r.many.n4user({
			from: r.issue.id.through(r.issueVoter.issueId),
			to: r.n4user.id.through(r.issueVoter.userId),
			alias: "issue_id_n4user_id_via_issueVoter"
		}),
		n4usersViaRecentIssue: r.many.n4user({
			from: r.issue.id.through(r.recentIssue.issueId),
			to: r.n4user.id.through(r.recentIssue.userId),
			alias: "issue_id_n4user_id_via_recentIssue"
		}),
	},
	organization: {
		n4usersViaFavoriteOrganization: r.many.n4user({
			from: r.organization.id.through(r.favoriteOrganization.organizationId),
			to: r.n4user.id.through(r.favoriteOrganization.userId),
			alias: "organization_id_n4user_id_via_favoriteOrganization"
		}),
		organizationUsers: r.many.organizationUser(),
		projects: r.many.project({
			from: r.organization.id.through(r.project.organizationId),
			to: r.project.id.through(r.project.originalProjectId)
		}),
		n4usersViaUserEnrolledOrganization: r.many.n4user({
			alias: "n4user_id_organization_id_via_userEnrolledOrganization"
		}),
	},
	assignee: {
		issues: r.many.issue(),
	},
	milestone: {
		issues: r.many.issue(),
		project: r.one.project({
			from: r.milestone.projectId,
			to: r.project.id
		}),
	},
	issueComment: {
		issues: r.many.issue(),
		n4users: r.many.n4user({
			from: r.issueComment.id.through(r.issueCommentVoter.issueCommentId),
			to: r.n4user.id.through(r.issueCommentVoter.userId)
		}),
	},
	issueEvent: {
		issue: r.one.issue({
			from: r.issueEvent.issueId,
			to: r.issue.id
		}),
	},
	issueLabel: {
		issues: r.many.issue(),
		postings: r.many.posting({
			from: r.issueLabel.id.through(r.postingIssueLabel.issueLabelId),
			to: r.posting.id.through(r.postingIssueLabel.postingId)
		}),
	},
	issueLabelCategory: {
		projects: r.many.project({
			from: r.issueLabelCategory.id.through(r.issueLabel.categoryId),
			to: r.project.id.through(r.issueLabel.projectId),
			alias: "issueLabelCategory_id_project_id_via_issueLabel"
		}),
		project: r.one.project({
			from: r.issueLabelCategory.projectId,
			to: r.project.id,
			alias: "issueLabelCategory_projectId_project_id"
		}),
	},
	linkedAccount: {
		userCredential: r.one.userCredential({
			from: r.linkedAccount.userCredentialId,
			to: r.userCredential.id
		}),
	},
	userCredential: {
		linkedAccounts: r.many.linkedAccount(),
		n4user: r.one.n4user({
			from: r.userCredential.userId,
			to: r.n4user.id
		}),
	},
	mention: {
		n4user: r.one.n4user({
			from: r.mention.userId,
			to: r.n4user.id
		}),
	},
	notificationEvent: {
		n4users: r.many.n4user(),
		notificationMails: r.many.notificationMail(),
	},
	notificationMail: {
		notificationEvent: r.one.notificationEvent({
			from: r.notificationMail.notificationEventId,
			to: r.notificationEvent.id
		}),
	},
	organizationUser: {
		organization: r.one.organization({
			from: r.organizationUser.organizationId,
			to: r.organization.id
		}),
		role: r.one.role({
			from: r.organizationUser.roleId,
			to: r.role.id
		}),
		n4user: r.one.n4user({
			from: r.organizationUser.userId,
			to: r.n4user.id
		}),
	},
	role: {
		organizationUsers: r.many.organizationUser(),
		projectUsers: r.many.projectUser(),
	},
	posting: {
		projects: r.many.project({
			from: r.posting.id.through(r.posting.parentId),
			to: r.project.id.through(r.posting.projectId)
		}),
		postingComments: r.many.postingComment(),
		issueLabels: r.many.issueLabel(),
	},
	postingComment: {
		postings: r.many.posting({
			from: r.postingComment.id.through(r.postingComment.parentCommentId),
			to: r.posting.id.through(r.postingComment.postingId)
		}),
	},
	label: {
		projects: r.many.project({
			from: r.label.id.through(r.projectLabel.labelId),
			to: r.project.id.through(r.projectLabel.projectId)
		}),
	},
	projectMenuSetting: {
		project: r.one.project({
			from: r.projectMenuSetting.projectId,
			to: r.project.id
		}),
	},
	projectPushedBranch: {
		project: r.one.project({
			from: r.projectPushedBranch.projectId,
			to: r.project.id
		}),
	},
	projectUser: {
		project: r.one.project({
			from: r.projectUser.projectId,
			to: r.project.id
		}),
		role: r.one.role({
			from: r.projectUser.roleId,
			to: r.role.id
		}),
		n4user: r.one.n4user({
			from: r.projectUser.userId,
			to: r.n4user.id
		}),
	},
	recentlyVisitedProjects: {
		projects: r.many.project(),
		n4user: r.one.n4user({
			from: r.recentlyVisitedProjects.userId,
			to: r.n4user.id
		}),
	},
	pullRequestCommit: {
		pullRequest: r.one.pullRequest({
			from: r.pullRequestCommit.pullRequestId,
			to: r.pullRequest.id
		}),
	},
	pullRequestEvent: {
		pullRequest: r.one.pullRequest({
			from: r.pullRequestEvent.pullRequestId,
			to: r.pullRequest.id
		}),
	},
	recentProject: {
		project: r.one.project({
			from: r.recentProject.projectId,
			to: r.project.id
		}),
	},
	reviewComment: {
		commentThread: r.one.commentThread({
			from: r.reviewComment.threadId,
			to: r.commentThread.id
		}),
	},
	siteAdmin: {
		n4user: r.one.n4user({
			from: r.siteAdmin.adminId,
			to: r.n4user.id
		}),
	},
	titleHead: {
		project: r.one.project({
			from: r.titleHead.projectId,
			to: r.project.id
		}),
	},
	unwatch: {
		n4user: r.one.n4user({
			from: r.unwatch.userId,
			to: r.n4user.id
		}),
	},
	userSetting: {
		n4user: r.one.n4user({
			from: r.userSetting.userId,
			to: r.n4user.id
		}),
	},
	userVerification: {
		n4user: r.one.n4user({
			from: r.userVerification.userId,
			to: r.n4user.id
		}),
	},
	watch: {
		n4user: r.one.n4user({
			from: r.watch.userId,
			to: r.n4user.id
		}),
	},
	webhook: {
		project: r.one.project({
			from: r.webhook.projectId,
			to: r.project.id
		}),
		webhookThreads: r.many.webhookThread(),
	},
	webhookThread: {
		webhook: r.one.webhook({
			from: r.webhookThread.webhookId,
			to: r.webhook.id
		}),
	},
}))