import path from "node:path";
import fse from "fs-extra";
import ora from "ora";
import ejs from "ejs";
import glob from "glob";
import { pathExistsSync } from "path-exists";
import { log, makeInput, makeList } from "@oweqian/utils";

function getCacheFilePath(targetPath, template) {
  return path.resolve(targetPath, "node_modules", template.npmName, "template");
}

function copyFile(targetPath, template, installDir) {
  // 从缓存目录找模板
  const originFile = getCacheFilePath(targetPath, template);
  // 读取 template 文件夹
  const fileList = fse.readdirSync(originFile);
  const spinner = ora("正在拷贝模板文件...").start();
  fileList.map((file) => {
    // 拷贝文件
    fse.copySync(`${originFile}/${file}`, `${installDir}/${file}`);
  });
  spinner.stop();
  log.success("模板拷贝成功");
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

async function ejsRender(targetPath, installDir, template, name) {
  // 忽略特定目录或文件
  const { ignore = [] } = template;

  let data;

  // 获取插件
  const pluginPath = getPluginFilePath(targetPath, template);
  if (pathExistsSync(pluginPath)) {
    // 动态加载
    const pluginFn = (await import(pluginPath)).default;
    // 执行插件
    data = await pluginFn({ makeList, makeInput });
  }

  const ejsData = {
    data: {
      name,
      ...data,
    },
  };

  // glob 匹配文件路径
  glob(
    "**",
    {
      cwd: installDir,
      nodir: true,
      // 忽略特定目录或文件
      ignore: [...ignore, "**/node_modules/**"],
    },
    (err, files) => {
      files.forEach((file) => {
        const filePath = path.join(installDir, file);
        log.verbose("filePath", filePath);
        // ejs 模板渲染
        ejs.renderFile(filePath, ejsData, (err, result) => {
          if (!err) {
            // result：渲染后的 html 字符串
            // 把渲染后的内容写回文件
            fse.writeFileSync(filePath, result);
          } else {
            log.error(err);
          }
        });
      });
    }
  );
}

async function installTemplate(selectedTemplate, opts) {
  // force: 是否强制安装
  const { force = false } = opts;
  const { targetPath, name, template } = selectedTemplate;

  // process.cwd()：返回 Node.js 进程的当前工作目录
  const rootDir = process.cwd();
  fse.ensureDirSync(targetPath);
  // 项目目录
  const installDir = path.resolve(`${rootDir}/${name}`);

  if (pathExistsSync(installDir)) {
    if (!force) {
      log.error(`当前目录下已存在 ${installDir} 文件夹`);
      return;
    } else {
      // 删除项目目录
      fse.removeSync(installDir);
      // 重新创建项目目录
      fse.ensureDirSync(installDir);
    }
  } else {
    // 创建项目目录
    fse.ensureDirSync(installDir);
  }

  // 拷贝模板文件
  copyFile(targetPath, template, installDir);

  // 模板动态渲染
  await ejsRender(targetPath, installDir, template, name);
}

export default installTemplate;
