#!/usr/bin/env node

import importLocal from "import-local";
import { filename } from "dirname-filename-esm";
import { log } from "@oweqian/utils";
import entry from "../lib/index.js";

const __filename = filename(import.meta);

// 优先加载本地脚手架版本
if (importLocal(__filename)) {
  log.info("cli", "使用本次 cli-oweqian 版本");
} else {
  entry(process.argv.slice(2));
}
