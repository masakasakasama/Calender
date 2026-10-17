import { createCalendarEvent } from '@/utils/calendarEventFactory';
import { useEffect, useState, useCallback } from 'react';
import type { CalendarEvent, EventVisibility, EventRecurrence } from '@/types';
import { inYear } from '@/utils/yearlyRecurrence';
import { services } from '@/services/container';
import { APP_CONFIG } from '@/config/appConfig';
import { newId } from '@/utils/id';
import { dedupeSharedEvents } from '@/utils/dedupeEvents';

// 共有予定の書き込み先Googleカレンダー（Firestore設定 > env の順で解決）。
function googleSharedCalId(): string | null {
  return services.settingsRepo.getAppConfig().googleSharedCalendarId ?? APP_CONFIG.googleSharedCalendarId ?? null;
}

function shiftRecurringDate(iso: string, frequency: string, step: number): string {
  const d = new Date(iso);
  if (frequency === 'daily') d.setDate(d.getDate() + step);
  if (frequency === 'weekly') d.setDate(d.getDate() + step * 7);
  if (frequency === 'monthly') d.setMonth(d.getMonth() + step);
  return d.toISOString();
}

// 共有カレンダー画面用。
// 表示するのは「2人の共有予定」＋「自分だけの予定（作成者本人のみ）」。
// 相手の "自分だけ" は表示しない（共有予定だけが相手に見える）。
export function useSharedEvents(currentUserId: string | null) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const unsub = services.eventsRepo.subscribe((all) => {
      const sharedVisible = all.filter(
          (e) =>
            e.calendarType === 'shared' &&
            (e.visibility === 'shared' || (e.visibility === 'private' && e.createdBy === currentUserId)),
        );
      // 重複は「表示上だけ」隠す。DBからは自動削除しない（誤削除・復元巻き戻しの防止）。
      setEvents(dedupeSharedEvents(sharedVisible));
      for (const e of all) {
        if (e.calendarType === 'shared') services.notifications.scheduleEventReminder(e);
      }
    });
    return unsub;
  }, [currentUserId]);

  const sharedCalendarId = services.settingsRepo.getAppConfig().sharedCalendarId;

  // アプリで作成した「共有」予定だけを、実際のGoogleカレンダーに反映する。
  // （彼女のGoogle既存予定＝source付き や「自分だけ」はGoogleに書かない）
  // 実Googleカレンダーへの反映は「裏でこっそり試すだけ」。
  // アプリ内の共有カレンダーが正本なので、失敗してもエラーは出さない（無言でスキップ）。
  async function pushSharedToGoogle(ev: CalendarEvent): Promise<void> {
    if (ev.visibility !== 'shared' || ev.sourceGoogleEventId) return;
    const gcal = googleSharedCalId();
    if (!gcal || !services.calendar.pushEventToGoogle) return;
    if (!(services.auth.isGoogleCalendarConnected?.() ?? true)) return; // 未連携なら静かにスキップ
    try {
      const gid = await services.calendar.pushEventToGoogle(gcal, ev);
      if (gid) {
        await services.eventsRepo.upsert({
          ...ev,
          googleEventId: gid,
          googleCalendarId: gcal,
          sharedGoogleCalendarId: gcal,
          sharedGoogleEventId: gid,
          syncStatus: 'synced',
          syncError: null,
        });
      }
    } catch {
      /* Googleへの反映は任意。失敗しても何もしない（アプリ内の共有予定は有効） */
    }
  }

  // 任意：Googleへ手動で再反映（裏で試すだけ）。
  const resyncEvent = useCallback(async (ev: CalendarEvent) => {
    await pushSharedToGoogle(ev);
  }, []);

  const createEvent = useCallback(
    async (input: {
      title: string;
      description: string;
      location: string;
      start: string;
      end: string;
      allDay?: boolean;
      reminderMinutes: number | null;
      color: string | null;
      emoji: string | null;
      categoryId: string | null;
      mapsPlaceId: string | null;
      recurrence: EventRecurrence | null;
      visibility: EventVisibility;
    }) => {
      const now = new Date().toISOString();
      const uid = currentUserId ?? 'unknown';
      const frequency = input.recurrence?.frequency ?? 'none';
      const count = frequency === 'none' || frequency === 'yearly' ? 1 : Math.max(1, Math.min(52, input.recurrence?.count ?? 1));
      const parentId = count > 1 ? newId('recur') : null;
      let first: CalendarEvent | null = null;

      for (let i = 0; i < count; i++) {
        const ev: CalendarEvent = createCalendarEvent({
          appEventId: i === 0 && !parentId ? newId('shared') : `${parentId}-${i + 1}`,
          ...input,
          start: shiftRecurringDate(input.start, frequency, i),
          end: shiftRecurringDate(input.end, frequency, i),
          recurrence: frequency === 'yearly' ? { frequency, count: 1 } : count > 1 ? { frequency, count } : null,
          recurrenceParentId: parentId,
          version: 1,
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
          syncStatus: 'synced', // アプリ内共有を正本とし、エラー表示は出さない
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        });
        const saved = await services.eventsRepo.upsert(ev);
        if (!first) first = saved;
        services.notifications.scheduleEventReminder(saved);
        await pushSharedToGoogle(saved);
      }

      await services.notifications.notify({
        kind: 'event_added',
        title: count > 1 ? '繰り返し予定が追加されました' : '共有予定が追加されました',
        body: input.title,
      });
      return first!;
    },
    [currentUserId, sharedCalendarId],
  );

  const updateEvent = useCallback(
    async (ev: CalendarEvent) => {
      const uid = currentUserId ?? 'unknown';
      const source = services.eventsRepo.getById(ev.appEventId);
      if (source?.recurrence?.frequency === 'yearly') {
        const displayedStart = inYear(source.start, new Date(ev.start).getFullYear());
        const displayedEnd = new Date(new Date(displayedStart).getTime() +
          new Date(source.end).getTime() - new Date(source.start).getTime()).toISOString();
        const members = events.filter((event) => event.appEventId === source.appEventId ||
          (source.recurrenceParentId && event.recurrenceParentId === source.recurrenceParentId));
        let first: CalendarEvent | undefined;
        for (const member of members) {
          const delta = new Date(member.start).getFullYear() - new Date(ev.start).getFullYear();
          const saved = await services.eventsRepo.upsert({
            ...member,
            title: ev.title, description: ev.description, location: ev.location,
            allDay: ev.allDay, reminderMinutes: ev.reminderMinutes,
            color: ev.color, emoji: ev.emoji, categoryId: ev.categoryId,
            mapsPlaceId: ev.mapsPlaceId, visibility: ev.visibility,
            start: ev.start === displayedStart ? member.start : inYear(ev.start, new Date(ev.start).getFullYear() + delta),
            end: ev.end === displayedEnd ? member.end : inYear(ev.end, new Date(ev.end).getFullYear() + delta),
            updatedBy: uid, syncStatus: 'synced', version: (member.version ?? 1) + 1,
          });
          services.notifications.scheduleEventReminder(saved);
          first ??= saved;
        }
        return first!;
      }
      const saved = await services.eventsRepo.upsert({ ...ev, updatedBy: uid, syncStatus: 'synced', version: (ev.version ?? 1) + 1 });
      services.notifications.scheduleEventReminder(saved);
      await pushSharedToGoogle(saved);
      return saved;
    },
    [currentUserId, events],
  );

  const deleteEvent = useCallback(
    async (appEventId: string) => {
      const existing = services.eventsRepo.getById(appEventId);
      const members = existing?.recurrence?.frequency === 'yearly' && existing.recurrenceParentId
        ? events.filter((event) => event.recurrenceParentId === existing.recurrenceParentId)
        : existing ? [existing] : [];
      for (const member of members) {
        services.notifications.cancelEventReminder(member.appEventId);
        await services.eventsRepo.softDelete(member.appEventId, currentUserId ?? 'unknown');
      }
    },
    [currentUserId, events],
  );

  return { events, createEvent, updateEvent, deleteEvent, resyncEvent };
}
