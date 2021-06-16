// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import readline from "readline";
import yargsParser from "yargs-parser";
const { ApiPromise, WsProvider } = require('@polkadot/api');
const BN = require('bn.js');
import { createVault, openVault } from "./startup";
import { getNetworkId, getNetworkName } from "./metadata";
import { importExternal, getAllAddresses } from "./wallet";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const handleArgv = (argv, handlers): any => {
  for (const handler of handlers) {
    let matched = true;
    let matchArgIndex = 0;
    const matchedValue = {};

    handler.command.forEach((commandItem) => {
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

const processCommand = async (db, api, argv) => {
  await handleArgv(argv, [
    { 
      command: ["import", "external", "<address>"],
      handle: async (matched) => {
        const address = matched.address;
        importExternal(db, address);
        console.log(`Imported address ${address}`);
      }
    },
    {
      command: ["balance", "[address]"],
      handle: async (matched) => {
        for (const address of getAllAddresses(db)) {
          const account = await api.query.system.account(address);
          const total = account.data.free
            .add(account.data.reserved);
          const totalHuman = total.div(new BN(1_000_000_000_0)).toNumber();
          console.log(`${address}: ${totalHuman}`);
        }
      }
    }
  ]);
};

const main = async () => {
  const argv = yargsParser(process.argv.slice(2));

  let db: sqlite3.Database;
  if (argv.create) {
    db = createVault(argv["_"][0], { networkId: argv.networkId, networkName: argv.networkName });
  } else {
    db = openVault(argv["_"][0]);
  }

  console.log(`Using network: ${getNetworkName(db)}`);

  const wsProvider = new WsProvider("wss://rpc.polkadot.io");

  const api = await ApiPromise.create({
    provider: wsProvider,
  });

  rl.prompt();
  rl.on('line', async (input) => {
    const argv = yargsParser(input);
    try {
      await processCommand(db, api, argv);
    } catch (err) {
      console.log(err.message);
    }

    rl.prompt();
  });
};
main();