import React from 'react';
import { useOnlineStatus } from '../hooks/usePWA';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-slate-900/90 border border-amber-500/40 px-3.5 py-1.5 text-xs font-medium text-amber-300 shadow-xl backdrop-blur-md">
      <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
      <span>Offline Mode · Local Encrypted Storage Active</span>
    </div>
  );
};
