import { DBType } from "../../../types.js";
import { createFile, readConfigFile } from "../../../utils.js";
import { formatFilePath, getFilePaths } from "../../filePaths/index.js";
import { Schema } from "../types.js";
import { formatTableName, snakeToKebab, toCamelCase } from "../utils.js";

export const scaffoldAPIRoute = (schema: Schema) => {
  const { driver } = readConfigFile();
  const { tableName } = schema;
  const path = `src/routes/${snakeToKebab(tableName)}.route.ts`;
  createFile(path, generateRouteContent(schema, driver));
};

const generateRouteContent = (schema: Schema, driver: DBType) => {
  const { tableName } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameSingular,
    tableNameCamelCase,
    tableNameKebabCase,
  } = formatTableName(tableName);
  const { shared } = getFilePaths();

  const template = `import express from "express";

import {
  create${tableNameSingularCapitalised},
  delete${tableNameSingularCapitalised},
  update${tableNameSingularCapitalised},
  get${tableNameSingularCapitalised}s,
  get${tableNameSingularCapitalised}ById,
} from "${formatFilePath(shared.controllersDir, {
    prefix: "alias",
    removeExtension: false,
  })}/${tableNameKebabCase}.controller";

import { 
  ${tableNameSingular}IdSchema,
  insert${tableNameSingularCapitalised}Params,
  update${tableNameSingularCapitalised}Params 
} from "${formatFilePath(shared.orm.schemaDir, {
    prefix: "alias",
    removeExtension: false,
  })}/${tableNameCamelCase}";

import validator from "@/middlewares/validator"

const ${tableNameCamelCase}Router = express.Router();

${tableNameCamelCase}Router
  .route("/")
  .post(validator(insert${tableNameSingularCapitalised}Params), create${tableNameSingularCapitalised})
  .get(get${tableNameSingularCapitalised}s);

${tableNameCamelCase}Router
  .route("/:${tableNameSingular}Id")
  .get(validator(${tableNameSingularCapitalised}IdSchema), get${tableNameSingularCapitalised}ById)
  .put(validator(update${tableNameSingularCapitalised}Params), update${tableNameSingularCapitalised})
  .delete(validator(${tableNameSingularCapitalised}IdSchema), delete${tableNameSingularCapitalised});

export default ${tableNameCamelCase}Router;
`;
  return template;
};
