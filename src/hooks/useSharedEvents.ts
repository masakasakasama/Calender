import { useEffect, useState, useCallback } from 'react';
import type { CalendarEvent, EventVisibility } from '@/types';
import { services } from '@/services/container';
import { newId } from '@/utils/id';

// 共有カレンダー画面用。
// 表示するのは「2人の共有予定」＋「自分だけの予定（作成者本人のみ）」。
// 相手の "自分だけ" は表示しない（共有予定だけが相手に見える）。
export function useSharedEvents(currentUserId: string | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const unsub = services.eventsRepo.subscribe((all) => {
      setEvents(
        all.filter(
          (e) =>
            e.calendarType === 'shared' &&
            (e.visibility === 'shared' || (e.visibility === 'private' && e.createdBy === currentUserId)),
        ),
      );
    });
    return unsub;
  }, [currentUserId]);

  const sharedCalendarId = services.settingsRepo.getAppConfig().sharedCalendarId;

  const createEvent = useCallback(
    async (input: {
      title: string;
      description: string;
      location: string;
      start: string;
      end: string;
      reminderMinutes: number | null;
      color: string | null;
      emoji: string | null;
      visibility: EventVisibility;
    }) => {
      const now = new Date().toISOString();
      const uid = currentUserId ?? 'unknown';
      const ev: CalendarEvent = {
        appEventId: newId('shared'),
        ...input,
        calendarType: 'shared',
        createdBy: uid,
        updatedBy: uid,
        googleCalendarId: sharedCalendarId,
        googleEventId: null,
        sourceGoogleCalendarId: null,
        sourceGoogleEventId: null,
        sharedGoogleCalendarId: sharedCalendarId,
        sharedGoogleEventId: null,
        visibility: input.visibility, // 自分だけ / 共有
        syncStatus: 'pending', // Google 反映待ち（モックでは pending のまま土台）
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      const saved = await services.eventsRepo.upsert(ev);
      services.notifications.scheduleEventReminder(saved);
      await services.notifications.notify({
        kind: 'event_added',
        title: '共有予定が追加されました',
        body: input.title,
      });
      return saved;
    },
    [currentUserId, sharedCalendarId],
  );

  const updateEvent = useCallback(
    async (ev: CalendarEvent) => {
      const uid = currentUserId ?? 'unknown';
      const saved = await services.eventsRepo.upsert({ ...ev, updatedBy: uid, syncStatus: 'pending' });
      services.notifications.scheduleEventReminder(saved);
      return saved;
    },
    [currentUserId],
  );

  const deleteEvent = useCallback(
    async (appEventId: string) => {
      services.notifications.cancelEventReminder(appEventId);
      await services.eventsRepo.softDelete(appEventId, currentUserId ?? 'unknown');
    },
    [currentUserId],
  );

  return { events, createEvent, updateEvent, deleteEvent };
}
