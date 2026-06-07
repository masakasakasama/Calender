import type { CalendarEvent } from '@/types';

function localDateKey(iso: string): string {
  const d = new Date(iso);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = parts.find((p) => p.type === 'year')?.value ?? String(d.getFullYear());
  const month = parts.find((p) => p.type === 'month')?.value ?? String(d.getMonth() + 1).padStart(2, '0');
  const day = parts.find((p) => p.type === 'day')?.value ?? String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeTitle(title: string): string {
  return title
    .replace(/^[^A-Za-z0-9\u3040-\u30ff\u3400-\u9fff]+/u, '')
    .replace(/\s+/g, '')
    .toLowerCase();
}

function googleKey(event: CalendarEvent): string | null {
  const cal = event.sharedGoogleCalendarId ?? event.googleCalendarId ?? event.sourceGoogleCalendarId;
  const id = event.sharedGoogleEventId ?? event.googleEventId ?? event.sourceGoogleEventId;
  return cal && id ? `${cal}:${id}` : null;
}

function fuzzySharedKey(event: CalendarEvent): string {
  const title = normalizeTitle(event.title);
  if (!title) return `event:${event.appEventId}`;
  return `${title}:${localDateKey(event.start)}`;
}

function rankSharedDuplicate(event: CalendarEvent): number {
  let score = 0;
  if (event.createdBy === 'google-shared') score += 10;
  if (event.sharedGoogleCalendarId && event.googleEventId) score += 8;
  if (!event.allDay) score += 4;
  if (event.sourceGoogleEventId) score += 2;
  if (event.location) score += 1;
  return score;
}

function chooseSharedEvent(a: CalendarEvent, b: CalendarEvent): CalendarEvent {
  const rankA = rankSharedDuplicate(a);
  const rankB = rankSharedDuplicate(b);
  if (rankA !== rankB) return rankA > rankB ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

function isLikelySyncDuplicate(a: CalendarEvent, b: CalendarEvent): boolean {
  const sameTitleAndDay = fuzzySharedKey(a) === fuzzySharedKey(b);
  if (!sameTitleAndDay) return false;
  if (a.allDay || b.allDay) return true;
  if (a.sourceGoogleEventId && b.createdBy === 'google-shared') return true;
  if (b.sourceGoogleEventId && a.createdBy === 'google-shared') return true;
  return false;
}

export function dedupeSharedEvents(events: CalendarEvent[]): CalendarEvent[] {
  const byGoogle = new Map<string, CalendarEvent>();
  const googleless: CalendarEvent[] = [];

  for (const event of events) {
    const key = googleKey(event);
    if (!key) {
      googleless.push(event);
      continue;
    }
    byGoogle.set(key, byGoogle.has(key) ? chooseSharedEvent(byGoogle.get(key)!, event) : event);
  }

  const byFuzzy = new Map<string, CalendarEvent>();
  for (const event of [...byGoogle.values(), ...googleless]) {
    const key = fuzzySharedKey(event);
    const existing = byFuzzy.get(key);
    if (!existing) {
      byFuzzy.set(key, event);
    } else if (isLikelySyncDuplicate(existing, event)) {
      byFuzzy.set(key, chooseSharedEvent(existing, event));
    } else {
      byFuzzy.set(`${key}:${event.appEventId}`, event);
    }
  }

  return [...byFuzzy.values()].sort((a, b) => a.start.localeCompare(b.start));
}
