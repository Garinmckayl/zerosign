import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  originalFilename: text("original_filename").notNull(),
  originalPath: text("original_path").notNull(),
  signedPath: text("signed_path"),
  pageCount: integer("page_count").notNull().default(1),
  pageWidth: integer("page_width").notNull().default(612),
  pageHeight: integer("page_height").notNull().default(792),
  status: text("status", { enum: ["draft", "signed"] })
    .notNull()
    .default("draft"),
  signerName: text("signer_name"),
  signedAt: integer("signed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export type DocumentRecord = typeof documents.$inferSelect;
export type NewDocumentRecord = typeof documents.$inferInsert;
