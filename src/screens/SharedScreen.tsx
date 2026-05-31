import { useState } from 'react';
import type { CalendarEvent, User } from '@/types';
import { useSharedEvents } from '@/hooks/useSharedEvents';
import { CalendarView } from '@/components/calendar/CalendarView';
import { EventModal, type EventFormValue } from '@/components/calendar/EventModal';

// 共有カレンダー画面（2人で見る）。
// calendarType === 'shared' かつ visibility === 'shared' のみ表示。
export function SharedScreen({ user, openAdd, onAddHandled }: { user: User; openAdd: boolean; onAddHandled: () => void }) {
  const { events, createEvent, updateEvent, deleteEvent } = useSharedEvents(user.userId);
  const [selected, setSelected] = useState<CalendarEvent | null>(null);
  const [adding, setAdding] = useState(false);
  const [addInitial, setAddInitial] = useState<Partial<EventFormValue> | undefined>(undefined);

  // 「追加」タブから来たフラグを開く。
  if (openAdd && !adding) {
    setAddInitial(undefined);
    setAdding(true);
    onAddHandled();
  }

  // 月表示で日付をタップ → その日の予定を追加（開始時刻はその日の正午）。
  const addOnDate = (date: Date) => {
    const start = new Date(date);
    start.setHours(12, 0, 0, 0);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    setAddInitial({ start: start.toISOString(), end: end.toISOString() });
    setAdding(true);
  };

  const handleSave = async (v: EventFormValue) => {
    if (selected) await updateEvent({ ...selected, ...v });
    else await createEvent(v);
  };

  const close = () => { setSelected(null); setAdding(false); setAddInitial(undefined); };

  return (
    <div>
      {events.length === 0 && (
        <div className="notice">
          Googleカレンダーの予定は「レベッカ」タブに表示されます。共有したい予定だけを「共有する」でここに追加できます。
        </div>
      )}
      <CalendarView events={events} onSelectEvent={setSelected} onAddOnDate={addOnDate} />

      {(adding || selected) && (
        <EventModal
          event={selected}
          initial={addInitial}
          onClose={close}
          onSave={handleSave}
          onDelete={selected ? () => deleteEvent(selected.appEventId) : undefined}
        />
      )}
    </div>
  );
}
