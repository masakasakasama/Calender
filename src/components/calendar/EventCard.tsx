import type { CalendarEvent } from '@/types';
import { fmtDateTimeRange } from '@/utils/date';
import { categoryById, eventDisplayColor } from '@/utils/eventStyle';
import { openInMaps } from '@/utils/maps';

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
  const color = accent ?? eventDisplayColor(event);
  return (
    <div
      className="event-card"
      style={{ ['--evt-color' as string]: color }}
      onClick={onClick}
    >
      <div style={{ flex: 1 }}>
        <div className="etime">{fmtDateTimeRange(event.start, event.end)}</div>
        <div className="etitle">
          {event.emoji && <span style={{ marginRight: 6 }}>{event.emoji}</span>}
          {event.title}
        </div>
        {event.location && (
          <button
            type="button"
            className="eloc eloc-link"
            onClick={(e) => { e.stopPropagation(); openInMaps(event.location); }}
          >
            📍 {event.location}
          </button>
        )}
        <div className="chips">
          {event.visibility === 'shared' ? (
            <span className="chip shared">共有</span>
          ) : (
            <span className="chip private">非共有</span>
          )}
          {event.syncStatus === 'pending' && <span className="chip pending">同期待ち</span>}
          {event.syncStatus === 'error' && <span className="chip error">同期エラー</span>}
          {event.reminderMinutes != null && <span className="chip">通知 {event.reminderMinutes}分前</span>}
          {event.categoryId && <span className="chip">{categoryById(event.categoryId).label}</span>}
        </div>
      </div>
      {right && <div onClick={(e) => e.stopPropagation()}>{right}</div>}
    </div>
  );
}
