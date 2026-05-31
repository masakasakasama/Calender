import { useState } from 'react';
import type { CalendarEvent } from '@/types';
import { EventCard } from './EventCard';
import {
  addDays,
  addMonths,
  fmtMonthTitle,
  sameDay,
  startOfWeek,
  WEEKDAY_LABELS,
  ymd,
} from '@/utils/date';

type Mode = 'month' | 'week' | 'day';

// 月/週/日表示を切り替えられる共有カレンダービュー。
export function CalendarView({
  events,
  onSelectEvent,
  onAddOnDate,
}: {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
  onAddOnDate?: (date: Date) => void;
}) {
  const [mode, setMode] = useState<Mode>('month');
  const [cursor, setCursor] = useState<Date>(new Date());
  const [slide, setSlide] = useState<'l' | 'r' | null>(null);
  const [sheetDate, setSheetDate] = useState<Date | null>(null);

  const eventsOn = (d: Date) => events.filter((e) => sameDay(new Date(e.start), d)).sort((a, b) => a.start.localeCompare(b.start));

  const move = (dir: number) => {
    setSlide(dir > 0 ? 'l' : 'r');
    if (mode === 'month') setCursor(addMonths(cursor, dir));
    else if (mode === 'week') setCursor(addDays(cursor, dir * 7));
    else setCursor(addDays(cursor, dir));
  };

  // 左右スワイプで前後の月/週/日へ移動。
  const touch = { x: 0, y: 0 };
  const onTouchStart = (e: React.TouchEvent) => {
    touch.x = e.touches[0].clientX;
    touch.y = e.touches[0].clientY;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touch.x;
    const dy = e.changedTouches[0].clientY - touch.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      move(dx < 0 ? 1 : -1); // 左スワイプ=次、右スワイプ=前
    }
  };

  const title =
    mode === 'month'
      ? fmtMonthTitle(cursor)
      : mode === 'week'
        ? `${ymd(startOfWeek(cursor))} の週`
        : `${cursor.getMonth() + 1}/${cursor.getDate()}(${WEEKDAY_LABELS[cursor.getDay()]})`;

  return (
    <div>
      <div className="cal-toolbar">
        <button className="navbtn" onClick={() => move(-1)}>‹</button>
        <div className="title">{title}</div>
        <button className="navbtn" onClick={() => move(1)}>›</button>
      </div>
      <div className="seg" style={{ marginBottom: 14 }}>
        {(['month', 'week', 'day'] as Mode[]).map((m) => (
          <button key={m} className={mode === m ? 'active' : ''} onClick={() => setMode(m)}>
            {m === 'month' ? '月' : m === 'week' ? '週' : '日'}
          </button>
        ))}
      </div>

      <div
        className={`cal-swipe${slide ? ` slide-${slide}` : ''}`}
        key={`${mode}-${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onAnimationEnd={() => setSlide(null)}
      >
        {mode === 'month' && <MonthView cursor={cursor} eventsOn={eventsOn} onPickDay={(d) => setSheetDate(d)} />}
        {mode === 'week' && <WeekView cursor={cursor} eventsOn={eventsOn} onSelectEvent={onSelectEvent} />}
        {mode === 'day' && <DayList day={cursor} events={eventsOn(cursor)} onSelectEvent={onSelectEvent} />}
      </div>

      {sheetDate && (
        <DaySheet
          day={sheetDate}
          events={eventsOn(sheetDate)}
          onClose={() => setSheetDate(null)}
          onSelectEvent={(e) => { setSheetDate(null); onSelectEvent(e); }}
          onAdd={onAddOnDate ? () => { const d = sheetDate; setSheetDate(null); onAddOnDate(d); } : undefined}
        />
      )}
    </div>
  );
}

// 月表示で日付をタップしたときに開く、その日の予定シート。
function DaySheet({
  day,
  events,
  onClose,
  onSelectEvent,
  onAdd,
}: {
  day: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (e: CalendarEvent) => void;
  onAdd?: () => void;
}) {
  return (
    <div className="scrim" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <h3>{day.getFullYear()}年{day.getMonth() + 1}月{day.getDate()}日({WEEKDAY_LABELS[day.getDay()]})</h3>
        {events.length === 0 ? (
          <div className="empty">この日の予定はありません</div>
        ) : (
          events.map((e) => <EventCard key={e.appEventId} event={e} onClick={() => onSelectEvent(e)} />)
        )}
        {onAdd && (
          <button className="btn" style={{ marginTop: 10 }} onClick={onAdd}>＋ この日に予定を追加</button>
        )}
      </div>
    </div>
  );
}

function MonthView({
  cursor,
  eventsOn,
  onPickDay,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarEvent[];
  onPickDay: (d: Date) => void;
}) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const today = new Date();

  return (
    <div className="month-grid">
      {WEEKDAY_LABELS.map((w) => (
        <div className="dow" key={w}>{w}</div>
      ))}
      {cells.map((d) => {
        const evs = eventsOn(d);
        const dim = d.getMonth() !== cursor.getMonth();
        return (
          <div
            key={d.toISOString()}
            className={`month-cell${dim ? ' dim' : ''}${sameDay(d, today) ? ' today' : ''}`}
            onClick={() => onPickDay(d)}
          >
            <span className="dnum">{d.getDate()}</span>
            <div className="dots">
              {evs.slice(0, 4).map((e) => (
                <span
                  className="dot"
                  key={e.appEventId}
                  style={e.color ? { background: e.color } : undefined}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WeekView({
  cursor,
  eventsOn,
  onSelectEvent,
}: {
  cursor: Date;
  eventsOn: (d: Date) => CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const start = startOfWeek(cursor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="day-list">
      {days.map((d) => {
        const evs = eventsOn(d);
        return (
          <div key={d.toISOString()}>
            <h4>{d.getMonth() + 1}/{d.getDate()}({WEEKDAY_LABELS[d.getDay()]})</h4>
            {evs.length === 0 ? (
              <div className="muted" style={{ padding: '4px 4px 8px' }}>予定なし</div>
            ) : (
              evs.map((e) => <EventCard key={e.appEventId} event={e} onClick={() => onSelectEvent(e)} />)
            )}
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  day,
  events,
  onSelectEvent,
}: {
  day: Date;
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  return (
    <div>
      {events.length === 0 ? (
        <div className="empty">{day.getMonth() + 1}月{day.getDate()}日の予定はありません</div>
      ) : (
        events.map((e) => <EventCard key={e.appEventId} event={e} onClick={() => onSelectEvent(e)} />)
      )}
    </div>
  );
}
