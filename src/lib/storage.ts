/**
 * MOTIX Local-First Storage Engine
 * High-performance IndexedDB with OPFS compatibility & quota monitoring
 * Local-first: all sensitive records are stored strictly encrypted locally.
 */

import {
  VaultMetadata,
  VaultPhotoItem,
  VaultVideoItem,
  VaultPasswordItem,
  VaultDocumentItem,
  VaultNoteItem,
  AuditLogEntry,
  StorageBreakdown,
} from '../types/vault';

const DB_NAME = 'motix_security_vault_db';
const DB_VERSION = 1;

let dbInstance: IDBDatabase | null = null;

export async function getDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Metadata store
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'id' });
      }

      // Photos store
      if (!db.objectStoreNames.contains('photos')) {
        const store = db.createObjectStore('photos', { keyPath: 'id' });
        store.createIndex('album', 'album', { unique: false });
        store.createIndex('isTrash', 'isTrash', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Videos store
      if (!db.objectStoreNames.contains('videos')) {
        const store = db.createObjectStore('videos', { keyPath: 'id' });
        store.createIndex('album', 'album', { unique: false });
        store.createIndex('isTrash', 'isTrash', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Passwords store
      if (!db.objectStoreNames.contains('passwords')) {
        const store = db.createObjectStore('passwords', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Documents store
      if (!db.objectStoreNames.contains('documents')) {
        const store = db.createObjectStore('documents', { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('isTrash', 'isTrash', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Notes store
      if (!db.objectStoreNames.contains('notes')) {
        const store = db.createObjectStore('notes', { keyPath: 'id' });
        store.createIndex('isPinned', 'isPinned', { unique: false });
        store.createIndex('isTrash', 'isTrash', { unique: false });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }

      // Audit logs store
      if (!db.objectStoreNames.contains('audit_logs')) {
        const store = db.createObjectStore('audit_logs', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Generic IndexedDB CRUD helpers
 */
export async function dbGet<T>(storeName: string, id: string): Promise<T | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function dbPut<T>(storeName: string, item: T): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(item);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbDelete(storeName: string, id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function dbClear(storeName: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

/**
 * Vault Metadata Operations
 */
export async function getVaultMetadata(): Promise<VaultMetadata | null> {
  return await dbGet<VaultMetadata>('metadata', 'current_vault_meta');
}

export async function saveVaultMetadata(metadata: VaultMetadata): Promise<void> {
  await dbPut('metadata', { ...metadata, id: 'current_vault_meta' });
}

/**
 * Security Audit Logging
 */
export async function addAuditLog(
  action: AuditLogEntry['action'],
  details: string,
  status: AuditLogEntry['status'] = 'info'
): Promise<void> {
  const entry: AuditLogEntry = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    action,
    details,
    status,
  };
  try {
    await dbPut('audit_logs', entry);
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

export async function getAuditLogs(limit: number = 25): Promise<AuditLogEntry[]> {
  const logs = await dbGetAll<AuditLogEntry>('audit_logs');
  return logs.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
}

/**
 * Storage Quota and Breakdown Calculations
 */
export async function calculateStorageBreakdown(): Promise<StorageBreakdown> {
  const photos = await dbGetAll<VaultPhotoItem>('photos');
  const videos = await dbGetAll<VaultVideoItem>('videos');
  const docs = await dbGetAll<VaultDocumentItem>('documents');
  const passwords = await dbGetAll<VaultPasswordItem>('passwords');
  const notes = await dbGetAll<VaultNoteItem>('notes');

  const photosBytes = photos.reduce((acc, p) => acc + (p.sizeBytes || 0), 0);
  const videosBytes = videos.reduce((acc, v) => acc + (v.sizeBytes || 0), 0);
  const documentsBytes = docs.reduce((acc, d) => acc + (d.sizeBytes || 0), 0);
  const passwordsBytes = passwords.length * 1024; // Average approximate size
  const notesBytes = notes.reduce((acc, n) => acc + (n.encryptedContent?.length || 0) * 2, 0);

  const totalUsedBytes = photosBytes + videosBytes + documentsBytes + passwordsBytes + notesBytes;

  let deviceQuotaBytes = 10 * 1024 * 1024 * 1024; // Default fallback: 10 GB
  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      if (estimate.quota) {
        deviceQuotaBytes = estimate.quota;
      }
    } catch (e) {
      console.warn('Storage estimate error:', e);
    }
  }

  const quotaUsagePercent = Math.min(100, Math.round((totalUsedBytes / deviceQuotaBytes) * 100 * 10) / 10);

  return {
    photosBytes,
    videosBytes,
    documentsBytes,
    passwordsBytes,
    notesBytes,
    totalUsedBytes,
    deviceQuotaBytes,
    quotaUsagePercent,
  };
}

/**
 * Persistent Storage Request (PWA spec)
 */
export async function requestPersistentStorage(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persist) {
    const isPersisted = await navigator.storage.persist();
    return isPersisted;
  }
  return false;
}

export async function checkStoragePersistence(): Promise<boolean> {
  if (navigator.storage && navigator.storage.persisted) {
    return await navigator.storage.persisted();
  }
  return false;
}

/**
 * Export all encrypted vault items for backup
 */
export async function exportAllVaultData() {
  const metadata = await getVaultMetadata();
  const photos = await dbGetAll<VaultPhotoItem>('photos');
  const videos = await dbGetAll<VaultVideoItem>('videos');
  const passwords = await dbGetAll<VaultPasswordItem>('passwords');
  const documents = await dbGetAll<VaultDocumentItem>('documents');
  const notes = await dbGetAll<VaultNoteItem>('notes');

  return {
    metadata,
    photos,
    videos,
    passwords,
    documents,
    notes,
    exportedAt: Date.now(),
    motixEngineVersion: '1.0.0',
  };
}

/**
 * Import all vault items (Restoration)
 */
export async function importVaultData(data: {
  photos?: VaultPhotoItem[];
  videos?: VaultVideoItem[];
  passwords?: VaultPasswordItem[];
  documents?: VaultDocumentItem[];
  notes?: VaultNoteItem[];
}) {
  if (data.photos) {
    for (const p of data.photos) await dbPut('photos', p);
  }
  if (data.videos) {
    for (const v of data.videos) await dbPut('videos', v);
  }
  if (data.passwords) {
    for (const pwd of data.passwords) await dbPut('passwords', pwd);
  }
  if (data.documents) {
    for (const doc of data.documents) await dbPut('documents', doc);
  }
  if (data.notes) {
    for (const note of data.notes) await dbPut('notes', note);
  }
}

/**
 * Completely wipe vault (Factory reset)
 */
export async function wipeEntireVault(): Promise<void> {
  await dbClear('metadata');
  await dbClear('photos');
  await dbClear('videos');
  await dbClear('passwords');
  await dbClear('documents');
  await dbClear('notes');
  await dbClear('audit_logs');
}
