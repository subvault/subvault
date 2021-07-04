// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import SqliteDb, * as sqlite3 from "better-sqlite3";
import assert from "assert";
import { migrate, LATEST_VERSION } from "./migration";
import { APPLICATION_ID } from "./const";
import { getCurrentVersion, getCurrentApplicationId, getMetadataByName } from "./util";
import { decodeAddress } from "../util";

export type CreateVaultOptions = {
  networkId: number,
  networkName: string,
};

export type Account = {
  name: string,
  address: string,
  type: "polkadotjs" | "external",
  data: any,
  config: any,
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

  get accounts(): { [key: string]: Account } {
    const wallets = {};

    const extWallets = this.raw.prepare("SELECT name, address, type, data, config FROM accounts").all();
    for (const wallet of extWallets) {
      wallets[wallet.name] = {
        type: wallet.type,
        name: wallet.name,
        address: wallet.address,
        data: JSON.parse(wallet.data),
        config: JSON.parse(wallet.config || "{}"),
      };
    }

    return wallets;
  }

  accountsByTag(tagName: string): { [key: string]: Account } {
    const tagId = this.raw.prepare("SELECT id FROM tags WHERE name = ?").get(tagName).id;
    if (!tagId) {
      return {};
    }

    const wallets = {};
    const accounts = this.raw.prepare("SELECT name, address, type, data, config FROM accounts INNER JOIN account_tags ON account_tags.account_id = accounts.id AND account_tags.tag_id = ?")
      .all(tagId);
    for (const wallet of accounts) {
      wallets[wallet.name] = {
        type: wallet.type,
        name: wallet.name,
        address: wallet.address,
        data: JSON.parse(wallet.data),
        config: JSON.parse(wallet.config || "{}"),
      };
    }
    
    return wallets;
  }

  accountsByType(typeName: string): { [key: string]: Account } {
    const wallets = {};
    const accounts = this.raw.prepare("SELECT name, address, type, data, config FROM accounts WHERE type = ?")
      .all(typeName);
    for (const wallet of accounts) {
      wallets[wallet.name] = {
        type: wallet.type,
        name: wallet.name,
        address: wallet.address,
        data: JSON.parse(wallet.data),
        config: JSON.parse(wallet.config || "{}"),
      };
    }

    return wallets;
  }

  setAccountConfig(accountName: string, key: string, value: any) {
    const config = JSON.parse(
      this.raw.prepare("SELECT config FROM accounts WHERE name = ?").get(accountName).config || "{}"
    );

    config[key] = value;
    this.raw.prepare("UPDATE accounts SET config = ? WHERE name = ?").run(JSON.stringify(config), accountName);
  }

  insertAccount(type: string, name: string, address: string, data: any) {
    decodeAddress(address, this.networkId);

    this.raw.prepare("INSERT INTO accounts (name, address, type, data) VALUES (?, ?, ?, ?)")
      .run(name, address, type, JSON.stringify(data));
  }

  renameAccount(oldName: string, newName: string) {
    this.raw.prepare("UPDATE accounts SET name = ? WHERE name = ?").run(newName, oldName);
  }

  setAccountData(accountName: string, data: any) {
    this.raw.prepare("UPDATE accounts SET data = ? WHERE name = ?").run(JSON.stringify(data), accountName);
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
      db.raw.prepare("INSERT INTO metadata (name, value) VALUES (?, ?)")
        .run("network_id", JSON.stringify(options.networkId));
      db.raw.prepare("INSERT Into metadata (name, value) VALUES (?, ?)")
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