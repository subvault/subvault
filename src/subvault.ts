// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import readline from "readline";
import yargsParser from "yargs-parser";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { formatBalance } from "@polkadot/util";
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import BN from "bn.js";
import { DB } from "./db";
import serverline from "./serverline";
import { create as createAPI } from "./api";

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

async function processCommand(db, api, argv) {
  await handleArgv(argv, [
    { 
      command: "import external <name> <address>",
      handle: async (matched) => {
        const address = matched.address;
        const name = matched.name;
        db.importExternal(name, address);
        console.log(`Imported address ${address}`);
      }
    },
    {
      command: "balance [address]",
      handle: async (matched) => {
        if (matched.address) {
          const wallet = db.wallets[matched.address];

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
          const wallets = db.wallets;

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
      command: "exit",
      handle: async (matched) => {
        process.exit(0);
      }
    },
  ]);
};

async function main() {
  const argv = yargsParser(process.argv.slice(2));

  let db: DB;
  if (argv.create) {
    db = DB.create(argv["_"][0], { networkId: argv.networkId, networkName: argv.networkName });
  } else {
    db = DB.open(argv["_"][0]);
  }

  const api = await createAPI(db.networkName);

  serverline.on('line', async (input) => {
    const argv = yargsParser(input);
    try {
      await processCommand(db, api, argv);
    } catch (err) {
      console.log(err.message);
    }
  });
};
main();