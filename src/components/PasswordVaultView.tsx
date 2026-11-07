/**
 * MOTIX Password Manager Component
 * Encrypted password storage, password generator, strength analysis,
 * and 30-second clipboard auto-clear security protocol.
 */

import React, { useState } from 'react';
import { useVault } from '../context/VaultContext';
import { VaultPasswordItem, VaultCategory } from '../types/vault';
import {
  encryptText,
  decryptText,
  generatePassword,
  evaluatePasswordStrength,
  PasswordGeneratorOptions,
} from '../lib/crypto';
import {
  KeyRound,
  Plus,
  Search,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Trash2,
  Edit2,
  Wand2,
  ShieldAlert,
  Star,
  Globe,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';

export const PasswordVaultView: React.FC = () => {
  const {
    passwords,
    addPassword,
    updatePassword,
    deletePassword,
    activeMasterKey,
    copyPasswordWithAutoClear,
    clipboardSecondsLeft,
    copiedPasswordId,
  } = useVault();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<VaultPasswordItem | null>(null);

  // Decrypted passwords cache for viewing { id: plaintext }
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, string>>({});
  const [loadingDecryptId, setLoadingDecryptId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<VaultCategory>('personal');
  const [formNotes, setFormNotes] = useState('');
  const [formShowPassword, setFormShowPassword] = useState(false);

  // Generator Drawer inside Form
  const [showGenerator, setShowGenerator] = useState(false);
  const [genOptions, setGenOptions] = useState<PasswordGeneratorOptions>({
    length: 16,
    includeUppercase: true,
    includeLowercase: true,
    includeNumbers: true,
    includeSymbols: true,
    excludeLookalikes: true,
  });

  const formStrength = evaluatePasswordStrength(formPassword);

  const resetForm = () => {
    setFormTitle('');
    setFormUsername('');
    setFormPassword('');
    setFormUrl('');
    setFormCategory('personal');
    setFormNotes('');
    setEditingItem(null);
    setShowGenerator(false);
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = async (item: VaultPasswordItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormUsername(item.username);
    setFormUrl(item.websiteUrl || '');
    setFormCategory(item.category || 'personal');
    setFormNotes(item.notes || '');

    if (activeMasterKey) {
      try {
        const plain = await decryptText(item.encryptedPassword, item.iv, activeMasterKey);
        setFormPassword(plain);
      } catch (err) {
        console.error('Error decrypting password for edit:', err);
      }
    }
    setShowAddModal(true);
  };

  const handleGenerateInForm = () => {
    const generated = generatePassword(genOptions);
    setFormPassword(generated);
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formPassword.trim() || !activeMasterKey) return;

    try {
      const { ciphertext, iv } = await encryptText(formPassword, activeMasterKey);
      const strengthScore = evaluatePasswordStrength(formPassword).score;

      if (editingItem) {
        const updated: VaultPasswordItem = {
          ...editingItem,
          title: formTitle.trim(),
          username: formUsername.trim(),
          encryptedPassword: ciphertext,
          iv,
          websiteUrl: formUrl.trim() || undefined,
          category: formCategory,
          notes: formNotes.trim() || undefined,
          updatedAt: Date.now(),
          strengthScore,
        };
        await updatePassword(updated);
      } else {
        const newItem: VaultPasswordItem = {
          id: `pwd_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: formTitle.trim(),
          username: formUsername.trim(),
          encryptedPassword: ciphertext,
          iv,
          websiteUrl: formUrl.trim() || undefined,
          category: formCategory,
          notes: formNotes.trim() || undefined,
          isFavorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          strengthScore,
        };
        await addPassword(newItem);
      }

      setShowAddModal(false);
      resetForm();
    } catch (err) {
      console.error('Failed to encrypt password item:', err);
      alert('Encryption failed.');
    }
  };

  const handleToggleReveal = async (item: VaultPasswordItem) => {
    if (revealedPasswords[item.id]) {
      const copy = { ...revealedPasswords };
      delete copy[item.id];
      setRevealedPasswords(copy);
      return;
    }

    if (!activeMasterKey) return;
    setLoadingDecryptId(item.id);
    try {
      const plain = await decryptText(item.encryptedPassword, item.iv, activeMasterKey);
      setRevealedPasswords((prev) => ({ ...prev, [item.id]: plain }));
    } catch (err) {
      console.error('Decryption failed:', err);
    } finally {
      setLoadingDecryptId(null);
    }
  };

  const handleCopy = async (item: VaultPasswordItem) => {
    if (!activeMasterKey) return;
    try {
      let plain = revealedPasswords[item.id];
      if (!plain) {
        plain = await decryptText(item.encryptedPassword, item.iv, activeMasterKey);
      }
      await copyPasswordWithAutoClear(plain, item.id);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  const filteredPasswords = passwords.filter((item) => {
    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        (item.websiteUrl && item.websiteUrl.toLowerCase().includes(q))
      );
    }
    return true;
  });

  // Calculate Weak Passwords Count
  const weakCount = passwords.filter((p) => p.strengthScore < 50).length;

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Add Button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <span>Password Manager</span>
          </h2>
          <p className="text-xs text-slate-400">Zero-knowledge encrypted password vault</p>
        </div>

        <button
          onClick={openAddModal}
          className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 active:scale-95 transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Login</span>
        </button>
      </div>

      {/* Weak Password Warning Banner if any */}
      {weakCount > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-300">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold">{weakCount} weak password(s) detected.</span>
              <p className="text-[11px] text-amber-300/80">Upgrade to 16+ characters with symbols.</p>
            </div>
          </div>
          <button
            onClick={() => {
              setGenOptions((prev) => ({ ...prev, length: 20 }));
              openAddModal();
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-medium shrink-0 cursor-pointer"
          >
            Generate Strong
          </button>
        </div>
      )}

      {/* Search & Categories */}
      <div className="space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logins, websites, emails..."
            className="w-full h-10 rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
          {['all', 'personal', 'work', 'financial', 'social', 'credentials'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium'
                  : 'text-slate-400 hover:text-white bg-slate-900/50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Password List */}
      {filteredPasswords.length === 0 ? (
        <div className="vault-glass-card rounded-2xl p-12 text-center border border-slate-800">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-white">No passwords saved</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            Safely store your accounts, PINs, and credentials with AES-256-GCM encryption.
          </p>
          <button
            onClick={openAddModal}
            className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-medium transition cursor-pointer"
          >
            Add First Login
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredPasswords.map((item) => {
            const isRevealed = !!revealedPasswords[item.id];
            const isCopied = copiedPasswordId === item.id;

            return (
              <div
                key={item.id}
                className="vault-glass-card rounded-2xl p-4 border border-slate-800/80 hover:border-emerald-500/30 transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">{item.title}</h4>
                        <span className="text-[10px] text-slate-500 capitalize bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                          {item.category}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mt-0.5">{item.username}</div>

                      {/* Password Value Row */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="font-mono text-xs text-emerald-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 select-all tracking-wider">
                          {isRevealed ? revealedPasswords[item.id] : '••••••••••••'}
                        </span>
                        <button
                          onClick={() => handleToggleReveal(item)}
                          className="text-slate-400 hover:text-white p-1"
                          title={isRevealed ? 'Hide Password' : 'Show Password'}
                        >
                          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopied ? `${clipboardSecondsLeft}s` : 'Copy'}</span>
                    </button>
                    <button
                      onClick={() => openEditModal(item)}
                      className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deletePassword(item.id)}
                      className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.websiteUrl && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                    <a
                      href={item.websiteUrl.startsWith('http') ? item.websiteUrl : `https://${item.websiteUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-cyan-400 flex items-center gap-1 truncate"
                    >
                      <span>{item.websiteUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <span className="text-[10px]">
                      Updated {new Date(item.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT PASSWORD MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => {
                setShowAddModal(false);
                resetForm();
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {editingItem ? 'Edit Credential' : 'Add New Credential'}
            </h3>

            <form onSubmit={handleSavePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Service / Website Name
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Google, GitHub, Chase Bank"
                  required
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Username / Email
                </label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  placeholder="e.g. user@example.com"
                  required
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              {/* Password field with Generator Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowGenerator(!showGenerator)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>{showGenerator ? 'Close Generator' : 'Generate Strong'}</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={formShowPassword ? 'text' : 'password'}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="Enter or generate password"
                    required
                    className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3.5 pr-10 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPassword(!formShowPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
                  >
                    {formShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Strength Meter in Form */}
                {formPassword && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Strength:</span>
                      <span className={`font-semibold ${formStrength.color}`}>{formStrength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 transition-all"
                        style={{ width: `${formStrength.score}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* GENERATOR ACCORDION */}
              {showGenerator && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">Password Generator</span>
                    <button
                      type="button"
                      onClick={handleGenerateInForm}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-medium flex items-center gap-1 hover:bg-emerald-500/30 transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Re-roll</span>
                    </button>
                  </div>

                  {/* Length Slider */}
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                      <span>Length</span>
                      <span className="font-mono text-white font-bold">{genOptions.length}</span>
                    </div>
                    <input
                      type="range"
                      min={8}
                      max={48}
                      value={genOptions.length}
                      onChange={(e) => {
                        const len = parseInt(e.target.value);
                        setGenOptions((prev) => ({ ...prev, length: len }));
                        setFormPassword(generatePassword({ ...genOptions, length: len }));
                      }}
                      className="w-full accent-emerald-400"
                    />
                  </div>

                  {/* Option Toggles */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genOptions.includeUppercase}
                        onChange={(e) => {
                          const opts = { ...genOptions, includeUppercase: e.target.checked };
                          setGenOptions(opts);
                          setFormPassword(generatePassword(opts));
                        }}
                        className="rounded border-slate-700 text-emerald-500 bg-slate-900"
                      />
                      <span>Uppercase (A-Z)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genOptions.includeNumbers}
                        onChange={(e) => {
                          const opts = { ...genOptions, includeNumbers: e.target.checked };
                          setGenOptions(opts);
                          setFormPassword(generatePassword(opts));
                        }}
                        className="rounded border-slate-700 text-emerald-500 bg-slate-900"
                      />
                      <span>Numbers (0-9)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genOptions.includeSymbols}
                        onChange={(e) => {
                          const opts = { ...genOptions, includeSymbols: e.target.checked };
                          setGenOptions(opts);
                          setFormPassword(generatePassword(opts));
                        }}
                        className="rounded border-slate-700 text-emerald-500 bg-slate-900"
                      />
                      <span>Symbols (!@#$)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={genOptions.excludeLookalikes}
                        onChange={(e) => {
                          const opts = { ...genOptions, excludeLookalikes: e.target.checked };
                          setGenOptions(opts);
                          setFormPassword(generatePassword(opts));
                        }}
                        className="rounded border-slate-700 text-emerald-500 bg-slate-900"
                      />
                      <span>No Lookalikes</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Website URL
                  </label>
                  <input
                    type="text"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="e.g. google.com"
                    className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as VaultCategory)}
                    className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3 text-xs text-white capitalize focus:outline-none focus:border-emerald-400"
                  >
                    <option value="personal">Personal</option>
                    <option value="work">Work</option>
                    <option value="financial">Financial</option>
                    <option value="social">Social</option>
                    <option value="credentials">Credentials</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Private Notes (Optional)
                </label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Encrypted notes, 2FA hints, recovery email..."
                  rows={2}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    resetForm();
                  }}
                  className="flex-1 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold text-xs shadow-lg transition cursor-pointer"
                >
                  {editingItem ? 'Save Changes' : 'Encrypt & Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
