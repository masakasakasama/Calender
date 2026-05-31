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
}: {
  events: CalendarEvent[];
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const [mode, setMode] = useState<Mode>('month');
  const [cursor, setCursor] = useState<Date>(new Date());

  const eventsOn = (d: Date) => events.filter((e) => sameDay(new Date(e.start), d)).sort((a, b) => a.start.localeCompare(b.start));

  const move = (dir: number) => {
    if (mode === 'month') setCursor(addMonths(cursor, dir));
    else if (mode === 'week') setCursor(addDays(cursor, dir * 7));
    else setCursor(addDays(cursor, dir));
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

      {mode === 'month' && <MonthView cursor={cursor} eventsOn={eventsOn} onPickDay={(d) => { setCursor(d); setMode('day'); }} />}
      {mode === 'week' && <WeekView cursor={cursor} eventsOn={eventsOn} onSelectEvent={onSelectEvent} />}
      {mode === 'day' && <DayList day={cursor} events={eventsOn(cursor)} onSelectEvent={onSelectEvent} />}
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
                <span className="dot" key={e.appEventId} />
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
