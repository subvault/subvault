export default {
  polkadot: {
    endpoints: [
      "wss://rpc.polkadot.io",
      "wss://polkadot.api.onfinality.io/public-ws",
      "wss://polkadot.elara.patract.io",
      "wss://rpc.pinknode.io/polkadot/explorer"
    ]
  },
  kusama: {
    endpoints: [
      "wss://kusama-rpc.polkadot.io",
      "wss://kusama.api.onfinality.io/public-ws",
      "wss://kusama.elara.patract.io",
      "wss://rpc.pinknode.io/kusama/explorer"
    ]
  },
  neatcoin: {
    endpoints: [
      "wss://rpc.neatcoin.org/ws"
    ],
    types: {
      NameHash: "H256"
    }
  },
  kulupu: {
    endpoints: [
      "wss://rpc.kulupu.corepaper.org/ws"
    ]
  }
};