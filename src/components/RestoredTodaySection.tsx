import { useEffect, useState } from 'react';
import type { CalendarEvent, User } from '@/types';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';
import { fmtDateTimeRange, fmtAllDayRange, fmtYmdHm } from '@/utils/date';

// 「今日もどってきた予定（要確認）」
// 直前の緊急“自動復元”で一度消えてから戻ってきた予定を洗い出す。
// この中に「彼女が意図的に消していた予定」が混ざっている可能性がある。
// 削除メタデータは復元時に上書きされてしまったため厳密判定はできないが、
// updatedAt が今日＝復元された可能性が高い Google 由来予定を候補として並べる。
function tokyoDay(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

function hasGoogleLineage(e: CalendarEvent): boolean {
  return Boolean(
    e.googleEventId || e.sourceGoogleEventId || e.sharedGoogleEventId ||
    e.googleCalendarId || e.sourceGoogleCalendarId || e.sharedGoogleCalendarId,
  );
}

function isPartnerPersonalImport(e: CalendarEvent): boolean {
  const cal = (e.sharedGoogleCalendarId ?? e.googleCalendarId ?? e.sourceGoogleCalendarId ?? '').toLowerCase();
  return cal === APP_CONFIG.partnerEmail.toLowerCase();
}

function restoredTodayList(): CalendarEvent[] {
  const today = tokyoDay(new Date().toISOString());
  const all = services.eventsRepo.getAllRaw?.() ?? services.eventsRepo.getAll();
  return all
    .filter((e) => !e.deletedAt)
    .filter((e) => e.calendarType === 'shared' || e.calendarType === 'rebecca_source')
    .filter(hasGoogleLineage)
    .filter((e) => !isPartnerPersonalImport(e))
    .filter((e) => tokyoDay(e.updatedAt) === today)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export function RestoredTodaySection({ user }: { user: User }) {
  const [items, setItems] = useState<CalendarEvent[]>(restoredTodayList);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = services.eventsRepo.subscribe(() => setItems(restoredTodayList()));
    return unsub;
  }, []);

  if (!services.eventsRepo.getAllRaw) return null;
  if (items.length === 0) return null;

  const remove = async (id: string) => {
    setBusy(true);
    try {
      await services.eventsRepo.softDelete(id, user.userId);
      setItems(restoredTodayList());
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="section-title">最近もどってきた予定（要確認・{items.length}）</div>
      <div className="card" style={{ marginBottom: 16 }}>
        <p className="muted" style={{ marginBottom: 10 }}>
          今日「消えて→戻ってきた」予定です。この中に<strong>彼女が意図的に消していた予定</strong>が
          混ざっている可能性があります。要らないものは「消す」でもう一度消してください
          （今後は自動で復元されません）。
        </p>
        {items.map((e) => (
          <div className="event-card" key={e.appEventId} style={{ ['--evt-color' as string]: e.color ?? '#b39ddf' }}>
            <div style={{ flex: 1 }}>
              <div className="etitle">{e.emoji ? `${e.emoji} ` : ''}{e.title || '(無題)'}</div>
              <div className="eloc">{e.allDay ? fmtAllDayRange(e.start, e.end) : fmtDateTimeRange(e.start, e.end)}</div>
              <div className="eloc muted" style={{ fontSize: 11 }}>
                復元: {fmtYmdHm(new Date(e.updatedAt))}
                {e.calendarType === 'rebecca_source' ? '・レベッカ' : ''}
              </div>
            </div>
            <button className="btn sm secondary" disabled={busy} onClick={() => remove(e.appEventId)}>消す</button>
          </div>
        ))}
      </div>
    </>
  );
}
