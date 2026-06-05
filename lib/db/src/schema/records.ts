import { pgTable, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recordsTable = pgTable("records", {
  id: serial("id").primaryKey(),
  datasetId: integer("dataset_id").notNull(),
  rowData: jsonb("row_data").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRecordSchema = createInsertSchema(recordsTable).omit({ id: true, createdAt: true });
export type InsertRecord = z.infer<typeof insertRecordSchema>;
export type DataRecord = typeof recordsTable.$inferSelect;
