import { DBType } from "../../../../../types.js";
import { readConfigFile } from "../../../../../utils.js";
import {
  formatFilePath,
  getDbIndexPath,
  getFilePaths,
} from "../../../../filePaths/index.js";
import { Schema } from "../../../types.js";
import { formatTableName } from "../../../utils.js";

const generateDrizzleImports = (schema: Schema) => {
  const { tableName, belongsToUser } = schema;
  const { orm } = readConfigFile();
  const {
    tableNameSingularCapitalised,
    tableNameCamelCase,
    tableNameSingular,
  } = formatTableName(tableName);

  const { shared } = getFilePaths();
  const dbIndex = getDbIndexPath();
  return `import { db } from "${formatFilePath(dbIndex, {
    prefix: "alias",
    removeExtension: true,
  })}";
import { ${belongsToUser ? "and, " : ""}eq } from "drizzle-orm";
import { 
  ${tableNameSingularCapitalised}Id, 
  New${tableNameSingularCapitalised}Params,
  Update${tableNameSingularCapitalised}Params, 
  update${tableNameSingularCapitalised}Schema,
  insert${tableNameSingularCapitalised}Schema, 
  ${tableNameCamelCase},
  ${tableNameSingular}IdSchema 
} from "${formatFilePath(shared.orm.schemaDir, {
    prefix: "alias",
    removeExtension: false,
  })}/${tableNameCamelCase}";
`;
};

const generateDrizzleCreateMutation = (schema: Schema, driver: DBType) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameCamelCase,
    tableNameSingular,
    tableNameFirstChar,
  } = formatTableName(tableName);
  return `export const create${tableNameSingularCapitalised} = async (${tableNameSingular}: New${tableNameSingularCapitalised}Params) => {
  const new${tableNameSingularCapitalised} = insert${tableNameSingularCapitalised}Schema.parse(${
    belongsToUser
      ? `{ ...${tableNameSingular}, userId: session?.user.id! }`
      : `${tableNameSingular}`
  });
  try {
    
      const [${tableNameFirstChar}] = await db.insert(${tableNameCamelCase}).values(new${tableNameSingularCapitalised}).returning();
    return { ${tableNameSingular}: ${tableNameFirstChar} };
  
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};
`;
};
const generateDrizzleUpdateMutation = (schema: Schema, driver: DBType) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameCamelCase,
    tableNameFirstChar,
    tableNameSingular,
  } = formatTableName(tableName);
  const config = readConfigFile();
  return `export const update${tableNameSingularCapitalised} = async (id: ${tableNameSingularCapitalised}Id, ${tableNameSingular}: Update${tableNameSingularCapitalised}Params) => {
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  const new${tableNameSingularCapitalised} = update${tableNameSingularCapitalised}Schema.parse(${
    belongsToUser
      ? `{ ...${tableNameSingular}, userId: session?.user.id! }`
      : `${tableNameSingular}`
  });
  try {
    const [${tableNameFirstChar}] = await db
     .update(${tableNameCamelCase})
     .set(${
       schema.includeTimestamps
         ? `{...new${tableNameSingularCapitalised}, updatedAt: new Date() }`
         : `new${tableNameSingularCapitalised}`
     })
     .where(${
       belongsToUser ? "and(" : ""
     }eq(${tableNameCamelCase}.id, ${tableNameSingular}Id!)${
    belongsToUser
      ? `, eq(${tableNameCamelCase}.userId, session?.user.id!)))`
      : ")"
  }.returning();
    return { ${tableNameSingular}: ${tableNameFirstChar} };
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};
`;
};
const generateDrizzleDeleteMutation = (schema: Schema, driver: DBType) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameCamelCase,
    tableNameSingular,
    tableNameFirstChar,
  } = formatTableName(tableName);
  return `export const delete${tableNameSingularCapitalised} = async (id: ${tableNameSingularCapitalised}Id) => {
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  try {
    const [${tableNameFirstChar}] = await db.delete(${tableNameCamelCase}).where(${
    belongsToUser ? "and(" : ""
  }eq(${tableNameCamelCase}.id, ${tableNameSingular}Id!)${
    belongsToUser
      ? `, eq(${tableNameCamelCase}.userId, session?.user.id!)))`
      : ")"
  }.returning();
    return { ${tableNameSingular}: ${tableNameFirstChar} };
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};
`;
};

const generatePrismaImports = (schema: Schema) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameCamelCase,
    tableNameSingular,
  } = formatTableName(tableName);
  const { shared } = getFilePaths();
  const dbIndex = getDbIndexPath();

  return `import { db } from "${formatFilePath(dbIndex, {
    prefix: "alias",
    removeExtension: true,
  })}";
import { 
  ${tableNameSingularCapitalised}Id, 
  New${tableNameSingularCapitalised}Params,
  Update${tableNameSingularCapitalised}Params, 
  update${tableNameSingularCapitalised}Schema,
  insert${tableNameSingularCapitalised}Schema, 
  ${tableNameSingular}IdSchema 
} from "${formatFilePath(shared.orm.schemaDir, {
    prefix: "alias",
    removeExtension: false,
  })}/${tableNameCamelCase}";
`;
};
const generatePrismaCreateMutation = (schema: Schema) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameSingular,
    tableNameFirstChar,
  } = formatTableName(tableName);
  return `export const create${tableNameSingularCapitalised} = async (${tableNameSingular}: New${tableNameSingularCapitalised}Params) => {
  const new${tableNameSingularCapitalised} = insert${tableNameSingularCapitalised}Schema.parse(${
    belongsToUser
      ? `{ ...${tableNameSingular}, userId: session?.user.id! }`
      : `${tableNameSingular}`
  });
  try {
    const ${tableNameFirstChar} = await db.${tableNameSingular}.create({ data: new${tableNameSingularCapitalised} });
    return { ${tableNameSingular}: ${tableNameFirstChar} };
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};
`;
};
const generatePrismaUpdateMutation = (schema: Schema) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameFirstChar,
    tableNameSingular,
  } = formatTableName(tableName);

  return `export const update${tableNameSingularCapitalised} = async (id: ${tableNameSingularCapitalised}Id, ${tableNameSingular}: Update${tableNameSingularCapitalised}Params) => {
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  const new${tableNameSingularCapitalised} = update${tableNameSingularCapitalised}Schema.parse(${
    belongsToUser
      ? `{ ...${tableNameSingular}, userId: session?.user.id! }`
      : `${tableNameSingular}`
  });
  try {
    const ${tableNameFirstChar} = await db.${tableNameSingular}.update({ where: { id: ${tableNameSingular}Id}, data: new${tableNameSingularCapitalised}})
    return { ${tableNameSingular}: ${tableNameFirstChar} };
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};
`;
};
const generatePrismaDeleteMutation = (schema: Schema) => {
  const { tableName, belongsToUser } = schema;
  const {
    tableNameSingularCapitalised,
    tableNameSingular,
    tableNameFirstChar,
  } = formatTableName(tableName);
  return `export const delete${tableNameSingularCapitalised} = async (id: ${tableNameSingularCapitalised}Id) => {
  const { id: ${tableNameSingular}Id } = ${tableNameSingular}IdSchema.parse({ id });
  try {
    const ${tableNameFirstChar} = await db.${tableNameSingular}.delete({ where: { id: ${tableNameSingular}Id }})
    return { ${tableNameSingular}: ${tableNameFirstChar} };
  } catch (err) {
    const message = (err as Error).message ?? "Error, please try again";
    console.error(message);
    throw { error: message };
  }
};
`;
};

export const generateMutations = {
  prisma: {
    imports: generatePrismaImports,
    create: generatePrismaCreateMutation,
    update: generatePrismaUpdateMutation,
    delete: generatePrismaDeleteMutation,
  },
  drizzle: {
    imports: generateDrizzleImports,
    create: generateDrizzleCreateMutation,
    update: generateDrizzleUpdateMutation,
    delete: generateDrizzleDeleteMutation,
  },
};
