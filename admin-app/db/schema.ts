import { sql } from "drizzle-orm";
import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
