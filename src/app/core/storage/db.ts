import { DBSchema, IDBPDatabase, openDB } from 'idb';

export const DB_NAME = 'helper-tools-db';

/**
 * IndexedDB structural version. Bump this ONLY when the set of object stores
 * or their indexes changes, and add a matching `if (oldVersion < N)` block in
 * `upgrade()` below. Per-document shape changes are handled separately by each
 * collection's `version` + `migrate` (see StorageService), so most feature
 * evolution never touches this number.
 */
export const DB_VERSION = 1;

/** Envelope wrapping every stored document so its schema version travels with the data. */
export interface StoredEnvelope<T = unknown> {
  version: number;
  data: T;
  updatedAt: number;
}

export interface HelperToolsSchema extends DBSchema {
  collections: {
    key: string;
    value: StoredEnvelope;
  };
}

let dbPromise: Promise<IDBPDatabase<HelperToolsSchema>> | null = null;

/** Lazily open (and cache) the shared database connection. */
export function getDb(): Promise<IDBPDatabase<HelperToolsSchema>> {
  dbPromise ??= openDB<HelperToolsSchema>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      // --- Structural (IndexedDB-level) migrations, applied in order ---
      if (oldVersion < 1) {
        // v1: single key/value store; the key is the collection name.
        db.createObjectStore('collections');
      }
      // Example future structural change:
      // if (oldVersion < 2) {
      //   const files = db.createObjectStore('files', { keyPath: 'id' });
      //   files.createIndex('byOwner', 'ownerId');
      // }
    },
  });
  return dbPromise;
}

/** Test/utility hook: drop the cached connection so a fresh one is opened next time. */
export function resetDbConnection(): void {
  dbPromise = null;
}
