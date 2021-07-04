// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import { ApiPromise, Keyring } from "@polkadot/api"
import { assert } from "console";
import { Db } from "./db";
import { formatBalance } from "@polkadot/util";
import serverline from "./serverline";
import { execSync } from "child_process";
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import { isAddress } from "./util";

function formatCall(indentation: number, call: any) {
  const indentString = " ".repeat(indentation);

  if (call.toRawType && call.toRawType() === "Extrinsic") {
    console.log(indentString + `${call.method.method.toString()}.${call.method.section.toString()}`);
    for (const arg of call.method.args) {
      formatCall(indentation + 2, arg);
    }
  } else if (call.toRawType && call.toRawType() === "Call") {
    console.log(indentString + `${call.method.toString()}.${call.section.toString()}`);
    for (const arg of call.args) {
      formatCall(indentation + 2, arg);
    }
  } else if (call.toRawType && (call.toRawType() === "Balance" || call.toRawType() === "Compact<Balance>")) {
    console.log(indentString + formatBalance(call));
  } else if (call.toRawType && call.toRawType().startsWith("Vec")) {
    console.log(indentString + "-");
    call.forEach((element: any) => {
      formatCall(indentation + 2, element);
    })
  } else if (Array.isArray(call)) {
    console.log(indentString + "-");
    for (const arg in call) {
      formatCall(indentation + 2, arg);
    }
  } else {
    console.log(indentString + call.toString());
  }
}

export class Control {
  readonly api: ApiPromise;
  readonly keyring: Keyring;
  readonly db: Db;

  constructor(api: ApiPromise, keyring: Keyring, db: Db) {
    this.api = api;
    this.keyring = keyring;
    this.db = db;
  }

  resolveAddress(nameOrAddress: string): string {
    if (isAddress(nameOrAddress, this.db.networkId)) {
      return nameOrAddress;
    } else {
      const wallet = this.db.accounts[nameOrAddress];
      if (wallet) {
        return wallet.address;
      } else {
        throw new Error("unresolved address")
      }
    }
  }

  async promptSign(call: SubmittableExtrinsic<"promise">, accountName: string) {
    const { api, db, keyring } = this;
    const wallet = db.accounts[accountName];

    formatCall(0, call);
    console.log(`Signing the above extrinsic using ${accountName} (${wallet.address}).`)

    const proxies = await api.query.proxy.proxies(wallet.address);
    const proxyWallets = [];

    for (const def of proxies[0]) {
      for (const account of Object.values(db.accounts) as any[]) {
        if (def.delegate.toString() === account.address) {
          proxyWallets.push({
            address: account.address,
            name: account.name,
            proxyType: def.proxyType.toString(),
          });
        }
      }
    }

    if (proxyWallets.length > 0) {
      proxyWallets.forEach((def) => {
        console.log(`${def.name}: ${def.address} (${def.proxyType})`);
      });

      const proxySelect = await serverline.question("Use an proxy for this extrinsic? ");

      if (proxySelect === "") {
        console.log("Not using a proxy.");
      } else {
        console.log(`Using proxy ${proxySelect}.`);
        await this.promptSign(api.tx.proxy.proxy(wallet.address, null, call), proxySelect);
        return
      }
    }
    
    if (wallet.type === "polkadotjs") {
      const pair = keyring.createFromJson(wallet.data);
      let passphrase: string;

      if (wallet.config.passphraseCommand) {
        await serverline.secret("Press enter to continue: ");
        passphrase = execSync(wallet.config.passphraseCommand).toString().trim();
      } else {
        passphrase = await serverline.secret("Enter the passphrase: ");
      }

      pair.unlock(passphrase);
      await call.signAndSend(pair, { nonce: -1 });
      pair.lock();
    } else {
      throw new Error("Unsupported wallet");
    }
  }
}