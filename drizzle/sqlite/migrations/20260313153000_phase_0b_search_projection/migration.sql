CREATE TABLE "search_document" (
	"id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	"document_type" text NOT NULL,
	"document_id" integer NOT NULL,
	"scope_kind" text NOT NULL,
	"access_scope" text NOT NULL,
	"organization_id" integer,
	"project_id" integer,
	"principal_user_id" integer,
	"title" text DEFAULT NULL,
	"body" text DEFAULT NULL,
	"path" text DEFAULT NULL,
	"document_text" text DEFAULT '' NOT NULL,
	"updated_date" integer DEFAULT NULL,
	FOREIGN KEY ("organization_id") REFERENCES "organization"("id") ON DELETE cascade ON UPDATE cascade,
	FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE cascade ON UPDATE cascade,
	FOREIGN KEY ("principal_user_id") REFERENCES "n4user"("id") ON DELETE cascade ON UPDATE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_search_document_source" ON "search_document" ("document_type", "document_id");
--> statement-breakpoint
CREATE INDEX "ix_search_document_scope" ON "search_document" ("scope_kind", "organization_id", "project_id");
--> statement-breakpoint
CREATE INDEX "ix_search_document_access" ON "search_document" ("access_scope", "organization_id", "project_id", "principal_user_id");
--> statement-breakpoint
CREATE INDEX "ix_search_document_updated_48" ON "search_document" ("updated_date");
--> statement-breakpoint
CREATE VIRTUAL TABLE "search_document_fts" USING fts5(
	"document_type" UNINDEXED,
	"title",
	"body",
	"path",
	"document_text",
	content='search_document',
	content_rowid='id'
);
--> statement-breakpoint
CREATE TRIGGER "search_document_ai" AFTER INSERT ON "search_document" BEGIN
	INSERT INTO "search_document_fts" (rowid, "document_type", "title", "body", "path", "document_text")
	VALUES (new."id", new."document_type", new."title", new."body", new."path", new."document_text");
END;
--> statement-breakpoint
CREATE TRIGGER "search_document_au" AFTER UPDATE ON "search_document" BEGIN
	INSERT INTO "search_document_fts" (
		"search_document_fts",
		rowid,
		"document_type",
		"title",
		"body",
		"path",
		"document_text"
	) VALUES (
		'delete',
		old."id",
		old."document_type",
		old."title",
		old."body",
		old."path",
		old."document_text"
	);
	INSERT INTO "search_document_fts" (rowid, "document_type", "title", "body", "path", "document_text")
	VALUES (new."id", new."document_type", new."title", new."body", new."path", new."document_text");
END;
--> statement-breakpoint
CREATE TRIGGER "search_document_ad" AFTER DELETE ON "search_document" BEGIN
	INSERT INTO "search_document_fts" (
		"search_document_fts",
		rowid,
		"document_type",
		"title",
		"body",
		"path",
		"document_text"
	) VALUES (
		'delete',
		old."id",
		old."document_type",
		old."title",
		old."body",
		old."path",
		old."document_text"
	);
END;
--> statement-breakpoint
INSERT INTO "search_document_fts" ("search_document_fts") VALUES ('rebuild');
