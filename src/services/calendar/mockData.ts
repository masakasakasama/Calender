import type { CalendarEvent, GoogleCalendarSummary } from '@/types';

// モックの「レベッカの既存Googleカレンダー一覧」。
export const MOCK_REBECCA_CALENDARS: GoogleCalendarSummary[] = [
  { googleCalendarId: 'rebecca-personal', calendarName: 'レベッカ（個人）', calendarColor: '#f06292', accessRole: 'owner' },
  { googleCalendarId: 'rebecca-work', calendarName: '仕事', calendarColor: '#4dd0e1', accessRole: 'owner' },
  { googleCalendarId: 'rebecca-gym', calendarName: 'ジム / 習い事', calendarColor: '#aed581', accessRole: 'writer' },
  { googleCalendarId: 'jp-holidays', calendarName: '日本の祝日', calendarColor: '#ffb74d', accessRole: 'reader' },
];

function iso(daysFromNow: number, hour: number, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

let seq = 0;
function srcEvent(p: Partial<CalendarEvent> & { title: string; start: string; end: string; sourceGoogleCalendarId: string }): CalendarEvent {
  const now = new Date().toISOString();
  const id = `mock-src-${++seq}`;
  return {
    appEventId: id,
    title: p.title,
    description: p.description ?? '',
    location: p.location ?? '',
    start: p.start,
    end: p.end,
    reminderMinutes: null,
    calendarType: 'rebecca_source',
    createdBy: 'user-rebecca',
    updatedBy: 'user-rebecca',
    googleCalendarId: p.sourceGoogleCalendarId,
    googleEventId: id,
    sourceGoogleCalendarId: p.sourceGoogleCalendarId,
    sourceGoogleEventId: id,
    sharedGoogleCalendarId: null,
    sharedGoogleEventId: null,
    visibility: 'private',
    syncStatus: 'synced',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  };
}

// モックの「レベッカの既存予定」。
export const MOCK_REBECCA_EVENTS: CalendarEvent[] = [
  srcEvent({ title: '美容院', start: iso(1, 11), end: iso(1, 13), sourceGoogleCalendarId: 'rebecca-personal', location: '表参道' }),
  srcEvent({ title: 'チームMTG', start: iso(1, 15), end: iso(1, 16), sourceGoogleCalendarId: 'rebecca-work' }),
  srcEvent({ title: 'ヨガ', start: iso(2, 19), end: iso(2, 20), sourceGoogleCalendarId: 'rebecca-gym' }),
  srcEvent({ title: '友人とランチ', start: iso(3, 12), end: iso(3, 14), sourceGoogleCalendarId: 'rebecca-personal', location: '渋谷' }),
  srcEvent({ title: '出張（大阪）', start: iso(5, 9), end: iso(6, 18), sourceGoogleCalendarId: 'rebecca-work', location: '大阪' }),
];

// モックの共有カレンダー初期予定（2人のデート等）。
export function mockInitialSharedEvents(sharedCalendarId: string): CalendarEvent[] {
  const now = new Date().toISOString();
  const make = (title: string, start: string, end: string, location = ''): CalendarEvent => {
    const id = `mock-shared-${++seq}`;
    return {
      appEventId: id, title, description: '', location, start, end, reminderMinutes: 15,
      calendarType: 'shared', createdBy: 'user-boyfriend', updatedBy: 'user-boyfriend',
      googleCalendarId: sharedCalendarId, googleEventId: id,
      sourceGoogleCalendarId: null, sourceGoogleEventId: null,
      sharedGoogleCalendarId: sharedCalendarId, sharedGoogleEventId: id,
      visibility: 'shared', syncStatus: 'synced',
      createdAt: now, updatedAt: now, deletedAt: null,
    };
  };
  return [
    make('映画デート', iso(2, 18), iso(2, 21), '新宿'),
    make('記念日ディナー', iso(7, 19), iso(7, 22), '銀座'),
  ];
}
