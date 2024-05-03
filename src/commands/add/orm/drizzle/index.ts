import { DBProvider, DBType, InitOptions } from "../../../../types.js";
import {
  addPackageToConfig,
  createFolder,
  readConfigFile,
  updateConfigFile,
} from "../../../../utils.js";
import {
  addScriptsToPackageJson,
  createDotEnv,
  createDrizzleConfig,
  createIndexTs,
  createMigrateTs,
  installDependencies,
  updateTsConfigTarget,
} from "./generators.js";
import { addNanoidToUtils } from "./utils.js";

export const addDrizzle = async (
  dbType: DBType,
  dbProvider: DBProvider,
  includeExampleModel: boolean,
  initOptions?: InitOptions
) => {
  const { preferredPackageManager, rootPath } = readConfigFile();

  const libPath = "src/lib";

  const databaseUrl = "postgres://postgres:postgres@localhost:5432/{DB_NAME}";

  createFolder("src/lib/db/schema");

  createIndexTs(dbProvider);
  createMigrateTs(libPath, dbType, dbProvider);
  createDrizzleConfig(libPath, dbProvider);

  // perhaps using push rather than migrate for sqlite?
  addScriptsToPackageJson(libPath, dbType, preferredPackageManager);
  createDotEnv("drizzle", preferredPackageManager, databaseUrl, "src/");
  await updateTsConfigTarget();

  addNanoidToUtils();

  updateConfigFile({ driver: dbType, provider: dbProvider, orm: "drizzle" });
  await installDependencies(dbProvider, preferredPackageManager);
  addPackageToConfig("drizzle");
};
