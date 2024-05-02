import { consola } from "consola";
import { execa } from "execa";
import fs from "fs";
import path from "path";
import stripJsonComments from "strip-json-comments";
import { DBProvider, DBType, PMType } from "../../../types.js";
import {
  pmInstallCommand,
  readConfigFile,
  replaceFile,
} from "../../../utils.js";

export const generateDbUrl = (dbType: DBType, provider?: DBProvider) => {
  const databaseUrl = "postgres://postgres:postgres@localhost:5432/{DB_NAME}";
  return databaseUrl;
};

export const prismaGenerate = async (packageManager: PMType) => {
  // consola.start(
  //   `Running Prisma generate command to generate zod-prisma types.`
  // );
  try {
    await execa(pmInstallCommand[packageManager], ["prisma", "generate"], {
      stdio: "ignore",
    });
    // consola.success(`Successfully generated zod-prisma types`);
  } catch (error) {
    consola.error(`Failed to run Prisma generate: ${error.message}`);
  }
};

export const prismaFormat = async (packageManager: PMType) => {
  // consola.start(`Running Prisma format.`);
  try {
    await execa(pmInstallCommand[packageManager], ["prisma", "format"], {
      stdio: "ignore",
    });
  } catch (error) {
    consola.error(`Failed to run Prisma format: ${error.message}`);
  }
};

export async function updateTsConfigPrismaTypeAlias() {
  // Define the path to the tsconfig.json file
  const { alias } = readConfigFile();
  const tsConfigPath = path.join(process.cwd(), "tsconfig.json");

  // Read the file
  const data = fs.readFileSync(tsConfigPath, "utf8");
  // Parse the content as JSON
  const tsConfig = JSON.parse(stripJsonComments(data));

  // Modify the target property
  tsConfig.compilerOptions.paths[`${alias}/zodSchemas`] = [
    "./prisma/zod/index",
  ];

  tsConfig.compilerOptions.baseUrl = "./";

  // Convert the modified object back to a JSON string
  const updatedContent = JSON.stringify(tsConfig, null, 2); // 2 spaces indentation

  // Write the updated content back to the file
  replaceFile(tsConfigPath, updatedContent);
  // consola.success("Updated tsconfig.json to support zod-prisma type alias.");
}
