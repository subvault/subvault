// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import { decodeAddress } from "./util";

export const importExternal = (db: sqlite3.Database, address: string) => {
  decodeAddress(db, address);
  db.prepare("INSERT INTO ext_wallets (address) VALUES (?)").run(address);
};

export const getAllAddresses = (db: sqlite3.Database): string[] => {
  const addresses = [];

  const extAddresses = db.prepare("SELECT address from ext_wallets").all();
  for (const address of extAddresses) {
    addresses.push(address.address);
  }

  const ownAddresses = db.prepare("SELECT address from own_wallets").all();
  for (const address of ownAddresses) {
    addresses.push(address.address);
  }

  return addresses;
}