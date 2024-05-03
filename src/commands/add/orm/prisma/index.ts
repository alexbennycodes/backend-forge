import { DBType, InitOptions } from "../../../../types.js";
import {
  addPackageToConfig,
  createFile,
  createFolder,
  readConfigFile,
  updateConfigFile,
} from "../../../../utils.js";
import { formatFilePath, getDbIndexPath } from "../../../filePaths/index.js";
import { addToInstallList } from "../../utils.js";
import { createDotEnv } from "../drizzle/generators.js";
import {
  generateDbUrl,
  prismaGenerate,
  updateTsConfigPrismaTypeAlias,
} from "../utils.js";
import {
  generatePrismaDbInstance,
  generatePrismaSchema,
} from "./generators.js";
import { addScriptsToPackageJsonForPrisma } from "./utils.js";

export const addPrisma = async (
  includeExampleModel: boolean,
  dbType: DBType,
  initOptions?: InitOptions
) => {
  const { preferredPackageManager } = readConfigFile();
  const dbIndex = getDbIndexPath("prisma");
  const rootPath = "src/";
  // ask for db type

  // create prisma/schema.prisma (with db type)
  createFile(`prisma/schema.prisma`, generatePrismaSchema(dbType));
  createDotEnv(
    "prisma",
    preferredPackageManager,
    generateDbUrl(dbType),
    rootPath
  );

  // create .env with database_url

  // generate prisma global instance
  createFile(
    formatFilePath(dbIndex, {
      prefix: "rootPath",
      removeExtension: false,
    }),
    generatePrismaDbInstance()
  );

  // update tsconfig with import alias for prisma types
  await updateTsConfigPrismaTypeAlias();

  // create all the files here

  createFolder("src/lib/db/schema");

  addScriptsToPackageJsonForPrisma(dbType);

  // install packages: regular: [] dev: [prisma, zod-prisma]
  // await installPackages(
  //   { regular: "zod @t3-oss/env-nextjs", dev: "prisma zod-prisma" },
  //   preferredPackageManager,
  // );
  addToInstallList({
    regular: ["zod", "@t3-oss/env-nextjs"],
    dev: ["prisma", "zod-prisma"],
  });

  // run prisma generate
  if (includeExampleModel) await prismaGenerate(preferredPackageManager);

  addPackageToConfig("prisma");
  updateConfigFile({ orm: "prisma", driver: dbType });

  // consola.success("Prisma has been added to your project!");
};
