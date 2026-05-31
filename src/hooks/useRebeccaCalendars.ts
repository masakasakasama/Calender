import { useEffect, useState, useCallback } from 'react';
import type { CalendarEvent, GoogleCalendarSummary, RebeccaCalendarSetting, ShareLink } from '@/types';
import { services } from '@/services/container';

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

  // 既存カレンダー一覧を取得し、未登録のものを設定に同期。
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setError(null);
        const list = await services.calendar.listRebeccaCalendars();
        if (!active) return;
        setCalendars(list);
        // 初回: 設定が無いカレンダーはデフォルト(visible=false, sync=false)で作る。
        const existing = services.settingsRepo.getRebeccaSettings();
        for (const c of list) {
          if (!existing.some((s) => s.googleCalendarId === c.googleCalendarId)) {
            const now = new Date().toISOString();
            await services.settingsRepo.upsertRebeccaSetting({
              userId: currentUserId ?? 'user-rebecca',
              googleCalendarId: c.googleCalendarId,
              calendarName: c.calendarName,
              calendarColor: c.calendarColor,
              accessRole: c.accessRole,
              visibleInApp: false,
              syncEnabled: false,
              createdAt: now,
              updatedAt: now,
            });
          }
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Googleカレンダーを取得できませんでした');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [currentUserId]);

  useEffect(() => services.settingsRepo.subscribeRebeccaSettings(setSettings), []);
  useEffect(() => services.shareLinksRepo.subscribe(setShareLinks), []);

  // 同期対象カレンダーの予定を読み込む。
  useEffect(() => {
    const ids = settings.filter((s) => s.syncEnabled).map((s) => s.googleCalendarId);
    if (ids.length === 0) {
      setEvents([]);
      return;
    }
    let active = true;
    services.calendar
      .listRebeccaEvents(ids)
      .then((evs) => {
        if (active) {
          setError(null);
          setEvents(evs);
        }
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : 'Googleカレンダーの予定を取得できませんでした');
      });
    return () => {
      active = false;
    };
  }, [settings]);

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
      const sharedCalendarId = services.settingsRepo.getAppConfig().sharedCalendarId;
      if (!sharedCalendarId) return;
      await services.share.shareEvent({ sharedCalendarId, source: ev, byUserId: currentUserId ?? 'user-rebecca' });
    },
    [currentUserId],
  );

  const unshareEvent = useCallback(async (ev: CalendarEvent) => {
    await services.share.unshareEvent(ev.sourceGoogleEventId ?? ev.appEventId);
  }, []);

  // 表示対象（visibleInApp=true）カレンダーの予定だけ画面に出す。
  const visibleIds = new Set(settings.filter((s) => s.visibleInApp).map((s) => s.googleCalendarId));
  const visibleEvents = events.filter((e) => visibleIds.has(e.sourceGoogleCalendarId ?? ''));

  return {
    calendars,
    settings,
    events: visibleEvents,
    loading,
    error,
    toggleVisible,
    toggleSync,
    isShared,
    shareEvent,
    unshareEvent,
  };
}
