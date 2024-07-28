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
    if (clear) {
      clearCache();
    }
    // 阶段 1、远程仓库初始化
    await this.createRomoteRepo();
    // 阶段 2、git 初始化
    await this.initLocal();
    // 阶段 3、git 提交
    await this.commit();
    // 阶段 4、git 发布
    if (publish) {
      await this.publish();
    }
  }

  async createRomoteRepo() {
    // 1、确定 git 平台、生成 git token
    this.gitAPI = await initGitServer();

    // 2、确定仓库类型
    await initGitType(this.gitAPI);

    // 3、创建远程仓库
    const dir = process.cwd();

    const pkgPath = path.resolve(dir, "package.json");
    const pkg = fse.readJSONSync(pkgPath);
    this.name = pkg.name;
    this.version = pkg.version || "1.0.0";
    await createRemotoRepo(this.gitAPI, this.name);

    // 4、生成.gitignore
    const gitIgnorePath = path.resolve(dir, ".gitignore");
    if (!pathExistsSync(gitIgnorePath)) {
      log.info(".gitignore 不存在，开始创建");
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
      log.success(".gitignore 创建成功");
    }
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

      // 执行 git add
      await this.git.add(status.not_added);
      await this.git.add(status.created);
      await this.git.add(status.deleted);
      await this.git.add(status.modified);
      await this.git.add(status.renamed.map((item) => item.to)); // 获取renamed内容

      // 执行 git commit -m "xxx"
      let message;
      while (!message) {
        message = await makeInput({
          message: "请输入 commit 信息: ",
        });
      }
      await this.git.commit(message);
      log.success("本地 commit 提交成功");
    }
  }

  async initLocal() {
    // 生成 git remote 地址
    const remoteUrl = this.gitAPI.getRepoUrl(
      `${this.gitAPI.login}/${this.name}`
    );

    console.log(remoteUrl);
    // 初始化 git 对象
    this.git = SimpleGit(process.cwd());

    // 判断当前项目是否进行 git 初始化
    const gitDir = path.resolve(process.cwd(), ".git");
    if (!pathExistsSync(gitDir)) {
      // 执行 git init
      await this.git.init();
      log.success("完成 git 初始化");
    }

    // 获取所有 remotes
    const remotes = await this.git.getRemotes();

    if (!remotes.find((remote) => remote.name === "origin")) {
      // 执行 git add remote
      this.git.addRemote("origin", remoteUrl);
      log.success("添加 git remote", remoteUrl);
    }

    // 自动提交未提交代码
    await this.checkNotCommitted();

    // 拉取远程 main 分支
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

  syncVersionToPackageJson() {
    const dir = process.cwd();
    const pkgPath = path.resolve(dir, "package.json");
    const pkg = fse.readJSONSync(pkgPath);
    if (pkg && pkg.version !== this.version) {
      pkg.version = this.version;
      fse.writeJSONSync(pkgPath, pkg, { spaces: 2 });
    }
  }

  /**
   * 版本号数组（排序方式：ASC）
   */
  async getRomoteBranchList(type) {
    const remoteList = await this.git.listRemote(["--refs"]);
    let reg;
    // 生产 or 开发
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
      // 更新 package.json version
      this.syncVersionToPackageJson();
    }

    log.success(`代码分支获取成功 ${this.branch}`);
  }

  async checkStash() {
    log.info("检查 stash 记录");

    const stashList = await this.git.stashList();

    if (stashList.all.length > 0) {
      await this.git.stash(["pop"]);
      log.success("stash pop 成功");
    }
  }

  async checkConflicted() {
    log.info("代码冲突检查");

    const status = await this.git.status();

    if (status.conflicted.length > 0) {
      throw new Error("当前代码存在冲突，请手动处理合并后再试！");
    }

    log.success("代码冲突检查通过");
  }

  async checkoutBranch(branchName) {
    const localBranchList = await this.git.branchLocal();

    if (localBranchList.all.indexOf(branchName) >= 0) {
      await this.git.checkout(branchName);
    } else {
      await this.git.checkoutLocalBranch(branchName);
    }

    log.success(`本地分支切换到 ${branchName}`);
  }

  async pullRemoteRepo(branch = "main", options = {}) {
    // 合并远程分支代码
    log.info(`同步远程 ${branch} 分支代码`);

    await this.git.pull("origin", branch, options).catch((err) => {
      log.verbose(`git pull origin ${branch}`, err.message);
      if (err.message.indexOf(`couldn't find remote ref ${branch}`) >= 0) {
        log.warn(`获取远程 [${branch}] 分支失败`);
      }
      process.exit(0);
    });
  }

  async pullRemoteMainAndBranch() {
    // 合并远程 main 分支
    log.info(`合并 [main] -> [${this.branch}]`);
    await this.pullRemoteRepo();
    log.success("合并远程 [main] 分支成功");
    log.info("检查远程分支");

    // 合并远程开发分支
    const remoteBranchList = await this.getRomoteBranchList();
    if (remoteBranchList.indexOf(this.version) >= 0) {
      log.info(`合并 [${this.branch}] -> [${this.branch}]`);
      await this.pullRemoteRepo(this.branch);
      log.success(`合并远程 [${this.branch}] 分支成功`);
      await this.checkConflicted();
    } else {
      log.success(`不存在远程分支 [${this.branch}]`);
    }
  }

  async pushRemoteRepo(branchName) {
    log.info(`推送代码至远程 ${branchName} 分支`);
    await this.git.push("origin", branchName);
    log.success("推送代码成功");
  }

  async commit() {
    // 自动生成版本号
    await this.getCorrectVersion();
    // 检查 stash 区
    await this.checkStash();
    // 检查代码冲突
    await this.checkConflicted();
    // 自动提交未提交代码
    await this.checkNotCommitted();
    // 自动切换分支
    await this.checkoutBranch(this.branch);
    // 自动合并远程 main 分支和远程开发分支
    await this.pullRemoteMainAndBranch();
    // 推送开发分支至远程开发分支
    await this.pushRemoteRepo(this.branch);
  }

  async checkTag() {
    log.info("获取远程 tag 列表");

    const tag = `release/${this.version}`;
    const tagList = await this.getRomoteBranchList("release");

    if (tagList.includes(this.version)) {
      log.info("远程 tag 已存在", tag);
      await this.git.push(["origin", `:refs/tags/${tag}`]);
      log.success("远程 tag 已删除", tag);
    }

    const localTagList = await this.git.tags();

    if (localTagList.all.includes(tag)) {
      log.info("本地 tag 已存在", tag);
      await this.git.tag(["-d", tag]);
      log.success("本地 tag 已删除", tag);
    }

    await this.git.addTag(tag);
    log.success("本地 tag 创建成功", tag);

    await this.git.pushTags("origin");
    log.success("远程 tag 推送成功", tag);
  }

  async mergeBranchToMain() {
    log.info("开始合并代码", `[${this.branch}] -> [main]`);
    await this.git.mergeFromTo(this.branch, "main");
    log.success("代码合并成功", `[${this.branch}] -> [main]`);
  }

  async deleteLocalBranch() {
    log.info("开始删除本地分支", this.branch);
    await this.git.deleteLocalBranch(this.branch);
    log.success("删除本地分支成功", this.branch);
  }

  async deleteRemoteBranch() {
    log.info("开始删除远程分支", this.branch);
    await this.git.push(["origin", "--delete", this.branch]);
    log.success("删除远程分支成功", this.branch);
  }

  async publish() {
    // 创建 Tag 并推送至远程 Tag
    await this.checkTag();
    // 本地切换到 main 分支
    await this.checkoutBranch("main");
    // 将开发分支代码合并到 main 分支
    await this.mergeBranchToMain();
    // 推送远程 main 分支
    await this.pushRemoteRepo("main");
    // 删除本地开发分支
    await this.deleteLocalBranch();
    // 删除远程开发分支
    await this.deleteRemoteBranch();
  }
}

function Commit(instance) {
  return new CommitCommand(instance);
}

export default Commit;
