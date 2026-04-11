import * as SQLite from 'expo-sqlite';

const DB_NAME = 'animus_offline.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = SQLite.openDatabaseAsync(DB_NAME).then(async (database) => {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS offline_dreams (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          transcript TEXT NOT NULL,
          audio_uri TEXT,
          created_at TEXT DEFAULT (datetime('now')),
          synced INTEGER DEFAULT 0
        );
      `);
      return database;
    });
  }
  return dbPromise;
}

export async function queueDream(transcript: string, audioUri: string | null): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    'INSERT INTO offline_dreams (transcript, audio_uri) VALUES (?, ?)',
    transcript, audioUri
  );
  return result.lastInsertRowId;
}

export interface OfflineDream {
  id: number;
  transcript: string;
  audio_uri: string | null;
  created_at: string;
  synced: number;
}

export async function getUnsyncedDreams(): Promise<OfflineDream[]> {
  const database = await getDb();
  return database.getAllAsync<OfflineDream>(
    'SELECT * FROM offline_dreams WHERE synced = 0 ORDER BY created_at ASC'
  );
}

export async function markSynced(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('UPDATE offline_dreams SET synced = 1 WHERE id = ?', id);
}

export async function deletesynced(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM offline_dreams WHERE synced = 1');
}
