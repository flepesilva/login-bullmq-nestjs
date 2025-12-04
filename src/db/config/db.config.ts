import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';
import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs(
  'database',
  (): PostgresConnectionOptions => ({
    type: 'postgres',
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    username: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || '',
    database: process.env.POSTGRES_DB || 'postgres',
    entities: [join(__dirname, '../..', '**', '*.entity.{ts,js}')],
    synchronize: process.env.TYPEORM_SYNC === 'true',
    migrations: [join(__dirname, '..', 'migrations', '*.{ts,js}')],
    migrationsRun: process.env.TYPEORM_MIGRATIONS_RUN === 'true',
  }),
);
