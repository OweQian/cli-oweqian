const log = require("npmlog");

if (process.argv.includes("--debug") || process.argv.includes("-d")) {
  log.level = "verbose";
} else {
  log.level = "info";
}

log.heading = "oweqian";

module.exports = log;
