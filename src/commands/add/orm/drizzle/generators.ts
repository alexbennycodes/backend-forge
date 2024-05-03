import fs from "fs";
import path from "path";
import stripJsonComments from "strip-json-comments";
import {
  DBProvider,
  DBType,
  DotEnvItem,
  ORMType,
  PMType,
} from "../../../../types.js";
import { createFile, readConfigFile, replaceFile } from "../../../../utils.js";
import {
  formatFilePath,
  getDbIndexPath,
  getFilePaths,
} from "../../../filePaths/index.js";
import { addToInstallList } from "../../utils.js";

type ConfigDriver = "pg";

const configDriverMappings = {
  postgresjs: "pg",
};

export const createDrizzleConfig = (libPath: string, provider: DBProvider) => {
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  createFile(
    "drizzle.config.ts",
    `import type { Config } from "drizzle-kit";
import { env } from "${formatFilePath(envMjs, {
      removeExtension: false,
      prefix: "alias",
    })}";

export default {
  schema: "./${libPath}/db/schema",
  out: "./${libPath}/db/migrations",
  driver: "${configDriverMappings[provider]}",
  dbCredentials: {
    "connectionString: env.DATABASE_URL",
  }
} satisfies Config;`
  );
};

export const createIndexTs = (dbProvider: DBProvider) => {
  const {
    shared: {
      init: { envMjs },
    },
    drizzle,
  } = getFilePaths();
  const dbIndex = getDbIndexPath("drizzle");
  let indexTS = "";
  switch (dbProvider) {
    case "postgresjs":
      indexTS = `import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "${formatFilePath(envMjs, {
        removeExtension: false,
        prefix: "alias",
      })}";

export const client = postgres(env.DATABASE_URL);
export const db = drizzle(client);`;
      break;
    default:
      break;
  }

  createFile(
    formatFilePath(dbIndex, { prefix: "rootPath", removeExtension: false }),
    indexTS
  );
};

export const createMigrateTs = (
  libPath: string,
  dbType: DBType,
  dbProvider: DBProvider
) => {
  const {
    drizzle: { dbMigrate, migrationsDir },
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  let imports = "";
  let connectionLogic = "";

  switch (dbProvider) {
    //done
    case "postgresjs":
      imports = `
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
`;
      connectionLogic = `
const connection = postgres(env.DATABASE_URL, { max: 1 });

const db = drizzle(connection);
`;
      break;
    //done
    default:
      break;
  }
  const template = `import { env } from "${formatFilePath(envMjs, {
    removeExtension: false,
    prefix: "alias",
  })}";
  ${imports}

const runMigrate = async () => {
  if (!env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }

  ${connectionLogic}

  console.log("⏳ Running migrations...");

  const start = Date.now();

  await migrate(db, { migrationsFolder: '${formatFilePath(migrationsDir, {
    removeExtension: false,
    prefix: "rootPath",
  })}' });

  const end = Date.now();

  console.log("✅ Migrations completed in", end - start, "ms");

  process.exit(0);
};

runMigrate().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});`;

  createFile(
    formatFilePath(dbMigrate, { prefix: "rootPath", removeExtension: false }),
    template
  );
};

export const addScriptsToPackageJson = (
  libPath: string,
  driver: DBType,
  preferredPackageManager: PMType
) => {
  // Define the path to package.json
  const packageJsonPath = path.resolve("package.json");

  // Read package.json
  const packageJsonData = fs.readFileSync(packageJsonPath, "utf-8");

  // Parse package.json content
  const packageJson = JSON.parse(packageJsonData);

  const newItems = {
    "db:generate": `drizzle-kit generate:${driver}`,
    "db:migrate": `tsx ${libPath}/db/migrate.ts`,
    "db:drop": "drizzle-kit drop",
    "db:pull": `drizzle-kit introspect:${driver}`,
    ...(driver !== "pg" ? { "db:push": `drizzle-kit push:${driver}` } : {}),
    "db:studio": "drizzle-kit studio",
    "db:check": `drizzle-kit check:${driver}`,
  };
  packageJson.scripts = {
    ...packageJson.scripts,
    ...newItems,
  };

  // Stringify the updated content
  const updatedPackageJsonData = JSON.stringify(packageJson, null, 2);

  // Write the updated content back to package.json
  fs.writeFileSync(packageJsonPath, updatedPackageJsonData);

  // consola.success("Scripts added to package.json");
};

export const installDependencies = async (
  dbType: DBProvider,
  preferredPackageManager: PMType
) => {
  const packages: {
    [key in DBProvider]: { regular: string[]; dev: string[] };
  } = {
    postgresjs: { regular: ["postgres"], dev: ["pg"] },
    // "node-postgres": { regular: ["pg"], dev: ["@types/pg"] },
  };
  // note this change hasnt been tested yet
  const dbSpecificPackage = packages[dbType];
  if (dbSpecificPackage) {
    addToInstallList({
      regular: [
        "drizzle-orm",
        "drizzle-zod",
        "@t3-oss/env-nextjs",
        "zod",
        "nanoid",
        ...dbSpecificPackage.regular,
      ],
      dev: ["drizzle-kit", "tsx", "dotenv", ...dbSpecificPackage.dev],
    });
    // await installPackages(
    //   {
    //     regular: `drizzle-orm drizzle-zod @t3-oss/env-nextjs zod ${dbSpecificPackage.regular}`,
    //     dev: `drizzle-kit tsx dotenv ${dbSpecificPackage.dev}`,
    //   },
    //   preferredPackageManager
    // );
  }
};

export const createDotEnv = (
  orm: ORMType,
  preferredPackageManager: PMType,
  databaseUrl?: string,
  rootPathOld: string = ""
) => {
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  const dburl =
    databaseUrl ?? "postgresql://postgres:postgres@localhost:5432/{DB_NAME}";

  const envPath = path.resolve(".env");
  const envExists = fs.existsSync(envPath);
  if (!envExists) createFile(".env", `DATABASE_URL=${dburl}`);

  const envmjsfilePath = formatFilePath(envMjs, {
    prefix: "rootPath",
    removeExtension: false,
  });
  const envMjsExists = fs.existsSync(envmjsfilePath);
  if (!envMjsExists)
    createFile(envmjsfilePath, generateEnvMjs(preferredPackageManager, orm));
};

export const addToDotEnv = (
  items: DotEnvItem[],
  rootPathOld?: string,
  excludeDbUrlIfBlank = false
) => {
  const { orm, preferredPackageManager } = readConfigFile();
  const {
    shared: {
      init: { envMjs },
    },
  } = getFilePaths();
  // handling dotenv
  const envPath = path.resolve(".env");
  const envExists = fs.existsSync(envPath);
  const newData = items.map((item) => `${item.key}=${item.value}`).join("\n");
  if (envExists) {
    const envData = fs.readFileSync(envPath, "utf-8");
    const updatedEnvData = `${envData}\n${newData}`;
    fs.writeFileSync(envPath, updatedEnvData);
  } else {
    fs.writeFileSync(envPath, newData);
  }
  // handling env.mjs
  const envmjsfilePath = formatFilePath(envMjs, {
    removeExtension: false,
    prefix: "rootPath",
  });
  const envMjsExists = fs.existsSync(envmjsfilePath);
  if (!envMjsExists && orm === null) {
    return;
  }
  if (!envMjsExists)
    createFile(
      envmjsfilePath,
      generateEnvMjs(preferredPackageManager, orm, excludeDbUrlIfBlank)
    );
  let envmjsfileContents = fs.readFileSync(envmjsfilePath, "utf-8");

  const formatItemForDotEnvMjs = (item: DotEnvItem) =>
    `${item.key}: ${
      item.customZodImplementation ??
      `z.string().${item.isUrl ? "url()" : "min(1)"}`
    },`;

  const formatPublicItemForRuntimeEnv = (item: DotEnvItem) =>
    `${item.key}: process.env.${item.key},`;

  const serverItems = items
    .filter((item) => !item.public)
    .map(formatItemForDotEnvMjs)
    .join("\n    ");
  const clientItems = items
    .filter((item) => item.public)
    .map(formatItemForDotEnvMjs)
    .join("\n    ");
  const runtimeEnvItems = items
    .filter((item) => item.public)
    .map(formatPublicItemForRuntimeEnv)
    .join("\n    ");

  // Construct the replacement string for both server and client sections
  const replacementStr = `    ${serverItems}\n  },\n  client: {\n    ${clientItems}`;

  // Replace content using the known pattern
  const regex = /  },\n  client: {\n/s;
  envmjsfileContents = envmjsfileContents.replace(regex, replacementStr);

  const runtimeEnvRegex = /experimental__runtimeEnv: {\n/s;
  envmjsfileContents = envmjsfileContents.replace(
    runtimeEnvRegex,
    `experimental__runtimeEnv: {\n    ${runtimeEnvItems}`
  );
  // Write the updated contents back to the file
  fs.writeFileSync(envmjsfilePath, envmjsfileContents);
};

export async function updateTsConfigTarget() {
  // Define the path to the tsconfig.json file
  const tsConfigPath = path.join(process.cwd(), "tsconfig.json");

  // Read the file
  fs.readFile(tsConfigPath, "utf8", (err, data) => {
    if (err) {
      console.error(
        `An error occurred while reading the tsconfig.json file: ${err}`
      );
      return;
    }

    // Parse the content as JSON
    const tsConfig = JSON.parse(stripJsonComments(data));

    // Modify the target property
    tsConfig.compilerOptions.target = "esnext";
    tsConfig.compilerOptions.baseUrl = "./";

    // Convert the modified object back to a JSON string
    const updatedContent = JSON.stringify(tsConfig, null, 2); // 2 spaces indentation

    // Write the updated content back to the file
    replaceFile(tsConfigPath, updatedContent);
    // consola.success(
    //   "Updated tsconfig.json target to esnext to support Drizzle-Kit."
    // );
  });
}

const generateEnvMjs = (
  preferredPackageManager: PMType,
  ormType: ORMType,
  blank = false
) => {
  return `import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";${
    preferredPackageManager !== "bun" && ormType === "drizzle"
      ? '\nimport "dotenv/config";'
      : ""
  }

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    ${blank ? "// " : ""}DATABASE_URL: z.string().min(1),
    
  },
  client: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: z.string().min(1),
  },
  // If you're using Next.js < 13.4.4, you'll need to specify the runtimeEnv manually
  // runtimeEnv: {
  //   DATABASE_URL: process.env.DATABASE_URL,
  //   NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  // },
  // For Next.js >= 13.4.4, you only need to destructure client variables:
  experimental__runtimeEnv: {
    // NEXT_PUBLIC_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_PUBLISHABLE_KEY,
  },
});
`;
};
