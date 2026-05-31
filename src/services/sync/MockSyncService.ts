import { localStore } from '@/repositories/db/LocalStore';
import type { ISyncService, SyncResult } from './ISyncService';

const TOKEN_KEY = 'sync_token';
const LAST_KEY = 'sync_last_result';

/**
 * 差分同期のモック。実際の Google Calendar API では syncToken を使って
 * 変更分のみ取得するが、ここでは「同期した」という土台のみ提供する。
 * 複数デバイス同期の即時性は LocalStore.subscribe（onSnapshot 相当）が担う。
 */
export class MockSyncService implements ISyncService {
  async syncNow(): Promise<SyncResult> {
    const prevToken = localStore.get<string | null>(TOKEN_KEY, null);
    const result: SyncResult = {
      changed: 0,
      syncToken: `mock-token-${Date.now()}`,
      at: new Date().toISOString(),
      status: 'ok',
      message: prevToken ? '差分同期(モック)完了' : '初回同期(モック)完了',
    };
    localStore.set(TOKEN_KEY, result.syncToken);
    localStore.set(LAST_KEY, result);
    return result;
  }

  startAutoSync(intervalMs: number, onResult: (r: SyncResult) => void): () => void {
    let stopped = false;
    const run = () => {
      if (stopped) return;
      this.syncNow().then(onResult).catch(() => {});
    };
    run(); // 起動時
    const timer = window.setInterval(run, intervalMs); // 定期
    const onVisible = () => {
      if (document.visibilityState === 'visible') run(); // 画面復帰時
    };
    const onOnline = () => run(); // オンライン復帰時
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    };
  }

  getLastResult(): SyncResult | null {
    return localStore.get<SyncResult | null>(LAST_KEY, null);
  }
}
