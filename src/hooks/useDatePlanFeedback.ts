import { useCallback, useEffect, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import type { User } from '@/types';
import type { WeekendResearchItem } from '@/hooks/useWeekendResearch';
import { localStore } from '@/repositories/db/LocalStore';
import { services } from '@/services/container';
import { firebaseDb } from '@/services/firebase/firebaseApp';

export type DatePlanPreference = 'like' | 'dislike';

export interface DatePlanFeedback {
  id: string;
  userId: string;
  userRole: User['role'];
  itemId: string;
  preference: DatePlanPreference;
  title: string;
  area: string;
  locationName: string;
  categoryId: string;
  tags: string[];
  dateLabel: string;
  sourceUrl: string;
  updatedAt: string;
  createdAt: string;
}

const COL = 'date_plan_feedback';
const LOCAL_KEY = 'date_plan_feedback';

function feedbackId(userId: string, itemId: string): string {
  return `${userId}_${itemId}`.replace(/[/?#[\]]/g, '_');
}

function toFeedback(user: User, item: WeekendResearchItem, preference: DatePlanPreference, previous?: DatePlanFeedback): DatePlanFeedback {
  const now = new Date().toISOString();
  return {
    id: feedbackId(user.userId, item.id),
    userId: user.userId,
    userRole: user.role,
    itemId: item.id,
    preference,
    title: item.title,
    area: item.area,
    locationName: item.locationName,
    categoryId: item.categoryId,
    tags: item.tags,
    dateLabel: item.dateLabel,
    sourceUrl: item.url,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}

export function useDatePlanFeedback(user: User | null) {
  const [feedbackByItemId, setFeedbackByItemId] = useState<Record<string, DatePlanFeedback>>({});

  useEffect(() => {
    if (!user) {
      setFeedbackByItemId({});
      return;
    }

    if (services.backendName === 'firebase') {
      const q = query(collection(firebaseDb(), COL), where('userId', '==', user.userId));
      return onSnapshot(q, (snap) => {
        const next: Record<string, DatePlanFeedback> = {};
        snap.docs.forEach((row) => {
          const feedback = row.data() as DatePlanFeedback;
          next[feedback.itemId] = feedback;
        });
        setFeedbackByItemId(next);
      });
    }

    return localStore.subscribe<DatePlanFeedback[]>(LOCAL_KEY, [], (rows) => {
      const next: Record<string, DatePlanFeedback> = {};
      rows.filter((row) => row.userId === user.userId).forEach((row) => {
        next[row.itemId] = row;
      });
      setFeedbackByItemId(next);
    });
  }, [user]);

  const setPreference = useCallback(
    async (item: WeekendResearchItem, preference: DatePlanPreference) => {
      if (!user) return;
      const previous = feedbackByItemId[item.id];
      const next = toFeedback(user, item, preference, previous);

      setFeedbackByItemId((current) => ({ ...current, [item.id]: next }));

      if (services.backendName === 'firebase') {
        await setDoc(doc(firebaseDb(), COL, next.id), next, { merge: true });
        return;
      }

      const rows = localStore.get<DatePlanFeedback[]>(LOCAL_KEY, []);
      localStore.set(LOCAL_KEY, [...rows.filter((row) => row.id !== next.id), next]);
    },
    [feedbackByItemId, user],
  );

  return { feedbackByItemId, setPreference };
}
