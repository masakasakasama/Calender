import type { CalendarEvent } from '@/types';

const TOMBSTONES = [
  {
    titleIncludes: ['どこかにビュー', 'どこかにビュ'],
    from: '2026-06-27',
    to: '2026-06-29',
  },
];

function tokyoDateKey(iso: string): string {
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(iso));
  return `${parts.find((p) => p.type === 'year')?.value}-${parts.find((p) => p.type === 'month')?.value}-${parts.find((p) => p.type === 'day')?.value}`;
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

function overlapsDateRange(event: CalendarEvent, from: string, to: string): boolean {
  const start = tokyoDateKey(event.start);
  const end = tokyoDateKey(event.end);
  return start < to && end >= from;
}

export function deletedGoogleTombstoneIds(events: CalendarEvent[]): string[] {
  return events
    .filter((event) => {
      if (event.calendarType !== 'shared') return false;
      if (!hasGoogleLineage(event)) return false;
      return TOMBSTONES.some(
        (stone) =>
          stone.titleIncludes.some((needle) => event.title.includes(needle)) &&
          overlapsDateRange(event, stone.from, stone.to),
      );
    })
    .map((event) => event.appEventId);
}
