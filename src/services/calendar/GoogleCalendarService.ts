import type { IEventsRepository } from '@/repositories/events/IEventsRepository';
import type { CalendarEvent, GoogleCalendarSummary } from '@/types';
import { suggestEmoji, eventDisplayColor } from '@/utils/eventStyle';
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
  colorId?: string;
}

// Google の「予定の色」colorId → 16進。カレンダーアプリと同じ配色。
const GOOGLE_EVENT_COLORS: Record<string, string> = {
  '1': '#a4bdfc', '2': '#7ae7bf', '3': '#dbadff', '4': '#ff887c',
  '5': '#fbd75b', '6': '#ffb878', '7': '#46d6db', '8': '#e1e1e1',
  '9': '#5484ed', '10': '#51b749', '11': '#dc2127',
};

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

  /** カレンダーID → そのカレンダーの色(backgroundColor)。失敗時は空。 */
  private async calendarColorMap(): Promise<Record<string, string>> {
    try {
      const data = await authed<{ items?: GoogleCalendarListItem[] }>(this.tokenProvider, '/users/me/calendarList');
      const map: Record<string, string> = {};
      for (const c of data.items ?? []) {
        if (c.backgroundColor) map[c.id] = c.backgroundColor;
      }
      return map;
    } catch {
      return {};
    }
  }

  async listRebeccaEvents(googleCalendarIds: string[]): Promise<CalendarEvent[]> {
    const now = new Date();
    // 今年の頭（過去分含む）から1年先まで取得する。
    const from = new Date(now.getFullYear(), 0, 1);
    const to = new Date(now);
    to.setFullYear(to.getFullYear() + 1);

    // カレンダーごとの実際の色（backgroundColor）を取得しておく。
    const calColors = await this.calendarColorMap();

    // 1つのカレンダー取得が失敗しても、他のカレンダーの予定は表示する。
    const batches = await Promise.all(
      googleCalendarIds.map(async (calendarId) => {
        const qs = new URLSearchParams({
          singleEvents: 'true',
          orderBy: 'startTime',
          timeMin: from.toISOString(),
          timeMax: to.toISOString(),
          maxResults: '2500',
        });
        let data: { items?: GoogleEventItem[] };
        try {
          data = await authed<{ items?: GoogleEventItem[] }>(
            this.tokenProvider,
            `/calendars/${encodeURIComponent(calendarId)}/events?${qs.toString()}`,
          );
        } catch {
          return [] as CalendarEvent[];
        }
        return (data.items ?? []).map((ev): CalendarEvent => {
          const sourceId = ev.id;
          const updatedAt = ev.updated ? new Date(ev.updated).toISOString() : new Date().toISOString();
          const title = ev.summary ?? '無題の予定';
          // レベッカのGoogleカレンダーの実際の色をそのまま使う。
          //  1) 予定個別の色(colorId)があればそれ
          //  2) なければそのカレンダーの色(backgroundColor)
          const color =
            (ev.colorId && GOOGLE_EVENT_COLORS[ev.colorId]) || calColors[calendarId] || null;
          return {
            appEventId: `google-${calendarId}-${sourceId}`,
            title,
            description: ev.description ?? '',
            location: ev.location ?? '',
            start: toIso(ev.start),
            end: toIso(ev.end),
            reminderMinutes: null,
            color, // Googleカレンダーの実際の色
            emoji: suggestEmoji(title), // タイトルから絵文字（アイコン表示用）
            categoryId: 'other',
            mapsPlaceId: null,
            recurrence: null,
            recurrenceParentId: null,
            version: 1,
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
      color: params.source.color ?? eventDisplayColor(params.source),
      categoryId: params.source.categoryId ?? 'other',
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

  // appEventId から決まる安定したGoogleイベントID（base32hex: 0-9a-v）。
  // 同じ予定は常に同じIDになるので、何度書き込んでも重複しない。
  private gcalEventId(appEventId: string): string {
    let h1 = 0;
    let h2 = 0;
    for (let i = 0; i < appEventId.length; i++) {
      h1 = (h1 * 31 + appEventId.charCodeAt(i)) >>> 0;
      h2 = (h2 * 131 + appEventId.charCodeAt(i)) >>> 0;
    }
    // 16進(0-9a-f)はbase32hexの一部なので有効。
    return `ev${h1.toString(16)}${h2.toString(16)}`;
  }

  async pushEventToGoogle(calendarId: string, event: CalendarEvent): Promise<string | null> {
    const token = await this.tokenProvider();
    if (!token) throw new Error('Googleカレンダーに書き込むには、設定でGoogle連携してください');
    const id = event.googleEventId || this.gcalEventId(event.appEventId);
    const enc = encodeURIComponent;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const body = JSON.stringify(this.toGoogleBody(event));
    // 既存なら更新、無ければ同じIDで新規作成（＝重複しない）。
    let res = await fetch(`${API}/calendars/${enc(calendarId)}/events/${enc(id)}`, { method: 'PATCH', headers, body });
    if (res.status === 404 || res.status === 410) {
      res = await fetch(`${API}/calendars/${enc(calendarId)}/events`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ id, ...this.toGoogleBody(event) }),
      });
      // 競合(既に作成済み)は実質成功とみなす。
      if (res.status === 409) return id;
    }
    if (!res.ok) throw new Error(`Google Calendar 書き込みエラー: ${res.status}`);
    return id;
  }

  async deleteEventFromGoogle(calendarId: string, googleEventId: string): Promise<void> {
    await this.authedWrite('DELETE', `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`);
  }
}
