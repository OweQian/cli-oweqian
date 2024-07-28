import { getGitPlatform, getGitLogin, getGitOwn } from "./GitServer.js";
import { makeList } from "../inquirer.js";
import log from "../log.js";
import Gitee from "./Gitee.js";
import Github from "./Github.js";

/**
 * 实例化 GitServer 对象、git 托管平台、git token
 */
export async function initGitServer() {
  let platform = getGitPlatform();
  if (!platform) {
    platform = await makeList({
      message: "请选择 Git 平台",
      choices: [
        {
          name: "Github",
          value: "github",
        },
        {
          name: "Gitee",
          value: "gitee",
        },
      ],
    });
  }
  log.verbose("platform", platform);

  let gitAPI;
  if (platform === "github") {
    gitAPI = new Github();
  } else {
    gitAPI = new Gitee();
  }
  gitAPI.savePlatform(platform);
  await gitAPI.init();
  return gitAPI;
}

/**
 * git 平台用户信息、git 平台组织信息
 */
export async function initGitType(gitAPI) {
  // 用户信息
  let gitOwn = getGitOwn();
  // 组织信息
  let gitLogin = getGitLogin();

  if (!gitLogin && !gitOwn) {
    const user = await gitAPI.getUser();
    const organization = await gitAPI.getOrganization();
    log.verbose("user", user);
    log.verbose("organization", organization);

    // 选择仓库类型
    if (!gitOwn) {
      gitOwn = await makeList({
        message: "请选择仓库类型",
        choices: [
          {
            name: "User",
            value: "user",
          },
          {
            name: "Organization",
            value: "organization",
          },
        ],
      });
      log.verbose("gitOwn", gitOwn);
    }

    if (gitOwn === "user") {
      gitLogin = user?.login;
    } else {
      const organizationList = organization.map((item) => ({
        name: item.name || item.login,
        value: item.login,
      }));
      gitLogin = await makeList({
        message: "请选择组织",
        choices: organizationList,
      });
    }
    log.verbose("gitLogin", gitLogin);
  }

  if (!gitLogin || !gitOwn) {
    throw new Error(
      '未获取到用户的 Git 登录信息！请使用 "cli-oweqian commit --clear" 清除缓存后重试'
    );
  }

  gitAPI.saveOwn(gitOwn);
  gitAPI.saveLogin(gitLogin);
  return gitLogin;
}

export async function createRemotoRepo(gitAPI, name) {
  const ret = await gitAPI.createRepo(name);
}
