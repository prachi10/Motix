/**
 * MOTIX In-App PWA Install Component
 * Follows PWA integration guidelines with Android & iOS support.
 */

import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWA';
import { Download, Share, X, ShieldCheck } from 'lucide-react';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already installed in standalone mode, hide
  if (isInstalled) {
    return null;
  }

  // Android / Chromium / Desktop flow
  if (isInstallable) {
    if (compact) {
      return (
        <button
          onClick={install}
          aria-label="Install MOTIX App"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-medium transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>
      );
    }

    return (
      <div className="vault-glass-card rounded-2xl p-4 mb-4 flex items-center justify-between gap-4 border border-cyan-500/30 glow-cyan">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Download className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white">Install MOTIX Vault App</h4>
            <p className="text-xs text-slate-400">Add to home screen for native offline security & biometric feel.</p>
          </div>
        </div>
        <button
          onClick={install}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-lg shadow-cyan-500/20 active:scale-95 transition-all shrink-0 cursor-pointer"
        >
          Install App
        </button>
      </div>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        {compact ? (
          <button
            onClick={() => setShowIOSGuide(true)}
            aria-label="Install on iPhone / iPad"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>
        ) : (
          <div className="vault-glass-card rounded-2xl p-3.5 mb-4 flex items-center justify-between gap-3 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Install on iPhone</h4>
                <p className="text-[11px] text-slate-400">Save MOTIX to your iOS Home Screen.</p>
              </div>
            </div>
            <button
              onClick={() => setShowIOSGuide(true)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 font-medium text-xs transition shrink-0"
            >
              How to Install
            </button>
          </div>
        )}

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <Share className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Install on iOS</h3>
                  <p className="text-xs text-slate-400">Safari Home Screen Installation</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">1</span>
                  <span>Tap the <strong>Share button</strong> <Share className="w-3.5 h-3.5 inline mx-1 text-cyan-400" /> in Safari's bottom toolbar.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">2</span>
                  <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">3</span>
                  <span>Tap <strong>Add</strong> in the top right corner.</span>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs shadow-lg transition"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
