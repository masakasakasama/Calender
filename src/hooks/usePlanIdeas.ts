import { useEffect, useState, useCallback } from 'react';
import type { CalendarEvent } from '@/types';
import { services } from '@/services/container';
import { newId } from '@/utils/id';

// 日付を決めずに保存する「デートプラン帳」。
// events コレクションに calendarType='plan_idea' として保存し、2人で共有する
// （カレンダーには出ない。プランタブだけに表示）。
export interface PlanMemoInput {
  title: string;
  location: string;
  description: string;
}

export function usePlanIdeas(currentUserId: string | null) {
  const [ideas, setIdeas] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    return services.eventsRepo.subscribe((all) => {
      setIdeas(
        all
          .filter((e) => e.calendarType === 'plan_idea')
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
      );
    });
  }, []);

  const addIdea = useCallback(
    async (input: PlanMemoInput) => {
      const now = new Date().toISOString();
      const uid = currentUserId ?? 'unknown';
      const ev: CalendarEvent = {
        appEventId: newId('plan'),
        title: input.title.trim() || 'やりたいこと',
        description: input.description,
        location: input.location,
        start: now,
        end: now,
        reminderMinutes: null,
        color: null,
        emoji: '💡',
        categoryId: 'date',
        mapsPlaceId: null,
        recurrence: null,
        recurrenceParentId: null,
        version: 1,
        calendarType: 'plan_idea',
        createdBy: uid,
        updatedBy: uid,
        googleCalendarId: null,
        googleEventId: null,
        sourceGoogleCalendarId: null,
        sourceGoogleEventId: null,
        sharedGoogleCalendarId: null,
        sharedGoogleEventId: null,
        visibility: 'shared',
        syncStatus: 'synced',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      };
      await services.eventsRepo.upsert(ev);
    },
    [currentUserId],
  );

  const updateIdea = useCallback(
    async (idea: CalendarEvent, input: PlanMemoInput) => {
      const now = new Date().toISOString();
      await services.eventsRepo.upsert({
        ...idea,
        title: input.title.trim() || 'やりたいこと',
        location: input.location,
        description: input.description,
        updatedBy: currentUserId ?? 'unknown',
        updatedAt: now,
        version: (idea.version ?? 1) + 1,
      });
    },
    [currentUserId],
  );

  const removeIdea = useCallback(async (appEventId: string) => {
    await services.eventsRepo.softDelete(appEventId, currentUserId ?? 'unknown');
  }, [currentUserId]);

  return { ideas, addIdea, updateIdea, removeIdea };
}
