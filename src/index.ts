import { Command } from "commander";
import { buildSchema } from "./commands/generate/index.js";
import { initProject } from "./commands/init/index.js";

const program = new Command();
program
  .name("backend-forge")
  .description("Backend Forge CLI")
  .version("0.0.01");

program
  .command("init")
  .description("initialise and configure backend-forge within directory")
  .action(initProject);

program
  .command("generate")
  .description("Generate a new resource")
  .action(buildSchema);

program.parse(process.argv);

process.on("SIGINT", () => {
  process.exit();
});
