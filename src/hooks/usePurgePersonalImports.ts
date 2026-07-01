import { useEffect } from 'react';
import type { CalendarEvent, User } from '@/types';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';

// 過去の同期バグで「本人/相手の“個人”Googleカレンダー」の予定が共有に取り込まれて
// しまった分を、共有カレンダーから削除する後始末。
//
// 判定はIDのスキームに依存せず、"由来" で行う：
//   共有(shared)予定で、Google由来(googleEventId等あり)なのに、
//   その取り込み元カレンダーが「専用の共有カレンダー(aafa…@group)」でないもの
//   ＝個人カレンダーからの流入 → 削除。
// アプリ内で作った予定（Google由来IDなし、または共有カレンダーへpush済み）は残す。
//
// 無限ループを避けるため購読はせず、タイマーで数回だけ実行し、処理済みIDは二度と触らない。
export function usePurgePersonalImports(user: User | null) {
  useEffect(() => {
    if (!user || services.backendName !== 'firebase') return;

    const sharedId = (
      services.settingsRepo.getAppConfig().googleSharedCalendarId ??
      APP_CONFIG.googleSharedCalendarId ??
      ''
    ).toLowerCase();

    const cal = (e: CalendarEvent) =>
      (e.sharedGoogleCalendarId ?? e.googleCalendarId ?? e.sourceGoogleCalendarId ?? '').toLowerCase();
    const fromGoogle = (e: CalendarEvent) =>
      Boolean(e.googleEventId || e.sharedGoogleEventId || e.sourceGoogleEventId);

    const isForeignImport = (e: CalendarEvent) => {
      if (e.calendarType !== 'shared') return false; // 共有予定だけが対象
      if (!fromGoogle(e)) return false; // アプリ内作成（Google由来でない）は残す
      const c = cal(e);
      if (!c) return false;
      // 専用の共有カレンダー由来は正規 → 残す。それ以外のGoogleカレンダー＝個人流入。
      return c !== sharedId;
    };

    const done = new Set<string>();
    const purge = () => {
      for (const e of services.eventsRepo.getAll()) {
        if (e.deletedAt || done.has(e.appEventId)) continue;
        if (isForeignImport(e)) {
          done.add(e.appEventId);
          void services.eventsRepo.softDelete(e.appEventId, user.userId).catch(() => {});
        }
      }
    };

    purge();
    const timers = [1500, 5000, 12000, 25000].map((ms) => window.setTimeout(purge, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [user?.userId]);
}
