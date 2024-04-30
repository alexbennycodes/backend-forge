import { select } from "@inquirer/prompts";
import {
  createConfigFile,
  createTSConfigFile,
  sendEvent,
} from "../../utils.js";
import { InitOptions, PMType } from "../../types.js";
import { consola } from "consola";
import { addPackage } from "../add/index.js";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { checkForPackageManager } from "./utils.js";
import figlet from "figlet";
import chalk from "chalk";

export async function initProject(options?: InitOptions) {
  const projectExists = existsSync("package.json");
  if (!projectExists) {
    consola.fatal(
      "package.json not found, run `npm init` and then run `backend-forge init` within that directory."
    );
    process.exit(0);
  }

  console.clear();
  console.log("\n");
  console.log(chalk(figlet.textSync("Backend Forge", { font: "ANSI Shadow" })));
  const srcExists = false;

  // console.log(options);
  const preferredPackageManager =
    checkForPackageManager() ||
    options?.packageManager ||
    ((await select({
      message: "Please pick your preferred package manager",
      choices: [
        { name: "NPM", value: "npm" },
        { name: "Yarn", value: "yarn" },
        { name: "PNPM", value: "pnpm" },
        { name: "Bun", value: "bun" },
      ],
    })) as PMType);
  // console.log("installing dependencies with", preferredPackageManager);

  const tsConfigExists = existsSync("tsconfig.json");
  if (!tsConfigExists) {
    consola.info("No TSConfig found..., creating TSConfig");
    createTSConfigFile({
      compilerOptions: {
        target: "es2016",
        module: "commonjs",
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        skipLibCheck: true,
        paths: {
          "@/*": ["./src/*"],
          "@/zodAutoGenSchemas": ["./prisma/zod/index"],
        },
      },
    });
  }
  const tsConfigString = readFileSync("tsconfig.json", "utf-8");
  let alias: string = "@";
  if (tsConfigString.includes("@/*")) alias = "@";
  if (tsConfigString.includes("~/*")) alias = "~";

  createConfigFile({
    alias,
    analytics: true,
    // auth: undefined,
    driver: undefined,
    hasSrc: true,
    orm: undefined,
    packages: [],
    preferredPackageManager,
    provider: undefined,
  });
  // consola.success("Backend Forge initialized!");
  // consola.info("You can now add packages.");
  addPackage(options, true);
}
