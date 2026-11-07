/**
 * MOTIX Native Android Vault Shell
 * Mobile-first native interface, Android navigation bar,
 * status bar, quick lock affordance, and live clipboard auto-clear bar.
 */

import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { DashboardView } from './DashboardView';
import { MediaVaultView } from './MediaVaultView';
import { PasswordVaultView } from './PasswordVaultView';
import { DocsNotesView } from './DocsNotesView';
import { SecurityBackupView } from './SecurityBackupView';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineIndicator } from './OfflineIndicator';
import {
  Shield,
  ShieldCheck,
  Image,
  KeyRound,
  FileText,
  Settings,
  Lock,
  BatteryCharging,
  Wifi,
  Sparkles,
  Clipboard,
  X,
  Smartphone,
  Monitor,
} from 'lucide-react';

export const VaultShell: React.FC = () => {
  const {
    lockVault,
    clipboardSecondsLeft,
    clearClipboardNow,
  } = useVault();

  const [activeTab, setActiveTab] = useState<'dashboard' | 'media' | 'passwords' | 'files' | 'security'>('dashboard');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [deviceFrameMode, setDeviceFrameMode] = useState<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={`min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-between ${deviceFrameMode ? 'p-4 sm:p-6 bg-slate-950 items-center justify-center' : ''}`}>
      {/* Offline Status Badge */}
      <OfflineIndicator />

      {/* Main Container - Responsive for Android & Desktop */}
      <div className={`w-full ${deviceFrameMode ? 'max-w-[430px] rounded-[48px] border-[10px] border-slate-800 shadow-[0_0_80px_-10px_rgba(0,210,255,0.25)] overflow-hidden bg-[#07090E] min-h-[880px]' : 'max-w-2xl mx-auto'} flex flex-col flex-1 relative`}>

        {/* ---------------- 1. ANDROID STATUS BAR ---------------- */}
        <div className="w-full px-6 pt-3 pb-2 flex items-center justify-between text-xs text-slate-400 select-none z-30 bg-[#07090E]/80 backdrop-blur-md sticky top-0">
          {/* Left: Clock */}
          <span className="font-semibold text-slate-200 tracking-tight font-mono">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </span>

          {/* Center: Subtle MOTIX Security Pill */}
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-cyan-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>ENCRYPTED</span>
          </div>

          {/* Right: Android Battery & Signals */}
          <div className="flex items-center gap-2 text-slate-400">
            <Wifi className="w-3.5 h-3.5" />
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
            <span className="text-[10px] font-mono">100%</span>
          </div>
        </div>

        {/* ---------------- 2. TOP APP BAR ---------------- */}
        <header className="px-5 py-3 flex items-center justify-between border-b border-slate-800/80 bg-[#07090E]/90 backdrop-blur-md sticky top-9 z-20">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-md glow-cyan">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold text-white tracking-tight">MOTIX</span>
                <span className="text-[10px] text-cyan-400/80 font-mono">VAULT</span>
              </div>
              <p className="text-[10px] text-slate-400 -mt-0.5">by Moti Technologies</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop frame preview toggle for desktop users */}
            <button
              onClick={() => setDeviceFrameMode(!deviceFrameMode)}
              className="hidden lg:flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 text-xs transition"
              title="Toggle Android Device Frame Preview"
            >
              {deviceFrameMode ? <Monitor className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
              <span className="text-[11px]">{deviceFrameMode ? 'Wide' : 'Phone'}</span>
            </button>

            {/* Install PWA compact trigger */}
            <PWAInstallButton compact />

            {/* Quick Lock Button */}
            <button
              onClick={() => lockVault('Header lock button')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700/80 hover:border-rose-500/30 text-xs font-medium transition cursor-pointer active:scale-95"
              title="Lock Vault Now"
            >
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Lock</span>
            </button>
          </div>
        </header>

        {/* ---------------- 3. VIEW CONTAINER ---------------- */}
        <main className="flex-1 px-4 sm:px-6 pt-4 pb-24 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardView onNavigateTab={setActiveTab} />}
          {activeTab === 'media' && <MediaVaultView />}
          {activeTab === 'passwords' && <PasswordVaultView />}
          {activeTab === 'files' && <DocsNotesView />}
          {activeTab === 'security' && <SecurityBackupView />}
        </main>

        {/* ---------------- 4. FLOATING CLIPBOARD AUTO-CLEAR BAR ---------------- */}
        {clipboardSecondsLeft !== null && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 max-w-sm w-[90%] p-3 rounded-2xl bg-slate-900/95 border border-emerald-500/40 text-xs text-white shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 glow-cyan animate-in slide-in-from-bottom-4">
            <div className="flex items-center gap-2 min-w-0">
              <Clipboard className="w-4 h-4 text-emerald-400 shrink-0 animate-pulse" />
              <div className="truncate">
                <span className="font-semibold text-slate-200">Password in clipboard</span>
                <span className="text-slate-400 text-[11px] block">
                  Auto-clearing in <strong className="text-emerald-400 font-mono">{clipboardSecondsLeft}s</strong>
                </span>
              </div>
            </div>
            <button
              onClick={clearClipboardNow}
              className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 font-medium text-[11px] shrink-0 transition cursor-pointer"
            >
              Clear Now
            </button>
          </div>
        )}

        {/* ---------------- 5. ANDROID BOTTOM NAVIGATION BAR ---------------- */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 max-w-2xl mx-auto bg-[#07090E]/95 backdrop-blur-xl border-t border-slate-800/80 px-2 py-2">
          <div className="grid grid-cols-5 items-center">
            {/* Tab 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'dashboard' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-cyan-500/15 scale-110' : ''}`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1">Vault</span>
            </button>

            {/* Tab 2: Media */}
            <button
              onClick={() => setActiveTab('media')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'media' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === 'media' ? 'bg-cyan-500/15 scale-110' : ''}`}>
                <Image className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1">Media</span>
            </button>

            {/* Tab 3: Passwords */}
            <button
              onClick={() => setActiveTab('passwords')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'passwords' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === 'passwords' ? 'bg-cyan-500/15 scale-110' : ''}`}>
                <KeyRound className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1">Passwords</span>
            </button>

            {/* Tab 4: Docs & Notes */}
            <button
              onClick={() => setActiveTab('files')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'files' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === 'files' ? 'bg-cyan-500/15 scale-110' : ''}`}>
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1">Files</span>
            </button>

            {/* Tab 5: Security Hub */}
            <button
              onClick={() => setActiveTab('security')}
              className={`flex flex-col items-center justify-center py-1 rounded-xl transition cursor-pointer ${
                activeTab === 'security' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-xl transition-all ${activeTab === 'security' ? 'bg-cyan-500/15 scale-110' : ''}`}>
                <Settings className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium tracking-tight mt-1">Security</span>
            </button>
          </div>
        </nav>
      </div>
    </div>
  );
};
