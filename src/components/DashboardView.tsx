/**
 * MOTIX Main Dashboard View
 * Native Android-style security overview, storage breakdown gauge,
 * quick action tiles, backup status, and security health index.
 */

import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { PWAInstallButton } from './PWAInstallButton';
import { getAuditLogs } from '../lib/storage';
import { AuditLogEntry } from '../types/vault';
import {
  ShieldCheck,
  Image,
  Video,
  KeyRound,
  FileText,
  Lock,
  HardDrive,
  Clock,
  Sparkles,
  ChevronRight,
  RefreshCw,
  Share2,
  FileCheck,
} from 'lucide-react';

interface DashboardViewProps {
  onNavigateTab: (tab: 'dashboard' | 'media' | 'passwords' | 'files' | 'security') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab }) => {
  const {
    metadata,
    storageBreakdown,
    photos,
    videos,
    passwords,
    documents,
    notes,
    shareBackupToDeviceOrDrive,
    exportLocalBackupFile,
    isBackingUp,
    lockVault,
  } = useVault();

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showShareToast, setShowShareToast] = useState(false);

  useEffect(() => {
    getAuditLogs(6).then(setAuditLogs);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleQuickBackup = async () => {
    const res = await shareBackupToDeviceOrDrive();
    if (res) {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 3000);
      getAuditLogs(6).then(setAuditLogs);
    }
  };

  // Calculate vault security score
  let securityScore = 75; // base score for having master password
  if (metadata?.lastBackupAt && Date.now() - metadata.lastBackupAt < 7 * 86400000) securityScore += 15;
  if (passwords.length > 0) securityScore += 10;
  securityScore = Math.min(100, securityScore);

  return (
    <div className="space-y-5 pb-8">
      {/* PWA Install Banner if applicable */}
      <PWAInstallButton />

      {/* Cyber Hero Welcome Card */}
      <div className="relative rounded-3xl overflow-hidden border border-cyan-500/30 p-6 glow-cyan">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none"
          style={{ backgroundImage: `url('/src/assets/images/vault_cyber_backdrop_1794044269641.jpg')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#07090E] via-[#07090E]/90 to-transparent pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-sm shadow-cyan-400" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-cyan-400">
                AES-256-GCM Active
              </span>
            </div>
            <button
              onClick={() => lockVault('Dashboard quick lock')}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 text-xs font-medium transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lock Now</span>
            </button>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            MOTIX Vault
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-sm">
            "Your Digital World. Your Private Space."
          </p>

          {/* Quick Metrics Strip */}
          <div className="mt-5 grid grid-cols-3 gap-2.5 pt-4 border-t border-slate-800/80">
            <div>
              <div className="text-[11px] text-slate-400">Shield Health</div>
              <div className="text-lg font-bold text-cyan-300 font-mono">{securityScore}%</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Vault Items</div>
              <div className="text-lg font-bold text-white font-mono">
                {photos.length + videos.length + passwords.length + documents.length + notes.length}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400">Encrypted Size</div>
              <div className="text-lg font-bold text-slate-200 font-mono">
                {formatBytes(storageBreakdown.totalUsedBytes)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Vault Categories Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Secure Vaults
          </h3>
          <span className="text-[11px] text-cyan-400 font-medium">Local-First Storage</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {/* Photo Vault */}
          <button
            onClick={() => onNavigateTab('media')}
            className="vault-glass-card p-4 rounded-2xl text-left hover:border-cyan-500/40 transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Image className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Photo Vault</div>
            <div className="text-xs text-slate-400 mt-0.5">{photos.length} photos</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              {formatBytes(storageBreakdown.photosBytes)}
            </div>
          </button>

          {/* Video Vault */}
          <button
            onClick={() => onNavigateTab('media')}
            className="vault-glass-card p-4 rounded-2xl text-left hover:border-blue-500/40 transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Video className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Video Vault</div>
            <div className="text-xs text-slate-400 mt-0.5">{videos.length} videos</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              {formatBytes(storageBreakdown.videosBytes)}
            </div>
          </button>

          {/* Password Manager */}
          <button
            onClick={() => onNavigateTab('passwords')}
            className="vault-glass-card p-4 rounded-2xl text-left hover:border-emerald-500/40 transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Passwords</div>
            <div className="text-xs text-slate-400 mt-0.5">{passwords.length} credentials</div>
            <div className="text-[10px] text-emerald-400 font-mono mt-2">30s Auto-Clear</div>
          </button>

          {/* Documents Vault */}
          <button
            onClick={() => onNavigateTab('files')}
            className="vault-glass-card p-4 rounded-2xl text-left hover:border-purple-500/40 transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Documents</div>
            <div className="text-xs text-slate-400 mt-0.5">{documents.length} files</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">
              {formatBytes(storageBreakdown.documentsBytes)}
            </div>
          </button>

          {/* Private Notes */}
          <button
            onClick={() => onNavigateTab('files')}
            className="vault-glass-card p-4 rounded-2xl text-left hover:border-amber-500/40 transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <FileCheck className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Private Notes</div>
            <div className="text-xs text-slate-400 mt-0.5">{notes.length} notes</div>
            <div className="text-[10px] text-slate-500 font-mono mt-2">Checklists & Text</div>
          </button>

          {/* Backup & Restore */}
          <button
            onClick={() => onNavigateTab('security')}
            className="vault-glass-card p-4 rounded-2xl text-left hover:border-cyan-500/40 transition group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <Share2 className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-white">Backup & Sync</div>
            <div className="text-xs text-slate-400 mt-0.5">.motix encrypted</div>
            <div className="text-[10px] text-cyan-400 font-mono mt-2">Integrity Verified</div>
          </button>
        </div>
      </div>

      {/* Storage Breakdown Bar */}
      <div className="vault-glass-card rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Device Storage Quota
            </h4>
          </div>
          <span className="text-xs font-mono text-slate-300">
            {formatBytes(storageBreakdown.totalUsedBytes)} / {formatBytes(storageBreakdown.deviceQuotaBytes)}
          </span>
        </div>

        {/* Visual Multi-Segment Storage Bar */}
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-800">
          <div
            style={{ width: `${Math.max(5, (storageBreakdown.photosBytes / (storageBreakdown.totalUsedBytes || 1)) * 100)}%` }}
            className="h-full bg-cyan-400 rounded-sm"
            title="Photos"
          />
          <div
            style={{ width: `${Math.max(5, (storageBreakdown.videosBytes / (storageBreakdown.totalUsedBytes || 1)) * 100)}%` }}
            className="h-full bg-blue-500 rounded-sm"
            title="Videos"
          />
          <div
            style={{ width: `${Math.max(5, (storageBreakdown.documentsBytes / (storageBreakdown.totalUsedBytes || 1)) * 100)}%` }}
            className="h-full bg-purple-500 rounded-sm"
            title="Documents"
          />
          <div
            style={{ width: `${Math.max(5, (storageBreakdown.passwordsBytes / (storageBreakdown.totalUsedBytes || 1)) * 100)}%` }}
            className="h-full bg-emerald-400 rounded-sm"
            title="Passwords"
          />
          <div
            style={{ width: `${Math.max(5, (storageBreakdown.notesBytes / (storageBreakdown.totalUsedBytes || 1)) * 100)}%` }}
            className="h-full bg-amber-400 rounded-sm"
            title="Notes"
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-cyan-400" /> Photos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Videos
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" /> Docs
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Passwords
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Notes
          </span>
        </div>
      </div>

      {/* Backup Status & Quick Action Card */}
      <div className="vault-glass-card rounded-2xl p-5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Vault Backup Status</span>
          </div>
          <p className="text-xs text-slate-400">
            {metadata?.lastBackupAt
              ? `Last backed up ${new Date(metadata.lastBackupAt).toLocaleDateString()} at ${new Date(metadata.lastBackupAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'No recent backup found. Back up your encrypted vault to prevent data loss.'}
          </p>
          {metadata?.backupChecksum && (
            <p className="text-[10px] font-mono text-slate-500">
              SHA-256 Checksum: {metadata.backupChecksum.substring(0, 20)}...
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportLocalBackupFile}
            disabled={isBackingUp}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer"
          >
            Export .motix
          </button>
          <button
            onClick={handleQuickBackup}
            disabled={isBackingUp}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 active:scale-95 transition cursor-pointer"
          >
            {isBackingUp ? 'Encrypting...' : 'Share / Save'}
          </button>
        </div>
      </div>

      {/* Security Activity Audit Log */}
      <div className="vault-glass-card rounded-2xl p-5 border border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wide">
              Recent Vault Activity
            </h4>
          </div>
          <button
            onClick={() => onNavigateTab('security')}
            className="text-[11px] text-cyan-400 hover:underline flex items-center gap-0.5 cursor-pointer"
          >
            Full Log <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="space-y-2.5">
          {auditLogs.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">No activity recorded yet.</p>
          ) : (
            auditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-xs py-1.5 border-b border-slate-800/60 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      log.status === 'success'
                        ? 'bg-emerald-400'
                        : log.status === 'warning'
                        ? 'bg-amber-400'
                        : 'bg-cyan-400'
                    }`}
                  />
                  <span className="text-slate-300 font-medium">{log.details}</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {showShareToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-emerald-500/90 text-white text-xs font-medium shadow-xl backdrop-blur-md">
          Encrypted backup prepared successfully!
        </div>
      )}
    </div>
  );
};
