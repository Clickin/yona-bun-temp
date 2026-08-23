# --- !Ups

create table assignee (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  project_id                bigint,
  constraint pk_assignee primary key (id))
;

create table attachment (
  id                        bigint auto_increment not null,
  name                      varchar(255),
  hash                      varchar(255),
  container_type            varchar(20),
  mime_type                 varchar(255),
  size                      bigint,
  container_id              varchar(255),
  created_date              datetime,
  constraint ck_attachment_container_type check (container_type in ('ISSUE_POST','ISSUE_ASSIGNEE','ISSUE_STATE','ISSUE_CATEGORY','ISSUE_MILESTONE','ISSUE_LABEL','BOARD_POST','BOARD_CATEGORY','BOARD_NOTICE','CODE','MILESTONE','WIKI_PAGE','PROJECT_SETTING','SITE_SETTING','USER','USER_AVATAR','PROJECT','ATTACHMENT','ISSUE_COMMENT','NONISSUE_COMMENT','LABEL','PROJECT_LABELS','FORK','COMMIT_COMMENT','PULL_REQUEST','COMMIT','COMMENT_THREAD','REVIEW_COMMENT','ORGANIZATION','PROJECT_TRANSFER','ISSUE_LABEL_CATEGORY','WEBHOOK','NOT_A_RESOURCE')),
  constraint pk_attachment primary key (id))
  row_format=compressed, key_block_size=8
;

create table comment_thread (
  dtype                     varchar(10) not null,
  id                        bigint auto_increment not null,
  author_id                 bigint,
  author_login_id           varchar(255),
  author_name               varchar(255),
  state                     varchar(6),
  created_date              datetime,
  pull_request_id           bigint,
  project_id                bigint,
  prev_commit_id            varchar(255),
  commit_id                 varchar(255),
  path                      varchar(255),
  start_side                varchar(1),
  start_line                integer,
  start_column              integer,
  end_side                  varchar(1),
  end_line                  integer,
  end_column                integer,
  constraint ck_comment_thread_state check (state in ('OPEN','CLOSED')),
  constraint ck_comment_thread_start_side check (start_side in ('A','B')),
  constraint ck_comment_thread_end_side check (end_side in ('A','B')),
  constraint pk_comment_thread primary key (id))
  row_format=compressed, key_block_size=8
;

create table commit_comment (
  id                        bigint auto_increment not null,
  project_id                bigint,
  path                      varchar(255),
  line                      integer,
  side                      varchar(1),
  contents                  longtext,
  created_date              datetime,
  author_id                 bigint,
  author_login_id           varchar(255),
  author_name               varchar(255),
  commit_id                 varchar(255),
  constraint ck_commit_comment_side check (side in ('A','B')),
  constraint pk_commit_comment primary key (id))
  row_format=compressed, key_block_size=8
;

create table email (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  email                     varchar(255),
  valid                     tinyint(1) default 0,
  token                     varchar(255),
  constraint pk_email primary key (id))
  row_format=compressed, key_block_size=8
;

create table issue (
  id                        bigint auto_increment not null,
  title                     varchar(255),
  body                      longtext,
  created_date              datetime,
  updated_date              datetime,
  author_id                 bigint,
  author_login_id           varchar(255),
  author_name               varchar(255),
  project_id                bigint,
  number                    bigint,
  num_of_comments           integer,
  state                     integer,
  due_date                  datetime,
  milestone_id              bigint,
  assignee_id               bigint,
  constraint ck_issue_state check (state in (0,1,2,3,4,5,6)),
  constraint uq_issue_1 unique (project_id,number),
  constraint pk_issue primary key (id))
  row_format=compressed, key_block_size=8
;

create table issue_comment (
  id                        bigint auto_increment not null,
  contents                  longtext,
  created_date              datetime,
  author_id                 bigint,
  author_login_id           varchar(255),
  author_name               varchar(255),
  issue_id                  bigint,
  constraint pk_issue_comment primary key (id))
  row_format=compressed, key_block_size=8
;

create table issue_event (
  id                        bigint auto_increment not null,
  created                   datetime,
  sender_login_id           varchar(255),
  sender_email              varchar(255),
  issue_id                  bigint,
  event_type                varchar(34),
  old_value                 longtext,
  new_value                 longtext,
  constraint ck_issue_event_event_type check (event_type in ('NEW_ISSUE','NEW_POSTING','NEW_PULL_REQUEST','ISSUE_STATE_CHANGED','ISSUE_ASSIGNEE_CHANGED','PULL_REQUEST_STATE_CHANGED','NEW_COMMENT','NEW_REVIEW_COMMENT','MEMBER_ENROLL_REQUEST','PULL_REQUEST_MERGED','ISSUE_REFERRED_FROM_COMMIT','PULL_REQUEST_COMMIT_CHANGED','NEW_COMMIT','PULL_REQUEST_REVIEW_STATE_CHANGED','ISSUE_BODY_CHANGED','ISSUE_REFERRED_FROM_PULL_REQUEST','REVIEW_THREAD_STATE_CHANGED','ORGANIZATION_MEMBER_ENROLL_REQUEST','COMMENT_UPDATED')),
  constraint pk_issue_event primary key (id))
  row_format=compressed, key_block_size=8
;

create table issue_label (
  id                        bigint auto_increment not null,
  category_id               bigint,
  color                     varchar(255),
  name                      varchar(255),
  project_id                bigint,
  constraint pk_issue_label primary key (id))
  row_format=compressed, key_block_size=8
;

create table issue_label_category (
  id                        bigint auto_increment not null,
  project_id                bigint,
  name                      varchar(255),
  is_exclusive              tinyint(1) default 0,
  constraint pk_issue_label_category primary key (id))
  row_format=compressed, key_block_size=8
;

create table label (
  id                        bigint auto_increment not null,
  category                  varchar(255),
  name                      varchar(255),
  constraint uq_label_1 unique (category,name),
  constraint pk_label primary key (id))
  row_format=compressed, key_block_size=8
;

create table mention (
  id                        bigint auto_increment not null,
  resource_type             varchar(20),
  resource_id               varchar(255),
  user_id                   bigint,
  constraint ck_mention_resource_type check (resource_type in ('ISSUE_POST','ISSUE_ASSIGNEE','ISSUE_STATE','ISSUE_CATEGORY','ISSUE_MILESTONE','ISSUE_LABEL','BOARD_POST','BOARD_CATEGORY','BOARD_NOTICE','CODE','MILESTONE','WIKI_PAGE','PROJECT_SETTING','SITE_SETTING','USER','USER_AVATAR','PROJECT','ATTACHMENT','ISSUE_COMMENT','NONISSUE_COMMENT','LABEL','PROJECT_LABELS','FORK','COMMIT_COMMENT','PULL_REQUEST','COMMIT','COMMENT_THREAD','REVIEW_COMMENT','ORGANIZATION','PROJECT_TRANSFER','ISSUE_LABEL_CATEGORY','WEBHOOK','NOT_A_RESOURCE')),
  constraint pk_mention primary key (id))
  row_format=compressed, key_block_size=8
;

create table milestone (
  id                        bigint auto_increment not null,
  title                     varchar(255),
  due_date                  datetime,
  contents                  longtext,
  state                     integer,
  project_id                bigint,
  constraint ck_milestone_state check (state in (0,1,2,3,4,5,6)),
  constraint uq_milestone_1 unique (project_id,title),
  constraint pk_milestone primary key (id))
  row_format=compressed, key_block_size=8
;

create table notification_event (
  id                        bigint auto_increment not null,
  title                     varchar(255),
  sender_id                 bigint,
  created                   datetime,
  resource_type             varchar(20),
  resource_id               varchar(255),
  event_type                varchar(34),
  old_value                 longtext,
  new_value                 longtext,
  constraint ck_notification_event_resource_type check (resource_type in ('ISSUE_POST','ISSUE_ASSIGNEE','ISSUE_STATE','ISSUE_CATEGORY','ISSUE_MILESTONE','ISSUE_LABEL','BOARD_POST','BOARD_CATEGORY','BOARD_NOTICE','CODE','MILESTONE','WIKI_PAGE','PROJECT_SETTING','SITE_SETTING','USER','USER_AVATAR','PROJECT','ATTACHMENT','ISSUE_COMMENT','NONISSUE_COMMENT','LABEL','PROJECT_LABELS','FORK','COMMIT_COMMENT','PULL_REQUEST','COMMIT','COMMENT_THREAD','REVIEW_COMMENT','ORGANIZATION','PROJECT_TRANSFER','ISSUE_LABEL_CATEGORY','WEBHOOK','NOT_A_RESOURCE')),
  constraint ck_notification_event_event_type check (event_type in ('NEW_ISSUE','NEW_POSTING','NEW_PULL_REQUEST','ISSUE_STATE_CHANGED','ISSUE_ASSIGNEE_CHANGED','PULL_REQUEST_STATE_CHANGED','NEW_COMMENT','NEW_REVIEW_COMMENT','MEMBER_ENROLL_REQUEST','PULL_REQUEST_MERGED','ISSUE_REFERRED_FROM_COMMIT','PULL_REQUEST_COMMIT_CHANGED','NEW_COMMIT','PULL_REQUEST_REVIEW_STATE_CHANGED','ISSUE_BODY_CHANGED','ISSUE_REFERRED_FROM_PULL_REQUEST','REVIEW_THREAD_STATE_CHANGED','ORGANIZATION_MEMBER_ENROLL_REQUEST','COMMENT_UPDATED')),
  constraint pk_notification_event primary key (id))
  row_format=compressed, key_block_size=8
;

create table notification_mail (
  id                        bigint auto_increment not null,
  notification_event_id     bigint,
  constraint pk_notification_mail primary key (id))
;

create table organization (
  id                        bigint auto_increment not null,
  name                      varchar(255),
  created                   datetime,
  descr                     varchar(255),
  constraint pk_organization primary key (id))
  row_format=compressed, key_block_size=8
;

create table organization_user (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  organization_id           bigint,
  role_id                   bigint,
  constraint pk_organization_user primary key (id))
  row_format=compressed, key_block_size=8
;

create table original_email (
  id                        bigint auto_increment not null,
  message_id                varchar(255),
  resource_type             varchar(20),
  resource_id               varchar(255),
  handled_date              datetime,
  constraint ck_original_email_resource_type check (resource_type in ('ISSUE_POST','ISSUE_ASSIGNEE','ISSUE_STATE','ISSUE_CATEGORY','ISSUE_MILESTONE','ISSUE_LABEL','BOARD_POST','BOARD_CATEGORY','BOARD_NOTICE','CODE','MILESTONE','WIKI_PAGE','PROJECT_SETTING','SITE_SETTING','USER','USER_AVATAR','PROJECT','ATTACHMENT','ISSUE_COMMENT','NONISSUE_COMMENT','LABEL','PROJECT_LABELS','FORK','COMMIT_COMMENT','PULL_REQUEST','COMMIT','COMMENT_THREAD','REVIEW_COMMENT','ORGANIZATION','PROJECT_TRANSFER','ISSUE_LABEL_CATEGORY','WEBHOOK','NOT_A_RESOURCE')),
  constraint uq_original_email_message_id unique (message_id),
  constraint uq_original_email_1 unique (resource_type,resource_id),
  constraint pk_original_email primary key (id))
  row_format=compressed, key_block_size=8
;

create table posting (
  id                        bigint auto_increment not null,
  title                     varchar(255),
  body                      longtext,
  created_date              datetime,
  updated_date              datetime,
  author_id                 bigint,
  author_login_id           varchar(255),
  author_name               varchar(255),
  project_id                bigint,
  number                    bigint,
  num_of_comments           integer,
  notice                    tinyint(1) default 0,
  readme                    tinyint(1) default 0,
  constraint uq_posting_1 unique (project_id,number),
  constraint pk_posting primary key (id))
  row_format=compressed, key_block_size=8
;

create table posting_comment (
  id                        bigint auto_increment not null,
  contents                  longtext,
  created_date              datetime,
  author_id                 bigint,
  author_login_id           varchar(255),
  author_name               varchar(255),
  posting_id                bigint,
  constraint pk_posting_comment primary key (id))
  row_format=compressed, key_block_size=8
;

create table project (
  id                        bigint auto_increment not null,
  name                      varchar(255),
  overview                  varchar(255),
  vcs                       varchar(255),
  siteurl                   varchar(255),
  owner                     varchar(255),
  created_date              datetime,
  last_issue_number         bigint,
  last_posting_number       bigint,
  original_project_id       bigint,
  last_pushed_date          datetime,
  default_reviewer_count    integer,
  is_using_reviewer_count   tinyint(1) default 0,
  organization_id           bigint,
  project_scope             varchar(9),
  previous_owner_login_id   varchar(255),
  previous_name             varchar(255),
  previous_name_changed_time bigint,
  constraint ck_project_project_scope check (project_scope in ('PRIVATE','PROTECTED','PUBLIC')),
  constraint pk_project primary key (id))
  row_format=compressed, key_block_size=8
;

create table project_menu_setting (
  id                        bigint auto_increment not null,
  project_id                bigint,
  code                      tinyint(1) default 0,
  issue                     tinyint(1) default 0,
  pull_request              tinyint(1) default 0,
  review                    tinyint(1) default 0,
  milestone                 tinyint(1) default 0,
  board                     tinyint(1) default 0,
  constraint pk_project_menu_setting primary key (id))
;

create table project_transfer (
  id                        bigint auto_increment not null,
  sender_id                 bigint,
  destination               varchar(255),
  project_id                bigint,
  requested                 datetime,
  confirm_key               varchar(255),
  accepted                  tinyint(1) default 0,
  new_project_name          varchar(255),
  constraint pk_project_transfer primary key (id))
  row_format=compressed, key_block_size=8
;

create table project_user (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  project_id                bigint,
  role_id                   bigint,
  constraint pk_project_user primary key (id))
;

create table project_visitation (
  id                        bigint auto_increment not null,
  project_id                bigint,
  recently_visited_projects_id bigint,
  visited                   datetime,
  constraint uq_project_visitation_1 unique (project_id,recently_visited_projects_id),
  constraint pk_project_visitation primary key (id))
;

create table property (
  id                        bigint auto_increment not null,
  name                      varchar(25),
  value                     varchar(255),
  constraint ck_property_name check (name in ('MAILBOX_LAST_SEEN_UID','MAILBOX_LAST_UID_VALIDITY')),
  constraint pk_property primary key (id))
  row_format=compressed, key_block_size=8
;

create table pull_request (
  id                        bigint auto_increment not null,
  title                     varchar(255),
  body                      longtext,
  to_project_id             bigint,
  from_project_id           bigint,
  to_branch                 varchar(255),
  from_branch               varchar(255),
  contributor_id            bigint,
  receiver_id               bigint,
  created                   datetime,
  updated                   datetime,
  received                  datetime,
  state                     integer,
  is_conflict               tinyint(1) default 0,
  is_merging                tinyint(1) default 0,
  last_commit_id            varchar(255),
  merged_commit_id_from     varchar(255),
  merged_commit_id_to       varchar(255),
  number                    bigint,
  constraint ck_pull_request_state check (state in (0,1,2,3,4,5,6)),
  constraint pk_pull_request primary key (id))
  row_format=compressed, key_block_size=8
;

create table pull_request_commit (
  id                        bigint auto_increment not null,
  pull_request_id           bigint,
  commit_id                 varchar(255),
  author_date               datetime,
  created                   datetime,
  commit_message            longtext,
  commit_short_id           varchar(255),
  author_email              varchar(255),
  state                     varchar(7),
  constraint ck_pull_request_commit_state check (state in ('PRIOR','CURRENT')),
  constraint pk_pull_request_commit primary key (id))
  row_format=compressed, key_block_size=8
;

create table pull_request_event (
  id                        bigint auto_increment not null,
  sender_login_id           varchar(255),
  pull_request_id           bigint,
  event_type                varchar(34),
  created                   datetime,
  old_value                 longtext,
  new_value                 longtext,
  constraint ck_pull_request_event_event_type check (event_type in ('NEW_ISSUE','NEW_POSTING','NEW_PULL_REQUEST','ISSUE_STATE_CHANGED','ISSUE_ASSIGNEE_CHANGED','PULL_REQUEST_STATE_CHANGED','NEW_COMMENT','NEW_REVIEW_COMMENT','MEMBER_ENROLL_REQUEST','PULL_REQUEST_MERGED','ISSUE_REFERRED_FROM_COMMIT','PULL_REQUEST_COMMIT_CHANGED','NEW_COMMIT','PULL_REQUEST_REVIEW_STATE_CHANGED','ISSUE_BODY_CHANGED','ISSUE_REFERRED_FROM_PULL_REQUEST','REVIEW_THREAD_STATE_CHANGED','ORGANIZATION_MEMBER_ENROLL_REQUEST','COMMENT_UPDATED')),
  constraint pk_pull_request_event primary key (id))
  row_format=compressed, key_block_size=8
;

create table project_pushed_branch (
  id                        bigint auto_increment not null,
  pushed_date               datetime,
  name                      varchar(255),
  project_id                bigint,
  constraint pk_project_pushed_branch primary key (id))
  row_format=compressed, key_block_size=8
;

create table recently_visited_projects (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  constraint pk_recently_visited_projects primary key (id))
;

create table review_comment (
  id                        bigint auto_increment not null,
  contents                  longtext,
  created_date              datetime,
  author_id                 bigint,
  author_login_id           varchar(255),
  author_name               varchar(255),
  thread_id                 bigint,
  constraint pk_review_comment primary key (id))
  row_format=compressed, key_block_size=8
;

create table role (
  id                        bigint auto_increment not null,
  name                      varchar(255),
  active                    tinyint(1) default 0,
  constraint pk_role primary key (id))
  row_format=compressed, key_block_size=8
;

create table site_admin (
  id                        bigint auto_increment not null,
  admin_id                  bigint,
  constraint pk_site_admin primary key (id))
;

create table unwatch (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  resource_type             varchar(20),
  resource_id               varchar(255),
  constraint ck_unwatch_resource_type check (resource_type in ('ISSUE_POST','ISSUE_ASSIGNEE','ISSUE_STATE','ISSUE_CATEGORY','ISSUE_MILESTONE','ISSUE_LABEL','BOARD_POST','BOARD_CATEGORY','BOARD_NOTICE','CODE','MILESTONE','WIKI_PAGE','PROJECT_SETTING','SITE_SETTING','USER','USER_AVATAR','PROJECT','ATTACHMENT','ISSUE_COMMENT','NONISSUE_COMMENT','LABEL','PROJECT_LABELS','FORK','COMMIT_COMMENT','PULL_REQUEST','COMMIT','COMMENT_THREAD','REVIEW_COMMENT','ORGANIZATION','PROJECT_TRANSFER','ISSUE_LABEL_CATEGORY','WEBHOOK','NOT_A_RESOURCE')),
  constraint pk_unwatch primary key (id))
  row_format=compressed, key_block_size=8
;

create table n4user (
  id                        bigint auto_increment not null,
  name                      varchar(255),
  login_id                  varchar(255),
  password                  varchar(255),
  password_salt             varchar(255),
  email                     varchar(255),
  remember_me               tinyint(1) default 0,
  state                     varchar(7),
  last_state_modified_date  datetime,
  created_date              datetime,
  lang                      varchar(255),
  constraint ck_n4user_state check (state in ('ACTIVE','LOCKED','DELETED')),
  constraint pk_n4user primary key (id))
  row_format=compressed, key_block_size=8
;

create table user_project_notification (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  project_id                bigint,
  notification_type         varchar(34),
  allowed                   tinyint(1) default 0,
  constraint ck_user_project_notification_notification_type check (notification_type in ('NEW_ISSUE','NEW_POSTING','NEW_PULL_REQUEST','ISSUE_STATE_CHANGED','ISSUE_ASSIGNEE_CHANGED','PULL_REQUEST_STATE_CHANGED','NEW_COMMENT','NEW_REVIEW_COMMENT','MEMBER_ENROLL_REQUEST','PULL_REQUEST_MERGED','ISSUE_REFERRED_FROM_COMMIT','PULL_REQUEST_COMMIT_CHANGED','NEW_COMMIT','PULL_REQUEST_REVIEW_STATE_CHANGED','ISSUE_BODY_CHANGED','ISSUE_REFERRED_FROM_PULL_REQUEST','REVIEW_THREAD_STATE_CHANGED','ORGANIZATION_MEMBER_ENROLL_REQUEST','COMMENT_UPDATED')),
  constraint uq_user_project_notification_1 unique (project_id,user_id,notification_type),
  constraint pk_user_project_notification primary key (id))
  row_format=compressed, key_block_size=8
;

create table watch (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  resource_type             varchar(20),
  resource_id               varchar(255),
  constraint ck_watch_resource_type check (resource_type in ('ISSUE_POST','ISSUE_ASSIGNEE','ISSUE_STATE','ISSUE_CATEGORY','ISSUE_MILESTONE','ISSUE_LABEL','BOARD_POST','BOARD_CATEGORY','BOARD_NOTICE','CODE','MILESTONE','WIKI_PAGE','PROJECT_SETTING','SITE_SETTING','USER','USER_AVATAR','PROJECT','ATTACHMENT','ISSUE_COMMENT','NONISSUE_COMMENT','LABEL','PROJECT_LABELS','FORK','COMMIT_COMMENT','PULL_REQUEST','COMMIT','COMMENT_THREAD','REVIEW_COMMENT','ORGANIZATION','PROJECT_TRANSFER','ISSUE_LABEL_CATEGORY','WEBHOOK','NOT_A_RESOURCE')),
  constraint pk_watch primary key (id))
  row_format=compressed, key_block_size=8
;

create table webhook (
  id                        bigint auto_increment not null,
  project_id                bigint,
  payload_url               varchar(2000),
  secret                    varchar(250),
  created_at                datetime,
  constraint pk_webhook primary key (id))
  row_format=compressed, key_block_size=8
;


create table comment_thread_n4user (
  comment_thread_id              bigint not null,
  n4user_id                      bigint not null,
  constraint pk_comment_thread_n4user primary key (comment_thread_id, n4user_id))
;

create table issue_issue_label (
  issue_id                       bigint not null,
  issue_label_id                 bigint not null,
  constraint pk_issue_issue_label primary key (issue_id, issue_label_id))
;

create table issue_voter (
  issue_id                       bigint not null,
  user_id                        bigint not null,
  constraint pk_issue_voter primary key (issue_id, user_id))
;

create table issue_comment_voter (
  issue_comment_id               bigint not null,
  user_id                        bigint not null,
  constraint pk_issue_comment_voter primary key (issue_comment_id, user_id))
;

create table notification_event_n4user (
  notification_event_id          bigint not null,
  n4user_id                      bigint not null,
  constraint pk_notification_event_n4user primary key (notification_event_id, n4user_id))
;

create table posting_issue_label (
  posting_id                     bigint not null,
  issue_label_id                 bigint not null,
  constraint pk_posting_issue_label primary key (posting_id, issue_label_id))
;

create table project_label (
  project_id                     bigint not null,
  label_id                       bigint not null,
  constraint pk_project_label primary key (project_id, label_id))
;

create table pull_request_reviewers (
  pull_request_id                bigint not null,
  user_id                        bigint not null,
  constraint pk_pull_request_reviewers primary key (pull_request_id, user_id))
;

create table user_enrolled_project (
  user_id                        bigint not null,
  project_id                     bigint not null,
  constraint pk_user_enrolled_project primary key (user_id, project_id))
;

create table user_enrolled_organization (
  user_id                        bigint not null,
  organization_id                bigint not null,
  constraint pk_user_enrolled_organization primary key (user_id, organization_id))
;
alter table assignee add constraint fk_assignee_user_1 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_assignee_user_1 on assignee (user_id);
alter table assignee add constraint fk_assignee_project_2 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_assignee_project_2 on assignee (project_id);
alter table comment_thread add constraint fk_comment_thread_pullRequest_3 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;
create index ix_comment_thread_pullRequest_3 on comment_thread (pull_request_id);
alter table comment_thread add constraint fk_comment_thread_project_4 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_comment_thread_project_4 on comment_thread (project_id);
alter table commit_comment add constraint fk_commit_comment_project_5 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_commit_comment_project_5 on commit_comment (project_id);
alter table email add constraint fk_email_user_6 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_email_user_6 on email (user_id);
alter table issue add constraint fk_issue_project_7 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_issue_project_7 on issue (project_id);
alter table issue add constraint fk_issue_milestone_8 foreign key (milestone_id) references milestone (id) on delete restrict on update restrict;
create index ix_issue_milestone_8 on issue (milestone_id);
alter table issue add constraint fk_issue_assignee_9 foreign key (assignee_id) references assignee (id) on delete restrict on update restrict;
create index ix_issue_assignee_9 on issue (assignee_id);
alter table issue_comment add constraint fk_issue_comment_issue_10 foreign key (issue_id) references issue (id) on delete restrict on update restrict;
create index ix_issue_comment_issue_10 on issue_comment (issue_id);
alter table issue_event add constraint fk_issue_event_issue_11 foreign key (issue_id) references issue (id) on delete restrict on update restrict;
create index ix_issue_event_issue_11 on issue_event (issue_id);
alter table issue_label add constraint fk_issue_label_category_12 foreign key (category_id) references issue_label_category (id) on delete restrict on update restrict;
create index ix_issue_label_category_12 on issue_label (category_id);
alter table issue_label add constraint fk_issue_label_project_13 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_issue_label_project_13 on issue_label (project_id);
alter table issue_label_category add constraint fk_issue_label_category_project_14 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_issue_label_category_project_14 on issue_label_category (project_id);
alter table mention add constraint fk_mention_user_15 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_mention_user_15 on mention (user_id);
alter table milestone add constraint fk_milestone_project_16 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_milestone_project_16 on milestone (project_id);
alter table notification_mail add constraint fk_notification_mail_notificationEvent_17 foreign key (notification_event_id) references notification_event (id) on delete restrict on update restrict;
create index ix_notification_mail_notificationEvent_17 on notification_mail (notification_event_id);
alter table organization_user add constraint fk_organization_user_user_18 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_organization_user_user_18 on organization_user (user_id);
alter table organization_user add constraint fk_organization_user_organization_19 foreign key (organization_id) references organization (id) on delete restrict on update restrict;
create index ix_organization_user_organization_19 on organization_user (organization_id);
alter table organization_user add constraint fk_organization_user_role_20 foreign key (role_id) references role (id) on delete restrict on update restrict;
create index ix_organization_user_role_20 on organization_user (role_id);
alter table posting add constraint fk_posting_project_21 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_posting_project_21 on posting (project_id);
alter table posting_comment add constraint fk_posting_comment_posting_22 foreign key (posting_id) references posting (id) on delete restrict on update restrict;
create index ix_posting_comment_posting_22 on posting_comment (posting_id);
alter table project add constraint fk_project_originalProject_23 foreign key (original_project_id) references project (id) on delete restrict on update restrict;
create index ix_project_originalProject_23 on project (original_project_id);
alter table project add constraint fk_project_organization_24 foreign key (organization_id) references organization (id) on delete restrict on update restrict;
create index ix_project_organization_24 on project (organization_id);
alter table project_menu_setting add constraint fk_project_menu_setting_project_25 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_project_menu_setting_project_25 on project_menu_setting (project_id);
alter table project_transfer add constraint fk_project_transfer_sender_26 foreign key (sender_id) references n4user (id) on delete restrict on update restrict;
create index ix_project_transfer_sender_26 on project_transfer (sender_id);
alter table project_transfer add constraint fk_project_transfer_project_27 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_project_transfer_project_27 on project_transfer (project_id);
alter table project_user add constraint fk_project_user_user_28 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_project_user_user_28 on project_user (user_id);
alter table project_user add constraint fk_project_user_project_29 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_project_user_project_29 on project_user (project_id);
alter table project_user add constraint fk_project_user_role_30 foreign key (role_id) references role (id) on delete restrict on update restrict;
create index ix_project_user_role_30 on project_user (role_id);
alter table project_visitation add constraint fk_project_visitation_project_31 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_project_visitation_project_31 on project_visitation (project_id);
alter table project_visitation add constraint fk_project_visitation_recentlyVisitedProjects_32 foreign key (recently_visited_projects_id) references recently_visited_projects (id) on delete restrict on update restrict;
create index ix_project_visitation_recentlyVisitedProjects_32 on project_visitation (recently_visited_projects_id);
alter table pull_request add constraint fk_pull_request_toProject_33 foreign key (to_project_id) references project (id) on delete restrict on update restrict;
create index ix_pull_request_toProject_33 on pull_request (to_project_id);
alter table pull_request add constraint fk_pull_request_fromProject_34 foreign key (from_project_id) references project (id) on delete restrict on update restrict;
create index ix_pull_request_fromProject_34 on pull_request (from_project_id);
alter table pull_request add constraint fk_pull_request_contributor_35 foreign key (contributor_id) references n4user (id) on delete restrict on update restrict;
create index ix_pull_request_contributor_35 on pull_request (contributor_id);
alter table pull_request add constraint fk_pull_request_receiver_36 foreign key (receiver_id) references n4user (id) on delete restrict on update restrict;
create index ix_pull_request_receiver_36 on pull_request (receiver_id);
alter table pull_request_commit add constraint fk_pull_request_commit_pullRequest_37 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;
create index ix_pull_request_commit_pullRequest_37 on pull_request_commit (pull_request_id);
alter table pull_request_event add constraint fk_pull_request_event_pullRequest_38 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;
create index ix_pull_request_event_pullRequest_38 on pull_request_event (pull_request_id);
alter table project_pushed_branch add constraint fk_project_pushed_branch_project_39 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_project_pushed_branch_project_39 on project_pushed_branch (project_id);
alter table recently_visited_projects add constraint fk_recently_visited_projects_user_40 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_recently_visited_projects_user_40 on recently_visited_projects (user_id);
alter table review_comment add constraint fk_review_comment_thread_41 foreign key (thread_id) references comment_thread (id) on delete restrict on update restrict;
create index ix_review_comment_thread_41 on review_comment (thread_id);
alter table site_admin add constraint fk_site_admin_admin_42 foreign key (admin_id) references n4user (id) on delete restrict on update restrict;
create index ix_site_admin_admin_42 on site_admin (admin_id);
alter table unwatch add constraint fk_unwatch_user_43 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_unwatch_user_43 on unwatch (user_id);
alter table user_project_notification add constraint fk_user_project_notification_user_44 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_user_project_notification_user_44 on user_project_notification (user_id);
alter table user_project_notification add constraint fk_user_project_notification_project_45 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_user_project_notification_project_45 on user_project_notification (project_id);
alter table watch add constraint fk_watch_user_46 foreign key (user_id) references n4user (id) on delete restrict on update restrict;
create index ix_watch_user_46 on watch (user_id);
alter table webhook add constraint fk_webhook_project_47 foreign key (project_id) references project (id) on delete restrict on update restrict;
create index ix_webhook_project_47 on webhook (project_id);



alter table comment_thread_n4user add constraint fk_comment_thread_n4user_comment_thread_01 foreign key (comment_thread_id) references comment_thread (id) on delete restrict on update restrict;

alter table comment_thread_n4user add constraint fk_comment_thread_n4user_n4user_02 foreign key (n4user_id) references n4user (id) on delete restrict on update restrict;

alter table issue_issue_label add constraint fk_issue_issue_label_issue_01 foreign key (issue_id) references issue (id) on delete restrict on update restrict;

alter table issue_issue_label add constraint fk_issue_issue_label_issue_label_02 foreign key (issue_label_id) references issue_label (id) on delete restrict on update restrict;

alter table issue_voter add constraint fk_issue_voter_issue_01 foreign key (issue_id) references issue (id) on delete restrict on update restrict;

alter table issue_voter add constraint fk_issue_voter_n4user_02 foreign key (user_id) references n4user (id) on delete restrict on update restrict;

alter table issue_comment_voter add constraint fk_issue_comment_voter_issue_comment_01 foreign key (issue_comment_id) references issue_comment (id) on delete restrict on update restrict;

alter table issue_comment_voter add constraint fk_issue_comment_voter_n4user_02 foreign key (user_id) references n4user (id) on delete restrict on update restrict;

alter table notification_event_n4user add constraint fk_notification_event_n4user_notification_event_01 foreign key (notification_event_id) references notification_event (id) on delete restrict on update restrict;

alter table notification_event_n4user add constraint fk_notification_event_n4user_n4user_02 foreign key (n4user_id) references n4user (id) on delete restrict on update restrict;

alter table posting_issue_label add constraint fk_posting_issue_label_posting_01 foreign key (posting_id) references posting (id) on delete restrict on update restrict;

alter table posting_issue_label add constraint fk_posting_issue_label_issue_label_02 foreign key (issue_label_id) references issue_label (id) on delete restrict on update restrict;

alter table project_label add constraint fk_project_label_project_01 foreign key (project_id) references project (id) on delete restrict on update restrict;

alter table project_label add constraint fk_project_label_label_02 foreign key (label_id) references label (id) on delete restrict on update restrict;

alter table pull_request_reviewers add constraint fk_pull_request_reviewers_pull_request_01 foreign key (pull_request_id) references pull_request (id) on delete restrict on update restrict;

alter table pull_request_reviewers add constraint fk_pull_request_reviewers_n4user_02 foreign key (user_id) references n4user (id) on delete restrict on update restrict;

alter table user_enrolled_project add constraint fk_user_enrolled_project_n4user_01 foreign key (user_id) references n4user (id) on delete restrict on update restrict;

alter table user_enrolled_project add constraint fk_user_enrolled_project_project_02 foreign key (project_id) references project (id) on delete restrict on update restrict;

alter table user_enrolled_organization add constraint fk_user_enrolled_organization_n4user_01 foreign key (user_id) references n4user (id) on delete restrict on update restrict;

alter table user_enrolled_organization add constraint fk_user_enrolled_organization_organization_02 foreign key (organization_id) references organization (id) on delete restrict on update restrict;


# --- !Ups
create index ix_issue_voter_user_id on issue_voter (user_id);
create index ix_issue_comment_voter_user_id on issue_comment_voter (user_id);

create index ix_original_email_resource_id on original_email (resource_id);

CREATE INDEX ix_attachment_container ON attachment (container_type, container_id);

create index ix_mention_resource_type on mention (resource_type);


# --- !Ups
create unique index uq_n4user_1 on n4user (login_id);
create index ix_notification_event_created on notification_event (created DESC);
create index ix_watch_resource_id_resource_type on watch(resource_id, resource_type);
create index ix_unwatch_resource_id_resource_type on unwatch(resource_id, resource_type);



# --- !Ups

create table recent_project (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  owner                     varchar(255),
  project_id                bigint,
  project_name              varchar(255),
  constraint pk_recent_project primary key (id),
  constraint uq_recent_project_1 unique (user_id, project_id))
  row_format=compressed, key_block_size=8
;

alter table recent_project add constraint fk_recent_project_project_2 foreign key (project_id) references project (id) on delete CASCADE on update CASCADE;


# --- !Ups
ALTER TABLE project_visitation DROP FOREIGN KEY fk_project_visitation_project_31;
alter table project_visitation add constraint fk_project_visitation_project_31 foreign key (project_id) references project (id) on delete CASCADE on update CASCADE;


# --- !Ups
ALTER TABLE n4user ADD COLUMN token varchar(255);
CREATE UNIQUE INDEX uq_n4user_token ON n4user (token);


# --- !Ups
ALTER TABLE issue ADD COLUMN history longtext;
ALTER TABLE posting ADD COLUMN history longtext;


# --- !Ups
ALTER TABLE project ADD COLUMN is_code_accessible_member_only tinyint(1) default 0;


# --- !Ups
SET FOREIGN_KEY_CHECKS=0;

ALTER TABLE issue_comment ADD COLUMN project_id bigint;
DELETE FROM issue_comment WHERE issue_id = 0;
COMMIT;

UPDATE issue_comment a
SET a.project_id = (SELECT project_id FROM issue b WHERE a.issue_id = b.id);

ALTER TABLE issue_comment MODIFY COLUMN project_id bigint NOT NULL;

CREATE INDEX ix_issue_comment_project_id ON issue_comment (project_id);

ALTER TABLE posting_comment ADD COLUMN project_id bigint NOT NULL;
DELETE FROM posting_comment WHERE posting_id = 0;
COMMIT;

UPDATE posting_comment a
SET a.project_id = (SELECT project_id FROM posting b WHERE a.posting_id = b.id);
ALTER TABLE posting_comment MODIFY COLUMN project_id bigint NOT NULL;

SET FOREIGN_KEY_CHECKS=1;

CREATE INDEX ix_posting_comment_project_id ON posting_comment (project_id);

CREATE INDEX ix_issue_comment_author_id ON issue_comment (author_id);
CREATE INDEX ix_posting_comment_author_id ON posting_comment (author_id);
CREATE INDEX ix_pull_request_number ON pull_request (number);
CREATE INDEX ix_issue_author_id_state ON issue (author_id, state);
CREATE INDEX ix_issue_created_date ON issue (created_date);

CREATE INDEX ix_n4user_email ON n4user (email);
CREATE UNIQUE INDEX uq_email_email_valid ON email (email, valid);


# --- !Ups
ALTER TABLE attachment ADD COLUMN owner_login_id VARCHAR(255);
CREATE INDEX ix_attachment_owner_login_id ON attachment (owner_login_id);
CREATE INDEX ix_attachment_created_date ON attachment (created_date);

ALTER TABLE attachment MODIFY container_id BIGINT NOT NULL;

UPDATE attachment a
SET owner_login_id = (SELECT author_login_id FROM posting b WHERE b.id = a.container_id)
WHERE container_type = 'BOARD_POST';

UPDATE attachment a
SET owner_login_id = (SELECT author_login_id FROM issue b WHERE b.id = a.container_id)
WHERE container_type = 'ISSUE_POST';

UPDATE attachment a
SET owner_login_id = (SELECT author_login_id FROM issue_comment b WHERE b.id = a.container_id)
WHERE container_type = 'ISSUE_COMMENT';

UPDATE attachment a
SET owner_login_id = (SELECT author_login_id FROM posting_comment b WHERE b.id = a.container_id)
WHERE container_type = 'NONISSUE_COMMENT';

UPDATE attachment a
SET owner_login_id = (SELECT login_id FROM n4user b WHERE a.id = b.id)
WHERE container_type in ('USER', 'USER_AVATAR');



# --- !Ups
CREATE TABLE favorite_project (
  id                        BIGINT AUTO_INCREMENT NOT NULL,
  user_id                   BIGINT,
  project_id                BIGINT,
  owner                     VARCHAR(255),
  project_name              VARCHAR(255),
  CONSTRAINT pk_favorite_project PRIMARY KEY (id),
  CONSTRAINT uq_favorite_project_user_id_project_id_1 UNIQUE (user_id, project_id),
  CONSTRAINT fk_favorite_project_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,
  CONSTRAINT fk_favorite_project_project FOREIGN KEY (project_id) REFERENCES project (id) on DELETE CASCADE
  )
  row_format=compressed, key_block_size=8
;

CREATE index ix_favorite_project_user_1 ON favorite_project (user_id);
CREATE index ix_favorite_project_project_2 ON favorite_project (project_id);

CREATE TABLE favorite_organization (
  id                        BIGINT AUTO_INCREMENT NOT NULL,
  user_id                   BIGINT,
  organization_id           BIGINT,
  organization_name        VARCHAR(255),
  CONSTRAINT pk_favorite_organization PRIMARY KEY (id),
  CONSTRAINT uq_favorite_organization_user_id_organization_id_1 UNIQUE (user_id, organization_id),
  CONSTRAINT fk_favorite_organization_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,
  CONSTRAINT fk_favorite_organization_organization FOREIGN KEY (organization_id) REFERENCES organization (id) on DELETE CASCADE
  )
  row_format=compressed, key_block_size=8
;

CREATE index ix_favorite_organization_user_1 ON favorite_organization (user_id);
CREATE index ix_favorite_organization_organization_2 ON favorite_organization (organization_id);


# --- !Ups

create table linked_account (
  id                        bigint auto_increment not null,
  user_credential_id        bigint,
  provider_user_id          varchar(255),
  provider_key              varchar(255),
  constraint pk_linked_account primary key (id))
  row_format=compressed, key_block_size=8
;

create table user_credential (
  id                        bigint auto_increment not null,
  user_id                   bigint,
  login_id                  varchar(255),
  email                     varchar(255),
  name                      varchar(255),
  active                    tinyint(1) default 0,
  email_validated           tinyint(1) default 0,
  constraint pk_users primary key (id),
  CONSTRAINT fk_user_credential_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE)
  row_format=compressed, key_block_size=8
;

create index ix_user_credential_user_id_1 on user_credential (user_id);

alter table linked_account add constraint fk_linked_account_user_1 foreign key (user_credential_id) references user_credential (id) on delete CASCADE;

create index ix_linked_account_user_credential_1 on linked_account (user_credential_id);



# --- !Ups
ALTER TABLE issue ADD COLUMN parent_id bigint;
alter table issue add constraint fk_issue_parent_id_01 foreign key (parent_id) references issue (id) on delete set null;
CREATE INDEX ix_issue_parent_id ON issue (parent_id);

ALTER TABLE posting ADD COLUMN parent_id bigint;
alter table posting add constraint fk_posting_parent_id_01 foreign key (parent_id) references posting (id) on delete set null;
CREATE INDEX ix_posting_parent_id ON posting (parent_id);


# --- !Ups
CREATE TABLE user_setting (
  id                        BIGINT AUTO_INCREMENT NOT NULL,
  user_id                   BIGINT,
  login_default_page        VARCHAR(255),
  CONSTRAINT pk_user_setting PRIMARY KEY (id),
  CONSTRAINT fk_user_setting_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE
)
row_format=compressed, key_block_size=8;

CREATE index ix_user_setting_user_1 ON user_setting (user_id);


# --- !Ups
CREATE TABLE user_verification (
  id                        BIGINT AUTO_INCREMENT NOT NULL,
  user_id                   BIGINT,
  login_id                  VARCHAR(255),
  verification_code         VARCHAR(255),
  timestamp                 BIGINT,
  CONSTRAINT pk_user_verification PRIMARY KEY (id),
  CONSTRAINT fk_user_verification_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE
)
row_format=compressed, key_block_size=8;

CREATE index ix_user_verification_user_1 ON user_verification (user_id);
CREATE index ix_user_verification_user_2 ON user_verification (login_id, verification_code);


# --- !Ups
ALTER TABLE n4user ADD COLUMN is_guest tinyint(1) default 0;
CREATE INDEX ix_n4user_is_guest ON n4user (is_guest);


# --- !Ups
ALTER TABLE webhook ADD COLUMN git_push_only tinyint(1) default 1;
CREATE INDEX ix_webhook_git_push_only ON webhook (git_push_only);


# --- !Ups
ALTER TABLE n4user ADD COLUMN english_name VARCHAR(255);


# --- !Ups
CREATE TABLE issue_sharer (
  id                        BIGINT AUTO_INCREMENT NOT NULL,
  created                   DATE,
  login_id                  VARCHAR(255),
  user_id                   BIGINT,
  issue_id                   BIGINT,
  CONSTRAINT pk_issue_sharer PRIMARY KEY (id),
  CONSTRAINT fk_issue_sharer_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,
  CONSTRAINT fk_issue_sharer_issue FOREIGN KEY (issue_id) REFERENCES issue (id) on DELETE CASCADE
)
row_format=compressed, key_block_size=8;

CREATE index ix_issue_sharer_login_id ON issue_sharer (login_id);
CREATE index ix_issue_sharer_user_id ON issue_sharer (user_id);
CREATE index ix_issue_sharer_issue_id ON issue_sharer (issue_id);


# --- !Ups
ALTER TABLE attachment DROP CONSTRAINT IF EXISTS ck_attachment_container_type;
ALTER TABLE comment_thread DROP CONSTRAINT IF EXISTS ck_comment_thread_state;
ALTER TABLE comment_thread DROP CONSTRAINT IF EXISTS ck_comment_thread_start_side;
ALTER TABLE comment_thread DROP CONSTRAINT IF EXISTS ck_comment_thread_end_side;
ALTER TABLE commit_comment DROP CONSTRAINT IF EXISTS ck_commit_comment_side;
ALTER TABLE issue DROP CONSTRAINT IF EXISTS ck_issue_state;
ALTER TABLE issue_event DROP CONSTRAINT IF EXISTS ck_issue_event_event_type;
ALTER TABLE mention DROP CONSTRAINT IF EXISTS ck_mention_resource_type;
ALTER TABLE milestone DROP CONSTRAINT IF EXISTS ck_milestone_state;
ALTER TABLE notification_event DROP CONSTRAINT IF EXISTS ck_notification_event_resource_type;
ALTER TABLE notification_event DROP CONSTRAINT IF EXISTS ck_notification_event_event_type;
ALTER TABLE original_email DROP CONSTRAINT IF EXISTS ck_original_email_resource_type;
ALTER TABLE project DROP CONSTRAINT IF EXISTS ck_project_project_scope;
ALTER TABLE property DROP CONSTRAINT IF EXISTS ck_property_name;
ALTER TABLE pull_request DROP CONSTRAINT IF EXISTS ck_pull_request_state;
ALTER TABLE pull_request_commit DROP CONSTRAINT IF EXISTS ck_pull_request_commit_state;
ALTER TABLE pull_request_event DROP CONSTRAINT IF EXISTS ck_pull_request_event_event_type;
ALTER TABLE unwatch DROP CONSTRAINT IF EXISTS ck_unwatch_resource_type;
ALTER TABLE n4user DROP CONSTRAINT IF EXISTS ck_n4user_state;
ALTER TABLE user_project_notification DROP CONSTRAINT IF EXISTS ck_user_project_notification_notification_type;
ALTER TABLE watch DROP CONSTRAINT IF EXISTS ck_watch_resource_type;


# --- !Ups
CREATE TABLE title_head (
  id                         BIGINT AUTO_INCREMENT NOT NULL,
  project_id                 BIGINT,
  head_keyword               VARCHAR(255),
  frequency                  INTEGER,
  CONSTRAINT pk_title_head PRIMARY KEY (id),
  CONSTRAINT fk_title_head_project FOREIGN KEY (project_id) REFERENCES project (id) on DELETE CASCADE
)
row_format=compressed, key_block_size=8;

CREATE index ix_title_head_project_id ON title_head (project_id);
CREATE index ix_title_head_head_keyword ON title_head (head_keyword);


# --- !Ups
ALTER TABLE issue_comment ADD COLUMN parent_comment_id bigint;
alter table issue_comment add constraint fk_issue_comment_parent_id_01 foreign key (parent_comment_id) references issue_comment (id) on delete set null;
CREATE INDEX ix_issue_parent_id ON issue_comment (parent_comment_id);

ALTER TABLE posting_comment ADD COLUMN parent_comment_id bigint;
alter table posting_comment add constraint fk_posting_comment_parent_id_01 foreign key (parent_comment_id) references posting_comment (id) on delete set null;
CREATE INDEX ix_posting_parent_id ON posting_comment (parent_comment_id);


# --- !Ups
CREATE TABLE favorite_issue (
  id                        BIGINT AUTO_INCREMENT NOT NULL,
  user_id                   BIGINT,
  issue_id                BIGINT,
  CONSTRAINT pk_favorite_issue PRIMARY KEY (id),
  CONSTRAINT uq_favorite_issue_user_id_issue_id_1 UNIQUE (user_id, issue_id),
  CONSTRAINT fk_favorite_issue_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,
  CONSTRAINT fk_favorite_issue_issue FOREIGN KEY (issue_id) REFERENCES issue (id) on DELETE CASCADE
  )
  row_format=compressed, key_block_size=8
;

CREATE index ix_favorite_issue_user_1 ON favorite_issue (user_id);
CREATE index ix_favorite_issue_project_2 ON favorite_issue (issue_id);


# --- !Ups
ALTER TABLE webhook ADD COLUMN webhook_type tinyint(1) default 1;
CREATE INDEX ix_webhook_webhook_type ON webhook (webhook_type);


# --- !Ups
ALTER TABLE issue DROP FOREIGN KEY fk_issue_assignee_9;
ALTER TABLE issue ADD CONSTRAINT fk_issue_assignee_9 FOREIGN KEY (assignee_id) REFERENCES assignee (id) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE issue DROP FOREIGN KEY fk_issue_project_7;
ALTER TABLE issue ADD CONSTRAINT fk_issue_project_7 FOREIGN KEY (project_id) REFERENCES project (id) ON DELETE CASCADE ON UPDATE CASCADE;


# --- !Ups
ALTER TABLE issue ADD COLUMN weight tinyint(2) default 0;
CREATE INDEX ix_issue_weight ON issue (weight);


# --- !Ups
CREATE TABLE webhook_thread (
  id                        BIGINT AUTO_INCREMENT NOT NULL,
  webhook_id                BIGINT,
  resource_type             VARCHAR(20),
  resource_id               VARCHAR(255),
  thread_id                 VARCHAR(2000),
  created_at                DATETIME,
  CONSTRAINT pk_webhook_thread PRIMARY KEY (id),
  CONSTRAINT fk_webhook_thread_webhook FOREIGN KEY (webhook_id) REFERENCES webhook (id) ON DELETE CASCADE
  )
  row_format=compressed, key_block_size=8
;

CREATE index ix_webhook_thread_webhook_1 ON webhook_thread (webhook_id);
CREATE index ix_webhook_thread_resource_2 ON webhook_thread (resource_type, resource_id);


# --- !Ups
UPDATE webhook SET webhook_type = 3 WHERE git_push_only = 1;
ALTER TABLE webhook CHANGE git_push_only git_push tinyint(1);


# --- !Ups
ALTER TABLE issue ADD COLUMN updated_by_author_id bigint;


# --- !Ups
ALTER TABLE posting ADD COLUMN updated_by_author_id bigint;


# --- !Ups
CREATE TABLE recent_issue (
    id           BIGINT AUTO_INCREMENT NOT NULL,
    user_id      BIGINT,
    issue_id     BIGINT,
    posting_id   BIGINT,
    title        VARCHAR(255),
    url          VARCHAR(255),
    created_date datetime,
    CONSTRAINT pk_recent_issue PRIMARY KEY (id),
    CONSTRAINT uq_recent_issue_user_id_issue_id_1 UNIQUE (user_id, issue_id),
    CONSTRAINT uq_recent_issue_user_id_posting_id_1 UNIQUE (user_id, posting_id),
    CONSTRAINT fk_recent_issue_user FOREIGN KEY (user_id) REFERENCES n4user (id) on DELETE CASCADE,
    CONSTRAINT fk_recent_issue_issue FOREIGN KEY (issue_id) REFERENCES issue (id) on DELETE CASCADE
);

CREATE index ix_recent_issue_user_1 ON recent_issue (user_id);
CREATE index ix_recent_issue_issue_2 ON recent_issue (user_id, issue_id);
CREATE index ix_recent_issue_posting_3 ON recent_issue (user_id, posting_id);


# --- !Ups
ALTER TABLE issue ADD COLUMN is_draft tinyint(1) default 0;
CREATE index ix_issue_is_draft_1 ON issue (weight, is_draft, number, created_date);
CREATE index ix_issue_is_draft_2 ON issue (is_draft, author_login_id, project_id);


