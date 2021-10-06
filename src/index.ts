// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import yargsParser from "yargs-parser";
import { formatBalance } from "@polkadot/util";
import Keyring from "@polkadot/keyring";
import BN from "bn.js";
import { Db } from "./db";
import serverline from "./serverline";
import config from "./api/config";
import { create as createAPI } from "./api";
import { Control } from "./control";
import * as payoutCommand from "./command/payout";

type Handler = {
  command: string,
  handle: (argv: { [key: string]: string }) => Promise<void>,
};

serverline.init({});

function handleArgv(argv: yargsParser.Arguments, handlers: Handler[]): any {
  for (const handler of handlers) {
    let matched = true;
    let matchArgIndex = 0;
    const matchedValue: { [key: string]: string } = {};

    const handlerCommand = handler.command.split(" ");
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

async function processCommand(control: Control, argv: yargsParser.Arguments) {
  const { api, db, keyring } = control;

  await handleArgv(argv, [
    { 
      command: "wallet add external <name> <address>",
      handle: async (matched) => {
        const address = matched.address;
        const name = matched.name;
        const data = { address: matched.address };

        db.insertAccount("external", name, matched.address, data);
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

        db.insertAccount("polkadotjs", name, address, data);
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
      command: "wallet config set <account> <name> <value>",
      handle: async (matched) => {
        db.setAccountConfig(matched.account, matched.name, JSON.parse(matched.value));
        console.log("Finished setting config.");
      }
    },
    {
      command: "wallet rename <old> <new>",
      handle: async (matched) => {
        const wallet = db.accounts[matched.old];

        if (!wallet) {
          throw new Error("unknown wallet");
        }

        if (wallet.type === "external") {
          db.renameAccount(matched.old, matched.new);
        } else if (wallet.type === "polkadotjs") {
          db.renameAccount(matched.old, matched.new);
          const data = wallet.data;
          data.meta.name = matched.new;
          db.setAccountData(matched.new, data);
        } else {
          throw new Error("unknown account type");
        }

        console.log(`Renamed wallet ${matched.old} to ${matched.new}.`);
      }
    },
    {
      command: "addressbook add <name> <address>",
      handle: async (matched) => {
        const address = matched.address;
        const name = matched.name;
        const data = { address: matched.address };

        db.insertAccount("external", name, matched.address, data);
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
      command: "payout list <last>",
      handle: async (matched) => {
        if (matched.last === "all") {
          await payoutCommand.list(control, "all");
        } else {
          await payoutCommand.list(control, parseInt(matched.last));
        }
      }
    },
    {
      command: "payout execute <last> using <address>",
      handle: async (matched) => {
        if (matched.last === "all") {
          await payoutCommand.execute(control, "all", matched.address);
        } else {
          await payoutCommand.execute(control, parseInt(matched.last), matched.address);
        }
      }
    },
    {
      command: "transfer from <from> to <to> value <value>",
      handle: async (matched) => {
        const to = control.resolveAddress(matched.to);
        const value = new BN(matched.value).mul(new BN(10).pow(new BN(api.registry.chainDecimals[0])));
        const call = api.tx.balances.transferKeepAlive(to, value);
        await control.promptSign(call, matched.from);

        console.log("Finished send");
      },
    },
    {
      command: "proxy list <address>",
      handle: async (matched) => {
        const address = control.resolveAddress(matched.address);
        const proxies = await api.query.proxy.proxies(address);
        for (const def of proxies[0]) {
          console.log(`${def.delegate.toString()} (${def.proxyType.toString()})`);
        }
      }
    },
    {
      command: "proxy add for <proxied> address <address> type <type> delay <delay>",
      handle: async (matched) => {
        const address = control.resolveAddress(matched.address);
        const call = api.tx.proxy.addProxy(address, matched.type as any, matched.delay);
        await control.promptSign(call, matched.proxied);
        console.log("Finished");
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
      throw new Error("unknown network");
    }

    db = Db.create(argv["_"][1], { networkId: networkId, networkName: networkName });
  } else if (argv["_"][0] === "open") {
    db = Db.open(argv["_"][1]);
  } else {
    console.log("subvault: Command-line wallet management utility for Substrate.");
    console.log("");
    console.log("open <path>        Open an existing wallet.");
    console.log("create <path>      Create a new wallet.");
    return
  }

  const api = await createAPI(db.networkName);
  const keyring = new Keyring({
    ss58Format: db.networkId,
  });

  const control = new Control(api, keyring, db);

  while(true) {
    const input = await serverline.prompt();
    const argv = yargsParser(input);
    try {
      await processCommand(control, argv);
    } catch (err: any) {
      console.log(err.message);
    }
  }
};
main();
