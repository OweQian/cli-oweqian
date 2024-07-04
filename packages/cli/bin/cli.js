#!/usr/bin/env node

const importLocal = require("import-local");
const entry = require("../lib/index");
const { log } = require("@oweqian/utils");

if (importLocal(__filename)) {
  log.info("cli", "使用本次 cli-oweqian 版本");
} else {
  entry(process.argv.slice(2));
}
