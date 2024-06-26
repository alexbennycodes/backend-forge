import { confirm } from "@inquirer/prompts";
import { consola } from "consola";
import { InitOptions, ORMType } from "../../types.js";
import { readConfigFile, updateConfigFile } from "../../utils.js";
import { initProject } from "../init/index.js";
import { addDrizzle } from "./orm/drizzle/index.js";
import { addPrisma } from "./orm/prisma/index.js";

import ora from "ora";
import { checkForExistingPackages } from "../init/utils.js";
import { askAuth, askDbProvider, askDbType, askOrm } from "./prompts.js";
import { installPackagesFromList, printNextSteps } from "./utils.js";
import { addPassportAuth } from "./auth/passport/index.js";

const promptUser = async (options?: InitOptions): Promise<InitOptions> => {
  const config = readConfigFile();
  // console.log(config);

  // prompt orm
  let orm: ORMType;
  orm = config.orm ? undefined : await askOrm(options);
  if (orm === null) {
    const confirmedNoORM = await confirm({
      message:
        "Are you sure you don't want to install an ORM? Note: the backend will crash.",
    });
    if (confirmedNoORM === false) {
      orm = await askOrm(options);
    } else {
      consola.fatal("ORM installation declined.");
      process.exit(0);
    }
  }

  // prompt db type
  const dbType =
    orm === null || config.driver ? undefined : await askDbType(options);

  let dbProvider =
    config.orm ||
    orm === "prisma" ||
    orm === null ||
    (await askDbProvider(options, dbType, config.preferredPackageManager));

  const auth = config.auth || !orm ? undefined : await askAuth(options);

  return {
    orm,
    auth,
    dbProvider: "postgresjs",
    db: dbType,
  };
};

export const spinner = ora();

export const addPackage = async (
  options?: InitOptions,
  init: boolean = false
) => {
  const initialConfig = readConfigFile();

  if (initialConfig) {
    if (initialConfig.packages?.length === 0)
      await checkForExistingPackages(initialConfig.rootPath);
    const config = readConfigFile();

    console.log("\n");
    const promptResponse = await promptUser(options);
    const start = Date.now();
    spinner.start();
    spinner.text = "Beginning Configuration Process";
    // check if orm
    if (config.orm === undefined) {
      if (promptResponse.orm === "drizzle") {
        spinner.text = "Configuring Drizzle ORM";

        await addDrizzle(
          promptResponse.db,
          promptResponse.dbProvider,
          promptResponse.includeExample,
          options
        );
      }
      if (promptResponse.orm === "prisma") {
        spinner.text = "Configuring Prisma";

        await addPrisma(
          promptResponse.includeExample,
          promptResponse.db,
          options
        );
      }
      if (promptResponse === null)
        updateConfigFile({ orm: null, driver: null, provider: null });
    }
    if (config.auth === undefined) {
      if (promptResponse.auth === null || promptResponse.auth === undefined) {
        updateConfigFile({ auth: null });
      } else {
        spinner.text = "Configuring Auth with passport";
        // add auth routes, schema,controller
        addPassportAuth(options);
      }
    }

    spinner.text = "Finishing configuration";

    spinner.succeed("Configuration complete");

    await installPackagesFromList();

    const end = Date.now();
    const duration = end - start;

    printNextSteps(promptResponse, duration);
  } else {
    consola.warn("No config file found, initializing project...");
    initProject(options);
  }
};
