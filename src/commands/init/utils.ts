import { existsSync, readFileSync } from "fs";
import {
  AvailablePackage,
  Config,
  DBProvider,
  DBProviderOptions,
  DBType,
  PMType,
} from "../../types.js";
import {
  installPackages,
  readConfigFile,
  replaceFile,
  updateConfigFile,
  wrapInParenthesis,
} from "../../utils.js";
import { consola } from "consola";
import { updateTsConfigPrismaTypeAlias } from "../add/orm/utils.js";
import { addToInstallList } from "../add/utils.js";
import { addNanoidToUtils } from "../add/orm/drizzle/utils.js";
// test

export const DBProviders: DBProviderOptions = {
  pg: [{ name: "Postgres.JS", value: "postgresjs" }],
};

export const checkForExistingPackages = async (rootPath: string) => {
  consola.start("Checking project for existing packages...");
  // get package json
  const { preferredPackageManager } = readConfigFile();
  const packageJsonInitText = readFileSync("package.json", "utf-8");

  let configObj: Partial<Config> = {
    packages: [],
  };
  const packages: Partial<Record<AvailablePackage, string[]>> = {
    drizzle: ["drizzle-orm", "drizzle-kit"],
    prisma: ["prisma"],
  };

  const packageTypeMappings: Partial<Record<AvailablePackage, "orm" | null>> = {
    prisma: "orm",
    drizzle: "orm",
  };

  const pkgDependencies = JSON.parse(packageJsonInitText);
  const allDependencies = {
    regular: pkgDependencies.dependencies,
    dev: pkgDependencies.devDependencies,
  };
  const dependenciesStringified = JSON.stringify(allDependencies);
  for (const [key, terms] of Object.entries(packages)) {
    // console.log(key, terms);
    if (!terms) continue;

    // Loop over each term in the array
    let existsInProject = false;
    for (const term of terms) {
      // Check if the term is present in the text file content
      if (dependenciesStringified.includes(term)) {
        // set object
        existsInProject = true;
        // if (packageTypeMappings[key] !== null) {
        //   configObj[packageTypeMappings[key]] = key;
        //   configObj.packages.push(key as AvailablePackage);
        // }
      }
    }
    if (existsInProject && packageTypeMappings[key] !== null)
      configObj[packageTypeMappings[key]] = key;
    if (existsInProject) configObj.packages.push(key as AvailablePackage);
  }

  // check for driver
  // prisma: check schema for provider value
  // drizzle: check package json
  const providerMappings: Record<DBProvider, string> = {
    postgresjs: "postgres",
  };
  const providerDriverMappings: Record<DBProvider, DBType> = {
    postgresjs: "pg",
  };
  for (const [key, term] of Object.entries(providerMappings)) {
    // console.log(key, terms);
    if (!term) continue;

    // Loop over each term in the array
    let existsInProject = false;

    if (dependenciesStringified.includes(term)) existsInProject = true;
    if (existsInProject && providerMappings[key] !== null) {
      configObj.provider = key as DBProvider;
      configObj.driver = providerDriverMappings[key];
    }
  }

  if (configObj.packages.length > 0) {
    consola.success(
      "Successfully searched project and found the following packages already installed:"
    );
    consola.info(configObj.packages.map((pkg) => pkg).join(", "));
  } else {
    consola.success(
      "Successfully searched project and found no additional packages."
    );
  }

  // if (prisma) check db driver
  if (configObj.orm === "prisma") {
    const schemaFile = readFileSync("prisma/schema.prisma");

    schemaFile.includes(`provider = "postgresql"`)
      ? (configObj.driver = "pg")
      : null;
  }

  updateConfigFile(configObj);
};

const addZodGeneratorToPrismaSchema = () => {
  const hasSchema = existsSync("prisma/schema.prisma");
  if (!hasSchema) {
    console.error("Prisma schema not found!");
    return;
  }
  const schema = readFileSync("prisma/schema.prisma", "utf-8");
  const newSchema = schema.concat(`
generator zod {
  provider              = "zod-prisma"
  output                = "./zod"
  relationModel         = true
  modelCase             = "camelCase"
  modelSuffix           = "Schema"
  useDecimalJs          = true
  prismaJsonNullability = true
}
`);

  replaceFile("prisma/schema.prisma", newSchema);
  consola.info("Updated Prisma schema");
};

export const checkForPackageManager = (): PMType | null => {
  const bun = existsSync("bun.lockb");
  const pnpm = existsSync("pnpm-lock.yaml");
  const yarn = existsSync("yarn.lock");

  if (bun) return "bun";
  if (pnpm) return "pnpm";
  if (yarn) return "yarn";

  return null;
};
