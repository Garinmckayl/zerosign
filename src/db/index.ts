import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export type ZeroSignDb = BetterSQLite3Database<typeof schema>;

const INIT_SQL = `
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  original_path TEXT NOT NULL,
  signed_path TEXT,
  page_count INTEGER NOT NULL DEFAULT 1,
  page_width INTEGER NOT NULL DEFAULT 612,
  page_height INTEGER NOT NULL DEFAULT 792,
  status TEXT NOT NULL DEFAULT 'draft',
  signer_name TEXT,
  signed_at INTEGER,
  created_at INTEGER NOT NULL
);
`;

export function createDatabase(dbPath: string): {
  db: ZeroSignDb;
  sqlite: Database.Database;
} {
  if (dbPath !== ":memory:") {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  }
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(INIT_SQL);
  const db = drizzle(sqlite, { schema });
  return { db, sqlite };
}

let singleton: ZeroSignDb | null = null;

export function getDb(): ZeroSignDb {
  if (!singleton) {
    const dbPath =
      process.env.ZEROSIGN_DB_PATH ||
      path.join(process.cwd(), "data", "zerosign.db");
    singleton = createDatabase(dbPath).db;
  }
  return singleton;
}
