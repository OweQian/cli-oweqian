#!/usr/bin/env node

import importLocal from "import-local";
import entry from "../lib/index.js";
import { filename } from "dirname-filename-esm";
import { log } from "@oweqian/utils";

const __filename = filename(import.meta);

if (importLocal(__filename)) {
  log.info("cli", "使用本次 cli-oweqian 版本");
} else {
  entry(process.argv.slice(2));
}
