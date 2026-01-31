CREATE TABLE "project_clients" (
	"project_id" text NOT NULL,
	"client_id" text NOT NULL,
	CONSTRAINT "project_clients_project_id_client_id_pk" PRIMARY KEY("project_id","client_id")
);
--> statement-breakpoint
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_clients" ADD CONSTRAINT "project_clients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;