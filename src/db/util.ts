// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import SqliteDB, * as sqlite3 from "better-sqlite3";

export function getCurrentVersion(db: sqlite3.Database): number {
  return db.pragma("user_version")[0].user_version;
};

export function getCurrentApplicationId(db: sqlite3.Database): number {
  return db.pragma("application_id")[0].application_id;
};

export function getMetadataByName(db: sqlite3.Database, name: string): any {
  return JSON.parse(db.prepare("SELECT value FROM metadata WHERE name = ?").get(name).value)
}