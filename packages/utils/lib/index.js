import log from "./log.js";
import isDebug from "./isDebug.js";
import printErrorLog from "./printErrorLog.js";
import { makeList, makeInput, makePassword } from "./inquirer.js";
import { getLatestVersion } from "./npm.js";
import request from "./request.js";
import Github from "./git/Github.js";
import Gitee from "./git/Gitee.js";
import { getGitPlatform } from "./git/GitServer.js";

export {
  log,
  isDebug,
  makeList,
  makeInput,
  makePassword,
  getLatestVersion,
  printErrorLog,
  request,
  Github,
  Gitee,
  getGitPlatform,
};
