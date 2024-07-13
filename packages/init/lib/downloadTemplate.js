import path from "node:path";
import fse from "fs-extra";
import ora from "ora";
import { execa } from "execa";
import { pathExistsSync } from "path-exists";
import { log, printErrorLog } from "@oweqian/utils";

function getCacheDir(targetPath) {
  return path.resolve(targetPath, "node_modules");
}

function makeCacheDir(targetPath) {
  const cacheDir = getCacheDir(targetPath);
  if (!pathExistsSync(cacheDir)) {
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
  const spinner = ora("正在下载模版...").start();
  try {
    await downloadAddTemplate(targetPath, template);
    setTimeout(() => {
      spinner.stop();
    }, 2000);
  } catch (e) {
    spinner.stop();
    printErrorLog(e);
  }
}

export default downloadTemplate;
