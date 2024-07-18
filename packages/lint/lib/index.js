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
      await execa("npm", ["install", "-D", "eslint-plugin-vue@9.8.0"], {
        cwd,
        stdout: "inherit",
      });
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
    log.info("正在执行eslint检查");
    // 执行工作，eslint
    const eslint = new ESLint({ cwd, overrideConfig: vueConfig });
    const results = await eslint.lintFiles(["./src/**/*.js", "./src/**/*.vue"]);
    const formatter = await eslint.loadFormatter("stylish");
    const resultText = formatter.format(results);
    const eslintResult = this.parseESLintResult(resultText);
    console.log(eslintResult);
    log.verbose("eslintResult", eslintResult);
  }

  async autoTest() {
    const cwd = process.cwd();
    // 执行自动化测试前，让用户选择采用哪种方式进行测试
    let testMode;
    const oweqianConfigFile = path.resolve(cwd, TEMP_HOME);
    let config;
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
      console.log(config);
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
    } else {
      // 3、mocha
      log.info("自动执行mocha测试");
      const mochaInstance = new Mocha();
      mochaInstance.addFile(path.resolve(cwd, "__tests__/mocha_test.js"));
      mochaInstance.run(() => {
        console.log("mocha测试执行完毕");
      });
    }
  }
  async action() {
    log.verbose("lint");
    await this.eslint();
    await this.autoTest();
  }
}

function Lint(instance) {
  return new LintCommand(instance);
}

export default Lint;
