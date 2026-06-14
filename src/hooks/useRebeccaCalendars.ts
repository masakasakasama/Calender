import { useEffect, useState, useCallback } from 'react';
import type { CalendarEvent, GoogleCalendarSummary, RebeccaCalendarSetting, ShareLink } from '@/types';
import { services } from '@/services/container';

const AUTO_ENABLE_KEY = 'rebecca_primary_calendar_auto_enabled';

// =====================================================================
// レベッカ画面用フック。彼氏ロールでは呼ばれない（UI/ルーティングで遮断）。
//   - 既存Googleカレンダー一覧（モック）
//   - 表示/同期対象の選択設定（rebecca_calendar_settings）
//   - 選択カレンダーの予定
//   - 共有/共有解除
// =====================================================================
export function useRebeccaCalendars(currentUserId: string | null) {
  const [calendars, setCalendars] = useState<GoogleCalendarSummary[]>([]);
  const [settings, setSettings] = useState<RebeccaCalendarSetting[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [shareLinks, setShareLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsConnect, setNeedsConnect] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [syncMode, setSyncMode] = useState<'live' | 'cached' | 'disconnected'>('disconnected');

  // Firebase バックエンドで未連携なら、自動でGoogleにアクセスしない
  // （= 何度もログインポップアップを出さない）。連携は connect() で1回だけ行う。
  const calendarReady = (): boolean =>
    services.auth.isGoogleCalendarConnected ? services.auth.isGoogleCalendarConnected() : true;

  const cachedSourceEvents = (ids: string[]) =>
    services.eventsRepo
      .getAll()
      .filter((e) => e.calendarType === 'rebecca_source' && ids.includes(e.sourceGoogleCalendarId ?? ''));

  // 既存カレンダー一覧を取得し、未登録のものを設定に同期。
  useEffect(() => {
    let active = true;
    (async () => {
      if (!calendarReady()) {
        const existing = services.settingsRepo.getRebeccaSettings();
        setSettings(existing);
        setCalendars(
          existing.map((s) => ({
            googleCalendarId: s.googleCalendarId,
            calendarName: s.calendarName,
            calendarColor: s.calendarColor,
            accessRole: s.accessRole,
          })),
        );
        const ids = existing.filter((s) => s.syncEnabled).map((s) => s.googleCalendarId);
        setEvents(cachedSourceEvents(ids));
        setSyncMode(existing.length > 0 ? 'cached' : 'disconnected');
        setNeedsConnect(false);
        setLoading(false);
        return;
      }
      try {
        setError(null);
        setNeedsConnect(false);
        const list = await services.calendar.listRebeccaCalendars();
        if (!active) return;
        setCalendars(list);
        // 初回テストで空に見えないよう、メインカレンダーだけ自動で表示/同期ONにする。
        const existing = services.settingsRepo.getRebeccaSettings();
        const autoEnableDone = localStorage.getItem(AUTO_ENABLE_KEY) === '1';
        const hasEnabledCalendar = existing.some((s) => s.syncEnabled || s.visibleInApp);
        const autoTarget =
          !autoEnableDone && !hasEnabledCalendar
            ? list.find((c) => c.primary) ?? list.find((c) => c.accessRole === 'owner') ?? list[0]
            : null;

        for (const c of list) {
          const current = existing.find((s) => s.googleCalendarId === c.googleCalendarId);
          const shouldAutoEnable = autoTarget?.googleCalendarId === c.googleCalendarId;

          if (!current) {
            const now = new Date().toISOString();
            await services.settingsRepo.upsertRebeccaSetting({
              userId: currentUserId ?? 'user-rebecca',
              googleCalendarId: c.googleCalendarId,
              calendarName: c.calendarName,
              calendarColor: c.calendarColor,
              accessRole: c.accessRole,
              visibleInApp: shouldAutoEnable,
              syncEnabled: shouldAutoEnable,
              lastSyncedAt: null,
              lastSyncStatus: null,
              lastSyncError: null,
              createdAt: now,
              updatedAt: now,
            });
          } else if (shouldAutoEnable) {
            await services.settingsRepo.upsertRebeccaSetting({
              ...current,
              visibleInApp: true,
              syncEnabled: true,
            });
          }
        }
        if (autoTarget) localStorage.setItem(AUTO_ENABLE_KEY, '1');
        setSyncMode('live');
      } catch (e) {
        if (active) {
          setNeedsConnect(false);
          setError(e instanceof Error ? e.message : 'Googleカレンダーを取得できませんでした');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUserId, refreshKey]);

  useEffect(() => services.settingsRepo.subscribeRebeccaSettings(setSettings), []);
  useEffect(() => services.shareLinksRepo.subscribe(setShareLinks), []);

  const syncIds = settings.filter((s) => s.syncEnabled).map((s) => s.googleCalendarId);
  const syncIdsKey = syncIds.join('\n');
  // 共有カレンダーへの自動同期は useGoogleSync（App全体）で実行する。

  // 同期対象カレンダーの予定を読み込む。
  // refreshKey を依存に含め、連携(connect)直後にも再取得する。
  useEffect(() => {
    const ids = syncIds;
    if (ids.length === 0) {
      setEvents([]);
      setSyncMode(calendarReady() ? 'live' : 'disconnected');
      return;
    }
    if (!calendarReady()) {
      setEvents(cachedSourceEvents(ids));
      setSyncMode('cached');
      return;
    }
    let active = true;
    services.calendar
      .listRebeccaEvents(ids)
      .then(async (evs) => {
        await Promise.all(
          evs.map((ev) =>
            services.eventsRepo.upsert({
              ...ev,
              updatedAt: new Date().toISOString(),
            }).catch(() => ev),
          ),
        );
        const syncedAt = new Date().toISOString();
        await Promise.all(
          settings
            .filter((s) => ids.includes(s.googleCalendarId))
            .map((s) =>
              services.settingsRepo.upsertRebeccaSetting({
                ...s,
                lastSyncedAt: syncedAt,
                lastSyncStatus: 'live',
                lastSyncError: null,
              }),
            ),
        );
        if (active) {
          setError(null);
          setSyncMode('live');
          setEvents(evs);
        }
      })
      .catch((e) => {
        const message = e instanceof Error ? e.message : 'Googleカレンダーの予定を取得できませんでした';
        void Promise.all(
          settings
            .filter((s) => ids.includes(s.googleCalendarId))
            .map((s) => services.settingsRepo.upsertRebeccaSetting({ ...s, lastSyncStatus: 'error', lastSyncError: message })),
        );
        if (active) {
          setSyncMode('cached');
          setEvents(cachedSourceEvents(ids));
          setError(message);
        }
      });
    return () => {
      active = false;
    };
  }, [syncIdsKey, refreshKey]);

  const toggleVisible = useCallback((s: RebeccaCalendarSetting, value: boolean) => {
    return services.settingsRepo.upsertRebeccaSetting({ ...s, visibleInApp: value });
  }, []);

  const toggleSync = useCallback((s: RebeccaCalendarSetting, value: boolean) => {
    // 同期OFFなら表示もOFFに揃える（取得しない情報は見せない）。
    return services.settingsRepo.upsertRebeccaSetting({
      ...s,
      syncEnabled: value,
      visibleInApp: value ? s.visibleInApp : false,
    });
  }, []);

  const isShared = useCallback(
    (ev: CalendarEvent) =>
      shareLinks.some((l) => l.sourceGoogleEventId === (ev.sourceGoogleEventId ?? ev.appEventId) && l.status === 'active'),
    [shareLinks],
  );

  const shareEvent = useCallback(
    async (ev: CalendarEvent) => {
      setError(null);
      try {
        const sharedCalendarId = services.settingsRepo.getAppConfig().sharedCalendarId;
        if (!sharedCalendarId) {
          await services.calendar.ensureSharedCalendar().then((id) => services.settingsRepo.setSharedCalendarId(id));
        }
        const id = services.settingsRepo.getAppConfig().sharedCalendarId;
        if (!id) {
          setError('共有カレンダーが未設定です。設定画面を確認してください。');
          return;
        }
        await services.share.shareEvent({ sharedCalendarId: id, source: ev, byUserId: currentUserId ?? 'user-rebecca' });
      } catch (e) {
        setError(e instanceof Error ? e.message : '共有に失敗しました');
      }
    },
    [currentUserId],
  );

  const unshareEvent = useCallback(async (ev: CalendarEvent) => {
    setError(null);
    try {
      await services.share.unshareEvent(ev.sourceGoogleEventId ?? ev.appEventId);
    } catch (e) {
      setError(e instanceof Error ? e.message : '共有解除に失敗しました');
    }
  }, []);

  // ユーザー操作で1回だけGoogleカレンダー連携。成功したら再読み込み。
  const connect = useCallback(async () => {
    setError(null);
    try {
      const ok = (await services.auth.connectGoogleCalendar?.()) ?? false;
      if (ok) {
        setNeedsConnect(false);
        setLoading(true);
        setRefreshKey((k) => k + 1);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Googleカレンダー連携に失敗しました');
    }
  }, []);

  // 表示対象（visibleInApp=true）カレンダーの予定だけ画面に出す。
  const visibleIds = new Set(settings.filter((s) => s.visibleInApp).map((s) => s.googleCalendarId));
  const visibleEvents = events.filter((e) => visibleIds.has(e.sourceGoogleCalendarId ?? ''));

  return {
    calendars,
    settings,
    events: visibleEvents,
    syncMode,
    loading,
    error,
    needsConnect,
    connect,
    toggleVisible,
    toggleSync,
    isShared,
    shareEvent,
    unshareEvent,
  };
}
