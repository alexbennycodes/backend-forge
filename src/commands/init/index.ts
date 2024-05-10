import { select } from "@inquirer/prompts";
import chalk from "chalk";
import figlet from "figlet";
import { existsSync, readFileSync } from "fs";
import { AuthType, InitOptions, PMType } from "../../types.js";
import {
  createConfigFile,
  createEntryPoint,
  createPackageJSONFile,
  createTSConfigFile,
  isCurrentDirectoryEmpty,
} from "../../utils.js";
import { addPackage } from "../add/index.js";
import { addToInstallList } from "../add/utils.js";
import { askForProjectName, checkForPackageManager } from "./utils.js";

export async function initProject(options?: InitOptions) {
  // isCurrentDirectoryEmpty();
  console.clear();
  console.log("\n");
  console.log(chalk(figlet.textSync("Backend Forge", { font: "ANSI Shadow" })));
  const srcExists = false;

  const projectName = await askForProjectName();

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

  createPackageJSONFile({
    name: projectName,
    version: "1.0.0",
    description: "",
    main: "index.js",
    scripts: {
      test: 'echo "Error: no test specified" && exit 1',
    },
    keywords: [],
    author: "",
    license: "ISC",
  });

  const tsConfigExists = existsSync("tsconfig.json");
  if (!tsConfigExists) {
    createTSConfigFile({
      compilerOptions: {
        target: "es2016",
        module: "commonjs",
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        rootDir: "./src",
        outDir: "./dist",
        strict: true,
        skipLibCheck: true,
        paths: {
          "@/*": ["./src/*"],
          "@/zodSchemas": ["./prisma/zod/index"],
        },
      },
    });
  }

  const tsConfigString = readFileSync("tsconfig.json", "utf-8");
  let alias: string = "@";
  if (tsConfigString.includes("@/*")) alias = "@";
  if (tsConfigString.includes("~/*")) alias = "~";

  createEntryPoint();

  addToInstallList({
    regular: [
      "cors",
      "express",
      "express-async-handler",
      "express-validator",
      "http-status-codes",
    ],
    dev: [
      "rimraf",
      "typescript",
      "nodemon",
      "@types/cors",
      "@types/express",
      "@types/node",
      "ts-node",
    ],
  });

  createConfigFile({
    projectName: projectName,
    alias,
    analytics: true,
    auth: undefined,
    driver: undefined,
    orm: undefined,
    packages: [],
    preferredPackageManager,
    provider: undefined,
  });

  addPackage(options, true);
}
