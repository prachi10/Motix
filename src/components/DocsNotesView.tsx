/**
 * MOTIX Documents Vault & Private Notes
 * Client-side AES-256-GCM encrypted document repository and private notes editor.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useVault } from '../context/VaultContext';
import { VaultDocumentItem, VaultNoteItem } from '../types/vault';
import { encryptBinary, decryptBinary, encryptText, decryptText } from '../lib/crypto';
import {
  FileText,
  FileCheck,
  Plus,
  Upload,
  Search,
  Download,
  Trash2,
  RotateCcw,
  Pin,
  CheckSquare,
  Square,
  X,
  Eye,
  Tag,
  ShieldCheck,
  FileSpreadsheet,
  FileCode,
  AlertCircle,
} from 'lucide-react';

interface NoteContent {
  body: string;
  checklist: { id: string; text: string; done: boolean }[];
}

export const DocsNotesView: React.FC = () => {
  const {
    documents,
    notes,
    addDocument,
    deleteDocument,
    restoreDocument,
    addNote,
    updateNote,
    deleteNote,
    restoreNote,
    activeMasterKey,
  } = useVault();

  const [activeTab, setActiveTab] = useState<'docs' | 'notes' | 'trash'>('docs');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('all');
  const [isEncrypting, setIsEncrypting] = useState(false);

  // Document Viewer Modal
  const [activeDoc, setActiveDoc] = useState<VaultDocumentItem | null>(null);
  const [decryptedDocUrl, setDecryptedDocUrl] = useState<string | null>(null);
  const [decryptedDocText, setDecryptedDocText] = useState<string | null>(null);

  // Note Editor State
  const [activeNote, setActiveNote] = useState<VaultNoteItem | null>(null);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteCategory, setNoteCategory] = useState('Personal');
  const [noteChecklist, setNoteChecklist] = useState<{ id: string; text: string; done: boolean }[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [isEditingNote, setIsEditingNote] = useState(false);

  const docFileInputRef = useRef<HTMLInputElement | null>(null);

  // Decrypt Document for Viewing
  useEffect(() => {
    let objectUrl: string | null = null;
    if (activeDoc && activeMasterKey) {
      decryptBinary(activeDoc.encryptedBlob, activeDoc.iv, activeMasterKey)
        .then((buffer) => {
          if (activeDoc.mimeType === 'text/plain' || activeDoc.mimeType === 'application/json') {
            const dec = new TextDecoder();
            setDecryptedDocText(dec.decode(buffer));
            setDecryptedDocUrl(null);
          } else {
            const blob = new Blob([buffer], { type: activeDoc.mimeType });
            objectUrl = URL.createObjectURL(blob);
            setDecryptedDocUrl(objectUrl);
            setDecryptedDocText(null);
          }
        })
        .catch((err) => {
          console.error('Failed to decrypt document:', err);
        });
    } else {
      setDecryptedDocUrl(null);
      setDecryptedDocText(null);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeDoc, activeMasterKey]);

  // Handle Document Upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeMasterKey) return;

    setIsEncrypting(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();
        const { ciphertext, ivHex } = await encryptBinary(arrayBuffer, activeMasterKey);

        let category: VaultDocumentItem['category'] = 'general';
        if (file.name.toLowerCase().includes('passport') || file.name.toLowerCase().includes('id')) {
          category = 'identity';
        } else if (file.name.toLowerCase().includes('contract') || file.name.toLowerCase().includes('agreement')) {
          category = 'contracts';
        } else if (file.name.toLowerCase().includes('tax') || file.name.toLowerCase().includes('bank')) {
          category = 'financial';
        }

        const docItem: VaultDocumentItem = {
          id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          originalName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          category,
          encryptedBlob: ciphertext,
          iv: ivHex,
          tags: ['encrypted', category],
          isFavorite: false,
          createdAt: Date.now(),
        };

        await addDocument(docItem);
      }
    } catch (err: any) {
      console.error('Document encryption error:', err);
      alert('Failed to encrypt document: ' + err.message);
    } finally {
      setIsEncrypting(false);
      if (docFileInputRef.current) docFileInputRef.current.value = '';
    }
  };

  // Open Note for Editing
  const openNoteEditor = async (note?: VaultNoteItem) => {
    if (note) {
      setActiveNote(note);
      setNoteTitle(note.title);
      setNoteCategory(note.category);

      if (activeMasterKey) {
        try {
          const plainText = await decryptText(note.encryptedContent, note.iv, activeMasterKey);
          const parsed: NoteContent = JSON.parse(plainText);
          setNoteBody(parsed.body || '');
          setNoteChecklist(parsed.checklist || []);
        } catch {
          setNoteBody('Decryption error.');
          setNoteChecklist([]);
        }
      }
    } else {
      setActiveNote(null);
      setNoteTitle('');
      setNoteBody('');
      setNoteCategory('Personal');
      setNoteChecklist([]);
    }
    setIsEditingNote(true);
  };

  // Save Encrypted Note
  const handleSaveNote = async () => {
    if (!noteTitle.trim() || !activeMasterKey) return;

    try {
      const payload: NoteContent = {
        body: noteBody,
        checklist: noteChecklist,
      };
      const json = JSON.stringify(payload);
      const { ciphertext, iv } = await encryptText(json, activeMasterKey);

      if (activeNote) {
        const updated: VaultNoteItem = {
          ...activeNote,
          title: noteTitle.trim(),
          category: noteCategory,
          encryptedContent: ciphertext,
          iv,
          updatedAt: Date.now(),
        };
        await updateNote(updated);
      } else {
        const newNote: VaultNoteItem = {
          id: `note_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: noteTitle.trim(),
          category: noteCategory,
          encryptedContent: ciphertext,
          iv,
          tags: [noteCategory],
          isPinned: false,
          isFavorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        await addNote(newNote);
      }

      setIsEditingNote(false);
    } catch (err) {
      console.error('Failed to encrypt note:', err);
    }
  };

  // Add checklist item to note
  const handleAddChecklistItem = () => {
    if (!newChecklistText.trim()) return;
    setNoteChecklist((prev) => [
      ...prev,
      { id: Date.now().toString(), text: newChecklistText.trim(), done: false },
    ]);
    setNewChecklistText('');
  };

  const handleToggleChecklist = (id: string) => {
    setNoteChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, done: !item.done } : item))
    );
  };

  const handleDownloadDecryptedDoc = () => {
    if (!activeDoc) return;
    let url = decryptedDocUrl;
    if (decryptedDocText) {
      const blob = new Blob([decryptedDocText], { type: 'text/plain' });
      url = URL.createObjectURL(blob);
    }
    if (!url) return;

    const a = document.createElement('a');
    a.href = url;
    a.download = activeDoc.originalName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredDocs = documents.filter((d) => {
    if (activeTab === 'trash') return d.isTrash;
    if (d.isTrash) return false;
    if (selectedDocCategory !== 'all' && d.category !== selectedDocCategory) return false;
    if (searchQuery && !d.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredNotes = notes.filter((n) => {
    if (activeTab === 'trash') return n.isTrash;
    if (n.isTrash) return false;
    if (searchQuery && !n.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Segmented Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'docs'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Documents ({documents.filter((d) => !d.isTrash).length})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'notes'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Private Notes ({notes.filter((n) => !n.isTrash).length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'trash'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Trash ({documents.filter((d) => d.isTrash).length + notes.filter((n) => n.isTrash).length})
          </button>
        </div>

        {activeTab === 'docs' ? (
          <button
            onClick={() => docFileInputRef.current?.click()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-purple-500/20 active:scale-95 transition cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        ) : activeTab === 'notes' ? (
          <button
            onClick={() => openNoteEditor()}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Note</span>
          </button>
        ) : null}

        <input
          type="file"
          ref={docFileInputRef}
          onChange={handleDocUpload}
          multiple
          accept=".pdf,.doc,.docx,.txt,.csv,.json,.xlsx"
          className="hidden"
        />
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === 'docs' ? 'Search documents, contracts, IDs...' : 'Search private notes...'}
          className="w-full h-10 rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* ----------------- DOCUMENTS TAB ----------------- */}
      {activeTab === 'docs' && (
        <div className="space-y-3">
          {/* Categories */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {['all', 'identity', 'financial', 'contracts', 'medical', 'general'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedDocCategory(cat)}
                className={`px-3 py-1.5 rounded-lg capitalize whitespace-nowrap transition cursor-pointer ${
                  selectedDocCategory === cat
                    ? 'bg-purple-500/20 text-purple-300 font-medium'
                    : 'text-slate-400 hover:text-white bg-slate-900/50'
                }`}
              >
                {cat === 'all' ? 'All Files' : cat}
              </button>
            ))}
          </div>

          {filteredDocs.length === 0 ? (
            <div className="vault-glass-card rounded-2xl p-12 text-center border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No documents uploaded</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Securely store sensitive PDFs, passport scans, contracts, and medical records.
              </p>
              <button
                onClick={() => docFileInputRef.current?.click()}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs font-medium transition cursor-pointer"
              >
                Upload PDF / File
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => setActiveDoc(doc)}
                  className="vault-glass-card rounded-2xl p-4 border border-slate-800/80 hover:border-purple-500/40 flex items-center justify-between transition group cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
                      {doc.mimeType.includes('pdf') ? (
                        <FileText className="w-5 h-5" />
                      ) : doc.mimeType.includes('sheet') || doc.mimeType.includes('csv') ? (
                        <FileSpreadsheet className="w-5 h-5" />
                      ) : (
                        <FileCode className="w-5 h-5" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">{doc.title}</div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <span className="capitalize">{doc.category}</span>
                        <span>·</span>
                        <span>{(doc.sizeBytes / 1024).toFixed(0)} KB</span>
                        <span>·</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-purple-300 text-[11px] font-medium flex items-center gap-1 group-hover:bg-purple-500/20 transition">
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition"
                      title="Move to Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- NOTES TAB ----------------- */}
      {activeTab === 'notes' && (
        <div className="space-y-3">
          {filteredNotes.length === 0 ? (
            <div className="vault-glass-card rounded-2xl p-12 text-center border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto mb-3">
                <FileCheck className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No private notes</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Write private encrypted notes, secret recovery codes, and sensitive checklists.
              </p>
              <button
                onClick={() => openNoteEditor()}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-medium transition cursor-pointer"
              >
                Create Encrypted Note
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredNotes.map((note) => (
                <div
                  key={note.id}
                  onClick={() => openNoteEditor(note)}
                  className="vault-glass-card rounded-2xl p-4 border border-slate-800/80 hover:border-amber-500/40 transition group cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition truncate">
                        {note.title}
                      </h4>
                      <span className="text-[10px] text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded-md shrink-0">
                        {note.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      Encrypted with AES-256-GCM. Tap to decrypt and edit.
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-800/60">
                    <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNote(note.id);
                      }}
                      className="text-rose-400 hover:text-rose-300 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ----------------- TRASH TAB ----------------- */}
      {activeTab === 'trash' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Encrypted files in trash can be restored or permanently destroyed.</span>
          </div>

          <div className="space-y-2">
            {documents.filter((d) => d.isTrash).map((doc) => (
              <div
                key={doc.id}
                className="vault-glass-card rounded-xl p-3 flex items-center justify-between border border-slate-800"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200">{doc.title}</div>
                  <div className="text-[10px] text-slate-500">Deleted document</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restoreDocument(doc.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-purple-300 text-xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => deleteDocument(doc.id, true)}
                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}

            {notes.filter((n) => n.isTrash).map((note) => (
              <div
                key={note.id}
                className="vault-glass-card rounded-xl p-3 flex items-center justify-between border border-slate-800"
              >
                <div>
                  <div className="text-xs font-medium text-slate-200">{note.title}</div>
                  <div className="text-[10px] text-slate-500">Deleted note</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restoreNote(note.id)}
                    className="p-1.5 rounded-lg bg-slate-800 text-amber-300 text-xs flex items-center gap-1"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => deleteNote(note.id, true)}
                    className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 text-xs flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DOCUMENT VIEWER MODAL */}
      {activeDoc && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl">
          <div className="flex items-center justify-between p-4 border-b border-slate-800 z-10">
            <div className="truncate mr-4">
              <h4 className="text-sm font-semibold text-white truncate">{activeDoc.title}</h4>
              <p className="text-[11px] text-slate-400">
                {(activeDoc.sizeBytes / 1024).toFixed(0)} KB · Encrypted Document
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleDownloadDecryptedDoc}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-purple-400 text-xs transition"
                title="Download Decrypted File"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  deleteDocument(activeDoc.id);
                  setActiveDoc(null);
                }}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs transition"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveDoc(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            {decryptedDocUrl ? (
              <iframe
                src={decryptedDocUrl}
                title={activeDoc.title}
                className="w-full h-full rounded-2xl bg-white border-0 shadow-2xl"
              />
            ) : decryptedDocText ? (
              <pre className="w-full h-full p-4 rounded-2xl bg-slate-900 border border-slate-800 overflow-auto font-mono text-xs text-slate-200 select-text">
                {decryptedDocText}
              </pre>
            ) : (
              <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                <span>Decrypting document in memory...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* NOTE EDITOR MODAL */}
      {isEditingNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsEditingNote(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-white mb-4">
              {activeNote ? 'Edit Private Note' : 'Create Encrypted Note'}
            </h3>

            <div className="space-y-4">
              <div>
                <input
                  type="text"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note Title..."
                  className="w-full h-11 rounded-xl bg-slate-950 border border-slate-800 px-3.5 text-sm font-semibold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Write your secret thoughts, credentials, notes..."
                  rows={6}
                  className="w-full rounded-xl bg-slate-950 border border-slate-800 p-3.5 text-xs text-white leading-relaxed focus:outline-none focus:border-amber-400 select-text"
                />
              </div>

              {/* Checklist Section */}
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 block">Checklist Items</span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {noteChecklist.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => handleToggleChecklist(item.id)}
                      className="flex items-center gap-2 text-xs text-slate-300 p-1.5 rounded-lg hover:bg-slate-900 cursor-pointer"
                    >
                      {item.done ? (
                        <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className={item.done ? 'line-through text-slate-500' : ''}>
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                    placeholder="Add checklist task..."
                    className="flex-1 h-9 rounded-lg bg-slate-900 border border-slate-800 px-3 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-[11px] text-slate-500">
                  {noteBody.split(/\s+/).filter(Boolean).length} words · AES-256-GCM
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNote}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-semibold shadow-lg cursor-pointer"
                  >
                    Save Encrypted
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
