// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import SqliteDb, * as sqlite3 from "better-sqlite3";
import assert from "assert";
import { migrate, LATEST_VERSION } from "./migration";
import { APPLICATION_ID } from "./const";
import { getCurrentVersion, getCurrentApplicationId, getMetadataByName } from "./util";
import { decodeAddress } from "../util";

type CreateVaultOptions = {
  networkId: number,
  networkName: string,
};

export class Db {
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

    const walletAddresses = this.raw.prepare("SELECT address from accounts").all();
    for (const address of walletAddresses) {
      addresses.push(address.address);
    }
  
    return addresses;
  }

  get accounts(): any {
    const wallets = {};

    const extWallets = this.raw.prepare("SELECT name, address, type, json FROM accounts").all();
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

  accountsByTag(tagName: string): any {
    const tagId = this.raw.prepare("SELECT id FROM tags where name = ?").get(tagName).id;
    if (!tagId) {
      return {};
    }

    const wallets = {};
    const accounts = this.raw.prepare("SELECT name, address, type, json FROM accounts INNER JOIN account_tags ON account_tags.account_id = accounts.id AND account_tags.tag_id = ?")
      .all(tagId);
    for (const wallet of accounts) {
      wallets[wallet.name] = {
        type: wallet.type,
        name: wallet.name,
        address: wallet.address,
        data: JSON.parse(wallet.json),
      };
    }
    
    return wallets;
  }

  insertAccount(name: string, type: string, data: any) {
    let address: string;
    if (type === "external") {
      address = data.address;
    } else if (type === "polkadotjs") {
      address = data.address;
    } else {
      throw new Error("unsupported wallet type");
    }

    decodeAddress(address, this.networkId);

    this.raw.prepare("INSERT INTO accounts (name, address, type, json) VALUES (?, ?, ?, ?)")
      .run(name, address, type, JSON.stringify(data));
  }

  deleteAccount(name: string) {
    this.raw.prepare("DELETE FROM accounts WHERE name = ?").run(name);
  }

  addTag(walletName: string, tagName: string) {
    const walletId = this.raw.prepare("SELECT id FROM accounts WHERE name = ?").get(walletName).id;
    if (!walletId) {
      throw new Error("wallet does not exist");
    }
    this.raw.prepare("INSERT OR IGNORE INTO tags (name) VALUES (?)").run(tagName);
    const tagId = this.raw.prepare("SELECT id FROM tags WHERE name = ?").get(tagName).id;

    this.raw.prepare("INSERT OR IGNORE INTO account_tags (account_id, tag_id) VALUES (?, ?)")
      .run(walletId, tagId);
  }

  removeTag(walletName: string, tagName: string) {
    const walletId = this.raw.prepare("SELECT id FROM accounts WHERE name = ?").get(walletName).id;
    if (!walletId) {
      return
    }

    const tagId = this.raw.prepare("SELECT id FROM tags WHERE name = ?").get(tagName).id;
    if (!tagId) {
      return
    }

    this.raw.prepare("DELETE FROM account_tags WHERE account_id = ? AND tag_id = ?").run(walletId, tagId);
  }
 
  static create(path: string, options: CreateVaultOptions): Db {
    const raw = new SqliteDb(path);
    const db = new Db(raw);

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

  static open(path: string): Db {
    const raw = new SqliteDb(path);
    const db = new Db(raw);

    db.migrate();
    db.check();

    return db;
  }
}