export const DB_DIALECT = {
	postgres: 'postgres',
	mysql: 'mysql',
	sqlite: 'sqlite'
} as const;

export type DbDialect = (typeof DB_DIALECT)[keyof typeof DB_DIALECT];

export interface DbProvider<TDb = unknown> {
	getDb(dialect?: DbDialect): TDb;
}
