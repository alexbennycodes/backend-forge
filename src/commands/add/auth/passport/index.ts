import consola from "consola";
import { InitOptions } from "../../../../types.js";
import {
  addPackageToConfig,
  createFile,
  readConfigFile,
  updateConfigFile,
} from "../../../../utils.js";
import { formatFilePath, getFilePaths } from "../../../filePaths/index.js";
import { addToPrismaSchema, updateEntryFile } from "../../../generate/utils.js";
import { addToDotEnv } from "../../orm/drizzle/generators.js";
import { addToInstallList } from "../../utils.js";
import {
  createAuthController,
  createAuthRoute,
  createDrizzleAuthSchema,
  createIsAuthMiddleware,
  createJWTFunctions,
  createPrismaAuthSchema,
} from "./generators.js";

export const addPassportAuth = async (options?: InitOptions) => {
  const {
    preferredPackageManager,
    driver,
    packages,
    orm,
    provider: dbProvider,
  } = readConfigFile();
  const rootPath = "src/";
  const { shared } = getFilePaths();

  //create controller
  createFile(
    `src/${shared.controllersDir}/auth.controller.ts`,
    createAuthController()
  );

  //create route
  createFile("src/routes/auth.route.ts", createAuthRoute());

  // add auth route to the entry point
  updateEntryFile("auth", "auth");

  //generate token in middleware
  createFile("src/lib/jwt.ts", createJWTFunctions());

  //generate isAuth middleware for protected routes
  createFile("src/middlewares/isAuth.ts", createIsAuthMiddleware());


  // create db/schema/auth.ts
  if (orm !== null) {
    if (orm === "drizzle") {
      createFile(
        formatFilePath(shared.auth.authSchema, {
          removeExtension: false,
          prefix: "rootPath",
        }),
        createDrizzleAuthSchema(driver)
      );
    }
    if (orm === "prisma") {
      addToPrismaSchema(createPrismaAuthSchema(driver), "Auth");
    }
  }

  // add to env
  addToDotEnv(
    [
      { key: "JWT_SECRET", value: "" },
      { key: "JWT_REFRESH_SECRET", value: "" },
      { key: "JWT_EXP", value: "/sign-in" },
      { key: "JWT_REFRESH_EXP", value: "/sign-up" },
    ],
    "src/"
  );

  addToInstallList({
    regular: ["passport", "jsonwebtoken", "bcrypt"],
    dev: [],
  });
  if (orm !== null) addPackageToConfig("passport");
  updateConfigFile({ auth: "passport" });

  consola.info("Authentication setup completed");
};
