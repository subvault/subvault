// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import { ApiPromise, Keyring, WsProvider } from "@polkadot/api";
import { formatBalance } from "@polkadot/util";
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import { TypeRegistry } from "@polkadot/types/create";
import BN from "bn.js";
import config from "./config";

async function retrieve(api: ApiPromise): Promise<any> {
  const registry = new TypeRegistry();

  const DEFAULT_DECIMALS = registry.createType('u32', 12);
  const DEFAULT_SS58 = registry.createType('u32', addressDefaults.prefix);
  const DEFAULT_AUX = ['Aux1', 'Aux2', 'Aux3', 'Aux4', 'Aux5', 'Aux6', 'Aux7', 'Aux8', 'Aux9'];

  const [chainProperties, systemChain, systemChainType, systemName, systemVersion] = await Promise.all([
    api.rpc.system.properties(),
    api.rpc.system.chain(),
    api.rpc.system.chainType
      ? api.rpc.system.chainType()
      : Promise.resolve(registry.createType('ChainType', 'Live')),
    api.rpc.system.name(),
    api.rpc.system.version(),
  ]);

  const properties = registry.createType("ChainProperties", {
    ss58Format: api.consts.system?.ss58Prefix || chainProperties.ss58Format,
    tokenDecimals: chainProperties.tokenDecimals,
    tokenSymbol: chainProperties.tokenSymbol
  });

  const ss58Format = properties.ss58Format.unwrapOr(DEFAULT_SS58).toNumber();
  const tokenSymbol = properties.tokenSymbol.unwrapOr([formatBalance.getDefaults().unit, ...DEFAULT_AUX]);
  const tokenDecimals = properties.tokenDecimals.unwrapOr([DEFAULT_DECIMALS]);

  return {
    properties: properties,
    systemChain: (systemChain || '<unknown>').toString(),
    systemChainType,
    systemName: systemName.toString(),
    systemVersion: systemVersion.toString(),
    registry: registry,
    ss58Format: ss58Format,
    tokenSymbol: tokenSymbol,
    tokenDecimals: tokenDecimals
  };
}

export type Api = {
  network: ApiPromise,
  keyring: Keyring,
}

export async function create(networkName: string): Promise<Api> {
  const endpoint = config[networkName]?.endpoints[0];

  if (!endpoint) {
    throw new Error("Unknown network");
  }

  console.log(`Using network: ${networkName} (${endpoint})`);

  const wsProvider = new WsProvider(endpoint);

  const api = await ApiPromise.create({
    provider: wsProvider,
    throwOnConnect: true,
    types: config[networkName].types,
  });

  const { 
    injectedAccounts, 
    properties, 
    systemChain, 
    systemChainType, 
    systemName, 
    systemVersion, 
    registry,
    ss58Format,
    tokenDecimals,
    tokenSymbol
  } = await retrieve(api);
  console.log(`chain: ${systemChain} (${systemChainType.toString()}), ${JSON.stringify(properties)}`);

  registry.setChainProperties(registry.createType('ChainProperties', { ss58Format, tokenDecimals, tokenSymbol }));
  formatBalance.setDefaults({
    decimals: (tokenDecimals as BN[]).map((b) => b.toNumber()),
    unit: tokenSymbol[0].toString()
  });

  const keyring = new Keyring();

  return {
    network: api,
    keyring: keyring,
  }
}