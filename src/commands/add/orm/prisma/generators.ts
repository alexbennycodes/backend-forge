import { DBType } from "../../../../types.js";
import { prismaDbTypeMappings } from "./utils.js";

export const generatePrismaSchema = (dbType: DBType) => {
  return `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

generator zod {
  provider              = "zod-prisma"
  output                = "./zod" 
  relationModel         = true 
  modelCase             = "camelCase" 
  modelSuffix           = "Schema" 
  useDecimalJs          = true 
  prismaJsonNullability = true 
}

datasource db {
  provider = "${prismaDbTypeMappings[dbType]}"
  url      = env("DATABASE_URL")
}
`;
};

export const generatePrismaDbInstance = () => {
  return `import { PrismaClient } from "@prisma/client";

declare global {
  // allow global \`var\` declarations
  // eslint-disable-next-line no-var
  var db: PrismaClient | undefined;
}

export const db =
  global.db ||
  new PrismaClient({
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") global.db = db;
`;
};
