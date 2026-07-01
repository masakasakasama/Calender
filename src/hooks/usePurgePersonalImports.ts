import { useEffect } from 'react';
import type { User } from '@/types';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';

// 過去のバグで「本人の個人Googleカレンダー(primary)」の予定が共有に取り込まれて
// しまった分を、共有カレンダーから削除する後始末。
//  - 対象は googleCalendarId / sharedGoogleCalendarId が本人/相手のメール(=primary)の予定だけ。
//  - 本来の共有グループカレンダー(@group.calendar.google.com)やアプリ内作成予定は触らない。
//  - 重要: 購読で回すと softDelete→再通知→再実行 の無限ループになるため、
//    タイマーで数回だけ実行し、処理済みIDは二度と触らない（ループ防止）。
export function usePurgePersonalImports(user: User | null) {
  useEffect(() => {
    if (!user || services.backendName !== 'firebase') return;
    const emails = APP_CONFIG.allowedEmails.map((e) => e.toLowerCase());
    const done = new Set<string>();

    const isPersonalImport = (cal: string | null | undefined) => {
      if (!cal) return false;
      const c = cal.toLowerCase();
      if (c.includes('@group.calendar.google.com')) return false; // グループ共有は対象外
      return emails.includes(c); // 本人/相手の個人メール=primary のみ
    };

    const purge = () => {
      for (const e of services.eventsRepo.getAll()) {
        if (e.deletedAt || done.has(e.appEventId)) continue;
        if (isPersonalImport(e.sharedGoogleCalendarId) || isPersonalImport(e.googleCalendarId)) {
          done.add(e.appEventId); // 先に記録してから消す＝二度と再処理しない
          void services.eventsRepo.softDelete(e.appEventId, user.userId).catch(() => {});
        }
      }
    };

    // Firestore の初期ロードを待ちつつ、数回だけ実行（購読はしない＝ループしない）。
    purge();
    const timers = [1500, 5000, 12000, 25000].map((ms) => window.setTimeout(purge, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [user?.userId]);
}
