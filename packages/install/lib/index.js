import Command from "@oweqian/command";
import {
  log,
  Github,
  Gitee,
  makeList,
  makeInput,
  getGitPlatform,
} from "@oweqian/utils";

class InstallCommand extends Command {
  get command() {
    return "install";
  }

  get description() {
    return "install project";
  }

  get options() {}

  async action() {
    await this.generateGitAPI();
    await this.searchGitAPI();
  }
  async generateGitAPI() {
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
    this.gitAPI = gitAPI;
  }
  async searchGitAPI() {
    // 1、收集搜索关键词和开发语言
    const q = await makeInput({
      message: "请输入搜索关键词",
      validate(value) {
        if (value.length > 0) {
          return true;
        } else {
          return "请输入搜索关键词";
        }
      },
    });
    const language = await makeInput({
      message: "请输入开发语言",
    });
    log.verbose("search params", q, language, this.gitAPI.getPlatform());

    const platform = this.gitAPI.getPlatform();
    this.page = 1;
    let searchResult;
    if (platform === "github") {
      // 2、生成搜索参数
      const params = {
        q: `${q}${language ? `+language:${language}` : ""}`,
        order: "desc",
        sort: "stars",
        per_page: 5,
        page: this.page,
      };
      // github
      const searchResult = await this.gitAPI.searchRepositories({
        ...params,
      });

      console.log(searchResult);
    }
  }
}

function Install(instance) {
  return new InstallCommand(instance);
}

export default Install;
