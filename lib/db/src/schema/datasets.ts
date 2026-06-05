import { pgTable, serial, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const datasetsTable = pgTable("datasets", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  sheetName: text("sheet_name"),
  rowCount: integer("row_count").notNull().default(0),
  columnCount: integer("column_count").notNull().default(0),
  columns: jsonb("columns").notNull().default([]).$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDatasetSchema = createInsertSchema(datasetsTable).omit({ id: true, createdAt: true });
export type InsertDataset = z.infer<typeof insertDatasetSchema>;
export type Dataset = typeof datasetsTable.$inferSelect;
