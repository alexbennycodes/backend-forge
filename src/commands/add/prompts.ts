import { Separator, select } from "@inquirer/prompts";
import {
  AuthType,
  DBProvider,
  DBType,
  InitOptions,
  ORMType,
  PMType,
} from "../../types.js";
import { DBProviders } from "../init/utils.js";
import { Packages } from "./utils.js";

const nullOption = { name: "None", value: null };

export const askOrm = async (options: InitOptions) => {
  return (
    options.orm ??
    ((await select({
      message: "Select an ORM to use:",
      choices: [...Packages.orm],
      default: "prisma",
    })) as ORMType)
  );
};

export const askDbType = async (options: InitOptions) => {
  return (
    options.db ??
    ((await select({
      message: "Please choose your DB type",
      choices: [{ name: "Postgres", value: "pg" }],
      default: "pg",
    })) as DBType)
  );
};

export const askDbProvider = async (
  options: InitOptions,
  dbType: DBType,
  ppm: PMType
) => {
  const dbProviders = DBProviders[dbType];
  return (
    options.dbProvider ??
    ((await select({
      message: "Please choose your DB Provider",
      choices: dbProviders,
      default: "postgresjs",
    })) as DBProvider)
  );
};

export const askAuth = async (options: InitOptions) => {
  return (
    options.auth ??
    ((await select({
      message: "Select an authentication package to use:",
      choices: [...Packages.auth, new Separator(), nullOption],
    })) as AuthType | null)
  );
};
