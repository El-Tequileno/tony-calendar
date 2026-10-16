CREATE TABLE "authorized_emails" (
	"email" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"is_tony" boolean DEFAULT false NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "authorized_emails_normalized" CHECK ("authorized_emails"."email" = lower(btrim("authorized_emails"."email"))),
	CONSTRAINT "authorized_emails_tony_active" CHECK (not "authorized_emails"."is_tony" or "authorized_emails"."active")
);
--> statement-breakpoint
CREATE UNIQUE INDEX "authorized_emails_single_tony" ON "authorized_emails" USING btree ("is_tony") WHERE "authorized_emails"."is_tony" = true;