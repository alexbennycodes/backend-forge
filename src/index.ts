#!/usr/bin/env node

import { Command } from "commander";
import { initProject } from "./commands/init/index.js";
import { buildSchema } from "./commands/generate/index.js";
import { addPackage } from "./commands/add/index.js";
import { toggleAnalytics } from "./commands/init/utils.js";

const program = new Command();
program
  .name("backend-forge")
  .description("Backend Forge CLI")
  .version("0.0.01");

program
  .command("analytics")
  .option("-t, --toggle", "toggle anonymous analytics")
  .action(toggleAnalytics);

addCommonOptions(program.command("init"))
  .description("initialise and configure backend-forge within directory")
  .action(initProject);

program
  .command("generate")
  .description("Generate a new resource")
  .action(buildSchema);

addCommonOptions(program.command("add"))
  .description("Add and setup additional packages")
  .action(addPackage);

program.parse(process.argv);

function addCommonOptions(command: Command) {
  return command
    .option("-sf, --has-src-folder", "has a src folder")
    .option(
      "-pm, --package-manager <pm>",
      "preferred package manager (npm, yarn, pnpm, bun)"
    )
    .option("-o, --orm <orm>", "preferred orm (prisma, drizzle)")
    .option("-db, --db <db>", "preferred database (pg)")
    .option("-dbp, --db-provider <db>", "database provider")
    .option("-ie, --include-example", "include example model in schema");
}

process.on("SIGINT", () => {
  // Then end process
  process.exit();
});
