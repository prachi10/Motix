/**
 * MOTIX Vault Authentication & Onboarding Component
 * Native Android-style lock screen & Master Password Setup with Recovery Key.
 */

import React, { useState, useEffect } from 'react';
import { useVault } from '../context/VaultContext';
import { evaluatePasswordStrength } from '../lib/crypto';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  Fingerprint,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Sparkles,
  Info,
} from 'lucide-react';

export const VaultAuth: React.FC = () => {
  const { status, metadata, initializeVault, unlockVault, unlockWithRecoveryKey, resetVault } = useVault();

  // Onboarding Setup State
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupStep, setSetupStep] = useState<'create' | 'recovery'>('create');
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState('');
  const [recoveryConfirmed, setRecoveryConfirmed] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState('');

  // Unlock State
  const [unlockPassword, setUnlockPassword] = useState('');
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState('');
  const [unlockAttempts, setUnlockAttempts] = useState(0);

  // Recovery Key Modal State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryKeyInput, setRecoveryKeyInput] = useState('');
  const [newMasterPasswordInput, setNewMasterPasswordInput] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  // Reset confirmation
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Current time for lock screen
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const strength = evaluatePasswordStrength(setupPassword);

  // Handle Initial Vault Creation
  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');

    if (setupPassword.length < 8) {
      setSetupError('Master password must be at least 8 characters long.');
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setSetupError('Passwords do not match. Please verify.');
      return;
    }

    setIsSettingUp(true);
    try {
      const { formattedKey } = await initializeVault(setupPassword);
      setGeneratedRecoveryKey(formattedKey);
      setSetupStep('recovery');
    } catch (err: any) {
      setSetupError(err.message || 'Failed to initialize vault.');
    } finally {
      setIsSettingUp(false);
    }
  };

  // Download Emergency Recovery Sheet
  const handleDownloadRecoverySheet = () => {
    const content = `=====================================================
MOTIX - PERSONAL DIGITAL SECURITY VAULT
DEVELOPED BY MOTI TECHNOLOGIES
"Your Digital World. Your Private Space."
=====================================================

EMERGENCY MASTER RECOVERY KEY:
${generatedRecoveryKey}

DATE CREATED: ${new Date().toLocaleString()}
SECURITY ARCHITECTURE: Local-First AES-256-GCM + Argon2id

INSTRUCTIONS:
1. Keep this document stored OFFLINE in a secure location.
2. If you forget your Master Password, this Recovery Key is the ONLY way to recover your encrypted photos, videos, passwords, documents, and notes.
3. MOTIX is zero-knowledge: Moti Technologies does NOT hold your keys and CANNOT reset your vault for you.
=====================================================`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MOTIX_EMERGENCY_RECOVERY_KEY_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(generatedRecoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2500);
  };

  // Handle Unlock
  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!unlockPassword.trim()) return;

    setIsUnlocking(true);
    setUnlockError('');
    try {
      const success = await unlockVault(unlockPassword);
      if (!success) {
        setUnlockAttempts((prev) => prev + 1);
        setUnlockError('Incorrect Master Password. Please try again.');
      }
    } catch {
      setUnlockError('An error occurred during decryption.');
    } finally {
      setIsUnlocking(false);
    }
  };

  // Simulated Biometric Unlock
  const handleBiometricSimulation = async () => {
    // If user has unlocked before and attempts biometric
    if (metadata) {
      setIsUnlocking(true);
      setUnlockError('');
      setTimeout(() => {
        setIsUnlocking(false);
        setUnlockError('Biometric passkey requires Master Password entry for session verification.');
      }, 700);
    }
  };

  // Handle Recovery Key Unlock
  const handleRecoveryUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError('');

    if (!recoveryKeyInput.trim()) {
      setRecoveryError('Please enter your Recovery Key.');
      return;
    }

    setIsRecovering(true);
    try {
      const success = await unlockWithRecoveryKey(
        recoveryKeyInput.trim(),
        newMasterPasswordInput.trim() || undefined
      );
      if (success) {
        setShowRecoveryModal(false);
      } else {
        setRecoveryError('Invalid Recovery Key. Please check the characters.');
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Recovery failed.');
    } finally {
      setIsRecovering(false);
    }
  };

  // Numeric keypad click helper
  const handleKeypadPress = (val: string) => {
    if (val === 'backspace') {
      setUnlockPassword((prev) => prev.slice(0, -1));
    } else {
      setUnlockPassword((prev) => prev + val);
    }
  };

  // -------------------------------------------------------------
  // RENDER 1: FIRST TIME ONBOARDING SETUP
  // -------------------------------------------------------------
  if (status === 'uninitialized') {
    return (
      <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Futuristic Cyber Ambient Background Glows */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          {/* Header Branding */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-slate-900 border border-cyan-500/30 mb-4 shadow-2xl glow-shield">
              <Shield className="w-10 h-10 text-cyan-400" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              MOTIX
            </h1>
            <p className="text-xs font-medium text-cyan-400/90 tracking-widest uppercase mt-0.5">
              by Moti Technologies
            </p>
            <p className="text-sm text-slate-400 mt-2">
              "Your Digital World. Your Private Space."
            </p>
          </div>

          {setupStep === 'create' ? (
            <div className="vault-glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-cyan-500/20">
              <div className="flex items-center gap-2.5 mb-6 text-sm font-semibold text-slate-200 pb-3 border-b border-slate-800">
                <Lock className="w-4 h-4 text-cyan-400" />
                <span>Initialize Master Security Key</span>
              </div>

              {setupError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{setupError}</span>
                </div>
              )}

              <form onSubmit={handleCreateVault} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Master Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSetupPassword ? 'text' : 'password'}
                      value={setupPassword}
                      onChange={(e) => setSetupPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      required
                      className="w-full h-12 rounded-xl bg-slate-900/90 border border-slate-700/80 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSetupPassword(!showSetupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {setupPassword && (
                    <div className="mt-2.5 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-slate-400">Strength:</span>
                        <span className={`font-semibold ${strength.color}`}>{strength.label}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            strength.score < 30
                              ? 'bg-rose-500'
                              : strength.score < 55
                              ? 'bg-amber-500'
                              : strength.score < 75
                              ? 'bg-yellow-400'
                              : strength.score < 90
                              ? 'bg-blue-400'
                              : 'bg-cyan-400'
                          }`}
                          style={{ width: `${strength.score}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Confirm Master Password
                  </label>
                  <input
                    type={showSetupPassword ? 'text' : 'password'}
                    value={setupConfirmPassword}
                    onChange={(e) => setSetupConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full h-12 rounded-xl bg-slate-900/90 border border-slate-700/80 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-cyan-400 font-medium">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Zero-Knowledge Promise</span>
                  </div>
                  <p>Your master password never leaves your browser. It is derived locally with Argon2id and Web Crypto AES-256-GCM.</p>
                </div>

                <button
                  type="submit"
                  disabled={isSettingUp}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-50"
                >
                  {isSettingUp ? 'Generating Military-Grade Keys...' : 'Create Secure Vault'}
                </button>
              </form>
            </div>
          ) : (
            /* Step 2: Emergency Recovery Key Screen */
            <div className="vault-glass-card rounded-3xl p-6 sm:p-8 shadow-2xl border border-cyan-500/30 glow-cyan">
              <div className="flex items-center gap-2.5 mb-4 text-sm font-semibold text-cyan-400 pb-3 border-b border-slate-800">
                <KeyRound className="w-4 h-4" />
                <span>Save Emergency Recovery Key</span>
              </div>

              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                If you ever forget your Master Password, this <strong>Recovery Key</strong> is the <em>only</em> way to regain access to your encrypted vault.
              </p>

              {/* Recovery Key Card */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-cyan-500/30 text-center mb-4 relative">
                <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block mb-1">
                  Master Recovery Token
                </span>
                <div className="font-mono text-base sm:text-lg font-bold tracking-widest text-cyan-300 select-all py-1">
                  {generatedRecoveryKey}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mb-5">
                <button
                  type="button"
                  onClick={handleCopyRecoveryKey}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey ? 'Copied!' : 'Copy Key'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadRecoverySheet}
                  className="h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 transition"
                >
                  <Download className="w-4 h-4 text-cyan-400" />
                  <span>Download .txt</span>
                </button>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={recoveryConfirmed}
                  onChange={(e) => setRecoveryConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-800"
                />
                <span className="text-xs text-slate-300 leading-tight">
                  I have saved this Recovery Key in a safe offline location. I understand it cannot be recovered by Moti Technologies.
                </span>
              </label>

              <button
                type="button"
                disabled={!recoveryConfirmed}
                onClick={() => window.location.reload()}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Enter Protected Vault
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER 2: NATIVE ANDROID-STYLE LOCK SCREEN
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col justify-between p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-cyan-600/10 blur-[100px] pointer-events-none" />

      {/* Top Android Status Area */}
      <div className="w-full max-w-sm mx-auto flex items-center justify-between text-xs text-slate-400 pt-2 z-10">
        <div className="flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-semibold tracking-wide text-slate-300">MOTIX VAULT</span>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
          <span>AES-256-GCM</span>
        </div>
      </div>

      {/* Center Clock & Lock Status */}
      <div className="w-full max-w-sm mx-auto text-center my-auto py-6 z-10">
        <div className="mb-2">
          <div className="text-5xl sm:text-6xl font-light tracking-tight text-white font-mono">
            {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
          <div className="text-xs text-slate-400 tracking-wider mt-1">
            {currentTime.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
          </div>
        </div>

        {/* Lock Icon Emblem */}
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-900/80 border border-slate-700/60 my-4 text-cyan-400 shadow-xl glow-cyan">
          <Lock className="w-6 h-6" />
        </div>

        {unlockError && (
          <div className="mb-4 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{unlockError}</span>
          </div>
        )}

        {/* Unlock Form */}
        <form onSubmit={handleUnlock} className="space-y-3">
          <div className="relative">
            <input
              type={showUnlockPassword ? 'text' : 'password'}
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Enter Master Password"
              autoFocus
              className="w-full h-12 rounded-2xl bg-slate-900/90 border border-slate-700/80 px-4 text-center text-sm text-white placeholder-slate-500 tracking-wider focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition"
            />
            <button
              type="button"
              onClick={() => setShowUnlockPassword(!showUnlockPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              aria-label="Toggle password visibility"
            >
              {showUnlockPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isUnlocking || !unlockPassword}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/20 active:scale-[0.98] transition cursor-pointer disabled:opacity-40"
            >
              {isUnlocking ? 'Decrypting Session...' : 'Unlock Vault'}
            </button>
            <button
              type="button"
              onClick={handleBiometricSimulation}
              title="Biometric passkey"
              className="w-12 h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-cyan-400 active:scale-95 transition shrink-0"
            >
              <Fingerprint className="w-6 h-6" />
            </button>
          </div>
        </form>

        {/* Numeric Keypad for fast mobile unlock */}
        <div className="mt-6 grid grid-cols-3 gap-2.5 max-w-[280px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'backspace'].map((key, i) => {
            if (key === '') return <div key={i} />;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleKeypadPress(key)}
                className="h-12 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 active:bg-cyan-500/20 border border-slate-800/60 text-base font-semibold text-slate-200 flex items-center justify-center transition active:scale-95"
              >
                {key === 'backspace' ? '⌫' : key}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Emergency Recovery & Reset Links */}
      <div className="w-full max-w-sm mx-auto text-center space-y-2 z-10 pb-4">
        <button
          type="button"
          onClick={() => setShowRecoveryModal(true)}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
        >
          Forgot Master Password? Unlock with Recovery Key
        </button>

        {unlockAttempts >= 3 && (
          <div>
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="text-[11px] text-rose-400 hover:text-rose-300 transition"
            >
              Emergency Device Reset (Wipe Vault)
            </button>
          </div>
        )}
      </div>

      {/* Recovery Key Modal */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-cyan-500/30 p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-400">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Emergency Vault Recovery</h3>
                <p className="text-xs text-slate-400">Unlock using your offline Recovery Key</p>
              </div>
            </div>

            {recoveryError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
                {recoveryError}
              </div>
            )}

            <form onSubmit={handleRecoveryUnlock} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Recovery Key (e.g. MTX9-XXXX-XXXX...)
                </label>
                <input
                  type="text"
                  value={recoveryKeyInput}
                  onChange={(e) => setRecoveryKeyInput(e.target.value)}
                  placeholder="MTX9-4K7B-9P2L..."
                  required
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-xs font-mono text-cyan-300 tracking-wider focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Set New Master Password (Optional)
                </label>
                <input
                  type="password"
                  value={newMasterPasswordInput}
                  onChange={(e) => setNewMasterPasswordInput(e.target.value)}
                  placeholder="Leave blank to use recovery key as password"
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRecoveryModal(false)}
                  className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRecovering}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold text-xs shadow-lg transition"
                >
                  {isRecovering ? 'Restoring...' : 'Verify & Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Factory Reset Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Factory Reset Vault?</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed">
              This will permanently delete all encrypted files, photos, passwords, and private notes stored on this device. This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 h-11 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await resetVault();
                  setShowResetConfirm(false);
                }}
                className="flex-1 h-11 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Wipe Vault
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
