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
  if (!isLongDayEvent(event)) score += 4;
  if (event.sourceGoogleEventId) score += 2;
  if (event.location) score += 1;
  return score;
}

export function chooseSharedEvent(a: CalendarEvent, b: CalendarEvent): CalendarEvent {
  const rankA = rankSharedDuplicate(a);
  const rankB = rankSharedDuplicate(b);
  if (rankA !== rankB) return rankA > rankB ? a : b;
  return a.updatedAt >= b.updatedAt ? a : b;
}

function isLongDayEvent(event: CalendarEvent): boolean {
  if (event.allDay) return true;
  const durationMs = new Date(event.end).getTime() - new Date(event.start).getTime();
  return durationMs >= 20 * 60 * 60 * 1000;
}

function hasGoogleLineage(event: CalendarEvent): boolean {
  return Boolean(
    event.googleEventId ||
      event.sourceGoogleEventId ||
      event.sharedGoogleEventId ||
      event.googleCalendarId ||
      event.sourceGoogleCalendarId ||
      event.sharedGoogleCalendarId,
  );
}

export function isLikelySyncDuplicate(a: CalendarEvent, b: CalendarEvent): boolean {
  const sameTitleAndDay = fuzzySharedKey(a) === fuzzySharedKey(b);
  if (!sameTitleAndDay) return false;
  // 同じタイトル・同じ日で、両方とも Google 由来なら、取り込み経路違いの
  // 重複（サーバー同期 / ブラウザ同期 / コピー元→共有 など）とみなす。
  // ※アプリ内で手入力した予定（Google由来でない）は重複扱いしない＝両方残す。
  return hasGoogleLineage(a) && hasGoogleLineage(b);
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

export function hiddenSharedDuplicateIds(events: CalendarEvent[]): string[] {
  const hidden = new Set<string>();
  const byGoogle = new Map<string, CalendarEvent>();
  const googleless: CalendarEvent[] = [];

  for (const event of events) {
    const key = googleKey(event);
    if (!key) {
      googleless.push(event);
      continue;
    }
    const existing = byGoogle.get(key);
    if (!existing) {
      byGoogle.set(key, event);
      continue;
    }
    const keep = chooseSharedEvent(existing, event);
    hidden.add(keep.appEventId === existing.appEventId ? event.appEventId : existing.appEventId);
    byGoogle.set(key, keep);
  }

  const byFuzzy = new Map<string, CalendarEvent>();
  for (const event of [...byGoogle.values(), ...googleless]) {
    const key = fuzzySharedKey(event);
    const existing = byFuzzy.get(key);
    if (!existing) {
      byFuzzy.set(key, event);
    } else if (isLikelySyncDuplicate(existing, event)) {
      const keep = chooseSharedEvent(existing, event);
      hidden.add(keep.appEventId === existing.appEventId ? event.appEventId : existing.appEventId);
      byFuzzy.set(key, keep);
    } else {
      byFuzzy.set(`${key}:${event.appEventId}`, event);
    }
  }

  return [...hidden];
}
