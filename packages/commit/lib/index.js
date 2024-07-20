import Command from "@oweqian/command";
import path from "node:path";
import fse from "fs-extra";
import { pathExistsSync } from "path-exists";
import {
  log,
  initGitType,
  initGitServer,
  clearCache,
  createRemotoRepo,
} from "@oweqian/utils";

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
    // 3、创建远程仓库
    // 获取项目名称
    const dir = process.cwd();
    const pkg = fse.readJSONSync(path.resolve(dir, "package.json"));
    await createRemotoRepo(this.gitAPI, pkg.name);
    // 4、生成.gitignore
    const gitIgnorePath = path.resolve(dir, ".gitignore");
    if (!pathExistsSync(gitIgnorePath)) {
      log.info(".gitignore不存在，开始创建");
      fse.writeFileSync(
        gitIgnorePath,
        `.DS_Store
      node_modules
      /dist
      
      
      # local env files
      .env.local
      .env.*.local
      
      # Log files
      npm-debug.log*
      yarn-debug.log*
      yarn-error.log*
      pnpm-debug.log*
      
      # Editor directories and files
      .idea
      .vscode
      *.suo
      *.ntvs*
      *.njsproj
      *.sln
      *.sw?`
      );
    }
  }
}

function Commit(instance) {
  return new CommitCommand(instance);
}

export default Commit;
