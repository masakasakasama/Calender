import { useEffect, useState, useCallback } from 'react';
import type { CalendarEvent } from '@/types';
import { services } from '@/services/container';
import { newId } from '@/utils/id';

// 共有カレンダー画面用。calendarType === 'shared' の予定のみ扱う。
// これにより「非共有予定は彼氏側に表示されない」を構造的に担保する。
export function useSharedEvents(currentUserId: string | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const unsub = services.eventsRepo.subscribe((all) => {
      setEvents(all.filter((e) => e.calendarType === 'shared' && e.visibility === 'shared'));
    });
    return unsub;
  }, []);

  const sharedCalendarId = services.settingsRepo.getAppConfig().sharedCalendarId;

  const createEvent = useCallback(
    async (input: { title: string; description: string; location: string; start: string; end: string }) => {
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
        visibility: 'shared',
        syncStatus: 'pending', // Google 反映待ち（モックでは pending のまま土台）
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      const saved = await services.eventsRepo.upsert(ev);
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
      return services.eventsRepo.upsert({ ...ev, updatedBy: uid, syncStatus: 'pending' });
    },
    [currentUserId],
  );

  const deleteEvent = useCallback(
    async (appEventId: string) => {
      await services.eventsRepo.softDelete(appEventId, currentUserId ?? 'unknown');
    },
    [currentUserId],
  );

  return { events, createEvent, updateEvent, deleteEvent };
}
