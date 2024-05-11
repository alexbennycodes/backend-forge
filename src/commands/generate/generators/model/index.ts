import { consola } from "consola";
import { DBType } from "../../../../types.js";
import { createFile, readConfigFile } from "../../../../utils.js";
import { prismaFormat, prismaGenerate } from "../../../add/orm/utils.js";
import {
  formatFilePath,
  generateControllerFileNames,
  getFilePaths,
} from "../../../filePaths/index.js";
import { ExtendedSchema } from "../../types.js";
import { snakeToKebab, toCamelCase } from "../../utils.js";
import { generateModelContent } from "./schema/index.js";

export async function scaffoldModel(schema: ExtendedSchema, dbType: DBType) {
  const { tableName } = schema;
  const { orm, preferredPackageManager, driver } = readConfigFile();
  const { shared, drizzle } = getFilePaths();
  const serviceFileName = generateControllerFileNames(snakeToKebab(tableName));

  const modelPath = `${formatFilePath(shared.orm.schemaDir, {
    prefix: "rootPath",
    removeExtension: false,
  })}/${toCamelCase(tableName)}.ts`;
  createFile(modelPath, generateModelContent(schema, dbType));

  if (orm === "prisma") {
    await prismaFormat(preferredPackageManager);
    await prismaGenerate(preferredPackageManager);
  }

  consola.success("Successfully added model to your database!");
}
