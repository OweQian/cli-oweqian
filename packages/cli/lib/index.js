import createInitCommand from "@oweqian/init";
import createInstallCommand from "@oweqian/install";
import createLintCommand from "@oweqian/lint";
import createCLI from "./createCLI.js";
import "./exception.js";

export default function (args) {
  const program = createCLI();
  createInitCommand(program);
  createInstallCommand(program);
  createLintCommand(program);
  program.parse(process.argv);
}
