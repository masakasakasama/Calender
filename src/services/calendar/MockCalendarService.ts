import type { CalendarEvent, GoogleCalendarSummary } from '@/types';
import type { IEventsRepository } from '@/repositories/events/IEventsRepository';
import type { ICalendarService } from './ICalendarService';
import { MOCK_REBECCA_CALENDARS, MOCK_REBECCA_EVENTS } from './mockData';
import { eventDisplayColor } from '@/utils/eventStyle';

const MOCK_SHARED_CALENDAR_ID = 'shared-couple-calendar';

/**
 * Google Calendar API のモック実装。
 * 共有予定はアプリの events リポジトリを正本とし、レベッカの既存予定は
 * モックデータ（Google 上のデータに相当）を返す。
 */
export class MockCalendarService implements ICalendarService {
  constructor(private events: IEventsRepository) {}

  async ensureSharedCalendar(): Promise<string> {
    // 本番: calendars.insert → 返ってきた id を保存。
    return MOCK_SHARED_CALENDAR_ID;
  }

  async listSharedEvents(sharedCalendarId: string): Promise<CalendarEvent[]> {
    return this.events
      .getAll()
      .filter((e) => e.calendarType === 'shared' && e.sharedGoogleCalendarId === sharedCalendarId);
  }

  async listRebeccaCalendars(): Promise<GoogleCalendarSummary[]> {
    return [...MOCK_REBECCA_CALENDARS];
  }

  async listRebeccaEvents(googleCalendarIds: string[]): Promise<CalendarEvent[]> {
    const set = new Set(googleCalendarIds);
    return MOCK_REBECCA_EVENTS.filter((e) => set.has(e.sourceGoogleCalendarId ?? ''));
  }

  async copyEventToShared(params: {
    sharedCalendarId: string;
    source: CalendarEvent;
    byUserId: string;
  }): Promise<CalendarEvent> {
    const { sharedCalendarId, source, byUserId } = params;
    const now = new Date().toISOString();
    const sharedId = `shared-copy-${source.sourceGoogleEventId ?? source.appEventId}`;
    // extendedProperties に保存する想定の値を、コピー予定のフィールドに保持。
    const copy: CalendarEvent = {
      appEventId: sharedId,
      title: source.title,
      description: source.description,
      location: source.location,
      start: source.start,
      end: source.end,
      reminderMinutes: source.reminderMinutes,
      color: source.color ?? eventDisplayColor(source),
      emoji: source.emoji ?? null,
      categoryId: source.categoryId ?? 'other',
      mapsPlaceId: source.mapsPlaceId ?? null,
      recurrence: source.recurrence ?? null,
      recurrenceParentId: source.recurrenceParentId ?? null,
      version: source.version ?? 1,
      calendarType: 'shared',
      createdBy: byUserId,
      updatedBy: byUserId,
      googleCalendarId: sharedCalendarId,
      googleEventId: sharedId,
      sourceGoogleCalendarId: source.sourceGoogleCalendarId,
      sourceGoogleEventId: source.sourceGoogleEventId,
      sharedGoogleCalendarId: sharedCalendarId,
      sharedGoogleEventId: sharedId,
      visibility: 'shared',
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    return this.events.upsert(copy);
  }

  async removeSharedEvent(_sharedCalendarId: string, sharedGoogleEventId: string): Promise<void> {
    // 共有予定の appEventId == sharedGoogleEventId（モック規約）。
    await this.events.softDelete(sharedGoogleEventId, 'system');
  }
}
