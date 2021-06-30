// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import { getCurrentVersion } from "./util";
import { LATEST_VERSION } from "./const";

type Migration = {
  fromVersion: number,
  toVersion: number,
  scripts: string[],
};

const MIGRATIONS: Migration[] = [
  { fromVersion: 0, toVersion: 1, scripts: [
      "CREATE TABLE wallets (name TEXT, address TEXT NOT NULL UNIQUE, type TEXT NOT NULL, json TEXT NOT NULL)",
      "CREATE TABLE metadata (name TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)"
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
};