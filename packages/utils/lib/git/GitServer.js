import path from "node:path";
import { execa } from "execa";
import { pathExistsSync } from "path-exists";
import fse from "fs-extra";
import { homedir } from "node:os";
import { makePassword } from "../inquirer.js";
import log from "../log.js";

const TEMP_HOME = ".cli-oweqian";
// 缓存 git token
const TEMP_TOKEN = ".git_token";
// 缓存 git 托管平台信息
const TEMP_PLATFORM = ".git_platform";
// 缓存 git 平台用户信息
const TEMP_OWN = ".git_own";
// 缓存 git 平台组织信息
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

function getProjectPath(cwd, fullName) {
  const projectName = fullName.split("/")[1];
  const projectPath = path.resolve(cwd, projectName);
  return projectPath;
}

function getPackageJson(cwd, fullName) {
  const projectPath = getProjectPath(cwd, fullName);
  const pkgPath = path.resolve(projectPath, "package.json");
  if (pathExistsSync(pkgPath)) {
    return fse.readJSONSync(pkgPath);
  }
  return null;
}

/**
 * 清除缓存
 */
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

/**
 * 封装 GitServer 类
 */
class GitServer {
  constructor() {}

  // 初始化
  async init() {
    // 判断 git token 是否存在
    const tokenPath = createTokenPath();
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

  // 克隆仓库
  cloneRepo(fullName, tag) {
    if (tag) {
      return execa("git", ["clone", this.getRepoUrl(fullName), "-b", tag]);
    }
    return execa("git", ["clone", this.getRepoUrl(fullName)]);
  }

  // 安装依赖
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

  // 启动项目
  async runRepo(cwd, fullName) {
    const projectPath = getProjectPath(cwd, fullName);
    const pkg = getPackageJson(cwd, fullName);

    if (pkg) {
      const { scripts, bin, name } = pkg;
      // 可执行文件（：脚手架
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

      // 项目
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

export { getGitPlatform, GitServer, clearCache, getGitOwn, getGitLogin };
