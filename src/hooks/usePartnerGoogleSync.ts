import { useEffect } from 'react';
import type { User } from '@/types';
import { services } from '@/services/container';

// ログイン中の本人（彼氏側）の Google カレンダー(primary)を、
// 共有予定としてアプリに取り込む。彼女の予定と同じカレンダー上に並ぶ。
//  - サーバーの「共有グループカレンダー同期」とは別カレンダー(本人のメール=primary)
//    を対象にするので衝突しない。
//  - Google で消した予定はアプリからも消す（本人カレンダー由来のみ）。
//  - 連携していなければ何もしない。
export function usePartnerGoogleSync(user: User | null) {
  useEffect(() => {
    if (!user || user.role !== 'partner' || services.backendName !== 'firebase') return;
    const calId = user.email; // primary カレンダーの ID は本人のメールアドレス
    if (!calId) return;

    let running = false;
    const run = async () => {
      if (running) return;
      if (!(services.auth.isGoogleCalendarConnected?.() ?? false)) return; // 未連携なら何もしない
      if (!services.calendar.listGoogleSharedEvents) return;
      running = true;
      try {
        const incoming = await services.calendar.listGoogleSharedEvents(calId);
        const incomingIds = new Set(incoming.map((e) => e.appEventId));
        for (const ev of incoming) {
          await services.eventsRepo.upsert({ ...ev, updatedAt: new Date().toISOString() }).catch(() => {});
        }
        // 本人カレンダー由来で、Google側から消えた予定はアプリでも削除。
        for (const e of services.eventsRepo.getAll()) {
          if (e.sharedGoogleCalendarId === calId && !e.deletedAt && !incomingIds.has(e.appEventId)) {
            await services.eventsRepo.softDelete(e.appEventId, user.userId).catch(() => {});
          }
        }
      } catch {
        /* ネットワーク等の失敗は無視。次回に任せる */
      } finally {
        running = false;
      }
    };

    void run();
    const iv = window.setInterval(run, 2 * 60 * 1000);
    const onVisible = () => { if (document.visibilityState === 'visible') void run(); };
    const onConnected = () => void run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onConnected);
    window.addEventListener('gcal-connected', onConnected);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onConnected);
      window.removeEventListener('gcal-connected', onConnected);
    };
  }, [user?.userId, user?.email]);
}
