import { getGitPlatform } from "./GitServer.js";
import { makeList } from "../inquirer.js";
import log from "../log.js";
import Gitee from "./Gitee.js";
import Github from "./Github.js";

export async function initGitServer() {
  let platform = getGitPlatform();
  if (!platform) {
    platform = await makeList({
      message: "请选择Git平台",
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

export async function initGitType(gitAPI) {
  const user = await gitAPI.getUser();
  const organization = await gitAPI.getOrganization();
  console.log(user, organization);
  // 让用户选择仓库类型
  // 仓库类型
  let gitOwn;
  // 仓库登录名
  let gitLogin;
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
    if (gitOwn === "user") {
      gitLogin = user?.login;
    } else {
      const organizationList = organization.map((item) => ({
        name: item.login,
        value: item.login,
      }));
      gitLogin = await makeList({
        message: "请选择组织",
        choices: organizationList,
      });
    }
    log.verbose("gitLogin", gitLogin);
    if (!gitLogin) {
      throw new Error("未获取到用户的Git登录名");
    }
  }
}
