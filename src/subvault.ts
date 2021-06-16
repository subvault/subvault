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

const processCommand = async (db, api, argv) => {
  if (argv["_"][0] === "import") {
    if (argv["_"][1] === "external") {
      if (argv["_"].length == 3) {
        const address = argv["_"][2];
        importExternal(db, address);
        console.log(`Imported address ${address}`);

        return
      }
    }
  }

  if (argv["_"][0] == "balance") {
    for (const address of getAllAddresses(db)) {
      const account = await api.query.system.account(address);
      const total = account.data.free
        .add(account.data.reserved)
        .add(account.data.miscFrozen)
        .add(account.data.feeFrozen);
      const totalHuman = total.div(new BN(1_000_000_000_0)).toNumber();
      console.log(`${address}: ${totalHuman}`);
    }

    return
  }

  console.log("Invalid command");
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
  rl.on('line', (input) => {
    const argv = yargsParser(input);
    processCommand(db, api, argv);

    rl.prompt();
  });
};
main();