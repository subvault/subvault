// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang

import Database, * as sqlite3 from "better-sqlite3";
import * as keyring from "@polkadot/keyring";
import { getNetworkId } from "./metadata";

export const decodeAddress = (db: sqlite3.Database, address: string): Uint8Array => {
  return keyring.decodeAddress(address, false, getNetworkId(db))
};