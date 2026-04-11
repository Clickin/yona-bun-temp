CREATE TABLE "search_document" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"document_type" varchar(32) NOT NULL,
	"document_id" bigint NOT NULL,
	"scope_kind" varchar(16) NOT NULL,
	"access_scope" varchar(32) NOT NULL,
	"organization_id" bigint,
	"project_id" bigint,
	"principal_user_id" bigint,
	"title" varchar(255) DEFAULT NULL,
	"body" text DEFAULT NULL,
	"path" varchar(255) DEFAULT NULL,
	"document_text" text DEFAULT '' NOT NULL,
	"updated_date" timestamp DEFAULT NULL
);
--> statement-breakpoint
ALTER TABLE "search_document" ADD COLUMN "search_vector" tsvector GENERATED ALWAYS AS (
	to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("body", '') || ' ' || coalesce("path", '') || ' ' || coalesce("document_text", ''))
) STORED;
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_search_document_source" ON "search_document" ("document_type", "document_id");
--> statement-breakpoint
CREATE INDEX "ix_search_document_scope" ON "search_document" ("scope_kind", "organization_id", "project_id");
--> statement-breakpoint
CREATE INDEX "ix_search_document_access" ON "search_document" ("access_scope", "organization_id", "project_id", "principal_user_id");
--> statement-breakpoint
CREATE INDEX "ix_search_document_updated_48" ON "search_document" ("updated_date");
--> statement-breakpoint
CREATE INDEX "ix_search_document_vector_49" ON "search_document" USING gin ("search_vector");
