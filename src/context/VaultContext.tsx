/**
 * MOTIX Vault Context & State Controller
 * 100% Local-First, Zero Firebase, Zero Cloud Dependency.
 * Manages encrypted session lifecycle, in-memory crypto keys,
 * auto-locking timers, clipboard auto-clearing, and sovereign storage.
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import {
  VaultStatus,
  VaultMetadata,
  VaultSettings,
  VaultPhotoItem,
  VaultVideoItem,
  VaultPasswordItem,
  VaultDocumentItem,
  VaultNoteItem,
  StorageBreakdown,
  EncryptedBackupContainer,
} from '../types/vault';
import {
  bytesToHex,
  hexToBytes,
  getRandomBytes,
  deriveVaultKey,
  createPasswordVerifier,
  verifyVaultKey,
  generateRecoveryKey,
  verifyRecoveryKey,
  encryptText,
  decryptText,
  calculateSha256,
} from '../lib/crypto';
import {
  getVaultMetadata,
  saveVaultMetadata,
  dbGetAll,
  dbPut,
  dbDelete,
  addAuditLog,
  calculateStorageBreakdown,
  exportAllVaultData,
  importVaultData,
  wipeEntireVault,
  checkStoragePersistence,
} from '../lib/storage';
import {
  downloadBackupFile,
  shareBackupToDrive,
  parseBackupFile,
} from '../lib/backupService';

const DEFAULT_SETTINGS: VaultSettings = {
  autoLockMinutes: 5,
  lockOnTabBlur: false,
  clipboardAutoClearSeconds: 30,
  enableHapticFeedback: true,
  persistentStorageGranted: false,
};

interface VaultContextType {
  status: VaultStatus;
  metadata: VaultMetadata | null;
  activeMasterKey: CryptoKey | null;
  settings: VaultSettings;
  storageBreakdown: StorageBreakdown;
  clipboardSecondsLeft: number | null;
  copiedPasswordId: string | null;
  isBackingUp: boolean;
  backupProgressMessage: string;

  // Lifecycle
  initializeVault: (password: string) => Promise<{ formattedKey: string }>;
  unlockVault: (password: string) => Promise<boolean>;
  unlockWithRecoveryKey: (recoveryKey: string, newPassword?: string) => Promise<boolean>;
  lockVault: (reason?: string) => void;
  updateSettings: (newSettings: Partial<VaultSettings>) => Promise<void>;
  changeMasterPassword: (currentPass: string, newPass: string) => Promise<boolean>;
  regenerateRecoveryKey: () => Promise<string>;
  resetVault: () => Promise<void>;

  // Clipboard manager
  copyPasswordWithAutoClear: (password: string, id: string) => Promise<void>;
  clearClipboardNow: () => Promise<void>;

  // Data Collections
  photos: VaultPhotoItem[];
  videos: VaultVideoItem[];
  passwords: VaultPasswordItem[];
  documents: VaultDocumentItem[];
  notes: VaultNoteItem[];

  // Mutators
  refreshAllData: () => Promise<void>;
  addPhoto: (item: VaultPhotoItem) => Promise<void>;
  deletePhoto: (id: string, permanent?: boolean) => Promise<void>;
  restorePhoto: (id: string) => Promise<void>;

  addVideo: (item: VaultVideoItem) => Promise<void>;
  deleteVideo: (id: string, permanent?: boolean) => Promise<void>;
  restoreVideo: (id: string) => Promise<void>;

  addPassword: (item: VaultPasswordItem) => Promise<void>;
  updatePassword: (item: VaultPasswordItem) => Promise<void>;
  deletePassword: (id: string) => Promise<void>;

  addDocument: (item: VaultDocumentItem) => Promise<void>;
  deleteDocument: (id: string, permanent?: boolean) => Promise<void>;
  restoreDocument: (id: string) => Promise<void>;

  addNote: (item: VaultNoteItem) => Promise<void>;
  updateNote: (item: VaultNoteItem) => Promise<void>;
  deleteNote: (id: string, permanent?: boolean) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;

  // Sovereign Backup & Restore
  createEncryptedBackupPayload: () => Promise<EncryptedBackupContainer>;
  restoreFromEncryptedBackupPayload: (
    backup: EncryptedBackupContainer,
    passwordOrRecoveryKey: string
  ) => Promise<{ success: boolean; error?: string }>;
  exportLocalBackupFile: () => Promise<void>;
  shareBackupToDeviceOrDrive: () => Promise<boolean>;
  restoreFromFile: (file: File, passwordOrRecovery: string) => Promise<{ success: boolean; error?: string }>;
}

const VaultContext = createContext<VaultContextType | undefined>(undefined);

export const VaultProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<VaultStatus>('locked');
  const [metadata, setMetadata] = useState<VaultMetadata | null>(null);
  const [activeMasterKey, setActiveMasterKey] = useState<CryptoKey | null>(null);
  const [settings, setSettings] = useState<VaultSettings>(DEFAULT_SETTINGS);
  const [storageBreakdown, setStorageBreakdown] = useState<StorageBreakdown>({
    photosBytes: 0,
    videosBytes: 0,
    documentsBytes: 0,
    passwordsBytes: 0,
    notesBytes: 0,
    totalUsedBytes: 0,
    deviceQuotaBytes: 10 * 1024 * 1024 * 1024,
    quotaUsagePercent: 0,
  });

  // Collections
  const [photos, setPhotos] = useState<VaultPhotoItem[]>([]);
  const [videos, setVideos] = useState<VaultVideoItem[]>([]);
  const [passwords, setPasswords] = useState<VaultPasswordItem[]>([]);
  const [documents, setDocuments] = useState<VaultDocumentItem[]>([]);
  const [notes, setNotes] = useState<VaultNoteItem[]>([]);

  // Clipboard auto-clear
  const [clipboardSecondsLeft, setClipboardSecondsLeft] = useState<number | null>(null);
  const [copiedPasswordId, setCopiedPasswordId] = useState<string | null>(null);
  const clipboardTimerRef = useRef<number | null>(null);

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupProgressMessage, setBackupProgressMessage] = useState('');

  // Activity tracking for auto-lock
  const lastActivityRef = useRef<number>(Date.now());

  // Haptic feedback
  const triggerHaptic = useCallback(() => {
    if (settings.enableHapticFeedback && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {
        // Ignore haptic errors on unsupported hardware
      }
    }
  }, [settings.enableHapticFeedback]);

  // Load initial metadata on startup
  useEffect(() => {
    const loadMeta = async () => {
      try {
        const meta = await getVaultMetadata();
        if (!meta) {
          setStatus('uninitialized');
        } else {
          setMetadata(meta);
          setSettings(meta.settings || DEFAULT_SETTINGS);
          setStatus('locked');
        }
        const isPersisted = await checkStoragePersistence();
        setSettings((prev) => ({ ...prev, persistentStorageGranted: isPersisted }));
      } catch (err) {
        console.error('Failed to load vault metadata:', err);
        setStatus('uninitialized');
      }
    };
    loadMeta();
  }, []);

  // Lock Vault
  const lockVault = useCallback((reason: string = 'User locked') => {
    setActiveMasterKey(null);
    setStatus('locked');
    triggerHaptic();
    addAuditLog('lock', `Vault locked (${reason})`, 'info');
  }, [triggerHaptic]);

  // Auto-lock inactivity listener
  useEffect(() => {
    if (status !== 'unlocked') return;

    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('pointerdown', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    window.addEventListener('touchstart', handleUserActivity);

    const handleVisibilityChange = () => {
      if (document.hidden && settings.lockOnTabBlur) {
        lockVault('Switched away from tab');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const checkInterval = setInterval(() => {
      if (settings.autoLockMinutes > 0) {
        const elapsedMinutes = (Date.now() - lastActivityRef.current) / (1000 * 60);
        if (elapsedMinutes >= settings.autoLockMinutes) {
          lockVault(`Inactivity timeout (${settings.autoLockMinutes}m)`);
        }
      }
    }, 10000);

    return () => {
      window.removeEventListener('pointerdown', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
      window.removeEventListener('touchstart', handleUserActivity);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(checkInterval);
    };
  }, [status, settings.autoLockMinutes, settings.lockOnTabBlur, lockVault]);

  // Refresh items from IndexedDB
  const refreshAllData = useCallback(async () => {
    try {
      const [pList, vList, pwdList, docList, nList, storage] = await Promise.all([
        dbGetAll<VaultPhotoItem>('photos'),
        dbGetAll<VaultVideoItem>('videos'),
        dbGetAll<VaultPasswordItem>('passwords'),
        dbGetAll<VaultDocumentItem>('documents'),
        dbGetAll<VaultNoteItem>('notes'),
        calculateStorageBreakdown(),
      ]);

      setPhotos(pList);
      setVideos(vList);
      setPasswords(pwdList);
      setDocuments(docList);
      setNotes(nList);
      setStorageBreakdown(storage);
    } catch (err) {
      console.error('Error refreshing vault data:', err);
    }
  }, []);

  // Initialize Vault (First time setup)
  const initializeVault = async (password: string): Promise<{ formattedKey: string }> => {
    const salt = getRandomBytes(16);
    const saltHex = bytesToHex(salt);

    const derivedKey = await deriveVaultKey(password, salt);
    const verifierHash = await createPasswordVerifier(derivedKey);
    const { formattedKey, hash: recoveryKeyHash } = await generateRecoveryKey();

    const newMeta: VaultMetadata = {
      id: 'current_vault_meta',
      isInitialized: true,
      salt: saltHex,
      verifierHash,
      recoveryKeyHash,
      createdAt: Date.now(),
      lastUnlockedAt: Date.now(),
      settings: DEFAULT_SETTINGS,
    };

    await saveVaultMetadata(newMeta);
    setMetadata(newMeta);
    setActiveMasterKey(derivedKey);
    setStatus('unlocked');

    await addAuditLog('unlock', 'Vault created and initialized with master password', 'success');
    await refreshAllData();
    triggerHaptic();

    return { formattedKey };
  };

  // Unlock Vault with Master Password
  const unlockVault = async (password: string): Promise<boolean> => {
    if (!metadata) return false;

    try {
      const saltBytes = hexToBytes(metadata.salt);
      const derivedKey = await deriveVaultKey(password, saltBytes);
      const isValid = await verifyVaultKey(derivedKey, metadata.verifierHash);

      if (isValid) {
        setActiveMasterKey(derivedKey);
        setStatus('unlocked');
        lastActivityRef.current = Date.now();

        const updated = { ...metadata, lastUnlockedAt: Date.now() };
        await saveVaultMetadata(updated);
        setMetadata(updated);

        await addAuditLog('unlock', 'Vault unlocked via Master Password', 'success');
        await refreshAllData();
        triggerHaptic();
        return true;
      } else {
        await addAuditLog('failed_unlock', 'Failed unlock attempt (Invalid password)', 'warning');
        return false;
      }
    } catch (err) {
      console.error('Unlock error:', err);
      return false;
    }
  };

  // Unlock Vault with Recovery Key
  const unlockWithRecoveryKey = async (
    recoveryKey: string,
    newPassword?: string
  ): Promise<boolean> => {
    if (!metadata) return false;

    const isMatch = await verifyRecoveryKey(recoveryKey, metadata.recoveryKeyHash);
    if (!isMatch) {
      await addAuditLog('failed_unlock', 'Invalid recovery key attempt', 'warning');
      return false;
    }

    const effectivePassword = newPassword || recoveryKey;
    const saltBytes = hexToBytes(metadata.salt);
    const newDerivedKey = await deriveVaultKey(effectivePassword, saltBytes);
    const newVerifier = await createPasswordVerifier(newDerivedKey);

    const updated: VaultMetadata = {
      ...metadata,
      verifierHash: newVerifier,
      lastUnlockedAt: Date.now(),
    };
    await saveVaultMetadata(updated);
    setMetadata(updated);
    setActiveMasterKey(newDerivedKey);
    setStatus('unlocked');

    await addAuditLog('unlock', 'Vault unlocked & restored with Recovery Key', 'success');
    await refreshAllData();
    triggerHaptic();
    return true;
  };

  // Change Master Password
  const changeMasterPassword = async (currentPass: string, newPass: string): Promise<boolean> => {
    if (!metadata) return false;
    const saltBytes = hexToBytes(metadata.salt);
    const oldKey = await deriveVaultKey(currentPass, saltBytes);
    const isValid = await verifyVaultKey(oldKey, metadata.verifierHash);
    if (!isValid) return false;

    const newSalt = getRandomBytes(16);
    const newSaltHex = bytesToHex(newSalt);
    const newKey = await deriveVaultKey(newPass, newSalt);
    const newVerifier = await createPasswordVerifier(newKey);

    const updated: VaultMetadata = {
      ...metadata,
      salt: newSaltHex,
      verifierHash: newVerifier,
    };
    await saveVaultMetadata(updated);
    setMetadata(updated);
    setActiveMasterKey(newKey);

    await addAuditLog('unlock', 'Master password successfully rotated', 'info');
    triggerHaptic();
    return true;
  };

  // Regenerate Recovery Key
  const regenerateRecoveryKey = async (): Promise<string> => {
    if (!metadata) throw new Error('Vault not initialized');
    const { formattedKey, hash } = await generateRecoveryKey();
    const updated = { ...metadata, recoveryKeyHash: hash };
    await saveVaultMetadata(updated);
    setMetadata(updated);
    await addAuditLog('unlock', 'New emergency Recovery Key generated', 'info');
    return formattedKey;
  };

  // Update Settings
  const updateSettings = async (newSettings: Partial<VaultSettings>) => {
    if (!metadata) return;
    const merged: VaultSettings = { ...settings, ...newSettings };
    setSettings(merged);
    const updated: VaultMetadata = { ...metadata, settings: merged };
    await saveVaultMetadata(updated);
    setMetadata(updated);
  };

  // Reset Vault
  const resetVault = async () => {
    await wipeEntireVault();
    setActiveMasterKey(null);
    setMetadata(null);
    setStatus('uninitialized');
    setPhotos([]);
    setVideos([]);
    setPasswords([]);
    setDocuments([]);
    setNotes([]);
  };

  // Password Clipboard Auto-Clear Service
  const clearClipboardNow = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText('');
      }
    } catch {
      // Ignore
    }
    setClipboardSecondsLeft(null);
    setCopiedPasswordId(null);
    if (clipboardTimerRef.current) {
      clearInterval(clipboardTimerRef.current);
      clipboardTimerRef.current = null;
    }
    triggerHaptic();
  };

  const copyPasswordWithAutoClear = async (password: string, id: string) => {
    try {
      await navigator.clipboard.writeText(password);
      triggerHaptic();
      await addAuditLog('password_copy', 'Password copied to clipboard', 'info');

      if (clipboardTimerRef.current) {
        clearInterval(clipboardTimerRef.current);
      }

      setCopiedPasswordId(id);
      const totalSec = settings.clipboardAutoClearSeconds || 30;
      setClipboardSecondsLeft(totalSec);

      clipboardTimerRef.current = window.setInterval(() => {
        setClipboardSecondsLeft((prev) => {
          if (prev === null || prev <= 1) {
            if (clipboardTimerRef.current) {
              clearInterval(clipboardTimerRef.current);
              clipboardTimerRef.current = null;
            }
            try {
              navigator.clipboard.writeText('');
            } catch {
              // ignore
            }
            setCopiedPasswordId(null);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // CRUD Item Handlers
  const addPhoto = async (item: VaultPhotoItem) => {
    await dbPut('photos', item);
    await refreshAllData();
    triggerHaptic();
  };

  const deletePhoto = async (id: string, permanent: boolean = false) => {
    if (permanent) {
      await dbDelete('photos', id);
    } else {
      const item = photos.find((p) => p.id === id);
      if (item) {
        await dbPut('photos', { ...item, isTrash: true, deletedAt: Date.now() });
      }
    }
    await refreshAllData();
    triggerHaptic();
  };

  const restorePhoto = async (id: string) => {
    const item = photos.find((p) => p.id === id);
    if (item) {
      await dbPut('photos', { ...item, isTrash: false, deletedAt: undefined });
      await refreshAllData();
      triggerHaptic();
    }
  };

  const addVideo = async (item: VaultVideoItem) => {
    await dbPut('videos', item);
    await refreshAllData();
    triggerHaptic();
  };

  const deleteVideo = async (id: string, permanent: boolean = false) => {
    if (permanent) {
      await dbDelete('videos', id);
    } else {
      const item = videos.find((v) => v.id === id);
      if (item) {
        await dbPut('videos', { ...item, isTrash: true, deletedAt: Date.now() });
      }
    }
    await refreshAllData();
    triggerHaptic();
  };

  const restoreVideo = async (id: string) => {
    const item = videos.find((v) => v.id === id);
    if (item) {
      await dbPut('videos', { ...item, isTrash: false, deletedAt: undefined });
      await refreshAllData();
      triggerHaptic();
    }
  };

  const addPassword = async (item: VaultPasswordItem) => {
    await dbPut('passwords', item);
    await refreshAllData();
    triggerHaptic();
  };

  const updatePassword = async (item: VaultPasswordItem) => {
    await dbPut('passwords', item);
    await refreshAllData();
    triggerHaptic();
  };

  const deletePassword = async (id: string) => {
    await dbDelete('passwords', id);
    await refreshAllData();
    triggerHaptic();
  };

  const addDocument = async (item: VaultDocumentItem) => {
    await dbPut('documents', item);
    await refreshAllData();
    triggerHaptic();
  };

  const deleteDocument = async (id: string, permanent: boolean = false) => {
    if (permanent) {
      await dbDelete('documents', id);
    } else {
      const item = documents.find((d) => d.id === id);
      if (item) {
        await dbPut('documents', { ...item, isTrash: true, deletedAt: Date.now() });
      }
    }
    await refreshAllData();
    triggerHaptic();
  };

  const restoreDocument = async (id: string) => {
    const item = documents.find((d) => d.id === id);
    if (item) {
      await dbPut('documents', { ...item, isTrash: false, deletedAt: undefined });
      await refreshAllData();
      triggerHaptic();
    }
  };

  const addNote = async (item: VaultNoteItem) => {
    await dbPut('notes', item);
    await refreshAllData();
    triggerHaptic();
  };

  const updateNote = async (item: VaultNoteItem) => {
    await dbPut('notes', item);
    await refreshAllData();
    triggerHaptic();
  };

  const deleteNote = async (id: string, permanent: boolean = false) => {
    if (permanent) {
      await dbDelete('notes', id);
    } else {
      const item = notes.find((n) => n.id === id);
      if (item) {
        await dbPut('notes', { ...item, isTrash: true, deletedAt: Date.now() });
      }
    }
    await refreshAllData();
    triggerHaptic();
  };

  const restoreNote = async (id: string) => {
    const item = notes.find((n) => n.id === id);
    if (item) {
      await dbPut('notes', { ...item, isTrash: false, deletedAt: undefined });
      await refreshAllData();
      triggerHaptic();
    }
  };

  // Backup Container Generator
  const createEncryptedBackupPayload = async (): Promise<EncryptedBackupContainer> => {
    if (!activeMasterKey || !metadata) {
      throw new Error('Vault must be unlocked to generate backup');
    }

    const rawExport = await exportAllVaultData();
    const serialized = JSON.stringify(rawExport);

    const { ciphertext, iv } = await encryptText(serialized, activeMasterKey);
    const checksum = await calculateSha256(ciphertext);

    const container: EncryptedBackupContainer = {
      format: 'MOTIX_SECURE_BACKUP_V1',
      timestamp: Date.now(),
      appVersion: '1.0.0',
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device',
      salt: metadata.salt,
      iv,
      encryptedPayload: ciphertext,
      checksum,
    };

    return container;
  };

  // Export as local .motix file
  const exportLocalBackupFile = async () => {
    setIsBackingUp(true);
    setBackupProgressMessage('Generating local AES-256-GCM encrypted backup...');
    try {
      const backupContainer = await createEncryptedBackupPayload();
      downloadBackupFile(backupContainer);

      if (metadata) {
        const updated: VaultMetadata = {
          ...metadata,
          lastBackupAt: Date.now(),
          lastBackupType: 'local-file',
          backupChecksum: backupContainer.checksum,
        };
        await saveVaultMetadata(updated);
        setMetadata(updated);
      }
      await addAuditLog('export_backup', 'Exported encrypted .motix backup file', 'success');
      triggerHaptic();
    } finally {
      setIsBackingUp(false);
      setBackupProgressMessage('');
    }
  };

  // Share to Google Drive or local device
  const shareBackupToDeviceOrDrive = async (): Promise<boolean> => {
    setIsBackingUp(true);
    setBackupProgressMessage('Preparing encrypted backup for export...');
    try {
      const backupContainer = await createEncryptedBackupPayload();
      const shared = await shareBackupToDrive(backupContainer);

      if (metadata) {
        const updated: VaultMetadata = {
          ...metadata,
          lastBackupAt: Date.now(),
          lastBackupType: 'local-file',
          backupChecksum: backupContainer.checksum,
        };
        await saveVaultMetadata(updated);
        setMetadata(updated);
      }
      await addAuditLog('export_backup', 'Backup shared to device / Drive storage', 'success');
      triggerHaptic();
      return shared;
    } finally {
      setIsBackingUp(false);
      setBackupProgressMessage('');
    }
  };

  // Restore from Backup Container
  const restoreFromEncryptedBackupPayload = async (
    backup: EncryptedBackupContainer,
    passwordOrRecoveryKey: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      if (backup.format !== 'MOTIX_SECURE_BACKUP_V1') {
        return { success: false, error: 'Invalid backup format or corrupt container.' };
      }

      const calculatedChecksum = await calculateSha256(backup.encryptedPayload);
      if (calculatedChecksum !== backup.checksum) {
        return { success: false, error: 'Backup checksum mismatch! Integrity check failed.' };
      }

      const saltBytes = hexToBytes(backup.salt);
      const testKey = await deriveVaultKey(passwordOrRecoveryKey, saltBytes);

      let decryptedJson = '';
      try {
        decryptedJson = await decryptText(backup.encryptedPayload, backup.iv, testKey);
      } catch {
        return { success: false, error: 'Decryption failed: Incorrect Master Password or Key.' };
      }

      const imported = JSON.parse(decryptedJson);
      if (imported.metadata) {
        await saveVaultMetadata(imported.metadata);
        setMetadata(imported.metadata);
      }

      await importVaultData(imported);
      setActiveMasterKey(testKey);
      setStatus('unlocked');
      await refreshAllData();
      await addAuditLog('import_backup', `Restored backup from ${new Date(backup.timestamp).toLocaleDateString()}`, 'success');
      triggerHaptic();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Restoration failed' };
    }
  };

  // Restore from selected .motix file
  const restoreFromFile = async (file: File, passwordOrRecovery: string) => {
    setIsBackingUp(true);
    setBackupProgressMessage('Verifying file integrity...');
    try {
      const container = await parseBackupFile(file);
      setBackupProgressMessage('Decrypting vault payload...');
      return await restoreFromEncryptedBackupPayload(container, passwordOrRecovery);
    } catch (err: any) {
      return { success: false, error: err.message || 'File processing failed' };
    } finally {
      setIsBackingUp(false);
      setBackupProgressMessage('');
    }
  };

  return (
    <VaultContext.Provider
      value={{
        status,
        metadata,
        activeMasterKey,
        settings,
        storageBreakdown,
        clipboardSecondsLeft,
        copiedPasswordId,
        isBackingUp,
        backupProgressMessage,
        initializeVault,
        unlockVault,
        unlockWithRecoveryKey,
        lockVault,
        updateSettings,
        changeMasterPassword,
        regenerateRecoveryKey,
        resetVault,
        copyPasswordWithAutoClear,
        clearClipboardNow,
        photos,
        videos,
        passwords,
        documents,
        notes,
        refreshAllData,
        addPhoto,
        deletePhoto,
        restorePhoto,
        addVideo,
        deleteVideo,
        restoreVideo,
        addPassword,
        updatePassword,
        deletePassword,
        addDocument,
        deleteDocument,
        restoreDocument,
        addNote,
        updateNote,
        deleteNote,
        restoreNote,
        createEncryptedBackupPayload,
        restoreFromEncryptedBackupPayload,
        exportLocalBackupFile,
        shareBackupToDeviceOrDrive,
        restoreFromFile,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
};

export const useVault = () => {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
};
