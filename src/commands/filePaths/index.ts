import { ORMType } from "../../types.js";
import { readConfigFile } from "../../utils.js";
import { Paths } from "./types.js";

export const paths: { normal: Paths } = {
  normal: {
    drizzle: {
      dbMigrate: "lib/db/migrate.ts",
      dbIndex: "lib/db/index.ts",
      migrationsDir: "lib/db/migrations",
    },
    shared: {
      orm: {
        servicesDir: "src/lib/api",
        schemaDir: "src/lib/db/schema",
      },

      init: {
        envMjs: "lib/env.mjs",
        libUtils: "lib/utils.ts",
      },
    },
    prisma: { dbIndex: "lib/db/index.ts" },
  },
};
export const getFilePaths = () => {
  return paths.normal;
};

export function removeFileExtension(filePath: string): string {
  // Check if the filePath has an extension by looking for the last dot
  const lastDotIndex = filePath.lastIndexOf(".");

  // Ensure that the dot is not the first character (hidden files) and is not part of the directory path
  if (lastDotIndex > 0 && filePath.lastIndexOf("/") < lastDotIndex) {
    // Remove the extension
    return filePath.substring(0, lastDotIndex);
  }

  // Return the original filePath if no extension was found
  return filePath;
}

export const formatFilePath = (
  filePath: string,
  opts: {
    prefix: "alias" | "rootPath";
    removeExtension: boolean;
  }
) => {
  const { alias, rootPath } = readConfigFile();
  const formattedFP = opts.removeExtension
    ? removeFileExtension(filePath)
    : filePath;
  return `${opts.prefix === "alias" ? `${alias}/` : rootPath}${formattedFP}`;
};

export const generateServiceFileNames = (newModel: string) => {
  const { shared } = getFilePaths();
  const { rootPath } = readConfigFile();
  const rootDir = rootPath.concat(shared.orm.servicesDir);
  return {
    queriesPath: `${rootDir}/${newModel}/queries.ts`,
    mutationsPath: `${rootDir}/${newModel}/mutations.ts`,
  };
};

export const getDbIndexPath = (ormToBeInstalled?: ORMType) => {
  const { drizzle, prisma } = getFilePaths();
  const { orm: ormFromConfig } = readConfigFile();
  const orm = ormToBeInstalled ? ormToBeInstalled : ormFromConfig;
  if (orm === "prisma") return prisma.dbIndex;
  if (orm === "drizzle") return drizzle.dbIndex;
  if (!orm || orm === "null") return null;
};
