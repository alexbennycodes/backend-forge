import { DBType, ORMType } from "../../../../../types.js";
import { createFile, readConfigFile } from "../../../../../utils.js";
import { generateControllerFileNames } from "../../../../filePaths/index.js";
import { ExtendedSchema } from "../../../types.js";
import { snakeToKebab } from "../../../utils.js";
import { generateQueries } from "../queries/generators.js";
import { generateMutations } from "./generators.js";

export const generateControllerContent = (
  schema: ExtendedSchema,
  driver: DBType,
  orm: ORMType
) => {
  const relations = schema.fields.filter(
    (field) => field.type.toLowerCase() === "references"
  );
  const hasChildren = schema.children !== undefined;

  const imports = generateQueries[orm].imports(schema, relations);
  const createMutation = generateMutations[orm].create(schema, driver);
  const updateMutation = generateMutations[orm].update(schema, driver);
  const deleteMutation = generateMutations[orm].delete(schema, driver);
  const getQuery = generateQueries[orm].get(schema, relations);
  const getByIdQuery = generateQueries[orm].getById(schema, relations);
  const getByIdWithChildren = hasChildren
    ? schema.children && schema.children.length > 0
      ? generateQueries[orm].getByIdWithChildren(schema, relations)
      : ""
    : "";

  return `${imports}
${getQuery}
${getByIdQuery}
${getByIdWithChildren}
${createMutation}
${updateMutation}
${deleteMutation}
`;
};

export const scaffoldController = (schema: ExtendedSchema) => {
  const { tableName } = schema;

  const { orm, driver } = readConfigFile();

  const controllerFileName = generateControllerFileNames(
    snakeToKebab(tableName)
  );

  createFile(
    controllerFileName,
    generateControllerContent(schema, driver, orm)
  );
};
