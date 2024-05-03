import { consola } from "consola";
import { DBType } from "../../../../types.js";
import { createFile, readConfigFile } from "../../../../utils.js";
import { prismaFormat, prismaGenerate } from "../../../add/orm/utils.js";
import {
  formatFilePath,
  generateServiceFileNames,
  getFilePaths,
} from "../../../filePaths/index.js";
import { ExtendedSchema } from "../../types.js";
import { snakeToKebab, toCamelCase } from "../../utils.js";
import { generateModelContent } from "./schema/index.js";
import { generateServicesContent } from "./services/index.js";

export async function scaffoldModel(schema: ExtendedSchema, dbType: DBType) {
  const { tableName } = schema;
  const { orm, preferredPackageManager, driver } = readConfigFile();
  const { shared, drizzle } = getFilePaths();
  const serviceFileName = generateServiceFileNames(snakeToKebab(tableName));

  const modelPath = `${formatFilePath(shared.orm.schemaDir, {
    prefix: "rootPath",
    removeExtension: false,
  })}/${toCamelCase(tableName)}.ts`;
  createFile(modelPath, generateModelContent(schema, dbType));

  if (orm === "prisma") {
    await prismaFormat(preferredPackageManager);
    await prismaGenerate(preferredPackageManager);
  }

  // create services file
  createFile(serviceFileName, generateServicesContent(schema, driver, orm));

  consola.success("Successfully added model to your database!");
}
