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

  get allAddresses(): string[] {
    const addresses = [];

    const extAddresses = this.raw.prepare("SELECT address from ext_wallets").all();
    for (const address of extAddresses) {
      addresses.push(address.address);
    }
  
    const ownAddresses = this.raw.prepare("SELECT address from own_wallets").all();
    for (const address of ownAddresses) {
      addresses.push(address.address);
    }
  
    return addresses;
  }

  importExternal(name: string, address: string) {
    decodeAddress(address, this.networkId);
    this.raw.prepare("INSERT INTO ext_wallets (name, address) VALUES (?, ?)").run(name, address);
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