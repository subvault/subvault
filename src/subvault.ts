// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import readline from "readline";
import yargsParser from "yargs-parser";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { formatBalance } from "@polkadot/util";
import Keyring from "@polkadot/keyring";
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import BN from "bn.js";
import { Db } from "./db";
import serverline from "./serverline";
import config from "./api/config";
import { create as createAPI, Api } from "./api";

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

async function processCommand(db: Db, api: Api, argv) {
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
        const pair = api.keyring.createFromJson(data);
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
            const account = await api.network.derive.balances.all(wallet.address);
            const balanceTotal = account.freeBalance.add(account.reservedBalance);
            console.log(`${wallet.name} (${wallet.address}): ${formatBalance(balanceTotal)}`);
          } else {
            const account = await api.network.derive.balances.all(matched.address);
            const balanceTotal = account.freeBalance.add(account.reservedBalance);
            console.log(`${matched.address}: ${formatBalance(balanceTotal)}`);
          }
        } else {
          const wallets = db.accountsByTag("owned");

          for (const walletName of Object.keys(wallets)) {
            const wallet = wallets[walletName];
            const account = await api.network.derive.balances.all(wallet.address);
            const balanceTotal = account.freeBalance.add(account.reservedBalance);
            console.log(`${wallet.name} (${wallet.address}): ${formatBalance(balanceTotal)}`);
          }
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

  while(true) {
    const input = await serverline.prompt();
    const argv = yargsParser(input);
    try {
      await processCommand(db, api, argv);
    } catch (err) {
      console.log(err.message);
    }
  }
};
main();