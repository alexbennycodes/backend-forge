export type Paths = {
  drizzle: {
    dbMigrate: string;
    migrationsDir: string;
    dbIndex: string;
    schemaTs?: string;
    schemaAggregator?: string;
  };
  prisma: { dbIndex: string };
  shared: {
    init: {
      envMjs: string;
      libUtils: string;
    };
    orm: {
      servicesDir: string;
      schemaDir?: string;
    };
  };
};
