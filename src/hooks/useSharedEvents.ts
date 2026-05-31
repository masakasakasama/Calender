import { useEffect, useState, useCallback } from 'react';
import type { CalendarEvent, EventVisibility } from '@/types';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';
import { newId } from '@/utils/id';

// 共有予定の書き込み先Googleカレンダー（Firestore設定 > env の順で解決）。
function googleSharedCalId(): string | null {
  return services.settingsRepo.getAppConfig().googleSharedCalendarId ?? APP_CONFIG.googleSharedCalendarId ?? null;
}

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

  // アプリで作成した「共有」予定だけを、実際のGoogleカレンダーに反映する。
  // （彼女のGoogle既存予定＝source付き や「自分だけ」はGoogleに書かない）
  async function pushSharedToGoogle(ev: CalendarEvent): Promise<void> {
    if (ev.visibility !== 'shared' || ev.sourceGoogleEventId) return;
    const gcal = googleSharedCalId();
    if (!gcal || !services.calendar.pushEventToGoogle) return;
    try {
      const gid = await services.calendar.pushEventToGoogle(gcal, ev);
      await services.eventsRepo.upsert({
        ...ev,
        googleEventId: gid,
        googleCalendarId: gcal,
        syncStatus: 'synced',
      });
    } catch {
      await services.eventsRepo.upsert({ ...ev, syncStatus: 'error' });
    }
  }

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
      await pushSharedToGoogle(saved);
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
      await pushSharedToGoogle(saved);
      return saved;
    },
    [currentUserId],
  );

  const deleteEvent = useCallback(
    async (appEventId: string) => {
      services.notifications.cancelEventReminder(appEventId);
      // 実Googleカレンダーにも反映済みなら削除する。
      const existing = services.eventsRepo.getById(appEventId);
      const gid = existing?.googleEventId;
      const gcal = googleSharedCalId();
      if (gid && gcal && services.calendar.deleteEventFromGoogle) {
        try {
          await services.calendar.deleteEventFromGoogle(gcal, gid);
        } catch {
          /* 失敗してもアプリ内削除は続行 */
        }
      }
      await services.eventsRepo.softDelete(appEventId, currentUserId ?? 'unknown');
    },
    [currentUserId],
  );

  return { events, createEvent, updateEvent, deleteEvent };
}
