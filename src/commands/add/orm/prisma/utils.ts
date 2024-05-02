import fs from "fs";
import path from "path";
import { DBType } from "../../../../types.js";

export const prismaDbTypeMappings: { [key in DBType]: string } = {
  pg: "postgresql",
};

export const addScriptsToPackageJsonForPrisma = (driver: DBType) => {
  // Define the path to package.json
  const packageJsonPath = path.resolve("package.json");

  // Read package.json
  const packageJsonData = fs.readFileSync(packageJsonPath, "utf-8");

  // Parse package.json content
  let packageJson = JSON.parse(packageJsonData);

  const newItems = {
    dev: "prisma generate && nodemon src/index.ts",
    build: "prisma generate && rimraf ./dist && tsc",
    "db:generate": `prisma generate`,
    "db:migrate": `prisma migrate dev`,
    ...(driver !== "pg" ? { "db:push": `prisma db push` } : {}),
    "db:studio": "prisma studio",
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
