CREATE TABLE "transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"description" text NOT NULL,
	"amount" integer DEFAULT 0 NOT NULL,
	"type" text DEFAULT 'income' NOT NULL,
	"category" text,
	"status" text DEFAULT 'completed',
	"date" timestamp DEFAULT now(),
	"project_id" text,
	"sub_project_id" text,
	"sub_project_item_id" text,
	"client_id" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "credentials" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "files" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "budget" jsonb DEFAULT '{"total":0,"items":[],"type":"manual"}'::jsonb;--> statement-breakpoint
ALTER TABLE "sub_projects" ADD COLUMN "links" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sub_projects" ADD COLUMN "credentials" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "sub_projects" ADD COLUMN "budget" jsonb DEFAULT '{"total":0,"items":[]}'::jsonb;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_sub_project_id_sub_projects_id_fk" FOREIGN KEY ("sub_project_id") REFERENCES "public"."sub_projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;