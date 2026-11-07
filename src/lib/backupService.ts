/**
 * MOTIX Sovereign Backup & Restore Engine
 * 100% Local-first, Zero Firebase, Zero Third-Party tracking.
 * Encrypts data locally with AES-256-GCM and SHA-256 checksums.
 * Supports:
 * - Native Android Share to Google Drive / Files
 * - Direct .motix encrypted container download & import
 * - Client-side file integrity verification
 */

import { EncryptedBackupContainer } from '../types/vault';
import { calculateSha256 } from './crypto';

/**
 * Trigger download of the encrypted .motix backup file
 */
export function downloadBackupFile(backup: EncryptedBackupContainer): void {
  const dateStr = new Date(backup.timestamp).toISOString().split('T')[0];
  const filename = `MOTIX_SECURE_BACKUP_${dateStr}.motix`;
  const jsonStr = JSON.stringify(backup, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Share encrypted backup using Native Android Web Share API
 * Enables one-tap direct saving into Google Drive app, Files, or secure storage.
 */
export async function shareBackupToDrive(backup: EncryptedBackupContainer): Promise<boolean> {
  const dateStr = new Date(backup.timestamp).toISOString().split('T')[0];
  const filename = `MOTIX_SECURE_BACKUP_${dateStr}.motix`;
  const jsonStr = JSON.stringify(backup, null, 2);
  const file = new File([jsonStr], filename, { type: 'application/octet-stream' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: 'MOTIX Vault Encrypted Backup',
        text: `MOTIX Personal Security Vault Backup (SHA-256: ${backup.checksum.slice(0, 12)}...)`,
        files: [file],
      });
      return true;
    } catch (err: any) {
      if (err.name === 'AbortError') return false;
      console.warn('Share aborted, falling back to download:', err);
    }
  }

  // Fallback to standard browser download
  downloadBackupFile(backup);
  return true;
}

/**
 * Read and validate an encrypted backup file from File input
 */
export async function parseBackupFile(file: File): Promise<EncryptedBackupContainer> {
  const text = await file.text();
  let container: EncryptedBackupContainer;

  try {
    container = JSON.parse(text);
  } catch {
    throw new Error('Invalid file format. The selected file is not a valid JSON container.');
  }

  if (container.format !== 'MOTIX_SECURE_BACKUP_V1') {
    throw new Error('Unrecognized backup format. Please select a valid .motix backup file.');
  }

  if (!container.encryptedPayload || !container.salt || !container.iv || !container.checksum) {
    throw new Error('Corrupted backup file: Missing cryptographic signatures or payload.');
  }

  // Verify SHA-256 integrity checksum
  const computedChecksum = await calculateSha256(container.encryptedPayload);
  if (computedChecksum !== container.checksum) {
    throw new Error('Integrity verification failed! The backup file appears altered or corrupted.');
  }

  return container;
}
