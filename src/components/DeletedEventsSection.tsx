import { useEffect, useState } from 'react';
import type { CalendarEvent, User } from '@/types';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';
import { fmtDateTimeRange, fmtAllDayRange, fmtYmdHm } from '@/utils/date';

// 本人(彼氏)の“個人”Googleカレンダー由来か？（＝要らないゴミ。復元候補に出さない）
function isPartnerPersonalImport(e: CalendarEvent): boolean {
  const cal = (e.sharedGoogleCalendarId ?? e.googleCalendarId ?? e.sourceGoogleCalendarId ?? '').toLowerCase();
  return cal === APP_CONFIG.partnerEmail.toLowerCase();
}

// 削除済み（論理削除）予定の一覧と復元。
//  - バグで消えた分と、本人/相手が意図的に消した分は同じソフト削除なので区別できない。
//    そこで「いつ消えたか」を出し、ユーザーが見て選んで復元できるようにする。
//  - 削除は行わない（復元のみ）。
//  - 本人の個人カレンダー由来のゴミは一覧に出さない。
function deletedList(): CalendarEvent[] {
  const all = services.eventsRepo.getAllRaw?.() ?? [];
  return all
    .filter((e) => e.deletedAt && (e.calendarType === 'shared' || e.calendarType === 'rebecca_source'))
    .filter((e) => !isPartnerPersonalImport(e))
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
}

function tokyoDay(iso: string): string {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

export function DeletedEventsSection({ user }: { user: User }) {
  const [items, setItems] = useState<CalendarEvent[]>(deletedList);
  const [busy, setBusy] = useState(false);

  // events リポジトリの更新に追従して一覧を最新化。
  useEffect(() => {
    const unsub = services.eventsRepo.subscribe(() => setItems(deletedList()));
    return unsub;
  }, []);

  if (!services.eventsRepo.restore || !services.eventsRepo.getAllRaw) return null;

  const restore = async (id: string) => {
    setBusy(true);
    try {
      await services.eventsRepo.restore?.(id, user.userId);
      setItems(deletedList());
    } finally {
      setBusy(false);
    }
  };

  const todayKey = tokyoDay(new Date().toISOString());
  const deletedToday = items.filter((e) => e.deletedAt && tokyoDay(e.deletedAt) === todayKey);
  const deletedEarlier = items.filter((e) => !e.deletedAt || tokyoDay(e.deletedAt) !== todayKey);

  const restoreMany = async (list: CalendarEvent[]) => {
    setBusy(true);
    try {
      for (const e of list) {
        await services.eventsRepo.restore?.(e.appEventId, user.userId).catch(() => {});
      }
      setItems(deletedList());
    } finally {
      setBusy(false);
    }
  };

  const renderItem = (e: CalendarEvent) => (
    <div className="event-card" key={e.appEventId} style={{ ['--evt-color' as string]: e.color ?? '#b39ddf' }}>
      <div style={{ flex: 1 }}>
        <div className="etitle">{e.emoji ? `${e.emoji} ` : ''}{e.title || '(無題)'}</div>
        <div className="eloc">{e.allDay ? fmtAllDayRange(e.start, e.end) : fmtDateTimeRange(e.start, e.end)}</div>
        <div className="eloc muted" style={{ fontSize: 11 }}>
          削除: {e.deletedAt ? fmtYmdHm(new Date(e.deletedAt)) : '—'}
          {e.calendarType === 'rebecca_source' ? '・レベッカ' : ''}
        </div>
      </div>
      <button className="btn sm" disabled={busy} onClick={() => restore(e.appEventId)}>復元</button>
    </div>
  );

  return (
    <>
      <div className="section-title">削除した予定（復元）</div>
      <div className="card" style={{ marginBottom: 16 }}>
        {items.length === 0 ? (
          <p className="muted">削除された予定はありません。</p>
        ) : (
          <>
            {/* 今日消えた分＝不具合の可能性が高い */}
            <div className="muted" style={{ fontWeight: 800, marginBottom: 8 }}>
              🐞 今日消えた（不具合の可能性・{deletedToday.length}）
            </div>
            {deletedToday.length === 0 ? (
              <p className="muted" style={{ marginBottom: 12 }}>なし</p>
            ) : (
              <>
                <button className="btn" disabled={busy} onClick={() => restoreMany(deletedToday)} style={{ marginBottom: 10 }}>
                  今日消えた{deletedToday.length}件をまとめて復元
                </button>
                {deletedToday.map(renderItem)}
              </>
            )}

            {/* それ以前＝意図的に消した可能性が高い */}
            <div className="muted" style={{ fontWeight: 800, margin: '16px 0 8px' }}>
              🗑 それ以前に消えた（意図的の可能性・{deletedEarlier.length}）
            </div>
            <p className="muted" style={{ fontSize: 11, marginBottom: 8 }}>
              これらは彼女や君が意図的に消した可能性が高いです。必要なものだけ個別に復元してください。
            </p>
            {deletedEarlier.length === 0 ? (
              <p className="muted">なし</p>
            ) : (
              deletedEarlier.map(renderItem)
            )}
          </>
        )}
      </div>
    </>
  );
}
