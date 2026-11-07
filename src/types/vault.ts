/**
 * MOTIX Security Vault Types
 * Brand: MOTIX by Moti Technologies
 * Tagline: "Your Digital World. Your Private Space."
 */

export type VaultStatus = 'uninitialized' | 'locked' | 'unlocked';

export interface VaultMetadata {
  id: string;
  isInitialized: boolean;
  salt: string; // Hex string for Argon2id/PBKDF2
  verifierHash: string; // Hash of master key + verifier string to check password correctness
  recoveryKeyHash: string; // SHA-256 hash of recovery key for emergency unlock
  createdAt: number;
  lastUnlockedAt: number;
  lastBackupAt?: number;
  lastBackupType?: 'google-drive' | 'local-file';
  backupChecksum?: string;
  settings: VaultSettings;
}

export interface VaultSettings {
  autoLockMinutes: number; // 1, 5, 15, 30, 0 (disabled)
  lockOnTabBlur: boolean;
  clipboardAutoClearSeconds: number; // default 30
  enableHapticFeedback: boolean;
  persistentStorageGranted: boolean;
}

export type VaultCategory = 'personal' | 'financial' | 'work' | 'social' | 'credentials' | 'other';

export interface VaultPhotoItem {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  encryptedBlob: ArrayBuffer;
  iv: string; // Base64 or Hex
  encryptedThumbnailBlob?: ArrayBuffer;
  thumbnailIv?: string;
  album: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  isTrash?: boolean;
  deletedAt?: number;
}

export interface VaultVideoItem {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number;
  encryptedBlob: ArrayBuffer;
  iv: string;
  encryptedThumbnailBlob?: ArrayBuffer;
  thumbnailIv?: string;
  album: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  isTrash?: boolean;
  deletedAt?: number;
}

export interface VaultPasswordItem {
  id: string;
  title: string;
  username: string;
  encryptedPassword: string; // Encrypted with AES-GCM
  iv: string;
  websiteUrl?: string;
  category: VaultCategory;
  notes?: string;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  strengthScore: number; // 0-100
}

export interface VaultDocumentItem {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: 'identity' | 'financial' | 'contracts' | 'medical' | 'general';
  encryptedBlob: ArrayBuffer;
  iv: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: number;
  isTrash?: boolean;
  deletedAt?: number;
}

export interface VaultNoteItem {
  id: string;
  title: string;
  encryptedContent: string; // Encrypted JSON containing text & checklist items
  iv: string;
  category: string;
  tags: string[];
  isPinned: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  isTrash?: boolean;
  deletedAt?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  action: 'unlock' | 'lock' | 'failed_unlock' | 'export_backup' | 'import_backup' | 'drive_backup' | 'drive_restore' | 'password_copy' | 'item_delete';
  details: string;
  status: 'success' | 'warning' | 'info';
}

export interface StorageBreakdown {
  photosBytes: number;
  videosBytes: number;
  documentsBytes: number;
  passwordsBytes: number;
  notesBytes: number;
  totalUsedBytes: number;
  deviceQuotaBytes: number;
  quotaUsagePercent: number;
}

export interface EncryptedBackupContainer {
  format: 'MOTIX_SECURE_BACKUP_V1';
  timestamp: number;
  appVersion: string;
  deviceInfo: string;
  salt: string;
  iv: string;
  encryptedPayload: string; // AES-GCM encrypted serialized vault data
  checksum: string; // SHA-256 HMAC of the encrypted payload
}

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  description?: string;
}
