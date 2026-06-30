import { useEffect } from 'react';
import type { User } from '@/types';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';

// 過去のバグで「本人の個人Googleカレンダー(primary)」の予定が共有に取り込まれて
// しまった分を、共有カレンダーから削除する後始末。
//  - 対象は googleCalendarId / sharedGoogleCalendarId が本人メール(=primary)の予定だけ。
//  - 本来の共有グループカレンダー(@group.calendar.google.com)やアプリ内作成予定は触らない。
export function usePurgePersonalImports(user: User | null) {
  useEffect(() => {
    if (!user || services.backendName !== 'firebase') return;
    const emails = APP_CONFIG.allowedEmails.map((e) => e.toLowerCase());

    const isPersonalImport = (cal: string | null | undefined) => {
      if (!cal) return false;
      const c = cal.toLowerCase();
      // グループ共有カレンダーは対象外。本人/相手の個人メール=primary のみ削除。
      if (c.includes('@group.calendar.google.com')) return false;
      return emails.includes(c);
    };

    const purge = () => {
      for (const e of services.eventsRepo.getAll()) {
        if (e.deletedAt) continue;
        if (isPersonalImport(e.sharedGoogleCalendarId) || isPersonalImport(e.googleCalendarId)) {
          void services.eventsRepo.softDelete(e.appEventId, user.userId).catch(() => {});
        }
      }
    };

    purge();
    const t1 = window.setTimeout(purge, 4000);
    const t2 = window.setTimeout(purge, 12000);
    const unsub = services.eventsRepo.subscribe?.(() => purge());
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      unsub?.();
    };
  }, [user?.userId]);
}
