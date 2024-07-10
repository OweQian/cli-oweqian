const commander = require("commander");
const semver = require("semver");
const chalk = require("chalk");

const createInitCommand = require("@oweqian/init");
const { log, isDebug } = require("@oweqian/utils");

const { program } = commander;
const pkg = require("../package.json");

const LOWEST_NODE_VERSION = "14.0.0";

function checkNodeVersion() {
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

process.on("uncaughtException", (e) => {
  if (isDebug()) {
    console.log(e);
  } else {
    console.log(e.message);
  }
});

module.exports = function (args) {
  log.info("version", pkg.version);
  program
    .name(Object.keys(pkg.bin)[0])
    .usage("<command> [options]")
    .version(pkg.version)
    .option("-d, --debug", "是否开启调试模式", false)
    .hook("preAction", preAction);

  // program
  //   .command("init [name]")
  //   .description("init project")
  //   .option("-f, --force", "是否强制更新", false)
  //   .action((name, opts) => {
  //     console.log("init...", name, opts);
  //   });

  createInitCommand(program);

  program.parse(process.argv);
};
