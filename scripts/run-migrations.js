#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { config: loadEnv } = require('dotenv');

loadEnv({ path: '.env' });
loadEnv({ path: '.env.local', override: true });
loadEnv({ path: '.env.docker', override: true });

const migrationsDir = path.resolve(process.cwd(), 'supabase/migrations');
const dbContainer = process.env.DB_CONTAINER_NAME || 'supabase-db';
const dbName = process.env.POSTGRES_DB || 'postgres';
const dbUser = process.env.POSTGRES_MIGRATION_USER || 'supabase_admin';
const dbPassword = process.env.POSTGRES_PASSWORD;

if (!dbPassword) {
  console.error('POSTGRES_PASSWORD não configurado (ex.: .env.docker).');
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  console.error(`Diretório de migrations não encontrado: ${migrationsDir}`);
  process.exit(1);
}

const migrationFiles = fs
  .readdirSync(migrationsDir)
  .filter((file) => file.endsWith('.sql'))
  .sort();

if (migrationFiles.length === 0) {
  console.log('Nenhuma migration encontrada.');
  process.exit(0);
}

console.log(`Aplicando ${migrationFiles.length} migration(s) em ${dbContainer}/${dbName}...`);

for (const fileName of migrationFiles) {
  const filePath = path.join(migrationsDir, fileName);
  const sql = fs.readFileSync(filePath);

  console.log(`\n-> ${fileName}`);
  const result = spawnSync(
    'docker',
    [
      'exec',
      '-i',
      '-e',
      `PGPASSWORD=${dbPassword}`,
      dbContainer,
      'psql',
      '-v',
      'ON_ERROR_STOP=1',
      '-U',
      dbUser,
      '-d',
      dbName,
    ],
    {
      input: sql,
      stdio: ['pipe', 'inherit', 'inherit'],
    }
  );

  if (result.status !== 0) {
    console.error(`\nFalha ao aplicar migration: ${fileName}`);
    process.exit(result.status || 1);
  }
}

console.log('\nMigrations aplicadas com sucesso.');
