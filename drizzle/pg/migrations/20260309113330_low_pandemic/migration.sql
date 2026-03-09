CREATE TABLE "verification" (
	"id" bigserial,
	"identifier" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT NULL,
	"updated_at" timestamp DEFAULT NULL
);
--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "password" varchar(255) DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "access_token" text DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "refresh_token" text DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "id_token" text DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "access_token_expires_at" timestamp DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "refresh_token_expires_at" timestamp DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "scope" varchar(255) DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "created_at" timestamp DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "linked_account" ADD COLUMN "updated_at" timestamp DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "user_credential" ADD COLUMN "image" varchar(255) DEFAULT 'NULL';--> statement-breakpoint
ALTER TABLE "user_credential" ADD COLUMN "created_at" timestamp DEFAULT NULL;--> statement-breakpoint
ALTER TABLE "user_credential" ADD COLUMN "updated_at" timestamp DEFAULT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_credential_email" ON "user_credential" ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_credential_login_id" ON "user_credential" ("login_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_verification_identifier" ON "verification" ("identifier");--> statement-breakpoint
CREATE INDEX "ix_verification_expires_at" ON "verification" ("expires_at");