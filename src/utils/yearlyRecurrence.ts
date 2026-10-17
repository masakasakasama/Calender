import type { CalendarEvent } from '@/types';

/** Keep February 29 birthdays in February in non-leap years. */
export function inYear(iso: string, year: number): string {
  const date = new Date(iso);
  const month = date.getMonth();
  date.setFullYear(year);
  if (date.getMonth() !== month) date.setDate(0);
  return date.toISOString();
}

/** Expand only the visible years; never create or delete stored documents. */
export function expandYearlyEvents(events: CalendarEvent[], fromYear: number, toYear: number): CalendarEvent[] {
  const result: CalendarEvent[] = [];
  const series = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    if (event.deletedAt) continue;
    if (event.recurrence?.frequency !== 'yearly') {
      result.push(event);
      continue;
    }
    const key = event.recurrenceParentId ?? event.appEventId;
    const members = series.get(key) ?? [];
    members.push(event);
    series.set(key, members);
  }
  for (const members of series.values()) {
    members.sort((a, b) => a.start.localeCompare(b.start));
    const anchor = members[0];
    const anchorYear = new Date(anchor.start).getFullYear();
    for (let year = Math.max(fromYear, anchorYear); year <= toYear; year++) {
      const source = members.find((event) => new Date(event.start).getFullYear() === year) ?? anchor;
      const start = inYear(source.start, year);
      const duration = new Date(source.end).getTime() - new Date(source.start).getTime();
      // Occurrences keep their stored source ID for editing/deleting the series,
      // but Google keys must differ by year or display deduplication hides them.
      const occurrenceId = (id: string | null) => id ? `${id}:yearly:${year}` : null;
      result.push({
        ...source,
        start,
        end: new Date(new Date(start).getTime() + duration).toISOString(),
        googleEventId: occurrenceId(source.googleEventId),
        sourceGoogleEventId: occurrenceId(source.sourceGoogleEventId),
        sharedGoogleEventId: occurrenceId(source.sharedGoogleEventId),
      });
    }
  }
  return result;
}
