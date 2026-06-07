import { useEffect } from 'react';
import type { User } from '@/types';
import { services } from '@/services/container';

// レベッカのGoogle予定 → 共有カレンダーへの自動同期。
// 「レベッカ」タブを開かなくても、アプリにいる間（どのタブでも）走る。
// 起動時・画面復帰時・定期（数分ごと）に実行する。レベッカ本人のみ。
export function useGoogleSync(user: User | null) {
  useEffect(() => {
    if (!user || user.role !== 'rebecca' || services.backendName !== 'firebase') return;

    let running = false;
    const run = async () => {
      if (running) return;
      if (!(services.auth.isGoogleCalendarConnected?.() ?? false)) return; // 未連携時は何もしない
      const sharedCalendarId = services.settingsRepo.getAppConfig().sharedCalendarId;
      if (!sharedCalendarId) return;
      const ids = services.settingsRepo
        .getRebeccaSettings()
        .filter((s) => s.syncEnabled)
        .map((s) => s.googleCalendarId);
      if (ids.length === 0) return;

      running = true;
      try {
        const events = await services.calendar.listRebeccaEvents(ids);
        const syncedAt = new Date().toISOString();
        await Promise.all(
          services.settingsRepo
            .getRebeccaSettings()
            .filter((s) => ids.includes(s.googleCalendarId))
            .map((s) =>
              services.settingsRepo.upsertRebeccaSetting({
                ...s,
                lastSyncedAt: syncedAt,
                lastSyncStatus: 'live',
                lastSyncError: null,
              }),
            ),
        );
        const allLinks = services.shareLinksRepo.getAll();
        const sourceIds = new Set(events.map((ev) => ev.sourceGoogleEventId ?? ev.appEventId));
        for (const link of allLinks) {
          if (link.status !== 'active') continue;
          if (!ids.includes(link.sourceGoogleCalendarId)) continue;
          if (sourceIds.has(link.sourceGoogleEventId)) continue;
          await services.eventsRepo.softDelete(link.sharedGoogleEventId, user.userId).catch(() => {});
          await services.shareLinksRepo.markRemoved(link.id).catch(() => {});
        }
        for (const ev of events) {
          await services.eventsRepo.upsert({ ...ev, updatedAt: new Date().toISOString() }).catch(() => ev);
          const srcId = ev.sourceGoogleEventId ?? ev.appEventId;
          const link = allLinks.find((l) => l.sourceGoogleEventId === srcId);
          if (!link) {
            await services.share.shareEvent({ sharedCalendarId, source: ev, byUserId: user.userId, silent: true });
          } else if (link.status === 'active') {
            const copy = services.eventsRepo.getById(link.sharedGoogleEventId);
            if (copy && (copy.color !== ev.color || copy.emoji !== ev.emoji || copy.title !== ev.title)) {
              await services.share.refreshShared({ sharedCalendarId, source: ev, byUserId: user.userId });
            }
          }
        }
      } catch {
        /* ネットワーク等の失敗は無視して次回に任せる */
      } finally {
        running = false;
      }
    };

    void run(); // 起動時
    const iv = window.setInterval(run, 2 * 60 * 1000); // 定期
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    const onConnected = () => void run(); // 連携直後に即同期
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
  }, [user]);
}
