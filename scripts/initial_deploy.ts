import pgPromise from 'pg-promise';
// import { exec } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { DatabaseError } from 'pg';

const pgp = pgPromise();

const config = {
  host: 'localhost',
  port: 5432,
  database: 'lovelystay', // Default database to connect initially
  user: 'postgres', // Replace with your PostgreSQL username
  password: 'yapostgres' // Replace with your PostgreSQL password
};

const newDbName = 'github_fetch';
const newDbNameTest = 'github_fetch_test';

async function createDatabase(): Promise<void> {
  const db = pgp(config);
  try {
    await db.none(`CREATE DATABASE ${newDbName}`);
    await db.none(`CREATE DATABASE ${newDbNameTest}`);
    console.log(`Database ${newDbName} created successfully.`);
  } catch (error) {
    // PostgreSQL error code for 'duplicate_database'
    if (error instanceof DatabaseError && error.code === '42P04') {
      console.log(
        `Database ${newDbName} already exists. Continuing with setup.`
      );
    } else {
      console.error('Error creating database:', error);
      throw error;
    }
  } finally {
    pgp.end();
  }
}

async function ensureMigrationsTable(
  db: pgPromise.IDatabase<object>
): Promise<void> {
  await db.none(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) UNIQUE NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function isMigrationApplied(
  db: pgPromise.IDatabase<object>,
  migrationName: string
): Promise<boolean> {
  const result =  await db.oneOrNone(
    'SELECT * FROM migrations WHERE name = $1', migrationName);
  return result !== null;
}

async function markMigrationAsApplied(
  db: pgPromise.ITask<object>,
  migrationName: string): Promise<void>
{
  await db.none('INSERT INTO migrations (name) VALUES ($1)', migrationName);
}

async function runMigrations(db: pgPromise.IDatabase<object>): Promise<void> {
  const migrationsDir = path.join(__dirname, 'migrations');
  const migrationFiles = await fs.readdir(migrationsDir);

  await ensureMigrationsTable(db);

  for (const file of migrationFiles.sort()) {
    if (file.endsWith('.sql')) {
      const migrationName = path.parse(file).name;
      const isApplied = await isMigrationApplied(db, migrationName);

      if (!isApplied) {
        const migrationPath = path.join(migrationsDir, file);
        const migrationSql = await fs.readFile(migrationPath, 'utf-8');
        
        console.log(`Running migration: ${file}`);
        await db.tx(async t => {
          await t.none(migrationSql);
          await markMigrationAsApplied(t, migrationName);
        });
        console.log(`Migration ${file} applied successfully.`);
      } else {
        console.log(`Migration ${file} already applied. Skipping.`);
      }
    }
  }
}

async function main() {
  try {
    await createDatabase();

    const newConfig = { ...config, database: newDbName };
    const db = pgp(newConfig);

    await runMigrations(db);

    console.log('Database setup completed successfully.');
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    pgp.end();
  }
}

main();