import { existsSync, readFileSync } from "fs";
import { createFile, readConfigFile, replaceFile } from "../../../../utils.js";
import { ORMTypeMap, TypeMap } from "../../types.js";
import {
  formatTableName,
  getReferenceFieldType,
  toCamelCase,
} from "../../utils.js";
import { formatFilePath, getFilePaths } from "../../../filePaths/index.js";

export const prismaMappings = {
  typeMappings: {
    String: ({ name, notNull }) =>
      `${toCamelCase(name)} String${notNull ? "" : "?"}`,
    Int: ({ name, notNull }) => `${toCamelCase(name)} Int${notNull ? "" : "?"}`,
    BigInt: ({ name, notNull }) =>
      `${toCamelCase(name)} BigInt${notNull ? "" : "?"}`,
    Float: ({ name, notNull }) =>
      `${toCamelCase(name)} Float${notNull ? "" : "?"}`,
    Boolean: ({ name, notNull }) =>
      `${toCamelCase(name)} Boolean${notNull ? "" : "?"}`,
    References: ({ references, cascade, notNull }) => {
      const { tableNameSingular, tableNameSingularCapitalised } =
        formatTableName(references);
      // TODO: add relation to other table using addToPrismaModel
      return `${tableNameSingular} ${tableNameSingularCapitalised}${
        notNull ? "" : "?"
      } @relation(fields: [${tableNameSingular}Id], references: [id]${
        cascade ? ", onDelete: Cascade" : ""
      })\n  ${tableNameSingular}Id String`;
    },
    DateTime: ({ name, notNull }) =>
      `${toCamelCase(name)} DateTime${notNull ? "" : "?"}`,
    // Json: ({ name, notNull }) =>
    //   `${toCamelCase(name)} Json${notNull ? "" : "?"}`,
    Decimal: ({ name, notNull }) =>
      `${toCamelCase(name)} Decimal${notNull ? "" : "?"}`,
  },
} as TypeMap;

export const createOrmMappings = () => {
  const { provider } = readConfigFile();
  return {
    drizzle: {
      pg: {
        tableFunc: "pgTable",
        typeMappings: {
          id: ({ name }) =>
            `varchar("${name}", { length: 191 }).primaryKey().$defaultFn(() => nanoid())`,
          varchar: ({ name }) => `varchar("${name}", { length: 256 })`,
          text: ({ name }) => `text("${name}")`,
          number: ({ name }) => `integer("${name}")`,
          float: ({ name }) => `real("${name}")`,
          boolean: ({ name }) => `boolean("${name}")`,
          references: ({
            name,
            references: referencedTable = "REFERENCE",
            cascade,
            referenceIdType = "string",
          }) =>
            `${getReferenceFieldType(referenceIdType)["pg"]}("${name}"${
              referenceIdType === "string" ? ", { length: 256 }" : ""
            }).references(() => ${toCamelCase(referencedTable)}.id${
              cascade ? ', { onDelete: "cascade" }' : ""
            })`,
          timestamp: ({ name }) => `timestamp("${name}")`,
          date: ({ name }) => `date("${name}")`,
          // json: ({ name }) => `json("${name}")`,
        },
      },
    },
    prisma: {
      pg: prismaMappings,
    },
  } as ORMTypeMap;
};

export const updateRootSchema = (tableName: string) => {
  const tableNameCC = toCamelCase(tableName);
  const { drizzle } = getFilePaths();
  const rootSchemaPath = formatFilePath(drizzle.schemaAggregator, {
    prefix: "rootPath",
    removeExtension: false,
  });

  const newImportStatement = `import { ${tableNameCC} } from "./${tableNameCC}";\n`;

  // check if schema/_root.ts exists
  const rootSchemaExists = existsSync(rootSchemaPath);
  if (rootSchemaExists) {
    // if yes, import new model from model path and add to export -> perhaps replace 'export {' with 'export { new_model,'
    const rootSchemaContents = readFileSync(rootSchemaPath, "utf-8");
    const rootSchemaWithNewExport = rootSchemaContents.replace(
      "export {",
      `export { ${tableNameCC},`
    );

    const importInsertionPoint = rootSchemaWithNewExport.lastIndexOf("import");
    const nextLineAfterLastImport =
      rootSchemaWithNewExport.indexOf("\n", importInsertionPoint) + 1;
    const beforeImport = rootSchemaWithNewExport.slice(
      0,
      nextLineAfterLastImport
    );
    const afterImport = rootSchemaWithNewExport.slice(nextLineAfterLastImport);

    const withNewImport = `${beforeImport}${newImportStatement}${afterImport}`;
    replaceFile(rootSchemaPath, withNewImport);
  } else {
    // if not create schema/_root.ts -> then do same import as above
    createFile(
      rootSchemaPath,
      `${newImportStatement}

export { ${tableNameCC} }`
    );
    // and also update db/index.ts to add extended model import
    const indexDbPath = formatFilePath(drizzle.dbIndex, {
      removeExtension: false,
      prefix: "rootPath",
    });
    const indexDbContents = readFileSync(indexDbPath, "utf-8");
    const updatedContentsWithImport = indexDbContents.replace(
      `import * as schema from "./schema";`,
      `import * as schema from "./schema";
import * as extended from "~/server/db/schema/_root";`
    );
    const updatedContentsFinal = updatedContentsWithImport.replace(
      `{ schema }`,
      `{ schema: { ...schema, ...extended } }`
    );
    replaceFile(indexDbPath, updatedContentsFinal);

    // update drizzle config file to add all in server/db/*
    const drizzleConfigPath = "drizzle.config.ts";
    const dConfigContents = readFileSync(drizzleConfigPath, "utf-8");
    const updatedContents = dConfigContents.replace(
      `schema: "./src/server/db/schema.ts",`,
      `schema: "./src/server/db/*",`
    );
    replaceFile(drizzleConfigPath, updatedContents);
  }
};
