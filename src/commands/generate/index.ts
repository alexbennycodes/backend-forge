import { confirm, input, select } from "@inquirer/prompts";
import { consola } from "consola";
import pluralize from "pluralize";
import {
  Config,
  DBField,
  DBType,
  DrizzleColumnType,
  ORMType,
  PrismaColumnType,
} from "../../types.js";
import { readConfigFile, updateConfigFileAfterUpdate } from "../../utils.js";
import { addPackage } from "../add/index.js";
import { initProject } from "../init/index.js";
import { scaffoldAPIRoute } from "./generators/apiRoute.js";
import { scaffoldModel } from "./generators/model/index.js";
import { createOrmMappings } from "./generators/model/utils.js";
import { ExtendedSchema, Schema } from "./types.js";
import {
  camelCaseToSnakeCase,
  formatTableName,
  getCurrentSchemas,
  printGenerateNextSteps,
  toCamelCase,
  updateEntryFile,
} from "./utils.js";
import { scaffoldController } from "./generators/model/controllers/index.js";

type Choice<Value> = {
  name?: string;
  value: Value;
  disabled?: boolean | string;
  checked?: boolean;
  type?: never;
};

function provideInstructions() {
  consola.info(
    "Quickly generate your Model (schema + queries / mutations), Controllers (API Routes)"
  );
}

export type TResource = "model" | "api_route";

async function askForResourceType() {
  const resourcesRequested: TResource[] = ["model", "api_route"];
  return resourcesRequested;
}

async function askForTable() {
  const tableName = await input({
    message: "Please enter the table name (plural and in snake_case):",
    validate: (input) =>
      input.match(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)
        ? true
        : "Table name must be in snake_case if more than one word, and plural.",
  });
  return tableName;
}

async function askIfBelongsToUser() {
  const belongsToUser = await confirm({
    message: "Does this model belong to the user?",
    default: true,
  });
  return belongsToUser;
}

async function askForFields(orm: ORMType, dbType: DBType, tableName: string) {
  const fields: DBField[] = [];
  let addMore = true;

  while (addMore) {
    const currentSchemas = getCurrentSchemas();

    const baseFieldTypeChoices = Object.keys(
      createOrmMappings()[orm][dbType].typeMappings
    )
      .filter((field) => field !== "id")
      .map((field) => {
        return { name: field.toLowerCase(), value: field };
      });

    const removeReferenceOption =
      currentSchemas.length === 0 ||
      (currentSchemas.length === 1 &&
        currentSchemas[0] === toCamelCase(tableName));
    const fieldTypeChoices = removeReferenceOption
      ? baseFieldTypeChoices.filter(
          (field) => field.name.toLowerCase() !== "references"
        )
      : baseFieldTypeChoices;

    const fieldType = (await select({
      message: "Please select the type of this field:",
      choices: fieldTypeChoices,
    })) as DrizzleColumnType | PrismaColumnType;

    if (fieldType.toLowerCase() === "references") {
      const referencesTable = await select({
        message: "Which table do you want it reference?",
        choices: currentSchemas
          .filter((schema) => schema !== toCamelCase(tableName))
          .map((schema) => {
            return {
              name: camelCaseToSnakeCase(schema),
              value: camelCaseToSnakeCase(schema),
            };
          }),
      });

      const fieldName = `${pluralize.singular(referencesTable)}_id`;
      const cascade = await confirm({
        message: "Would you like to cascade on delete?",
        default: false,
      });

      fields.push({
        name: fieldName,
        type: fieldType,
        references: referencesTable,
        notNull: true,
        cascade,
      });
    } else {
      const fieldName = await input({
        message: "Please enter the field name (in snake_case):",
        validate: (input) =>
          input.match(/^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/)
            ? true
            : "Field name must be in snake_case if more than one word.",
      });

      const notNull = await confirm({
        message: "Is this field required?",
        default: true,
      });

      fields.push({ name: fieldName.toLowerCase(), type: fieldType, notNull });
    }

    const continueAdding = await confirm({
      message: "Would you like to add another field?",
      default: false,
    });

    addMore = continueAdding;
  }

  return fields;
}

async function askForTimestamps() {
  return await confirm({
    message: "Would you like timestamps (createdAt, updatedAt)?",
    default: true,
  });
}

async function askForChildModel(parentModel: string) {
  return await confirm({
    message: `Would you like to add a child model? (${parentModel})`,
    default: false,
  });
}

export function preBuild() {
  const config = readConfigFile();

  if (!config) {
    consola.warn("You need to have a config file in order to use generate.");
    initProject();
    return false;
  }

  if (config.orm === undefined) updateConfigFileAfterUpdate();
  return true;
}

async function promptUserForSchema(config: Config, resourceType: TResource[]) {
  const tableName = await askForTable();
  const fields = await askForFields(config.orm, config.driver, tableName);
  const includeTimestamps = await askForTimestamps();
  let belongsToUser: boolean = false;
  if (resourceType.includes("model") && config?.auth !== null) {
    belongsToUser = await askIfBelongsToUser();
  }
  return {
    tableName,
    fields,
    index: null,
    belongsToUser,
    includeTimestamps,
  } as Schema;
}

// Create a new function to handle the recursion
async function addChildSchemaToParent(
  config: Config,
  resourceType: TResource[],
  parentSchema: Schema
): Promise<Schema> {
  const childModels: Schema[] = [];
  let addChild = await askForChildModel(parentSchema.tableName);
  while (addChild) {
    const childSchema = await getSchema(config, resourceType); // recursive call instead of getBaseSchema
    childModels.push(childSchema);
    addChild = await askForChildModel(parentSchema.tableName); // ask again if they want to add another child
  }

  return {
    ...parentSchema,
    children: childModels,
  } as Schema;
}

async function getSchema(
  config: Config,
  resourceType: TResource[]
): Promise<Schema> {
  const baseSchema = await promptUserForSchema(config, resourceType);
  return await addChildSchemaToParent(config, resourceType, baseSchema);
}

function getInidividualSchemas(
  schema: Schema,
  parents: string[] = [],
  result: ExtendedSchema[] = []
) {
  // Add the main schema entity to the result array
  const config = readConfigFile();
  const { tableName, children, fields, ...mainSchema } = schema;
  const newParents = [...parents, tableName];
  const immediateParent = parents[parents.length - 1];

  const parentRelationField: DBField[] =
    immediateParent === undefined
      ? []
      : [
          {
            name: `${pluralize.singular(immediateParent)}_id`,
            type: config.orm === "prisma" ? "References" : "references",
            cascade: true,
            references: immediateParent,
            notNull: true,
          },
        ];

  result.push({
    ...mainSchema,
    tableName,
    parents,
    children,
    fields: [...fields, ...parentRelationField],
  });

  // If there are child schemas, recursively call getSchemas() on each one
  if (Array.isArray(children)) {
    children.forEach((child) =>
      getInidividualSchemas(child, newParents, result)
    );
  }

  return result;
}

export const formatSchemaForGeneration = (schema?: Schema) => {
  return getInidividualSchemas(schema);
};

const anonymiseSchemas = (schemas: ExtendedSchema[]): ExtendedSchema[] => {
  const anonymise = (
    schema: ExtendedSchema,
    prefix: string
  ): ExtendedSchema => {
    return {
      ...schema,
      tableName: `${prefix}Table`,
      parents: schema.parents
        ? schema.parents.map((_, i) => `${prefix}Parent${i + 1}`)
        : [],
      children: schema.children
        ? schema.children.map((c, i) =>
            anonymise(c as ExtendedSchema, `${prefix}Child${i + 1}`)
          )
        : [],
      fields: schema.fields.map((f, i) => ({
        ...f,
        name: `${prefix}Field${i + 1}`,
        references: ``,
      })),
    };
  };

  return schemas.map((s, i) => anonymise(s, `Schema${i + 1}`));
};

async function generateResources(
  schema: ExtendedSchema,
  resourceType: TResource[]
) {
  const config = readConfigFile();
  const {
    tableNameNormalEnglishCapitalised: tnEnglish,
    tableNameCamelCase,
    tableNameKebabCase,
  } = formatTableName(schema.tableName);

  scaffoldModel(schema, config.driver);
  scaffoldAPIRoute(schema);
  scaffoldController(schema);
  updateEntryFile(tableNameCamelCase, tableNameKebabCase);
}

export async function buildSchema() {
  const ready = preBuild();
  if (!ready) return;

  const config = readConfigFile();

  if (config.orm !== null) {
    provideInstructions();
    const resourceType = await askForResourceType();

    const schema = await getSchema(config, resourceType);

    const schemas = formatSchemaForGeneration(schema);

    for (let schema of schemas) {
      await generateResources(schema, resourceType);
    }
    printGenerateNextSteps(schema, resourceType);
  } else {
    consola.warn(
      "You need to have an ORM installed in order to use the scaffold command."
    );
    addPackage();
  }
}
