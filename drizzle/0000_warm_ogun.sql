CREATE TABLE "acknowledgments" (
	"entry_id" uuid NOT NULL,
	"email" text NOT NULL,
	"acknowledged_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "acknowledgments_entry_id_email_pk" PRIMARY KEY("entry_id","email")
);
--> statement-breakpoint
CREATE TABLE "attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"name" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_meetings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"purpose" text NOT NULL,
	"location" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"data" jsonb NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"requested_by" text NOT NULL,
	"status" text NOT NULL,
	"provider_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tender_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entry_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"priority" integer NOT NULL,
	"specification" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "acknowledgments" ADD CONSTRAINT "acknowledgments_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attachments" ADD CONSTRAINT "attachments_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_meetings" ADD CONSTRAINT "customer_meetings_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tender_requirements" ADD CONSTRAINT "tender_requirements_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attachment_entry_idx" ON "attachments" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "customer_entry_idx" ON "customer_meetings" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "entries_type_idx" ON "entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "invitation_entry_idx" ON "invitations" USING btree ("entry_id");--> statement-breakpoint
CREATE INDEX "requirement_entry_idx" ON "tender_requirements" USING btree ("entry_id");