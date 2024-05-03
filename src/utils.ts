import { consola } from "consola";
import { execa } from "execa";
import fs from "fs";
import path from "path";
import { AvailablePackage, Config, PMType, UpdateConfig } from "./types.js";

export function isCurrentDirectoryEmpty() {
  try {
    const files = fs.readdirSync(".");
    if (files.length !== 0) {
      consola.fatal(
        "Current directory is not empty. Create a new empty directory and try again"
      );
      process.exit(0);
    }
  } catch (err) {
    consola.fatal("Something went wrong");
    process.exit(0);
  }
}

export function createFile(filePath: string, content: string) {
  const resolvedPath = path.resolve(filePath);
  const dirName = path.dirname(resolvedPath);

  // Check if the directory exists
  if (!fs.existsSync(dirName)) {
    // If not, create the directory and any nested directories that might be needed
    fs.mkdirSync(dirName, { recursive: true });
    // consola.success(`Directory ${dirName} created.`);
  }

  fs.writeFileSync(resolvedPath, content);
  // consola.success(`File created at ${filePath}`);
}

export function replaceFile(filePath: string, content: string, log = true) {
  const resolvedPath = path.resolve(filePath);
  const dirName = path.dirname(resolvedPath);

  // Check if the directory exists
  if (!fs.existsSync(dirName)) {
    // If not, create the directory and any nested directories that might be needed
    fs.mkdirSync(dirName, { recursive: true });
    // consola.success(`Directory ${dirName} created.`);
  }

  fs.writeFileSync(resolvedPath, content);
  if (log === true) {
    // consola.success(`File replaced at ${filePath}`);
  }
}

export function createFolder(relativePath: string, log = false) {
  const fullPath = path.join(process.cwd(), relativePath);
  fs.mkdirSync(fullPath, { recursive: true });
  if (log) {
    // TODO as above
    // consola.success(`Folder created at ${fullPath}`);
  }
}

export const runCommand = async (command: string, args: string[]) => {
  const formattedArgs = args.filter((a) => a !== "");
  try {
    await execa(command, formattedArgs, {
      stdio: "inherit",
    });
  } catch (error) {
    throw new Error(
      `command "${command} ${formattedArgs
        .join(" ")
        .trim()}" exited with code ${error.code}`
    );
  }
};

export async function installPackages(
  packages: { regular: string; dev: string },
  pmType: PMType
) {
  const packagesListString = packages.regular.concat(" ").concat(packages.dev);
  // consola.start(`Installing packages: ${packagesListString}...`);

  const installCommand = pmType === "npm" ? "install" : "add";

  try {
    consola.info("Installing Dependencies");
    if (packages.regular) {
      await runCommand(
        pmType,
        [installCommand].concat(packages.regular.split(" "))
      );
    }
    if (packages.dev) {
      await runCommand(
        pmType,
        [installCommand, "-D"].concat(packages.dev.split(" "))
      );
    }
    // consola.success(
    //   `Regular dependencies installed: \n${packages.regular
    //     .split(" ")
    //     .join("\n")}`
    // );
    // consola.success(
    //   `Dev dependencies installed: \n${packages.dev.split(" ").join("\n")}`
    // );
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
  }
}

export const createPackageJSONFile = (options: any) => {
  createFile("./package.json", JSON.stringify(options, null, 2));
};

export const createTSConfigFile = (options: any) => {
  createFile("./tsconfig.json", JSON.stringify(options, null, 2));
};

export const createConfigFile = (options: Config) => {
  createFile("./backend-forge.config.json", JSON.stringify(options, null, 2));
};

export const updateConfigFile = (options: UpdateConfig) => {
  const config = readConfigFile();
  const newConfig = { ...config, ...options };
  replaceFile(
    "./backend-forge.config.json",
    JSON.stringify(newConfig, null, 2),
    false
  );
};

export const readConfigFile = (): (Config & { rootPath: string }) | null => {
  // Define the path to package.json
  const configPath = path.join(process.cwd(), "backend-forge.config.json");

  if (!fs.existsSync(configPath)) {
    return null;
  }
  // Read package.json
  const configJsonData = fs.readFileSync(configPath, "utf-8");

  // Parse package.json content
  let config: Config = JSON.parse(configJsonData);

  const rootPath = config.hasSrc ? "src/" : "";
  return { ...config, rootPath };
};

export const addPackageToConfig = (packageName: AvailablePackage) => {
  const config = readConfigFile();
  updateConfigFile({ packages: [...config?.packages, packageName] });
};

export const wrapInParenthesis = (string: string) => {
  return "(" + string + ")";
};
export const pmInstallCommand = {
  pnpm: "pnpm",
  npm: "npx",
  yarn: "npx",
  bun: "bunx",
};

export const updateConfigFileAfterUpdate = () => {
  const { packages, orm } = readConfigFile();
  if (orm === undefined) {
    const updatedOrm = packages.includes("drizzle") ? "drizzle" : null;
    updateConfigFile({ orm: updatedOrm });
    consola.info("Config file updated.");
  } else {
    consola.info("Config file already up to date.");
  }
};

export const createEntryPoint = () => {
  createFile(
    "src/index.ts",
    `import cors from "cors";
import express from "express";
import errorHandler from "./middlewares/error";
import notFoundHandler from "./middlewares/not-found";

const app = express();

app.use(cors());
app.use(express.json());


app.use("*", notFoundHandler);
app.use("*", errorHandler);

// start the server
const port = process.env.PORT || 1338;

app.listen(port, () => {
  console.log("Start listening on port " + port);
});`
  );

  createFile(
    "src/middlewares/error.ts",
    `import { NextFunction, Request, Response } from "express";

async function errorHandler(
  error: Error,
  _: Request,
  res: Response,
  next: NextFunction
) {
  console.error(error);
  res.send("Something went wrong");
}

export default errorHandler;`
  );

  createFile(
    "src/middlewares/not-found.ts",
    `import { Request, Response } from "express";

async function notFoundHandler(_: Request, res: Response) {
  res.status(404).send("This router does not exist");
}

export default notFoundHandler;`
  );

  createFile(
    "src/middlewares/validator.ts",
    `import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { StatusCodes } from "http-status-codes";

function validator(schema: z.ZodObject<any, any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errorMessages = error.errors.map((issue: any) => ({
          message: \`\${issue.path.join(".")} is \${issue.message}\`,
        }));
        res
          .status(StatusCodes.BAD_REQUEST)
          .json({ error: "Invalid data", details: errorMessages });
      } else {
        res
          .status(StatusCodes.INTERNAL_SERVER_ERROR)
          .json({ error: "Internal Server Error: " + error.message });
      }
    }
  };
}

export default validator;`
  );
};
