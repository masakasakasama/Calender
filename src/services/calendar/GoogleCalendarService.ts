import type { IEventsRepository } from '@/repositories/events/IEventsRepository';
import type { CalendarEvent, GoogleCalendarSummary } from '@/types';
import type { ICalendarService } from './ICalendarService';

const API = 'https://www.googleapis.com/calendar/v3';
const SHARED_CALENDAR_ID = 'shared-firestore';

type TokenProvider = () => Promise<string | null>;

interface GoogleCalendarListItem {
  id: string;
  summary?: string;
  backgroundColor?: string;
  accessRole?: 'owner' | 'writer' | 'reader' | 'freeBusyReader';
  selected?: boolean;
  primary?: boolean;
}

interface GoogleEventItem {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  updated?: string;
}

async function authed<T>(tokenProvider: TokenProvider, path: string): Promise<T> {
  const token = await tokenProvider();
  if (!token) {
    throw new Error('Googleカレンダーを読むには、もう一度Googleでログインしてください');
  }
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Google Calendar API エラー: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

function toIso(input?: { dateTime?: string; date?: string }): string {
  if (input?.dateTime) return new Date(input.dateTime).toISOString();
  if (input?.date) return new Date(`${input.date}T00:00:00`).toISOString();
  return new Date().toISOString();
}

export class GoogleCalendarService implements ICalendarService {
  constructor(
    private events: IEventsRepository,
    private tokenProvider: TokenProvider,
  ) {}

  async ensureSharedCalendar(): Promise<string> {
    return SHARED_CALENDAR_ID;
  }

  async listSharedEvents(sharedCalendarId: string): Promise<CalendarEvent[]> {
    return this.events
      .getAll()
      .filter((e) => e.calendarType === 'shared' && e.sharedGoogleCalendarId === sharedCalendarId);
  }

  async listRebeccaCalendars(): Promise<GoogleCalendarSummary[]> {
    const data = await authed<{ items?: GoogleCalendarListItem[] }>(this.tokenProvider, '/users/me/calendarList');
    return (data.items ?? [])
      .filter((c) => c.accessRole === 'owner' || c.accessRole === 'writer' || c.accessRole === 'reader')
      .map((c) => ({
        googleCalendarId: c.id,
        calendarName: c.summary ?? c.id,
        calendarColor: c.backgroundColor ?? '#f472b6',
        accessRole: c.accessRole === 'freeBusyReader' ? 'reader' : c.accessRole ?? 'reader',
        primary: c.primary ?? c.id === 'primary',
      }));
  }

  async listRebeccaEvents(googleCalendarIds: string[]): Promise<CalendarEvent[]> {
    const now = new Date();
    // 今年の頭（過去分含む）から1年先まで取得する。
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now);
    to.setFullYear(to.getFullYear() + 1);

    const batches = await Promise.all(
      googleCalendarIds.map(async (calendarId) => {
        const qs = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          maxResults: '2500',
        });
        const data = await authed<{ items?: GoogleEventItem[] }>(
          this.tokenProvider,
          `/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
        );
        return (data.items ?? []).map((ev): CalendarEvent => {
          const sourceId = ev.id;
          const updatedAt = ev.updated ? new Date(ev.updated).toISOString() : new Date().toISOString();
          return {
            appEventId: `google-${calendarId}-${sourceId}`,
            title: ev.summary ?? '無題の予定',
            description: ev.description ?? '',
            location: ev.location ?? '',
            start: toIso(ev.start),
            end: toIso(ev.end),
            reminderMinutes: null,
            calendarType: 'rebecca_source',
            createdBy: 'google',
            updatedBy: 'google',
            googleCalendarId: calendarId,
            googleEventId: sourceId,
            sourceGoogleCalendarId: calendarId,
            sourceGoogleEventId: sourceId,
            sharedGoogleCalendarId: null,
            sharedGoogleEventId: null,
            visibility: 'private',
            syncStatus: 'synced',
            createdAt: updatedAt,
            updatedAt,
            deletedAt: null,
          };
        });
      }),
    );
    return batches.flat();
  }

  async copyEventToShared(params: {
    sharedCalendarId: string;
    source: CalendarEvent;
    byUserId: string;
  }): Promise<CalendarEvent> {
    const now = new Date().toISOString();
    // 元イベントから決まる安定ID（重複コピー防止）。
    const srcId = params.source.sourceGoogleEventId ?? params.source.appEventId;
    const id = `shared-${params.source.sourceGoogleCalendarId ?? 'x'}-${srcId}`;
    const copy: CalendarEvent = {
      ...params.source,
      appEventId: id,
      calendarType: 'shared',
      createdBy: params.byUserId,
      updatedBy: params.byUserId,
      googleCalendarId: params.sharedCalendarId,
      googleEventId: null,
      sourceGoogleCalendarId: params.source.sourceGoogleCalendarId,
      sourceGoogleEventId: params.source.sourceGoogleEventId ?? params.source.appEventId,
      sharedGoogleCalendarId: params.sharedCalendarId,
      sharedGoogleEventId: id,
      visibility: 'shared',
      syncStatus: 'synced',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };
    return this.events.upsert(copy);
  }

  async removeSharedEvent(_sharedCalendarId: string, sharedGoogleEventId: string): Promise<void> {
    await this.events.softDelete(sharedGoogleEventId, 'system');
  }

  // --- 実際のGoogleカレンダーへの書き込み -----------------------------
  private toGoogleBody(event: CalendarEvent): Record<string, unknown> {
    const title = `${event.emoji ? event.emoji + ' ' : ''}${event.title}`;
    return {
      summary: title,
      description: event.description || undefined,
      location: event.location || undefined,
      start: { dateTime: new Date(event.start).toISOString() },
      end: { dateTime: new Date(event.end).toISOString() },
      // アプリ側IDを保持して重複・対応付けを管理。
      extendedProperties: { private: { appEventId: event.appEventId } },
    };
  }

  private async authedWrite<T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T | null> {
    const token = await this.tokenProvider();
    if (!token) throw new Error('Googleカレンダーに書き込むには、設定でGoogle連携してください');
    const res = await fetch(`${API}${path}`, {
      method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Google Calendar 書き込みエラー: ${res.status}`);
    if (method === 'DELETE') return null;
    return res.json() as Promise<T>;
  }

  async pushEventToGoogle(calendarId: string, event: CalendarEvent): Promise<string | null> {
    const base = `/calendars/${encodeURIComponent(calendarId)}/events`;
    if (event.googleEventId) {
      // 既存 → patch（更新）
      await this.authedWrite('PATCH', `${base}/${encodeURIComponent(event.googleEventId)}`, this.toGoogleBody(event));
      return event.googleEventId;
    }
    const created = await this.authedWrite<{ id: string }>('POST', base, this.toGoogleBody(event));
    return created?.id ?? null;
  }

  async deleteEventFromGoogle(calendarId: string, googleEventId: string): Promise<void> {
    await this.authedWrite('DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`);
  }
}
