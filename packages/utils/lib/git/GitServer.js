import path from "node:path";
import { execa } from "execa";
import { pathExistsSync } from "path-exists";
import fse from "fs-extra";
import { homedir } from "node:os";
import { makePassword } from "../inquirer.js";
import log from "../log.js";

const TEMP_HOME = ".cli-oweqian";
const TEMP_TOKEN = ".git_token";
const TEMP_PLATFORM = ".git_platform";
const TEMP_OWN = ".git_own";
const TEMP_LOGIN = ".git_login";

function createTokenPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_TOKEN);
}

function createPlatformPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_PLATFORM);
}

function createOwnPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_OWN);
}

function createLoginPath() {
  return path.resolve(homedir(), TEMP_HOME, TEMP_LOGIN);
}

function getGitPlatform() {
  const platformPath = createPlatformPath();
  if (pathExistsSync(platformPath)) {
    return fse.readFileSync(platformPath).toString();
  }
  return null;
}

function getGitOwn() {
  const ownPath = createOwnPath();
  if (pathExistsSync(ownPath)) {
    return fse.readFileSync(ownPath).toString();
  }
}

function getGitLogin() {
  const loginPath = createLoginPath();
  if (pathExistsSync(loginPath)) {
    return fse.readFileSync(loginPath).toString();
  }
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

  saveOwn(own) {
    this.own = own;
    fse.writeFileSync(createOwnPath(), own);
  }

  saveLogin(login) {
    this.login = login;
    fse.writeFileSync(createLoginPath(), login);
  }

  getPlatform() {
    return this.platform;
  }

  getOwn() {
    return this.own;
  }

  getLogin() {
    return this.login;
  }

  cloneRepo(fullName, tag) {
    if (tag) {
      return execa("git", ["clone", this.getRepoUrl(fullName), "-b", tag]);
    }
    return execa("git", ["clone", this.getRepoUrl(fullName)]);
  }

  installDependencies(cwd, fullName) {
    const projectPath = getProjectPath(cwd, fullName);
    if (pathExistsSync(projectPath)) {
      return execa(
        "npm",
        ["install", "--registry=https://registry.npmmirror.com"],
        { cwd: projectPath }
      );
    }
  }

  async runRepo(cwd, fullName) {
    const projectPath = getProjectPath(cwd, fullName);
    const pkg = getPackageJson(cwd, fullName);
    if (pkg) {
      const { scripts, bin, name } = pkg;
      if (bin) {
        await execa(
          "npm",
          ["install", "-g", name, "--registry=https://registry.npmmirror.com"],
          {
            cwd: projectPath,
            stdout: "inherit",
          }
        );
      }
      if (scripts && scripts.dev) {
        return execa("npm", ["run", "dev"], {
          cwd: projectPath,
          stdout: "inherit",
        });
      } else if (scripts && scripts.start) {
        return execa("npm", ["run", "start"], {
          cwd: projectPath,
          stdout: "inherit",
        });
      } else {
        log.warn("未找到启动命令");
      }
    }
  }

  getUser() {
    throw new Error("gitUser must be implemented!");
  }

  getOrganization() {
    throw new Error("getOrganization must be implemented!");
  }

  createRepo() {
    throw new Error("createRepo must be implemented!");
  }
}

function getPackageJson(cwd, fullName) {
  const projectPath = getProjectPath(cwd, fullName);
  const pkgPath = path.resolve(projectPath, "package.json");
  if (pathExistsSync(pkgPath)) {
    return fse.readJSONSync(pkgPath);
  }
  return null;
}

function getProjectPath(cwd, fullName) {
  const projectName = fullName.split("/")[1];
  const projectPath = path.resolve(cwd, projectName);
  return projectPath;
}

function clearCache() {
  const platform = createPlatformPath();
  const token = createTokenPath();
  const own = createOwnPath();
  const login = createLoginPath();
  fse.removeSync(platform);
  fse.removeSync(token);
  fse.removeSync(own);
  fse.removeSync(login);
}

export { getGitPlatform, GitServer, clearCache, getGitOwn, getGitLogin };
