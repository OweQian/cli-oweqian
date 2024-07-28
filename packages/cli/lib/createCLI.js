import path from "node:path";
import { program } from "commander";
import { dirname } from "dirname-filename-esm";
import semver from "semver";
import chalk from "chalk";
import fse from "fs-extra";
import { log } from "@oweqian/utils";

// 获取当前模块的目录路径
const __dirname = dirname(import.meta);
// 获取 package.json 文件路径
const pkgPath = path.resolve(__dirname, "../package.json");
// 读取 package.json 文件
const pkg = fse.readJSONSync(pkgPath);

// 定义最低 Node.js 版本
const LOWEST_NODE_VERSION = "14.0.0";

// 检查 Node.js 版本
function checkNodeVersion() {
  // 使用 semver 检查当前运行的 Node.js 版本是否满足最低要求
  if (!semver.gte(process.version, LOWEST_NODE_VERSION)) {
    throw new Error(
      chalk.red(
        `cli-oweqian 需要安装 ${LOWEST_NODE_VERSION} 以上版本的 Node.js`
      )
    );
  }
}

function preAction() {
  // 检查Node版本
  checkNodeVersion();
}

function createCLI() {
  log.info("version", pkg.version);

  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .hook("preAction", preAction);

  // 处理 debug 选项
  program.on("option:debug", function () {
    if (program.opts().debug) {
      log.verbose("debug", "launch debug mode!");
    }
  });

  // 处理未知命令
  program.on("command:*", function (obj) {
    log.error("未知的命令：" + obj[0]);
  });

  return program;
}

export default createCLI;
