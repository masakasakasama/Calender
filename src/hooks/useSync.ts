import { useEffect, useState } from 'react';
import type { SyncResult } from '@/services/sync/ISyncService';
import { services } from '@/services/container';

// 起動時/復帰時/定期/オンライン復帰で差分同期を回す土台。
export function useSync() {
  const [last, setLast] = useState<SyncResult | null>(() => services.sync.getLastResult());
  const [online, setOnline] = useState<boolean>(navigator.onLine);

  useEffect(() => {
    const stop = services.sync.startAutoSync(5 * 60 * 1000, setLast);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      stop();
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return { last, online };
}
