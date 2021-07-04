// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

type Config = {
  [ networkName: string ]: {
    networkId: number,
    endpoints: string[],
    types?: any,
  }
};

const config: Config = {
  polkadot: {
    networkId: 0,
    endpoints: [
      "wss://rpc.polkadot.io",
      "wss://polkadot.api.onfinality.io/public-ws",
      "wss://polkadot.elara.patract.io",
      "wss://rpc.pinknode.io/polkadot/explorer"
    ]
  },
  kusama: {
    networkId: 2,
    endpoints: [
      "wss://kusama-rpc.polkadot.io",
      "wss://kusama.api.onfinality.io/public-ws",
      "wss://kusama.elara.patract.io",
      "wss://rpc.pinknode.io/kusama/explorer"
    ]
  },
  neatcoin: {
    networkId: 48,
    endpoints: [
      "wss://rpc.neatcoin.org/ws"
    ],
    types: {
      NameHash: "H256"
    }
  },
  kulupu: {
    networkId: 16,
    endpoints: [
      "wss://rpc.kulupu.corepaper.org/ws"
    ]
  },
  rococo: {
    networkId: 42,
    endpoints: [
      "wss://rococo-rpc.polkadot.io"
    ]
  }
};

export default config;