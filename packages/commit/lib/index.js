import Command from "@oweqian/command";
import path from "node:path";
import fse from "fs-extra";
import SimpleGit from "simple-git";
import semver from "semver";
import { pathExistsSync } from "path-exists";
import {
  log,
  initGitType,
  initGitServer,
  clearCache,
  createRemotoRepo,
  makeInput,
  makeList,
} from "@oweqian/utils";

class CommitCommand extends Command {
  get command() {
    return "commit";
  }

  get description() {
    return "commit project";
  }

  get options() {
    return [
      ["-c, --clear", "清空缓存", false],
      ["-p, --publish", "发布", false],
    ];
  }

  async action([{ clear, publish }]) {
    log.verbose("commit", clear, publish);
    if (clear) {
      clearCache();
    }
    // 阶段 1、创建远程仓库
    await this.createRomoteRepo();
    // 阶段 2、git本地初始化
    await this.initLocal();
    // 阶段 3、代码自动化提交
    await this.commit();
    // 阶段 4、代码发布
    if (publish) {
      await this.publish();
    }
  }

  async createRomoteRepo() {
    // 1、实例化Git对象
    this.gitAPI = await initGitServer();

    // 2、仓库类型选择
    await initGitType(this.gitAPI);

    // 3、创建远程仓库
    // 获取项目名称
    const dir = process.cwd();
    const pkg = fse.readJSONSync(path.resolve(dir, "package.json"));
    this.name = pkg.name;
    this.version = pkg.version || "1.0.0";
    await createRemotoRepo(this.gitAPI, this.name);

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

  async initLocal() {
    // 生成 git remote 地址
    const remoteUrl = this.gitAPI.getRepoUrl(
      `${this.gitAPI.login}/${this.name}`
    );

    // 初始化 git 对象
    this.git = SimpleGit(process.cwd());

    // 判断当前项目是否进行git初始化
    const gitDir = path.resolve(process.cwd(), ".git");
    if (!pathExistsSync(gitDir)) {
      // 实现 git 初始化
      await this.git.init();
    }

    // 获取所有 remotes
    const remotes = await this.git.getRemotes();
    if (!remotes.find((remote) => remote.name === "origin")) {
      this.git.addRemote("origin", remoteUrl);
    }

    // 检查未提交代码
    await this.checkNotCommitted();

    // 检查是否存在远程 main 分支
    const tags = await this.git.listRemote(["--refs"]);
    log.verbose("listRemotes", tags);

    if (tags.indexOf("refs/heads/main") >= 0) {
      // 拉取远程 main 分支，实现代码同步
      await this.pullRemoteRepo("main", {
        "--allow-unrelated-histories": null,
      });
    } else {
      // 推送代码到远程 main 分支
      await this.pushRemoteRepo("main");
    }
  }

  async commit() {
    // 自动生成版本号
    await this.getCorrectVersion();
    await this.checkStash();
    await this.checkConflicted();
    await this.checkNotCommitted();
    await this.checkoutBranch(this.branch);
    await this.pullRemoteMainAndBranch();
    await this.pushRemoteRepo(this.branch);
  }

  async publish() {
    await this.checkTag();
    await this.checkoutBranch("main");
    await this.mergeBranchToMain();
    await this.pushRemoteRepo("main");
    await this.deleteLocalBranch();
    await this.deleteRemoteBranch();
  }

  async mergeBranchToMain() {
    log.info("开始合并代码", `[${this.branch}] -> [main]`);
    await this.git.mergeFromTo(this.branch, "main");
  }

  async deleteLocalBranch() {
    log.info("开始删除本地分支", this.branch);
    await this.git.deleteLocalBranch(this.branch);
  }

  async deleteRemoteBranch() {
    log.info("开始删除远程分支", this.branch);
    await this.git.push(["origin", "--delete", this.branch]);
  }

  async checkTag() {
    log.info("获取远程 tag 列表");
    const tag = `release/${this.version}`;
    const tagList = await this.getRomoteBranchList("release");
    if (tagList.includes(this.version)) {
      log.info("远程 tag 已存在", tag);
      await this.git.push(["origin", `:refs/tags/${tag}`]);
    }
    const localTagList = await this.git.tags();
    if (localTagList.all.includes(tag)) {
      log.info("本地 tag 已存在", tag);
      await this.git.tag(["-d", tag]);
    }
    await this.git.addTag(tag);
    await this.git.pushTags("origin");
  }

  async pullRemoteMainAndBranch() {
    log.info(`合并 [main] -> [${this.branch}]`);
    await this.pullRemoteRepo("main");
    log.info("检查远程分支");
    const remoteBranchList = await this.getRomoteBranchList();
    if (remoteBranchList.indexOf(this.version) >= 0) {
      log.info(`合并 [${this.branch}] -> [${this.branch}]`);
      await this.pullRemoteRepo(this.branch);
      await this.checkConflicted();
    }
  }

  async pullRemoteRepo(branch = "main", options = {}) {
    // 拉取远程分支，实现代码同步
    log.info(`同步远程 ${branch} 分支代码`);
    await this.git.pull("origin", branch, options).catch((err) => {
      log.verbose(`git pull origin ${branch}`, err.message);
      if (err.message.indexOf(`couldn't find remote ref ${branch}`) >= 0) {
        log.warn(`获取远程 [${branch}]分支失败`);
      }
      process.exit(0);
    });
  }

  async checkoutBranch(branchName) {
    const localBranchList = await this.git.branchLocal();
    if (localBranchList.all.indexOf(branchName) >= 0) {
      await this.git.checkout(branchName);
    } else {
      await this.git.checkoutLocalBranch(branchName);
    }
  }

  async checkConflicted() {
    log.info("代码冲突检查");
    const status = await this.git.status();
    if (status.conflicted.length > 0) {
      throw new Error("当前代码存在冲突，请手动处理合并后再试！");
    }
  }

  async checkStash() {
    log.info("检查 stash 记录");
    const stashList = await this.git.stashList();
    console.log(stashList);
    if (stashList.all.length > 0) {
      await this.git.stash(["pop"]);
    }
  }

  async getCorrectVersion() {
    log.info("获取代码分支");
    const remoteBranchList = await this.getRomoteBranchList("release");
    let releaseVersion = null;
    if (remoteBranchList && remoteBranchList.length > 0) {
      releaseVersion = remoteBranchList[0];
    }
    const developVersion = this.version;
    if (!releaseVersion) {
      this.branch = `develop/${developVersion}`;
    } else if (semver.gt(developVersion, releaseVersion)) {
      log.info(
        `当前本地版本号大于线上最新版本号`,
        `${developVersion} > ${releaseVersion}`
      );
      this.branch = `develop/${developVersion}`;
    } else {
      log.info(
        `当前线上最新版本号大于本地版本号`,
        `${releaseVersion} > ${developVersion}`
      );
      const incType = await makeList({
        message: "自动升级版本，请选择升级版本类型",
        defaultValue: "patch",
        choices: [
          {
            name: `小版本 (${releaseVersion} -> ${semver.inc(
              releaseVersion,
              "patch"
            )})`,
            value: "patch",
          },
          {
            name: `中版本 (${releaseVersion} -> ${semver.inc(
              releaseVersion,
              "minor"
            )})`,
            value: "minor",
          },
          {
            name: `大版本 (${releaseVersion} -> ${semver.inc(
              releaseVersion,
              "major"
            )})`,
            value: "major",
          },
        ],
      });
      const incVersion = semver.inc(releaseVersion, incType);
      this.branch = `develop/${incVersion}`;
      this.version = incVersion;
      this.syncVersionToPackageJson();
    }
  }

  syncVersionToPackageJson() {
    const dir = process.cwd();
    const pkgPath = path.resolve(dir, "package.json");
    const pkg = fse.readJSONSync(pkgPath);
    if (pkg && pkg.version !== this.version) {
      pkg.version = this.version;
      fse.writeJSONSync(pkgPath, pkg, { spaces: 2 });
    }
  }

  async getRomoteBranchList(type) {
    const remoteList = await this.git.listRemote(["--refs"]);
    let reg;
    if (type === "release") {
      // release/0.0.1
      reg = /.+?refs\/tags\/release\/(\d+\.\d+\.\d+)/g;
    } else {
      // develop/0.0.1
      reg = /.+?refs\/tags\/develop\/(\d+\.\d+\.\d+)/g;
    }
    return remoteList
      .split("\n")
      .map((remote) => {
        const match = reg.exec(remote);
        reg.lastIndex = 0;
        // semver 判断是否为有效版本号
        if (match && semver.valid(match[1])) {
          return match[1];
        }
      })
      .filter(Boolean)
      .sort((a, b) => {
        // ASC
        if (semver.lte(b, a)) {
          if (a === b) return 0;
          return -1;
        }
        return 1;
      });
  }

  async checkNotCommitted() {
    const status = await this.git.status();
    if (
      status.not_added.length > 0 ||
      status.created.length > 0 ||
      status.deleted.length > 0 ||
      status.modified.length > 0 ||
      status.renamed.length > 0
    ) {
      log.verbose("status", status);
      await this.git.add(status.not_added);
      await this.git.add(status.created);
      await this.git.add(status.deleted);
      await this.git.add(status.modified);
      await this.git.add(status.renamed.map((item) => item.to)); // 获取renamed内容
      let message;
      while (!message) {
        message = await makeInput({
          message: "请输入 commit 信息: ",
        });
      }
      await this.git.commit(message);
    }
  }

  async pushRemoteRepo(branchName) {
    log.info(`推送代码至远程 ${branchName} 分支`);
    await this.git.push("origin", branchName);
  }
}

function Commit(instance) {
  return new CommitCommand(instance);
}

export default Commit;
