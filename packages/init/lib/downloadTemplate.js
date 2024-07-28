import path from "node:path";
import fse from "fs-extra";
import ora from "ora";
import { execa } from "execa";
import { pathExistsSync } from "path-exists";
import { log, printErrorLog } from "@oweqian/utils";

/**
 * 🐞 下载的文件夹下需要安装node_modules目录，否则直接使用 npm install 无法下载成功
 */
function getCacheDir(targetPath) {
  return path.resolve(targetPath, "node_modules");
}

function makeCacheDir(targetPath) {
  const cacheDir = getCacheDir(targetPath);
  // 判断文件夹是否存在
  if (!pathExistsSync(cacheDir)) {
    // 创建文件夹
    fse.mkdirpSync(cacheDir);
  }
}

async function downloadAddTemplate(targetPath, selectedTemplate) {
  const { npmName, version } = selectedTemplate;
  const installCommand = "npm";
  const installArgs = ["install", `${npmName}@${version}`];
  const cwd = targetPath;
  log.verbose("installArgs", installArgs);
  log.verbose("cwd", cwd);
  await execa(installCommand, installArgs, { cwd });
}

async function downloadTemplate(selectedTemplate) {
  const { targetPath, template } = selectedTemplate;
  makeCacheDir(targetPath);

  // 下载进度显示
  const spinner = ora("正在下载模板...").start();

  try {
    // 下载模板至缓存目录
    await downloadAddTemplate(targetPath, template);
    log.success("下载模板成功");
  } catch (e) {
    printErrorLog(e);
  } finally {
    spinner.stop();
  }
}

export default downloadTemplate;
