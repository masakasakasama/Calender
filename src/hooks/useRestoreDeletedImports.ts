import { useEffect } from 'react';
import type { CalendarEvent, User } from '@/types';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';

// 直前の掃除バグで論理削除してしまった「Google由来の共有/レベッカ予定」を復旧する。
// レベッカはもうGoogleカレンダーを使っていない＝再同期されないため、
// アプリ内のソフト削除分（deletedAt）を戻すのが唯一の復旧手段。
//
// 復旧対象：deletedAt が付いた shared / rebecca_source 予定で、Google由来のもの。
// 除外：本人(彼氏)の“個人”カレンダー(primary=本人メール)由来だけは戻さない
//       （ユーザーが明示的に不要としたゴミのため）。
//
// 無限ループ回避：購読せずタイマーで数回だけ、処理済みIDは二度と触らない。
export function useRestoreDeletedImports(user: User | null) {
  useEffect(() => {
    if (!user || services.backendName !== 'firebase') return;
    if (!services.eventsRepo.getAllRaw || !services.eventsRepo.restore) return;

    const partnerEmail = APP_CONFIG.partnerEmail.toLowerCase();

    const hasGoogleLineage = (e: CalendarEvent) =>
      Boolean(
        e.googleEventId ||
          e.sourceGoogleEventId ||
          e.sharedGoogleEventId ||
          e.googleCalendarId ||
          e.sourceGoogleCalendarId ||
          e.sharedGoogleCalendarId,
      );
    const cal = (e: CalendarEvent) =>
      (e.sharedGoogleCalendarId ?? e.googleCalendarId ?? e.sourceGoogleCalendarId ?? '').toLowerCase();

    const shouldRestore = (e: CalendarEvent) => {
      if (!e.deletedAt) return false;
      if (e.calendarType !== 'shared' && e.calendarType !== 'rebecca_source') return false;
      if (!hasGoogleLineage(e)) return false;
      if (cal(e) === partnerEmail) return false; // 本人の個人カレンダーのゴミは戻さない
      return true;
    };

    const done = new Set<string>();
    const run = () => {
      const all = services.eventsRepo.getAllRaw?.() ?? [];
      for (const e of all) {
        if (done.has(e.appEventId)) continue;
        if (shouldRestore(e)) {
          done.add(e.appEventId);
          void services.eventsRepo.restore?.(e.appEventId, user.userId).catch(() => {});
        }
      }
    };

    run();
    const timers = [1500, 4000, 9000, 18000, 30000].map((ms) => window.setTimeout(run, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [user?.userId]);
}
