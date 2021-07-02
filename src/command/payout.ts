// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import { Control } from "../control";
import { formatBalance } from "@polkadot/util";

export async function list(control: Control, last: number | "all") {
  const { db, api } = control;

  const wallets = db.accountsByTag("owned");
  const stashes = [];
  const stashAddresses = [];
  for (const walletName of Object.keys(wallets)) {
    stashes.push(wallets[walletName]);
    stashAddresses.push(wallets[walletName].address);
  }

  let allEras = await api.derive.staking.erasHistoric(false);
  allEras.reverse();
  if (last != "all") {
    allEras = allEras.slice(0, last);
  }

  for (const era of allEras) {
    const stakerRewards = await api.derive.staking.stakerRewardsMultiEras(stashAddresses, [ era ]);
    console.log(`Found ${stakerRewards.length} entries in era ${era}.`);
    for (const [index, stakerReward] of stakerRewards.entries()) {
      const stash = stashes[index];
      for (const reward of stakerReward) {
        console.log(`Stash ${stash.name} (${stash.address}) total reward: ${formatBalance(reward.eraReward)}`);
      }
    }
  }
}

export async function execute(control: Control, last: number | "all", usingAddress: string) {
  const { db, api } = control;

  const wallets = db.accountsByTag("owned");
  const stashes = [];
  const stashAddresses = [];
  for (const walletName of Object.keys(wallets)) {
    stashes.push(wallets[walletName]);
    stashAddresses.push(wallets[walletName].address);
  }

  let allEras = await api.derive.staking.erasHistoric(false);
  allEras.reverse();
  if (last != "all") {
    allEras = allEras.slice(0, last);
  }

  const claims = {};
  for (const era of allEras) {
    const stakerRewards = await api.derive.staking.stakerRewardsMultiEras(stashAddresses, [ era ]);
    console.log(`Found ${stakerRewards.length} entries in era ${era}.`);
    for (const [index, stakerReward] of stakerRewards.entries()) {
      for (const reward of stakerReward) {
        for (const validator of Object.keys(reward.validators)) {
          claims[validator] = claims[validator] || [];
          if (!claims[validator].includes(reward.era)) {
            claims[validator].push(reward.era);
          }
        }
      }
    }
  }

  const calls = [];
  for (const stashAddress of Object.keys(claims)) {
    for (const era of claims[stashAddress]) {
      calls.push(api.tx.staking.payoutStakers(stashAddress, era));
    }
  }

  const CHUNK = 5;
  for (let i = 0; i < calls.length; i += CHUNK) {
    const currentCalls = calls.slice(i, i + CHUNK);
    const multiCall = api.tx.utility.batch(currentCalls);
    await control.promptSign(multiCall, usingAddress);
  }

  console.log("Finished payout execution.");
}