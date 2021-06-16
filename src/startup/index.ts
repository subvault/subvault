// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import assert from "assert";
import { APPLICATION_ID, LATEST_VERSION } from "./const";
import { migrate, currentVersion } from "./migration";
import * as metadata from "../metadata";

type CreateVaultOptions = {
  networkId: number,
  networkName: string,
};

export function currentApplicationId(db: sqlite3.Database): number {
  return db.pragma("application_id")[0].application_id;
};

function checkVault(db: sqlite3.Database) {
  assert.strictEqual(currentApplicationId(db), APPLICATION_ID);
  assert.strictEqual(currentVersion(db), LATEST_VERSION);
  assert(typeof metadata.getNetworkId(db), "number");
  assert(typeof metadata.getNetworkName(db), "string");
};

export function createVault(path: string, options: CreateVaultOptions): sqlite3.Database {
  const db = new Database(path);

  db.pragma(`application_id = ${APPLICATION_ID}`);
  migrate(db);
  db.transaction(() => {
    db.prepare("INSERT INTO metadata (name, json) VALUES (?, ?)")
      .run("network_id", JSON.stringify(options.networkId));
    db.prepare("INSERT Into metadata (name, json) VALUES (?, ?)")
      .run("network_name", JSON.stringify(options.networkName));
  })();

  checkVault(db);

  return db;
};

export function openVault(path: string): sqlite3.Database {
  const db = new Database(path, { fileMustExist: true });

  migrate(db);
  checkVault(db);

  return db;
}