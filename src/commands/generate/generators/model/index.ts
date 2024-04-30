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
import { toCamelCase } from "../../utils.js";
import { generateMutationContent } from "./mutations/index.js";
import { generateQueryContent } from "./queries/index.js";
import { generateModelContent } from "./schema/index.js";

export async function scaffoldModel(
  schema: ExtendedSchema,
  dbType: DBType,
  hasSrc: boolean
) {
  const { tableName } = schema;
  const { orm, preferredPackageManager, driver } = readConfigFile();
  const { shared, drizzle } = getFilePaths();
  const serviceFileNames = generateServiceFileNames(toCamelCase(tableName));

  const modelPath = `${formatFilePath(shared.orm.schemaDir, {
    prefix: "rootPath",
    removeExtension: false,
  })}/${toCamelCase(tableName)}.ts`;
  createFile(modelPath, generateModelContent(schema, dbType));

  if (orm === "prisma") {
    await prismaFormat(preferredPackageManager);
    await prismaGenerate(preferredPackageManager);
  }

  // create queryFile
  createFile(serviceFileNames.queriesPath, generateQueryContent(schema, orm));

  // create mutationFile
  createFile(
    serviceFileNames.mutationsPath,
    generateMutationContent(schema, driver, orm)
  );

  consola.success("Successfully added model to your database!");
}
