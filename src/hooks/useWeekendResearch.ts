import { useEffect, useState } from 'react';
import type { EventFormValue } from '@/components/calendar/EventModal';

export interface WeekendResearchItem {
  id: string;
  title: string;
  emoji: string;
  categoryId: string;
  dateLabel: string;
  start: string;
  end: string;
  area: string;
  locationName: string;
  nearestStation: string;
  price: string;
  reservation: string;
  rainFriendly: boolean;
  tags: string[];
  summary: string;
  coupleNote: string;
  sourceName: string;
  url: string;
}

export interface WeekendResearch {
  generatedAt: string;
  generatedBy: string;
  area: string;
  targetWeekend: {
    start: string;
    end: string;
    label: string;
  };
  summary: string;
  items: WeekendResearchItem[];
}

export function researchItemToInitial(item: WeekendResearchItem): Partial<EventFormValue> {
  return {
    title: item.title,
    description: `${item.summary}\n\n${item.coupleNote}\n\n料金: ${item.price}\n予約: ${item.reservation}\n出典: ${item.sourceName}\n${item.url}`,
    location: item.locationName,
    start: new Date(item.start).toISOString(),
    end: new Date(item.end).toISOString(),
    reminderMinutes: 60,
    color: null,
    emoji: item.emoji,
    categoryId: item.categoryId,
    mapsPlaceId: null,
    recurrence: { frequency: 'none', count: 1 },
    visibility: 'shared',
  };
}

export function useWeekendResearch() {
  const [data, setData] = useState<WeekendResearch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const base = import.meta.env.BASE_URL ?? '/';
    fetch(`${base}research/weekend-latest.json?ts=${Date.now()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`research ${res.status}`);
        return res.json() as Promise<WeekendResearch>;
      })
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
