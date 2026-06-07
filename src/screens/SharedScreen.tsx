import { useEffect, useState } from 'react';
import type { CalendarEvent, User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';
import { EVENT_CATEGORIES } from '@/utils/eventStyle';
import { dedupeSharedEvents } from '@/utils/dedupeEvents';

interface SharedScreenProps {
  user: User;
  openAdd: boolean;
  searchPulse: number;
  onAddHandled: () => void;
}

export function SharedScreen({ user, openAdd, searchPulse, onAddHandled }: SharedScreenProps) {
  const { events, createEvent, updateEvent, deleteEvent } = useSharedEvents(user.userId);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!openAdd || adding) return;
    setAddInitial(undefined);
    setAdding(true);
    onAddHandled();
  }, [adding, onAddHandled, openAdd]);

  useEffect(() => {
    if (searchPulse > 0) setSearchOpen(true);
  }, [searchPulse]);

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

  const handleSave = async (value: EventFormValue) => {
    if (selected) await updateEvent({ ...selected, ...value });
    else await createEvent(value);
  };

  const close = () => {
    setSelected(null);
    setAdding(false);
    setAddInitial(undefined);
  };

  const resetSearch = () => {
    setQuery('');
    setCategory('all');
    setSearchOpen(false);
  };

  const q = query.trim().toLowerCase();
  const visibleEvents = dedupeSharedEvents(events.filter((event) => {
    const matchesText =
      !q || [event.title, event.location, event.description].some((text) => (text ?? '').toLowerCase().includes(q));
    const matchesCategory = category === 'all' || event.categoryId === category;
    return matchesText && matchesCategory;
  }));

  return (
    <div>
      {searchOpen && (
        <div className="search-row open">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="予定を検索" autoFocus />
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">すべて</option>
            {EVENT_CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.emoji} {item.label}
              </option>
            ))}
          </select>
          <button className="icon-search close" onClick={resetSearch} aria-label="検索を閉じる">
            ×
          </button>
        </div>
      )}

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
