export type DBType = "pg";
export type DBProviderItem = {
  name: string;
  value: string;
  disabled?: string | boolean;
};
export type PackageChoice = {
  name: string;
  value: AvailablePackage;
  disabled?: string | boolean;
};
export type DBProvider = "postgresjs";

export type DBProviderOptions = {
  pg: DBProviderItem[];
};
export type PMType = "npm" | "yarn" | "pnpm" | "bun";

export type DrizzleColumnType = pgColumnType;

export type ColumnType = DrizzleColumnType | PrismaColumnType;

export type DBField<T extends ColumnType = ColumnType> = {
  name: string;
  type: T;
  references?: string;
  notNull?: boolean;
  cascade?: boolean;
};

export type AvailablePackage = "drizzle" | "prisma" | "passport";
export type PackageType = "orm" | "auth";
export type ORMType = "drizzle" | "prisma";
export type AuthType = "passport" | false;

export type Config = {
  projectName: string;
  alias: string;
  analytics: boolean;
  driver: DBType | undefined;
  auth: AuthType;
  orm: ORMType | undefined;
  packages: AvailablePackage[];
  preferredPackageManager: PMType;
  provider: DBProvider | undefined;
};

export type UpdateConfig = Partial<Config>;

export type InitOptions = {
  packageManager?: PMType;
  auth?: AuthType;
  orm?: ORMType;
  db?: DBType;
  dbProvider?: DBProvider;
  includeExample?: boolean;
};

export type ScaffoldSchema = {
  tableName: string;
  fields: DBField[];
  index?: string;
};

export type pgColumnType =
  | "varchar"
  | "text"
  | "number"
  | "float"
  | "boolean"
  | "references"
  | "timestamp"
  | "date";
// | "json";

export type PrismaColumnType =
  | "String"
  | "Boolean"
  | "Int"
  | "BigInt"
  | "Float"
  | "Decimal"
  | "Boolean"
  | "DateTime"
  | "References";
// | "Json";

export type DotEnvItem = {
  key: string;
  value: string;
  isUrl?: boolean;
  isOptional?: boolean;
  customZodImplementation?: string;
  public?: boolean;
};
