import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const certificates = sqliteTable("certificates", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  studentName: text("student_name").notNull(),
  cpf: text("cpf").notNull(),
  course: text("course").notNull(),
  workload: text("workload").notNull(),
  completionDate: text("completion_date").notNull(),
  instructor: text("instructor").notNull().default("Gambeti Engenharia e Treinamentos"),
  certificateCode: text("certificate_code").notNull().unique(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_certificates_owner_created").on(table.ownerId, table.createdAt)]);

export const adminCredentials = sqliteTable("admin_credentials", {
  id: integer("id").primaryKey(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  passwordSalt: text("password_salt").notNull(),
  iterations: integer("iterations").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const adminSessions = sqliteTable("admin_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  username: text("username").notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_admin_sessions_expires").on(table.expiresAt)]);

export const loginAttempts = sqliteTable("login_attempts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  attemptKey: text("attempt_key").notNull(),
  failedAt: text("failed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, (table) => [index("idx_login_attempts_key_time").on(table.attemptKey, table.failedAt)]);
