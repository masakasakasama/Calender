import { useEffect } from 'react';
import type { CalendarEvent, User } from '@/types';
import { services } from '@/services/container';

// 共有Google同期(サーバー)が失敗している間、手動で入れられない特定の共有予定を
// アプリ内(Firestore)に1回だけ投入するための一時シード。
//  - 追加のみ。削除は絶対にしない。
//  - すでに存在する(削除済み含む)なら投入しない＝ユーザーが消したら復活しない。
//  - 端末ごとに一度だけ試行（localStorage ガード）。
//  - 同期が直ってGoogleから同じ予定が入っても、表示側 dedup で1つにまとまる。
// TODO: サーバー同期が復旧したら、このシードは削除してよい。
const SEEDS: CalendarEvent[] = [
  {
    appEventId: 'seed-tennis-20260711',
    title: 'テニス',
    description: '1時間3600円くらい',
    location: 'VIP Indoor Tennis School Toyocho（東陽町・ファミル東陽町5F）',
    start: '2026-07-11T12:30:00.000Z', // JST 21:30
    end: '2026-07-11T13:30:00.000Z', // JST 22:30
    allDay: false,
    reminderMinutes: null,
    color: null,
    emoji: '🎾',
    categoryId: 'other',
    mapsPlaceId: null,
    recurrence: null,
    recurrenceParentId: null,
    version: 1,
    calendarType: 'shared',
    createdBy: 'seed',
    updatedBy: 'seed',
    googleCalendarId: null,
    googleEventId: null,
    sourceGoogleCalendarId: null,
    sourceGoogleEventId: null,
    sharedGoogleCalendarId: null,
    sharedGoogleEventId: null,
    visibility: 'shared',
    syncStatus: 'synced',
    syncError: null,
    createdAt: '2026-07-07T03:24:38.000Z',
    updatedAt: '2026-07-07T03:24:38.000Z',
    deletedAt: null,
  },
];

export function useSeedEvents(user: User | null) {
  useEffect(() => {
    if (!user || services.backendName !== 'firebase') return;

    const trySeed = () => {
      for (const seed of SEEDS) {
        const flag = `seeded:${seed.appEventId}`;
        if (localStorage.getItem(flag)) continue; // この端末では投入済み
        if (services.eventsRepo.getById(seed.appEventId)) {
          // 既に存在（削除済み含む）→ 二度と投入しない
          localStorage.setItem(flag, '1');
          continue;
        }
        localStorage.setItem(flag, '1');
        void services.eventsRepo
          .upsert({ ...seed, createdBy: user.userId, updatedBy: user.userId })
          .catch(() => {});
      }
    };

    // Firestore の初期ロードを待ってから（既存doc判定のため）数回だけ。
    const timers = [2000, 6000].map((ms) => window.setTimeout(trySeed, ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [user?.userId]);
}
