import type { CalendarEvent } from '@/types';
import { fmtDateTimeRange } from '@/utils/date';

// 共有済み/非共有/同期エラーが一目で分かる予定カード。
export function EventCard({
  event,
  accent,
  onClick,
  right,
}: {
  event: CalendarEvent;
  accent?: string;
  onClick?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <div className="event-card" style={accent ? { borderLeftColor: accent } : undefined} onClick={onClick}>
      <div style={{ flex: 1 }}>
        <div className="etime">{fmtDateTimeRange(event.start, event.end)}</div>
        <div className="etitle">{event.title}</div>
        {event.location && <div className="eloc">📍 {event.location}</div>}
        <div className="chips">
          {event.visibility === 'shared' ? (
            <span className="chip shared">共有</span>
          ) : (
            <span className="chip private">非共有</span>
          )}
          {event.syncStatus === 'pending' && <span className="chip pending">同期待ち</span>}
          {event.syncStatus === 'error' && <span className="chip error">同期エラー</span>}
        </div>
      </div>
      {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
    </div>
  );
}
