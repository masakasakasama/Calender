import { useState } from 'react';
import type { CalendarEvent, User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { DayTimeline } from '@/components/calendar/DayTimeline';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { useSwipe } from '@/hooks/useSwipe';
import { addDays, ymd, fmtYmd, WEEKDAY_LABELS } from '@/utils/date';

// 1日タイムライン（時間ごと）画面。Structured 風の縦時間軸。
export function TimelineScreen({ user }: { user: User }) {
  const { events, createEvent, updateEvent, deleteEvent } = useSharedEvents(user.userId);
  const [day, setDay] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);

  const key = ymd(day);
  const onDay = (e: CalendarEvent) => {
    const s = new Date(e.start);
    const en = new Date(new Date(e.end).getTime() - 1);
    for (let t = new Date(s.getFullYear(), s.getMonth(), s.getDate()); t <= en; t.setDate(t.getDate() + 1)) {
      if (ymd(t) === key) return true;
    }
    return false;
  };
  const dayEvents = events.filter(onDay);
  const allDay = dayEvents.filter((e) => e.allDay);
  const timed = dayEvents.filter((e) => !e.allDay);

  const go = (n: number) => setDay((d) => { const r = addDays(d, n); r.setHours(0, 0, 0, 0); return r; });
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); setDay(d); };
  const swipe = useSwipe({ onLeft: () => go(1), onRight: () => go(-1) });

  const pickSlot = (hour: number) => {
    const start = new Date(day);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setAddInitial({ start: start.toISOString(), end: end.toISOString() });
    setAdding(true);
  };

  const addAllDay = () => {
    const start = new Date(day); start.setHours(0, 0, 0, 0);
    const end = new Date(day); end.setHours(23, 59, 59, 999);
    setAddInitial({ start: start.toISOString(), end: end.toISOString(), allDay: true });
    setAdding(true);
  };

  const handleSave = async (v: EventFormValue) => {
    if (selected) await updateEvent({ ...selected, ...v });
    else await createEvent(v);
  };
  const close = () => { setSelected(null); setAdding(false); setAddInitial(undefined); };

  const isToday = key === ymd(new Date());

  return (
    <div className="timeline-screen" {...swipe}>
      <div className="tl-header">
        <button className="tl-nav" onClick={() => go(-1)} aria-label="前の日">‹</button>
        <div className="tl-date">
          <div className="tl-date-main">{fmtYmd(day)}</div>
          <div className="tl-date-sub">{WEEKDAY_LABELS[day.getDay()]}曜日{isToday ? '・今日' : ''}</div>
        </div>
        <button className="tl-nav" onClick={() => go(1)} aria-label="次の日">›</button>
      </div>

      <div className="tl-actions">
        {!isToday && <button className="btn sm secondary" onClick={today}>今日へ</button>}
        <button className="btn sm secondary" onClick={addAllDay}>＋ 終日の予定</button>
      </div>

      {allDay.length > 0 && (
        <div className="tl-allday">
          {allDay.map((e) => (
            <button
              key={e.appEventId}
              type="button"
              className="tl-allday-chip"
              style={{ ['--evt-color' as string]: e.color ?? '#b39ddf' }}
              onClick={() => setSelected(e)}
            >
              {e.emoji ? `${e.emoji} ` : ''}{e.title}
            </button>
          ))}
        </div>
      )}

      <DayTimeline day={day} timed={timed} onSelectEvent={setSelected} onPickSlot={pickSlot} />

      {(adding || selected) && (
        <EventModal
          event={selected}
          initial={addInitial}
          allowPrivate={user.role === 'rebecca'}
          onClose={close}
          onSave={handleSave}
          onDelete={selected ? () => deleteEvent(selected.appEventId) : undefined}
        />
      )}
    </div>
  );
}
