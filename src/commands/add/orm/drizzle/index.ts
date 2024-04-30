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
  const { preferredPackageManager, hasSrc, rootPath } = readConfigFile();

  let libPath = "";
  hasSrc ? (libPath = "src/lib") : (libPath = "lib");

  const databaseUrl = "postgres://postgres:postgres@localhost:5432/{DB_NAME}";

  createFolder(`${hasSrc ? "src/" : ""}lib/db/schema`);
  createFolder(`${hasSrc ? "src/" : ""}lib/api`);

  createIndexTs(dbProvider);
  createMigrateTs(libPath, dbType, dbProvider);
  createDrizzleConfig(libPath, dbProvider);

  // perhaps using push rather than migrate for sqlite?
  addScriptsToPackageJson(libPath, dbType, preferredPackageManager);
  createDotEnv(
    "drizzle",
    preferredPackageManager,
    databaseUrl,
    hasSrc ? "src/" : ""
  );
  await updateTsConfigTarget();

  addNanoidToUtils();

  updateConfigFile({ driver: dbType, provider: dbProvider, orm: "drizzle" });
  await installDependencies(dbProvider, preferredPackageManager);
  addPackageToConfig("drizzle");
};
