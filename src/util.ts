// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import * as keyring from "@polkadot/keyring";

export function decodeAddress(address: string, networkId: number): Uint8Array {
  return keyring.decodeAddress(address, false, networkId)
}

export function isAddress(address: string, networkId: number): boolean {
  try {
    keyring.decodeAddress(address, false, networkId);
    return true;
  } catch {
    return false;
  }
}