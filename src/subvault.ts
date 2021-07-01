// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import readline from "readline";
import yargsParser from "yargs-parser";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { formatBalance } from "@polkadot/util";
import Keyring from "@polkadot/keyring";
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import type { SubmittableExtrinsic } from '@polkadot/api/types';
import BN from "bn.js";
import { Db } from "./db";
import serverline from "./serverline";
import config from "./api/config";
import { create as createAPI } from "./api";
import { assert } from "console";

serverline.init({});

function handleArgv(argv, handlers): any {
  for (const handler of handlers) {
    let matched = true;
    let matchArgIndex = 0;
    const matchedValue = {};

    let handlerCommand = handler.command;
    if (typeof handlerCommand === "string") {
      handlerCommand = handlerCommand.split(" ");
    }
    handlerCommand.forEach((commandItem) => {
      if (!matched) {
        return;
      }

      if (commandItem.startsWith("<") && commandItem.endsWith(">")) {
        if (matchArgIndex >= argv["_"].length) {
          matched = false;
          return;
        }

        const commandName = commandItem.substring(1, commandItem.length - 1);
        matchedValue[commandName] = argv["_"][matchArgIndex];
        matchArgIndex += 1;
      } else if (commandItem.startsWith("[") && commandItem.endsWith("]")) {
        if (matchArgIndex >= argv["_"].length) {
          return;
        }

        const commandName = commandItem.substring(1, commandItem.length - 1);
        matchedValue[commandName] = argv["_"][matchArgIndex];
        matchArgIndex += 1;
      } else {
        if (matchArgIndex >= argv["_"].length) {
          matched = false;
          return;
        }

        if (commandItem !== argv["_"][matchArgIndex]) {
          matched = false;
          return;
        }

        matchArgIndex += 1;
      }
    });

    if (matchArgIndex !== argv["_"].length) {
      matched = false;
    }

    if (matched) {
      return handler.handle(matchedValue);
    }
  }

  console.log("Invalid command");
};

function formatCall(indentation, call) {
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
  } else if (call.toRawType && call.toRawType().startsWith("Vec")) {
    console.log(indentString + "-");
    call.forEach((element) => {
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

async function signCallUsing(control: Control, call: SubmittableExtrinsic<"promise">, accountName: string) {
  const { api, db, keyring } = control;
  const wallet = db.accounts[accountName];
  assert(wallet.type === "polkadotjs");
  const pair = keyring.createFromJson(wallet.data);

  formatCall(0, call);
  console.log(`Signing the above extrinsic using ${accountName} (${wallet.address}).`)
  const passphrase = await serverline.secret("Enter the passphrase: ");
  pair.unlock(passphrase);

  await call.signAndSend(pair, { nonce: -1 });

  pair.lock();
}

async function processCommand(control: Control, argv) {
  const { api, db, keyring } = control;

  await handleArgv(argv, [
    { 
      command: "wallet add external <name> <address>",
      handle: async (matched) => {
        const address = matched.address;
        const name = matched.name;
        const data = { address: matched.address };

        db.insertAccount(name, "external", data);
        db.addTag(name, "owned");
        console.log(`Imported external wallet ${address}`);
      }
    },
    {
      command: "wallet add polkadotjs <json>",
      handle: async (matched) => {
        const data = JSON.parse(matched.json);
        const pair = keyring.createFromJson(data);
        const passphrase = await serverline.secret("Enter passphrase: ");
        pair.unlock(passphrase);
        const name = pair.meta.name as string;
        const address = pair.address.toString();

        db.insertAccount(name, "polkadotjs", data);
        db.addTag(name, "owned");
        console.log(`Imported polkadotjs wallet ${address}`);
      }
    },
    {
      command: "wallet remove <name>",
      handle: async (matched) => {
        db.deleteAccount(matched.name);
        console.log(`Deleted wallet ${matched.name}`);
      }
    },
    {
      command: "addressbook add <name> <address>",
      handle: async (matched) => {
        const address = matched.address;
        const name = matched.name;
        const data = { address: matched.address };

        db.insertAccount(name, "external", data);
        db.addTag(name, "addressbook");
        console.log(`Added addressbook ${address}`);
      }
    },
    {
      command: "addressbook remove <name>",
      handle: async (matched) => {
        db.deleteAccount(matched.name);
        console.log(`Deleted addressbook ${matched.name}`);
      },
    },
    {
      command: "balance [address]",
      handle: async (matched) => {
        if (matched.address) {
          const wallet = db.accounts[matched.address];

          if (wallet) {
            const account = await api.derive.balances.all(wallet.address);
            const balanceTotal = account.freeBalance.add(account.reservedBalance);
            console.log(`${wallet.name} (${wallet.address}): ${formatBalance(balanceTotal)}`);
          } else {
            const account = await api.derive.balances.all(matched.address);
            const balanceTotal = account.freeBalance.add(account.reservedBalance);
            console.log(`${matched.address}: ${formatBalance(balanceTotal)}`);
          }
        } else {
          const wallets = db.accountsByTag("owned");

          for (const walletName of Object.keys(wallets)) {
            const wallet = wallets[walletName];
            const account = await api.derive.balances.all(wallet.address);
            const balanceTotal = account.freeBalance.add(account.reservedBalance);
            console.log(`${wallet.name} (${wallet.address}): ${formatBalance(balanceTotal)}`);
          }
        }
      }
    },
    {
      command: "payout list",
      handle: async (matched) => {
        const wallets = db.accountsByTag("owned");
        const stashes = [];
        const stashAddresses = [];
        for (const walletName of Object.keys(wallets)) {
          stashes.push(wallets[walletName]);
          stashAddresses.push(wallets[walletName].address);
        }

        const allEras = await api.derive.staking.erasHistoric(true);
        const stakerRewards = await api.derive.staking.stakerRewardsMulti(stashAddresses, false);

        for (const [index, stakerReward] of stakerRewards.entries()) {
          const stash = stashes[index];
          console.log(`Staking rewards for stash ${stash.name} (${stash.address}):`);
          for (const reward of stakerReward) {
            console.log(`Era: ${reward.era.toString()}, Total reward: ${formatBalance(reward.eraReward)}`);
          }
          console.log();
        }
      }
    },
    {
      command: "payout execute using <address>",
      handle: async (matched) => {
        const wallets = db.accountsByTag("owned");
        const stashes = [];
        const stashAddresses = [];
        for (const walletName of Object.keys(wallets)) {
          stashes.push(wallets[walletName]);
          stashAddresses.push(wallets[walletName].address);
        }

        const allEras = await api.derive.staking.erasHistoric(true);
        const stakerRewards = await api.derive.staking.stakerRewardsMulti(stashAddresses, false);
        const claims = {};

        for (const [index, stakerReward] of stakerRewards.entries()) {
          const stash = stashes[index];
          for (const reward of stakerReward) {
            claims[stash.address] = claims[stash.address] || [];
            claims[stash.address].push(reward.era);
          }
        }

        const calls = [];
        for (const stashAddress of Object.keys(claims)) {
          for (const era of claims[stashAddress]) {
            calls.push(api.tx.staking.payoutStakers(stashAddress, era));
          }
        }

        const CHUNK = 5;
        for (let i = 0; i < calls.length; i += CHUNK) {
          const currentCalls = calls.slice(i, i + CHUNK);
          const multiCall = api.tx.utility.batch(currentCalls);
          await signCallUsing(control, multiCall, matched.address);
        }
      }
    },

    {
      command: "exit",
      handle: async (matched) => {
        console.log();
        process.exit(0);
      }
    },
  ]);
};

type Control = {
  api: ApiPromise,
  keyring: Keyring,
  db: Db,
}

async function main() {
  const argv = yargsParser(process.argv.slice(2));

  let db: Db;
  if (argv["_"][0] === "create") {
    console.log("Creating a new vault.")
    const networkName = await serverline.question("Enter the network name: ");
    const networkId = config[networkName]?.networkId;

    if (!networkId) {
      throw new Error("Unknown network");
    }

    db = Db.create(argv["_"][1], { networkId: networkId, networkName: networkName });
  } else if (argv["_"][0] === "open") {
    db = Db.open(argv["_"][1]);
  }

  const api = await createAPI(db.networkName);
  const keyring = new Keyring();

  const control = {
    api: api,
    keyring: keyring,
    db: db,
  };

  while(true) {
    const input = await serverline.prompt();
    const argv = yargsParser(input);
    try {
      await processCommand(control, argv);
    } catch (err) {
      console.log(err.message);
    }
  }
};
main();