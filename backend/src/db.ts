import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { mkdirSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dbDir = join(__dirname, '..', 'data');
mkdirSync(dbDir, { recursive: true });

const db: InstanceType<typeof Database> = new Database(join(dbDir, 'claude-code-ui.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Chats table removed - now stored in /data/chats/ as JSON files
// Sessions table removed - now stored in /data/sessions.json
// Message queue table removed - now stored in /data/queue/ as JSON files

export default db;
