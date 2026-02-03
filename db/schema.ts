import {
    boolean,
    timestamp,
    pgTable,
    text,
    primaryKey,
    integer,
    varchar,
    jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

export const users = pgTable("user", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name"),
    email: text("email").unique(),
    emailVerified: timestamp("emailVerified", { mode: "date" }),
    image: text("image"),
    role: text("role").default("user"),
});

export const accounts = pgTable(
    "account",
    {
        userId: text("userId")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        type: text("type").$type<AdapterAccountType>().notNull(),
        provider: text("provider").notNull(),
        providerAccountId: text("providerAccountId").notNull(),
        refresh_token: text("refresh_token"),
        access_token: text("access_token"),
        expires_at: integer("expires_at"),
        token_type: text("token_type"),
        scope: text("scope"),
        id_token: text("id_token"),
        session_state: text("session_state"),
    },
    (account) => ({
        compoundKey: primaryKey({
            columns: [account.provider, account.providerAccountId],
        }),
    })
);

export const sessions = pgTable("session", {
    sessionToken: text("sessionToken").primaryKey(),
    userId: text("userId")
        .notNull()
        .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
    "verificationToken",
    {
        identifier: text("identifier").notNull(),
        token: text("token").notNull(),
        expires: timestamp("expires", { mode: "date" }).notNull(),
    },
    (vt) => ({
        compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
    })
);

// Entidades de Negócio TDJs

export const clients = pgTable("clients", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    email: text("email"),
    phone: text("phone"),
    avatar: text("avatar"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const projects = pgTable("projects", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("active"), // active, completed, archived
    // clientId is deprecated but kept for backward compatibility until full migration
    clientId: text("client_id")
        .references(() => clients.id, { onDelete: "cascade" }),
    links: jsonb("links").default([]),
    credentials: jsonb("credentials").default([]),
    files: jsonb("files").default([]),
    budget: jsonb("budget").default({ total: 0, items: [], type: 'manual' }), // type: manual, dynamic (sum of subprojects)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const projectClients = pgTable("project_clients", {
    projectId: text("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade" }),
    clientId: text("client_id")
        .notNull()
        .references(() => clients.id, { onDelete: "cascade" }),
}, (t) => ({
    pk: primaryKey({ columns: [t.projectId, t.clientId] }),
}));

export const subProjects = pgTable("sub_projects", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status").default("active"),
    projectId: text("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade" }),
    position: integer("position").default(0),
    content: jsonb("content").default({ stages: [] }), // Dynamic content for Kanban/Checklists
    links: jsonb("links").default([]),
    credentials: jsonb("credentials").default([]),
    budget: jsonb("budget").default({ total: 0, items: [] }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
    id: text("id")
        .primaryKey()
        .$defaultFn(() => crypto.randomUUID()),
    description: text("description").notNull(),
    amount: integer("amount").notNull().default(0), // stored in cents
    type: text("type").notNull().default("income"), // income, expense
    category: text("category"), // e.g., 'Serviço', 'Material', 'Imposto', 'Pro-labore'
    status: text("status").default("completed"), // completed, pending
    date: timestamp("date").defaultNow(),
    projectId: text("project_id")
        .references(() => projects.id, { onDelete: "set null" }),
    subProjectId: text("sub_project_id")
        .references(() => subProjects.id, { onDelete: "set null" }),
    subProjectItemId: text("sub_project_item_id"), // ID of the specific item/stage in the JSON content
    clientId: text("client_id")
        .references(() => clients.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Define relations for simpler querying
export const projectsRelations = relations(projects, ({ one, many }) => ({
    clients: many(projectClients),
    subProjects: many(subProjects),
    transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    project: one(projects, {
        fields: [transactions.projectId],
        references: [projects.id],
    }),
    subProject: one(subProjects, {
        fields: [transactions.subProjectId],
        references: [subProjects.id],
    }),
    client: one(clients, {
        fields: [transactions.clientId],
        references: [clients.id],
    }),
}));

export const subProjectsRelations = relations(subProjects, ({ one, many }) => ({
    project: one(projects, {
        fields: [subProjects.projectId],
        references: [projects.id],
    }),
    transactions: many(transactions),
}));

export const clientsRelations = relations(clients, ({ many }) => ({
    projects: many(projectClients),
}));

export const projectClientsRelations = relations(projectClients, ({ one }) => ({
    project: one(projects, {
        fields: [projectClients.projectId],
        references: [projects.id],
    }),
    client: one(clients, {
        fields: [projectClients.clientId],
        references: [clients.id],
    }),
}));
