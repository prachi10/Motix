/**
 * MOTIX Media Vault (Photos & Videos)
 * Client-side AES-256-GCM encrypted media storage and secure viewer/player.
 * Never stores unencrypted media on disk or remote servers.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useVault } from '../context/VaultContext';
import { VaultPhotoItem, VaultVideoItem } from '../types/vault';
import { encryptBinary, decryptBinary } from '../lib/crypto';
import {
  Image,
  Video,
  Upload,
  Camera,
  Trash2,
  RotateCcw,
  Star,
  Download,
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  Tag,
  Search,
  AlertCircle,
  Eye,
} from 'lucide-react';

export const MediaVaultView: React.FC = () => {
  const {
    photos,
    videos,
    addPhoto,
    deletePhoto,
    restorePhoto,
    addVideo,
    deleteVideo,
    restoreVideo,
    activeMasterKey,
  } = useVault();

  const [activeTab, setActiveTab] = useState<'photos' | 'videos' | 'trash'>('photos');
  const [selectedAlbum, setSelectedAlbum] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');

  // Active Photo Viewer Modal
  const [activePhoto, setActivePhoto] = useState<VaultPhotoItem | null>(null);
  const [decryptedPhotoUrl, setDecryptedPhotoUrl] = useState<string | null>(null);
  const [photoRotation, setPhotoRotation] = useState(0);

  // Active Video Player Modal
  const [activeVideo, setActiveVideo] = useState<VaultVideoItem | null>(null);
  const [decryptedVideoUrl, setDecryptedVideoUrl] = useState<string | null>(null);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isVideoMuted, setIsVideoMuted] = useState(false);
  const videoPlayerRef = useRef<HTMLVideoElement | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  // Decrypt selected photo for viewing
  useEffect(() => {
    let objectUrl: string | null = null;
    if (activePhoto && activeMasterKey) {
      decryptBinary(activePhoto.encryptedBlob, activePhoto.iv, activeMasterKey)
        .then((decryptedBuffer) => {
          const blob = new Blob([decryptedBuffer], { type: activePhoto.mimeType || 'image/jpeg' });
          objectUrl = URL.createObjectURL(blob);
          setDecryptedPhotoUrl(objectUrl);
        })
        .catch((err) => {
          console.error('Failed to decrypt photo:', err);
        });
    } else {
      setDecryptedPhotoUrl(null);
      setPhotoRotation(0);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activePhoto, activeMasterKey]);

  // Decrypt selected video for playback
  useEffect(() => {
    let objectUrl: string | null = null;
    if (activeVideo && activeMasterKey) {
      decryptBinary(activeVideo.encryptedBlob, activeVideo.iv, activeMasterKey)
        .then((decryptedBuffer) => {
          const blob = new Blob([decryptedBuffer], { type: activeVideo.mimeType || 'video/mp4' });
          objectUrl = URL.createObjectURL(blob);
          setDecryptedVideoUrl(objectUrl);
        })
        .catch((err) => {
          console.error('Failed to decrypt video:', err);
        });
    } else {
      setDecryptedVideoUrl(null);
      setIsVideoPlaying(false);
    }

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activeVideo, activeMasterKey]);

  // Handle Photo File Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeMasterKey) return;

    setIsEncrypting(true);
    setUploadStatus(`Encrypting ${files.length} photo(s) with AES-256-GCM...`);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const arrayBuffer = await file.arrayBuffer();

        // Encrypt with AES-GCM
        const { ciphertext, ivHex } = await encryptBinary(arrayBuffer, activeMasterKey);

        const photoItem: VaultPhotoItem = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          title: file.name.replace(/\.[^/.]+$/, ''),
          originalName: file.name,
          mimeType: file.type || 'image/jpeg',
          sizeBytes: file.size,
          encryptedBlob: ciphertext,
          iv: ivHex,
          album: selectedAlbum === 'all' ? 'Personal' : selectedAlbum,
          tags: ['encrypted', 'photo'],
          isFavorite: false,
          createdAt: Date.now(),
        };

        await addPhoto(photoItem);
      }
    } catch (err: any) {
      console.error('Photo encryption error:', err);
      alert('Failed to encrypt photo: ' + err.message);
    } finally {
      setIsEncrypting(false);
      setUploadStatus('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  // Handle Video Upload
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !activeMasterKey) return;

    setIsEncrypting(true);
    setUploadStatus(`Encrypting video with AES-256-GCM...`);

    try {
      const file = files[0];
      const arrayBuffer = await file.arrayBuffer();
      const { ciphertext, ivHex } = await encryptBinary(arrayBuffer, activeMasterKey);

      const videoItem: VaultVideoItem = {
        id: `video_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        originalName: file.name,
        mimeType: file.type || 'video/mp4',
        sizeBytes: file.size,
        encryptedBlob: ciphertext,
        iv: ivHex,
        album: 'Personal',
        tags: ['encrypted', 'video'],
        isFavorite: false,
        createdAt: Date.now(),
      };

      await addVideo(videoItem);
    } catch (err: any) {
      console.error('Video encryption error:', err);
      alert('Failed to encrypt video: ' + err.message);
    } finally {
      setIsEncrypting(false);
      setUploadStatus('');
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  // Download decrypted file
  const handleDownloadDecrypted = (url: string | null, name: string) => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const filteredPhotos = photos.filter((p) => {
    if (activeTab === 'trash') return p.isTrash;
    if (p.isTrash) return false;
    if (selectedAlbum !== 'all' && p.album !== selectedAlbum) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filteredVideos = videos.filter((v) => {
    if (activeTab === 'trash') return v.isTrash;
    if (v.isTrash) return false;
    if (searchQuery && !v.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-4 pb-12">
      {/* Top Segmented Controls */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-900/80 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('photos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'photos'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Photos ({photos.filter((p) => !p.isTrash).length})
          </button>
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'videos'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Videos ({videos.filter((v) => !v.isTrash).length})
          </button>
          <button
            onClick={() => setActiveTab('trash')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
              activeTab === 'trash'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Trash ({photos.filter((p) => p.isTrash).length + videos.filter((v) => v.isTrash).length})
          </button>
        </div>

        {/* Upload Buttons */}
        {activeTab !== 'trash' && (
          <div className="flex items-center gap-2">
            {activeTab === 'photos' ? (
              <>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  title="Capture Photo with Camera"
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 active:scale-95 transition cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Add Photos</span>
                </button>
              </>
            ) : (
              <button
                onClick={() => videoInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-medium flex items-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 transition cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Add Video</span>
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handlePhotoUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handlePhotoUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
            <input
              type="file"
              ref={videoInputRef}
              onChange={handleVideoUpload}
              accept="video/*"
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Progress Toast */}
      {isEncrypting && (
        <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2 animate-pulse">
          <Upload className="w-4 h-4 animate-spin" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {/* Search & Album Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search encrypted media..."
            className="w-full h-10 rounded-xl bg-slate-900/90 border border-slate-800 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>

        {activeTab === 'photos' && (
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {['all', 'Personal', 'ID Cards', 'Receipts', 'Family'].map((album) => (
              <button
                key={album}
                onClick={() => setSelectedAlbum(album)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition cursor-pointer ${
                  selectedAlbum === album
                    ? 'bg-cyan-500/20 text-cyan-300 font-medium'
                    : 'text-slate-400 hover:text-white bg-slate-900/50'
                }`}
              >
                {album === 'all' ? 'All Albums' : album}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ----------------- PHOTOS TAB ----------------- */}
      {activeTab === 'photos' && (
        <>
          {filteredPhotos.length === 0 ? (
            <div className="vault-glass-card rounded-2xl p-12 text-center border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                <Image className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No photos in this vault</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Import pictures to encrypt them with AES-256-GCM. Unencrypted files are never saved.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-medium transition cursor-pointer"
              >
                Import First Photo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setActivePhoto(photo)}
                  className="vault-glass-card rounded-2xl overflow-hidden border border-slate-800/80 hover:border-cyan-500/40 transition group cursor-pointer relative"
                >
                  <div className="aspect-square bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
                    <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                      <Image className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] text-cyan-400/80 font-mono">Encrypted</span>

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                      <span className="px-2 py-1 rounded bg-cyan-500/80 text-white text-[11px] font-medium flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    </div>
                  </div>

                  <div className="p-2.5">
                    <div className="text-xs font-medium text-slate-200 truncate">{photo.title}</div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{(photo.sizeBytes / 1024).toFixed(0)} KB</span>
                      <span>{new Date(photo.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ----------------- VIDEOS TAB ----------------- */}
      {activeTab === 'videos' && (
        <>
          {filteredVideos.length === 0 ? (
            <div className="vault-glass-card rounded-2xl p-12 text-center border border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto mb-3">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-white">No videos in vault</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                Securely store personal video recordings. Decrypted on-the-fly for playback.
              </p>
              <button
                onClick={() => videoInputRef.current?.click()}
                className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs font-medium transition cursor-pointer"
              >
                Import Video
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredVideos.map((video) => (
                <div
                  key={video.id}
                  onClick={() => setActiveVideo(video)}
                  className="vault-glass-card rounded-2xl p-3 border border-slate-800/80 hover:border-blue-500/40 transition group cursor-pointer"
                >
                  <div className="aspect-video rounded-xl bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden mb-2">
                    <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 ml-0.5" />
                    </div>
                    <span className="text-[10px] text-blue-400/80 font-mono mt-1">AES Encrypted</span>
                  </div>
                  <div className="text-xs font-medium text-slate-200 truncate">{video.title}</div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>{(video.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ----------------- TRASH TAB ----------------- */}
      {activeTab === 'trash' && (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Items in trash are still encrypted. You can restore them or delete permanently.</span>
          </div>

          <div className="space-y-2">
            {photos.filter((p) => p.isTrash).map((photo) => (
              <div
                key={photo.id}
                className="vault-glass-card rounded-xl p-3 flex items-center justify-between border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    <Image className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-200">{photo.title}</div>
                    <div className="text-[10px] text-slate-500">Deleted photo · {(photo.sizeBytes / 1024).toFixed(0)} KB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restorePhoto(photo.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => deletePhoto(photo.id, true)}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}

            {videos.filter((v) => v.isTrash).map((video) => (
              <div
                key={video.id}
                className="vault-glass-card rounded-xl p-3 flex items-center justify-between border border-slate-800"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400">
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-200">{video.title}</div>
                    <div className="text-[10px] text-slate-500">Deleted video · {(video.sizeBytes / (1024 * 1024)).toFixed(1)} MB</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => restoreVideo(video.id)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs flex items-center gap-1 transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => deleteVideo(video.id, true)}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs flex items-center gap-1 transition"
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

      {/* FULLSCREEN PHOTO VIEWER MODAL */}
      {activePhoto && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800/80 z-10">
            <div className="truncate mr-4">
              <h4 className="text-sm font-semibold text-white truncate">{activePhoto.title}</h4>
              <p className="text-[11px] text-slate-400">
                {(activePhoto.sizeBytes / 1024).toFixed(1)} KB · Encrypted with AES-256-GCM
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPhotoRotation((r) => (r + 90) % 360)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                title="Rotate 90 degrees"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDownloadDecrypted(decryptedPhotoUrl, activePhoto.originalName)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs transition"
                title="Download Decrypted File"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  deletePhoto(activePhoto.id);
                  setActivePhoto(null);
                }}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs transition"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePhoto(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Image Container */}
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
            {decryptedPhotoUrl ? (
              <img
                src={decryptedPhotoUrl}
                alt={activePhoto.title}
                style={{ transform: `rotate(${photoRotation}deg)` }}
                className="max-h-full max-w-full object-contain transition-transform duration-200 rounded-lg shadow-2xl"
              />
            ) : (
              <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                <span>Decrypting photo binary in local memory...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FULLSCREEN VIDEO PLAYER MODAL */}
      {activeVideo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800/80 z-10">
            <div className="truncate mr-4">
              <h4 className="text-sm font-semibold text-white truncate">{activeVideo.title}</h4>
              <p className="text-[11px] text-slate-400">
                {(activeVideo.sizeBytes / (1024 * 1024)).toFixed(1)} MB · Secure Memory Playback
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleDownloadDecrypted(decryptedVideoUrl, activeVideo.originalName)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 text-xs transition"
                title="Export Decrypted Video"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => {
                  deleteVideo(activeVideo.id);
                  setActiveVideo(null);
                }}
                className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs transition"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActiveVideo(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Center Video Player */}
          <div className="flex-1 flex items-center justify-center p-4">
            {decryptedVideoUrl ? (
              <video
                ref={videoPlayerRef}
                src={decryptedVideoUrl}
                controls
                autoPlay
                playsInline
                className="max-h-full max-w-full rounded-2xl shadow-2xl bg-black"
              />
            ) : (
              <div className="text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                <span>Decrypting video stream in local memory...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
