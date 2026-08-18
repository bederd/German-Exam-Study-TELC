import { Platform } from 'react-native';
import { File, Paths, Directory } from 'expo-file-system/next';
import { Asset } from 'expo-asset';
import * as SQLite from 'expo-sqlite';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function initDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  const dbName = 'deutschfit.db';
  
  try {
    if (Platform.OS === 'web') {
      // On web, just open the database directly (no file system operations)
      dbInstance = SQLite.openDatabaseSync(dbName);
      return dbInstance;
    }
    
    // Note: Ensure the db file is present in assets folder and metro.config.js is updated
    const dbAsset = require('../../assets/deutschfit.db');
    
    // Use the new expo-file-system/next API (SDK 54+)
    const sqliteDir = new Directory(Paths.document, 'SQLite');
    if (!sqliteDir.exists) {
      sqliteDir.create();
    }

    const dbFile = new File(sqliteDir, dbName);
    
    // If the DB does not exist, copy it from assets.
    // In development, you might want to force overwrite, but for now we only copy once.
    if (!dbFile.exists) {
      console.log('Database not found in local storage. Copying from assets...');
      const asset = await Asset.fromModule(dbAsset).downloadAsync();
      if (!asset.localUri) {
        throw new Error('Failed to download database asset');
      }
      const sourceFile = new File(asset.localUri);
      sourceFile.copy(dbFile);
      console.log('Database copied successfully.');
    } else {
      console.log('Database already exists in local storage.');
    }

    dbInstance = SQLite.openDatabaseSync(dbName);
    return dbInstance;
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw new Error(`Veritabanı başlatılamadı: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function getDb(): SQLite.SQLiteDatabase {
  if (!dbInstance) {
    throw new Error('Database is not initialized. Call initDb() first.');
  }
  return dbInstance;
}
