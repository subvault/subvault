// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import { LATEST_VERSION } from "./const";

type Migration = {
  fromVersion: number,
  toVersion: number,
  scripts: string[],
};

const MIGRATIONS: Migration[] = [
  { fromVersion: 0, toVersion: 1, scripts: [
      "CREATE TABLE ext_wallets (address TEXT PRIMARY KEY NOT NULL)",
      "CREATE TABLE own_wallets (address TEXT PRIMARY KEY NOT NULL, type TEXT NOT NULL, json TEXT NOT NULL)",
      "CREATE TABLE metadata (name TEXT PRIMARY KEY NOT NULL, json TEXT NOT NULL)"
  ] },
];

const INDEXED_MIGRATIONS: { [key: number]: Migration } = {};
for (const migration of MIGRATIONS) {
  INDEXED_MIGRATIONS[migration.fromVersion] = migration;
}

export const currentVersion = (db: sqlite3.Database) => {
  return db.pragma("user_version")[0].user_version;
};

export const migrate = (db: sqlite3.Database) => {
  while (currentVersion(db) != LATEST_VERSION) {
    const migration = INDEXED_MIGRATIONS[currentVersion(db)];
    db.transaction(() => {
      for (const script of migration.scripts) {
        db.prepare(script).run();
      }
      db.pragma(`user_version = ${migration.toVersion}`);
    })();
  }
};