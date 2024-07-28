import path from "node:path";
import { ESLint } from "eslint";
import { execa } from "execa";
import ora from "ora";
import jest from "jest";
import Mocha from "mocha";
import { pathExistsSync } from "path-exists";
import fse from "fs-extra";
import Command from "@oweqian/command";
import { log, printErrorLog, makeList } from "@oweqian/utils";
import vueConfig from "./eslint/vueConfig.js";

const TEMP_HOME = ".cli-oweqian";

class LintCommand extends Command {
  get command() {
    return "lint";
  }

  get description() {
    return "lint project";
  }

  get options() {}

  extractESLint(resultText, type) {
    const problems = /([0-9]+) problems/;
    const warnings = /([0-9]+) warnings/;
    const errors = /([0-9]+) errors/;
    switch (type) {
      case "problems":
        return resultText.match(problems)[0].match(/[0-9]+/)[0];
      case "errors":
        return resultText.match(errors)[0].match(/[0-9]+/)[0];
      case "warnings":
        return resultText.match(warnings)[0].match(/[0-9]+/)[0];
      default:
        return null;
    }
  }

  parseESLintResult(resultText) {
    // eslint 检查结果分类
    const problems = this.extractESLint(resultText, "problems");
    const errors = this.extractESLint(resultText, "errors");
    const warnings = this.extractESLint(resultText, "warnings");
    return {
      problems: +problems || 0,
      errors: +errors || 0,
      warnings: +warnings || 0,
    };
  }

  async eslint() {
    const cwd = process.cwd();
    // 1、eslint
    // 准备工作，安装依赖
    const spinner = ora("正在安装依赖...").start();

    try {
      // 安装 eslint-plugin-vue@9.8.0
      await execa("npm", ["install", "-D", "eslint-plugin-vue@9.8.0"], {
        cwd,
        stdout: "inherit",
      });
      // 安装 eslint-config-airbnb-base@15.0.0
      await execa(
        "npm",
        ["install", "-D", "eslint-config-airbnb-base@15.0.0"],
        {
          cwd,
          stdout: "inherit",
        }
      );
    } catch (e) {
      printErrorLog(e);
    } finally {
      spinner.stop();
    }

    log.info("正在执行 eslint 检查");

    // 执行工作，eslint
    const eslint = new ESLint({ cwd, overrideConfig: vueConfig });
    // 匹配 src 下的所有 js、vue 文件
    const results = await eslint.lintFiles(["./src/**/*.js", "./src/**/*.vue"]);
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = formatter.format(results);
    const eslintResult = this.parseESLintResult(resultText);

    log.verbose("eslintResult", eslintResult);
    log.success(
      "eslint检查完毕",
      "问题: " + eslintResult.problems,
      "，错误: " + eslintResult.errors,
      "，警告: " + eslintResult.warnings
    );
  }

  async autoTest() {
    const cwd = process.cwd();

    // 执行自动化测试前，让用户选择采用哪种方式进行测试
    let testMode;
    let config;
    // 读取缓存文件，获取 testMode
    const oweqianConfigFile = path.resolve(cwd, TEMP_HOME);
    if (pathExistsSync(oweqianConfigFile)) {
      config = fse.readJSONSync(oweqianConfigFile);
      testMode = config.testMode;
      if (!testMode) {
        testMode = await makeList({
          message: "请选择自动化测试方法",
          choices: [
            { name: "jest", value: "jest" },
            { name: "mocha", value: "mocha" },
          ],
        });
        config.testMode = testMode;
        fse.writeJsonSync(oweqianConfigFile, config);
      }
    } else {
      testMode = await makeList({
        message: "请选择自动化测试方法",
        choices: [
          { name: "jest", value: "jest" },
          { name: "mocha", value: "mocha" },
        ],
      });
      fse.writeJsonSync(oweqianConfigFile, {
        testMode,
      });
    }

    if (testMode === "jest") {
      // 2、jest
      log.info("自动执行jest测试");
      await jest.run("test");
      log.success("jest测试执行完毕");
    } else {
      // 3、mocha
      log.info("自动执行mocha测试");
      const mochaInstance = new Mocha();
      mochaInstance.addFile(path.resolve(cwd, "__tests__/mocha_test.js"));
      mochaInstance.run(() => {
        log.success("mocha测试执行完毕");
      });
    }
  }

  async action() {
    // 代码规范检查
    await this.eslint();
    // 自动化测试
    await this.autoTest();
  }
}

function Lint(instance) {
  return new LintCommand(instance);
}

export default Lint;
