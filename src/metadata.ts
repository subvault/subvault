// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";

const getByName = (db: sqlite3.Database, name: string): any => {
  return JSON.parse(db.prepare("SELECT json from metadata where NAME = ?").get(name).json)
}

export const getNetworkId = (db: sqlite3.Database): number => {
  return getByName(db, "network_id");
};

export const getNetworkName = (db: sqlite3.Database): string => {
  return getByName(db, "network_name");
}