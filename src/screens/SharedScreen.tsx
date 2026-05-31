import { useState } from 'react';
import type { CalendarEvent, User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';

// 共有カレンダー画面（彼氏・レベッカ両方が見る）。
// calendarType === 'shared' かつ visibility === 'shared' のみ表示するため、
// レベッカの非共有予定はここに絶対出ない。
export function SharedScreen({ user, openAdd, onAddHandled }: { user: User; openAdd: boolean; onAddHandled: () => void }) {
  const { events, createEvent, updateEvent, deleteEvent } = useSharedEvents(user.userId);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [adding, setAdding] = useState(false);

  // 「追加」タブから来たフラグを開く。
  if (openAdd && !adding) {
    setAdding(true);
    onAddHandled();
  }

  const handleSave = async (v: EventFormValue) => {
    if (selected) await updateEvent({ ...selected, ...v });
    else await createEvent(v);
  };

  return (
    <div>
      <CalendarView events={events} onSelectEvent={setSelected} />

      {(adding || selected) && (
        <EventModal
          event={selected}
          onClose={() => { setSelected(null); setAdding(false); }}
          onSave={handleSave}
          onDelete={selected ? () => deleteEvent(selected.appEventId) : undefined}
        />
      )}
    </div>
  );
}
