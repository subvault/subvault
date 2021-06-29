import { ApiPromise, WsProvider } from "@polkadot/api";
import { formatBalance } from "@polkadot/util";
import { defaults as addressDefaults } from '@polkadot/util-crypto/address/defaults';
import { TypeRegistry } from "@polkadot/types/create";
import BN from "bn.js";

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

  const ss58Format = ((api.consts.system?.ss58Prefix || chainProperties.ss58Format) as any)
    .unwrapOr(DEFAULT_SS58).toNumber();
  const tokenSymbol = chainProperties.tokenSymbol.unwrapOr([formatBalance.getDefaults().unit, ...DEFAULT_AUX]);
  const tokenDecimals = chainProperties.tokenDecimals.unwrapOr([DEFAULT_DECIMALS]);

  return {
    properties: registry.createType('ChainProperties', {
      ss58Format: ss58Format,
      tokenDecimals: tokenDecimals,
      tokenSymbol: tokenSymbol
    }),
    systemChain: (systemChain || '<unknown>').toString(),
    systemChainType,
    systemName: systemName.toString(),
    systemVersion: systemVersion.toString(),
    registry: registry,
  };
}

export async function create(networkName: string): Promise<ApiPromise> {
  console.log(`Using network: ${networkName}`);

  const wsProvider = new WsProvider("wss://rpc.polkadot.io");

  const api = await ApiPromise.create({
    provider: wsProvider,
    throwOnConnect: true,
  });

  const { injectedAccounts, properties, systemChain, systemChainType, systemName, systemVersion, registry } = await retrieve(api);
  console.log(`chain: ${systemChain} (${systemChainType.toString()}), ${JSON.stringify(properties)}`);

  const ss58Format = properties.ss58Format;
  const tokenDecimals = properties.tokenDecimals;
  const tokenSymbol = properties.tokenSymbol;

  registry.setChainProperties(registry.createType('ChainProperties', { ss58Format, tokenDecimals, tokenSymbol }));
  formatBalance.setDefaults({
    decimals: (tokenDecimals as BN[]).map((b) => b.toNumber()),
    unit: tokenSymbol[0].toString()
  });

  return api;
}