import createInitCommand from "@oweqian/init";
import createInstallCommand from "@oweqian/install";
import createLintCommand from "@oweqian/lint";
import createCommitCommand from "@oweqian/commit";
import createCLI from "./createCLI.js";
import "./exception.js";

export default function (args) {
  const program = createCLI();
  // 项目创建工具
  createInitCommand(program);
  // 源码下载工具
  createInstallCommand(program);
  // 代码规范检查工具
  createLintCommand(program);
  // 代码提交工具
  createCommitCommand(program);
  program.parse(process.argv);
}
