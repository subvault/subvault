#!/usr/bin/env node

// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (c) 2021 Wei Tang
// Copyright (c) 2018-2021 @polkadot/api-cli authors & contributors

/* eslint-disable header/header */

const fs = require("fs");
const path = require("path");

const [compiled] = ["./subvault.cjs"]
  .map((file) => path.join(__dirname, file))
  .filter((file) => fs.existsSync(file));

if (compiled) {
  require(compiled);
} else {
  require("@babel/register")({
    extensions: [".js", ".ts"]
  });
  require("regenerator-runtime/runtime");
  require("./subvault");
}