// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import SqliteDB, * as sqlite3 from "better-sqlite3";
import assert from "assert";
import { migrate } from "./migration";
import { LATEST_VERSION, APPLICATION_ID } from "./const";
import { getCurrentVersion, getCurrentApplicationId, getMetadataByName } from "./util";
import { decodeAddress } from "../util";

type CreateVaultOptions = {
  networkId: number,
  networkName: string,
};

export class DB {
  private readonly raw: sqlite3.Database;
  private constructor(raw: sqlite3.Database) {
    this.raw = raw;
  }

  private check() {
    assert.strictEqual(this.currentApplicationId, APPLICATION_ID);
    assert.strictEqual(this.currentVersion, LATEST_VERSION);
    assert(typeof this.networkId, "number");
    assert(typeof this.networkName, "string");
  }

  private migrate() {
    migrate(this.raw);
  }

  get currentApplicationId(): number {
    return getCurrentApplicationId(this.raw);
  }

  get currentVersion(): number {
    return getCurrentVersion(this.raw);
  }

  get networkId(): number {
    return getMetadataByName(this.raw, "network_id");
  }

  get networkName(): string {
    return getMetadataByName(this.raw, "network_name");
  }

  get addresses(): string[] {
    const addresses = [];

    const walletAddresses = this.raw.prepare("SELECT address from wallets").all();
    for (const address of walletAddresses) {
      addresses.push(address.address);
    }
  
    return addresses;
  }

  get wallets(): any {
    const wallets = {};

    const extWallets = this.raw.prepare("SELECT name, address, type, json from wallets").all();
    for (const wallet of extWallets) {
      wallets[wallet.name] = {
        type: wallet.type,
        name: wallet.name,
        address: wallet.address,
        data: JSON.parse(wallet.json),
      };
    }

    return wallets;
  }

  insertWallet(name: string, type: string, data: any) {
    let address: string;
    if (type === "external") {
      address = data.address;
    } else {
      throw new Error("Unsupported wallet type");
    }

    decodeAddress(address, this.networkId);

    this.raw.prepare("INSERT INTO wallets (name, address, type, json) VALUES (?, ?, ?, ?)")
      .run(name, address, type, JSON.stringify(data));
  }

  deleteWallet(name: string) {
    this.raw.prepare("DELETE FROM wallets WHERE name = ?").run(name);
  }
 
  static create(path: string, options: CreateVaultOptions): DB {
    const raw = new SqliteDB(path);
    const db = new DB(raw);

    db.raw.pragma(`application_id = ${APPLICATION_ID}`);
    db.migrate();
    db.raw.transaction(() => {
      db.raw.prepare("INSERT INTO metadata (name, json) VALUES (?, ?)")
        .run("network_id", JSON.stringify(options.networkId));
      db.raw.prepare("INSERT Into metadata (name, json) VALUES (?, ?)")
        .run("network_name", JSON.stringify(options.networkName));
    })();

    db.check();

    return db;
  }

  static open(path: string): DB {
    const raw = new SqliteDB(path);
    const db = new DB(raw);

    db.migrate();
    db.check();

    return db;
  }
}