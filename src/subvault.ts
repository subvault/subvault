// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import readline from "readline";
import yargsParser from "yargs-parser";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { formatBalance } from "@polkadot/util";
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import BN from "bn.js";
import { createVault, openVault } from "./startup";
import { getNetworkId, getNetworkName } from "./metadata";
import { importExternal, getAllAddresses } from "./wallet";
import registry from "./registry";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

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
      command: "import external <address>",
      handle: async (matched) => {
        const address = matched.address;
        importExternal(db, address);
        console.log(`Imported address ${address}`);
      }
    },
    {
      command: "balance [address]",
      handle: async (matched) => {
        let addresses;
        if (matched.address) {
          addresses = [ matched.address ];
        } else {
          addresses = getAllAddresses(db);
        }

        for (const address of addresses) {
          const account = await api.derive.balances.all(address);
          const balanceTotal = account.freeBalance.add(account.reservedBalance);
          console.log(`${address}: ${formatBalance(balanceTotal)}`);
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

async function retrieve (api: ApiPromise): Promise<any> {
  const [chainProperties, systemChain, systemChainType, systemName, systemVersion] = await Promise.all([
    api.rpc.system.properties(),
    api.rpc.system.chain(),
    api.rpc.system.chainType
      ? api.rpc.system.chainType()
      : Promise.resolve(registry.createType('ChainType', 'Live')),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  return {
    properties: registry.createType('ChainProperties', {
      ss58Format: api.consts.system?.ss58Prefix || chainProperties.ss58Format,
      tokenDecimals: chainProperties.tokenDecimals,
      tokenSymbol: chainProperties.tokenSymbol
    }),
    systemChain: (systemChain || '<unknown>').toString(),
    systemChainType,
    systemName: systemName.toString(),
    systemVersion: systemVersion.toString()
  };
}

export const DEFAULT_DECIMALS = registry.createType('u32', 12);
export const DEFAULT_SS58 = registry.createType('u32', addressDefaults.prefix);
export const DEFAULT_AUX = ['Aux1', 'Aux2', 'Aux3', 'Aux4', 'Aux5', 'Aux6', 'Aux7', 'Aux8', 'Aux9'];

async function main() {
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
    throwOnConnect: true,
  });

  const { injectedAccounts, properties, systemChain, systemChainType, systemName, systemVersion } = await retrieve(api);
  console.log(`chain: ${systemChain} (${systemChainType.toString()}), ${JSON.stringify(properties)}`);

  const ss58Format = properties.ss58Format.unwrapOr(DEFAULT_SS58).toNumber();
  const tokenSymbol = properties.tokenSymbol.unwrapOr([formatBalance.getDefaults().unit, ...DEFAULT_AUX]);
  const tokenDecimals = properties.tokenDecimals.unwrapOr([DEFAULT_DECIMALS]);

  registry.setChainProperties(registry.createType('ChainProperties', { ss58Format, tokenDecimals, tokenSymbol }));
  formatBalance.setDefaults({
    decimals: (tokenDecimals as BN[]).map((b) => b.toNumber()),
    unit: tokenSymbol[0].toString()
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