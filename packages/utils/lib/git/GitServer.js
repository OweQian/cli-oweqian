import path from "node:path";
import { pathExistsSync } from "path-exists";
import fse from "fs-extra";
import { homedir } from "node:os";
import { makePassword } from "../inquirer.js";
import log from "../log.js";

const TEMP_HOME = ".cli-oweqian";
const TEMP_TOKEN = ".token";
const TEMP_PLATFORM = ".git_platform";

function createTokenPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_TOKEN);
}

function createPlatformPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_PLATFORM);
}

function getGitPlatform() {
  const platformPath = createPlatformPath();
  if (pathExistsSync(platformPath)) {
    return fse.readFileSync(platformPath).toString();
  }
  return null;
}
class GitServer {
  constructor() {}

  async init() {
    // 判断token是否存在
    const tokenPath = createTokenPath();
    console.log(tokenPath);
    if (pathExistsSync(tokenPath)) {
      this.token = fse.readFileSync(tokenPath).toString();
    } else {
      this.token = await this.getToken();
      fse.writeFileSync(tokenPath, this.token);
    }
    log.verbose("token", this.token);
    log.verbose("token path", pathExistsSync(tokenPath));
  }

  getToken() {
    return makePassword({
      message: "请输入 token 的信息",
    });
  }

  savePlatform(platform) {
    this.platform = platform;
    fse.writeFileSync(createPlatformPath(), platform);
  }

  getPlatform() {
    return this.platform;
  }
}

export { getGitPlatform, GitServer };
