import { useState } from 'react';
import type { CalendarEvent, User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { EVENT_CATEGORIES } from '@/utils/eventStyle';

// 共有カレンダー画面（2人で見る）。ホームはカレンダーと検索だけのシンプル構成。
export function SharedScreen({ user, openAdd, onAddHandled }: { user: User; openAdd: boolean; onAddHandled: () => void }) {
  const { events, createEvent, updateEvent, deleteEvent } = useSharedEvents(user.userId);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  // 「追加」タブから来たフラグを開く。
  if (openAdd && !adding) {
    setAddInitial(undefined);
    setAdding(true);
    onAddHandled();
  }

  // 月表示で日付をタップ／プラン選択 → 予定を追加。
  const addOnDate = (date: Date, initial?: Partial<EventFormValue>) => {
    if (initial) {
      setAddInitial(initial);
    } else {
      const start = new Date(date);
      start.setHours(12, 0, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      setAddInitial({ start: start.toISOString(), end: end.toISOString() });
    }
    setAdding(true);
  };

  const handleSave = async (v: EventFormValue) => {
    if (selected) await updateEvent({ ...selected, ...v });
    else await createEvent(v);
  };

  const close = () => { setSelected(null); setAdding(false); setAddInitial(undefined); };
  const q = query.trim().toLowerCase();
  const visibleEvents = events.filter((e) => {
    const matchesText =
      !q || [e.title, e.location, e.description].some((x) => (x ?? '').toLowerCase().includes(q));
    const matchesCategory = category === 'all' || e.categoryId === category;
    return matchesText && matchesCategory;
  });

  return (
    <div>
      <div className="search-row">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="予定を検索" />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="all">すべて</option>
          {EVENT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>

      <CalendarView events={visibleEvents} onSelectEvent={setSelected} onAddOnDate={addOnDate} />

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
