import path from "node:path";
import fse from "fs-extra";
import { pathExistsSync } from "path-exists";
import { log, makeInput, makeList } from "@oweqian/utils";
import ora from "ora";
import ejs from "ejs";
import glob from "glob";

function getCacheFilePath(targetPath, template) {
  return path.resolve(targetPath, "node_modules", template.npmName, "template");
}

function getPluginFilePath(targetPath, template) {
  return path.resolve(
    targetPath,
    "node_modules",
    template.npmName,
    "plugins",
    "index.js"
  );
}

function copyFile(targetPath, template, installDir) {
  const originFile = getCacheFilePath(targetPath, template);
  const fileList = fse.readdirSync(originFile);
  const spinner = ora("正在拷贝模版文件...").start();
  fileList.map((file) => {
    fse.copySync(`${originFile}/${file}`, `${installDir}/${file}`);
  });
  spinner.stop();
}

async function ejsRender(targetPath, installDir, template, name) {
  const { ignore } = template;
  let data;
  // 执行插件
  const pluginPath = getPluginFilePath(targetPath, template);
  if (pathExistsSync(pluginPath)) {
    // 动态加载
    const pluginFn = (await import(pluginPath)).default;
    data = await pluginFn({ makeList, makeInput });
  }
  const ejsData = {
    data: {
      name,
      ...data,
    },
  };
  let files = await glob("**", {
    cwd: installDir,
    nodir: true,
    ignore: [...ignore, "**/node_modules/**"],
  });
  files.forEach((file) => {
    const filePath = path.join(installDir, file);
    ejs.renderFile(filePath, ejsData, (err, result) => {
      if (!err) {
        fse.writeFileSync(filePath, result);
      } else {
        log.error(err);
      }
    });
  });
}
async function installTemplate(selectedTemplate, opts) {
  const { force = false } = opts;
  const { targetPath, name, template } = selectedTemplate;
  const rootDir = process.cwd();
  fse.ensureDirSync(targetPath);
  const installDir = path.resolve(`${rootDir}/${name}`);
  if (pathExistsSync(installDir)) {
    if (!force) {
      log.error(`当前目录下已存在 ${installDir} 文件夹`);
      return;
    } else {
      fse.removeSync(installDir);
      fse.ensureDirSync(installDir);
    }
  } else {
    fse.ensureDirSync(installDir);
  }
  copyFile(targetPath, template, installDir);
  await ejsRender(targetPath, installDir, template, name);
}

export default installTemplate;
