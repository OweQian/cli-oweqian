import Command from "@oweqian/command";
import { log, initGitType, initGitServer, clearCache } from "@oweqian/utils";

class CommitCommand extends Command {
  get command() {
    return "commit";
  }

  get description() {
    return "commit project";
  }

  get options() {
    return [["-c, --clear", "清空缓存", false]];
  }

  async action([{ clear }]) {
    log.verbose("commit");
    if (clear) {
      clearCache();
    }
    // 获取用户主目录
    await this.createRomoteRepo();
  }

  // 阶段 1、创建远程仓库
  async createRomoteRepo() {
    // 1、实例化Git对象
    this.gitAPI = await initGitServer();
    // 2、仓库类型选择
    await initGitType(this.gitAPI);
  }
}

function Commit(instance) {
  return new CommitCommand(instance);
}

export default Commit;
