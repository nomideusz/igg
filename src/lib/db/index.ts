import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

// Get the project root directory
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..', '..', '..');

// Ensure data directory exists
// Use process.env.DATA_DIR if provided (docker), otherwise default to project root/data
const dataDir = process.env.DATA_DIR || join(projectRoot, 'data');

if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database
const sqlite = new Database(join(dataDir, 'igg_v2.db'));
sqlite.pragma('journal_mode = WAL'); // Better performance

import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

// Create Drizzle instance with schema
export const db = drizzle(sqlite, { schema });

// Run migrations on startup
// This is critical for Docker deployment where the DB starts empty
try {
    const migrationsFolder = join(projectRoot, 'drizzle');
    if (existsSync(migrationsFolder)) {
        migrate(db, { migrationsFolder });
        console.log('✅ Database migrations completed.');
    } else {
        console.warn('⚠️ No migrations folder found at', migrationsFolder);
    }
} catch (e) {
    console.error('❌ Migration failed:', e);
}

// Export schema for convenience
export * from './schema';
