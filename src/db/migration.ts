// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import { getCurrentVersion } from "./util";

type Migration = {
  fromVersion: number,
  toVersion: number,
  scripts: string[],
};

export const LATEST_VERSION = 2;

const MIGRATIONS: Migration[] = [
  { fromVersion: 0, toVersion: 1, scripts: [
    "CREATE TABLE accounts (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, address TEXT NOT NULL UNIQUE, type TEXT NOT NULL, json TEXT NOT NULL)",
    "CREATE TABLE metadata (name TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)",
    "CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE)",
    "CREATE TABLE account_tags (account_id INTEGER REFERENCES accounts(id) ON DELETE CASCADE, tag_id INTEGER REFERENCES tags(id), PRIMARY KEY(account_id, tag_id))"
  ] },
  { fromVersion: 1, toVersion: 2, scripts: [
    "ALTER TABLE accounts RENAME COLUMN json TO data",
    "ALTER TABLE accounts ADD COLUMN config TEXT",
    "ALTER TABLE metadata RENAME COLUMN json TO value"
  ] },
];

const INDEXED_MIGRATIONS: { [key: number]: Migration } = {};
for (const migration of MIGRATIONS) {
  INDEXED_MIGRATIONS[migration.fromVersion] = migration;
}

export function migrate(db: sqlite3.Database) {
  while (getCurrentVersion(db) != LATEST_VERSION) {
    const migration = INDEXED_MIGRATIONS[getCurrentVersion(db)];
    db.transaction(() => {
      for (const script of migration.scripts) {
        db.prepare(script).run();
      }
      db.pragma(`user_version = ${migration.toVersion}`);
    })();
  }
}