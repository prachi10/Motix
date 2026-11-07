/**
 * MOTIX Security & Backup View
 * 100% Local-first sovereign backup, native Android Share to Google Drive,
 * emergency Recovery Key generator, auto-lock settings, and persistent storage.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useVault } from '../context/VaultContext';
import { getAuditLogs } from '../lib/storage';
import { useStoragePersistence } from '../hooks/usePWA';
import { AuditLogEntry } from '../types/vault';
import {
  ShieldCheck,
  KeyRound,
  Download,
  Upload,
  Share2,
  Clock,
  HardDrive,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
  Smartphone,
  Eye,
  EyeOff,
  Copy,
  FileCheck,
} from 'lucide-react';

export const SecurityBackupView: React.FC = () => {
  const {
    metadata,
    settings,
    updateSettings,
    exportLocalBackupFile,
    shareBackupToDeviceOrDrive,
    restoreFromFile,
    changeMasterPassword,
    regenerateRecoveryKey,
    isBackingUp,
    backupProgressMessage,
    lockVault,
  } = useVault();

  const { isPersisted, requestPersist } = useStoragePersistence();

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [toastMessage, setToastMessage] = useState('');

  // Password Change State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmNewPass, setConfirmNewPass] = useState('');
  const [passChangeError, setPassChangeError] = useState('');
  const [passChangeSuccess, setPassChangeSuccess] = useState(false);

  // Recovery Key View
  const [showRecoveryView, setShowRecoveryView] = useState(false);
  const [currentRecoveryKey, setCurrentRecoveryKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Restore State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [restorePassInput, setRestorePassInput] = useState('');
  const [restoreError, setRestoreError] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  const restoreFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    getAuditLogs(50).then(setAuditLogs);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Handle Password Change
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassChangeError('');

    if (newPass.length < 8) {
      setPassChangeError('New password must be at least 8 characters long.');
      return;
    }
    if (newPass !== confirmNewPass) {
      setPassChangeError('New passwords do not match.');
      return;
    }

    try {
      const ok = await changeMasterPassword(currentPass, newPass);
      if (ok) {
        setPassChangeSuccess(true);
        setCurrentPass('');
        setNewPass('');
        setConfirmNewPass('');
        showToast('Master Password successfully rotated!');
        setTimeout(() => {
          setShowPasswordChange(false);
          setPassChangeSuccess(false);
        }, 1500);
      } else {
        setPassChangeError('Current password is incorrect.');
      }
    } catch (err: any) {
      setPassChangeError(err.message || 'Password update failed.');
    }
  };

  // Regenerate Recovery Key
  const handleRegenerateKey = async () => {
    if (window.confirm('Regenerate a new Emergency Recovery Key? The previous key will be invalidated.')) {
      try {
        const key = await regenerateRecoveryKey();
        setCurrentRecoveryKey(key);
        setShowRecoveryView(true);
        showToast('New Emergency Recovery Key generated!');
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  // Handle Restore File Selection
  const handleSelectRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRestoreFile(file);
      setShowRestoreModal(true);
      setRestoreError('');
    }
  };

  // Execute Restoration
  const handleExecuteRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restoreFile || !restorePassInput.trim()) return;

    setIsRestoring(true);
    setRestoreError('');
    try {
      const res = await restoreFromFile(restoreFile, restorePassInput.trim());
      if (res.success) {
        showToast('Vault restored successfully!');
        setShowRestoreModal(false);
        setRestoreFile(null);
        setRestorePassInput('');
      } else {
        setRestoreError(res.error || 'Failed to restore vault.');
      }
    } catch (err: any) {
      setRestoreError(err.message || 'Restoration failed');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Page Title */}
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          <span>Security & Backup Hub</span>
        </h2>
        <p className="text-xs text-slate-400">
          Sovereign local-first architecture · Zero cloud accounts required
        </p>
      </div>

      {/* ---------------- 1. BACKUP & RESTORE ---------------- */}
      <div className="vault-glass-card rounded-2xl p-5 border border-cyan-500/30 glow-cyan space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Sovereign Vault Backup</h3>
              <p className="text-xs text-slate-400">AES-256-GCM encrypted .motix container</p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
            Client-Side Encrypted
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Your backup is encrypted directly in your browser before export. You can save it to your device or share it directly into your <strong>Google Drive app</strong> using Android's native system share.
        </p>

        {metadata?.lastBackupAt && (
          <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>Last Backup:</span>
            <span className="font-mono text-slate-200">
              {new Date(metadata.lastBackupAt).toLocaleString()}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Share to Drive / Device */}
          <button
            onClick={async () => {
              const shared = await shareBackupToDeviceOrDrive();
              if (shared) showToast('Backup exported / shared successfully!');
            }}
            disabled={isBackingUp}
            className="h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{isBackingUp ? 'Encrypting...' : 'Share / Save to Google Drive'}</span>
          </button>

          {/* Direct File Download */}
          <button
            onClick={async () => {
              await exportLocalBackupFile();
              showToast('Encrypted .motix file downloaded!');
            }}
            disabled={isBackingUp}
            className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Download .motix File</span>
          </button>
        </div>

        {/* Restore Section */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Have a previous .motix backup?
          </div>
          <button
            onClick={() => restoreFileInputRef.current?.click()}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore Backup</span>
          </button>
          <input
            type="file"
            ref={restoreFileInputRef}
            onChange={handleSelectRestoreFile}
            accept=".motix,.json"
            className="hidden"
          />
        </div>
      </div>

      {/* ---------------- 2. SECURITY KEYS & CREDENTIALS ---------------- */}
      <div className="vault-glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Keys & Master Credentials</h3>
            <p className="text-xs text-slate-400">Manage your Master Password and Recovery Key</p>
          </div>
        </div>

        <div className="space-y-2">
          {/* Change Master Password Trigger */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Master Password</div>
              <div className="text-[11px] text-slate-400">Used to derive your local encryption key</div>
            </div>
            <button
              onClick={() => setShowPasswordChange(!showPasswordChange)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
            >
              {showPasswordChange ? 'Cancel' : 'Change Password'}
            </button>
          </div>

          {/* Password Change Form */}
          {showPasswordChange && (
            <form onSubmit={handleChangePasswordSubmit} className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              {passChangeError && (
                <div className="p-2.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs">
                  {passChangeError}
                </div>
              )}
              {passChangeSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-500/15 text-emerald-300 text-xs">
                  Master password successfully rotated!
                </div>
              )}

              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                placeholder="Current Master Password"
                required
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="New Master Password (min 8 characters)"
                required
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <input
                type="password"
                value={confirmNewPass}
                onChange={(e) => setConfirmNewPass(e.target.value)}
                placeholder="Confirm New Master Password"
                required
                className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 px-3 text-xs text-white focus:outline-none focus:border-cyan-400"
              />

              <button
                type="submit"
                className="w-full h-10 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition"
              >
                Update Master Password
              </button>
            </form>
          )}

          {/* Emergency Recovery Key */}
          <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-white">Emergency Recovery Key</div>
              <div className="text-[11px] text-slate-400">Offline key for emergency vault recovery</div>
            </div>
            <button
              onClick={handleRegenerateKey}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-medium transition cursor-pointer"
            >
              Regenerate Key
            </button>
          </div>

          {/* Display newly generated recovery key */}
          {showRecoveryView && currentRecoveryKey && (
            <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 space-y-2">
              <span className="text-[10px] text-purple-300 uppercase tracking-wider font-mono">
                New Emergency Recovery Key:
              </span>
              <div className="font-mono text-sm font-bold text-purple-200 select-all bg-slate-950 p-2.5 rounded-lg border border-purple-900/50">
                {currentRecoveryKey}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentRecoveryKey);
                  setCopiedKey(true);
                  setTimeout(() => setCopiedKey(false), 2000);
                }}
                className="px-3 py-1.5 rounded-lg bg-purple-800 text-white text-xs font-medium flex items-center gap-1.5"
              >
                {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- 3. AUTO-LOCK & HARDENING ---------------- */}
      <div className="vault-glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Inactivity & Auto-Lock</h3>
            <p className="text-xs text-slate-400">Automatic session termination and clipboard privacy</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          {/* Auto-Lock Minutes */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">Auto-Lock Inactivity Timeout</div>
              <div className="text-[11px] text-slate-400">Lock vault after period of user inactivity</div>
            </div>
            <select
              value={settings.autoLockMinutes}
              onChange={(e) => updateSettings({ autoLockMinutes: parseInt(e.target.value) })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value={1}>1 Minute</option>
              <option value={5}>5 Minutes</option>
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={0}>Never (Not recommended)</option>
            </select>
          </div>

          {/* Lock on Tab Blur */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
            <div>
              <div className="font-semibold text-slate-200">Lock Immediately on Tab Switch</div>
              <div className="text-[11px] text-slate-400">Lock vault whenever you switch apps or minimize browser</div>
            </div>
            <input
              type="checkbox"
              checked={settings.lockOnTabBlur}
              onChange={(e) => updateSettings({ lockOnTabBlur: e.target.checked })}
              className="rounded border-slate-700 text-cyan-500 bg-slate-800 focus:ring-cyan-400 w-4 h-4"
            />
          </label>

          {/* Clipboard Auto-Clear Seconds */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
            <div>
              <div className="font-semibold text-slate-200">Clipboard Auto-Clear Delay</div>
              <div className="text-[11px] text-slate-400">Wipe copied passwords from device clipboard</div>
            </div>
            <select
              value={settings.clipboardAutoClearSeconds}
              onChange={(e) => updateSettings({ clipboardAutoClearSeconds: parseInt(e.target.value) })}
              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value={15}>15 Seconds</option>
              <option value={30}>30 Seconds (Default)</option>
              <option value={60}>60 Seconds</option>
            </select>
          </div>

          {/* Haptic Feedback */}
          <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 cursor-pointer">
            <div>
              <div className="font-semibold text-slate-200">Android Haptic Feedback</div>
              <div className="text-[11px] text-slate-400">Tactile vibration on unlock, copy, and secure actions</div>
            </div>
            <input
              type="checkbox"
              checked={settings.enableHapticFeedback}
              onChange={(e) => updateSettings({ enableHapticFeedback: e.target.checked })}
              className="rounded border-slate-700 text-cyan-500 bg-slate-800 focus:ring-cyan-400 w-4 h-4"
            />
          </label>
        </div>
      </div>

      {/* ---------------- 4. STORAGE PERSISTENCE & DIAGNOSTICS ---------------- */}
      <div className="vault-glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Browser Storage Persistence</h3>
            <p className="text-xs text-slate-400">Prevent browser from clearing vault under low disk pressure</p>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs">
          <div>
            <div className="font-semibold text-white">
              Status: {isPersisted ? 'Persisted (Protected)' : 'Standard (Best Effort)'}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {isPersisted
                ? 'Your device has granted persistent storage permission to MOTIX.'
                : 'Click below to request persistent storage lock from Android/Browser.'}
            </p>
          </div>

          {!isPersisted && (
            <button
              onClick={async () => {
                const ok = await requestPersist();
                if (ok) showToast('Persistent storage granted!');
              }}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition cursor-pointer"
            >
              Request
            </button>
          )}
        </div>

        {/* Security Specs Checklist */}
        <div className="space-y-1.5 pt-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-2 text-cyan-400 font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architecture Invariants:</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-5">
            <div>✓ Encryption: AES-256-GCM (96-bit IV)</div>
            <div>✓ Derivation: Argon2id / PBKDF2 (SHA-256)</div>
            <div>✓ Integrity: SHA-256 HMAC Checksums</div>
            <div>✓ Zero Cloud Leakage: 100% Offline Capable</div>
            <div>✓ Storage Engine: IndexedDB & OPFS</div>
            <div>✓ Developed by: Moti Technologies</div>
          </div>
        </div>
      </div>

      {/* RESTORE MODAL */}
      {showRestoreModal && restoreFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Restore Vault Backup</h3>
                <p className="text-xs text-slate-400">{restoreFile.name}</p>
              </div>
            </div>

            {restoreError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {restoreError}
              </div>
            )}

            <form onSubmit={handleExecuteRestore} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Enter Master Password (or Recovery Key) of this Backup
                </label>
                <input
                  type="password"
                  value={restorePassInput}
                  onChange={(e) => setRestorePassInput(e.target.value)}
                  placeholder="Master password used when backup was created"
                  required
                  autoFocus
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400">
                Integrity will be strictly verified with SHA-256 prior to decrypting records.
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowRestoreModal(false);
                    setRestoreFile(null);
                  }}
                  className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRestoring}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-lg"
                >
                  {isRestoring ? 'Verifying & Decrypting...' : 'Restore Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-slate-900 border border-cyan-500/50 text-cyan-300 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2">
          <Check className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
