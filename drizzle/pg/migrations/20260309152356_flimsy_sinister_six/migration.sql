DROP INDEX "uq_organization_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_organization_name" ON "organization" (lower("name"));--> statement-breakpoint
DROP INDEX "uq_project_owner_name";--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_owner_name" ON "project" (lower("owner"),lower("name"));