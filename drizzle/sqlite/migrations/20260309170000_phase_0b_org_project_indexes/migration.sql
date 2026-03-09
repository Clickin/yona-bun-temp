CREATE UNIQUE INDEX "uq_organization_name" ON "organization" ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "uq_project_owner_name" ON "project" ("owner", "name");
