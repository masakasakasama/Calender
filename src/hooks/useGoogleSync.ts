import { useEffect } from 'react';
import type { RebeccaCalendarSetting, User } from '@/types';
import { services } from '@/services/container';

const PARTNER_SHARED_GOOGLE_CALENDAR_NAME = '共有のカレンダー';

function settingsForUser(settings: RebeccaCalendarSetting[], userId: string): RebeccaCalendarSetting[] {
  return settings.filter((setting) => setting.userId === userId);
}

function sourceKey(calendarId: string | null | undefined, eventId: string | null | undefined): string | null {
  return calendarId && eventId ? `${calendarId}:${eventId}` : null;
}

async function ensureUserCalendarSettings(user: User): Promise<RebeccaCalendarSetting[]> {
  const existing = settingsForUser(services.settingsRepo.getRebeccaSettings(), user.userId);
  const calendars = await services.calendar.listRebeccaCalendars();
  const autoTarget = calendars.find((calendar) => calendar.calendarName.trim() === PARTNER_SHARED_GOOGLE_CALENDAR_NAME);

  const now = new Date().toISOString();
  for (const calendar of calendars) {
    const current = existing.find((setting) => setting.googleCalendarId === calendar.googleCalendarId);
    const shouldEnable = calendar.googleCalendarId === autoTarget?.googleCalendarId;
    await services.settingsRepo.upsertRebeccaSetting({
      userId: user.userId,
      googleCalendarId: calendar.googleCalendarId,
      calendarName: calendar.calendarName,
      calendarColor: calendar.calendarColor,
      accessRole: calendar.accessRole,
      visibleInApp: shouldEnable,
      syncEnabled: shouldEnable,
      lastSyncedAt: current?.lastSyncedAt ?? null,
      lastSyncStatus: current?.lastSyncStatus ?? null,
      lastSyncError: current?.lastSyncError ?? null,
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
  }
  return settingsForUser(services.settingsRepo.getRebeccaSettings(), user.userId);
}

async function markSyncResult(settings: RebeccaCalendarSetting[], status: 'live' | 'error', error: string | null = null) {
  const syncedAt = new Date().toISOString();
  await Promise.all(
    settings.map((setting) =>
      services.settingsRepo.upsertRebeccaSetting({
        ...setting,
        lastSyncedAt: status === 'live' ? syncedAt : setting.lastSyncedAt,
        lastSyncStatus: status,
        lastSyncError: error,
      }),
    ),
  );
}

// Partner Google Calendar -> shared calendar sync.
// Rebecca does not need Google Calendar access for the partner's events to appear.
export function useGoogleSync(user: User | null) {
  useEffect(() => {
    if (!user || user.role !== 'partner' || services.backendName !== 'firebase') return;

    let running = false;
    const run = async () => {
      if (running) return;
      if (!(services.auth.isGoogleCalendarConnected?.() ?? false)) return;
      let sharedCalendarId = services.settingsRepo.getAppConfig().sharedCalendarId;
      if (!sharedCalendarId) {
        sharedCalendarId = await services.calendar.ensureSharedCalendar();
        await services.settingsRepo.setSharedCalendarId(sharedCalendarId);
      }
      if (!sharedCalendarId) return;

      running = true;
      let syncSettings: RebeccaCalendarSetting[] = [];
      try {
        syncSettings = await ensureUserCalendarSettings(user);
        const enabledSettings = syncSettings.filter((setting) => setting.syncEnabled);
        const ids = enabledSettings.map((setting) => setting.googleCalendarId);
        if (ids.length === 0) return;

        const events = await services.calendar.listRebeccaEvents(ids);
        await markSyncResult(enabledSettings, 'live');

        const allLinks = services.shareLinksRepo.getAll();
        const sourceKeys = new Set(
          events
            .map((event) => sourceKey(event.sourceGoogleCalendarId, event.sourceGoogleEventId ?? event.appEventId))
            .filter((key): key is string => Boolean(key)),
        );

        for (const link of allLinks) {
          if (link.status !== 'active') continue;
          if (link.sharedBy !== user.userId) continue;
          if (!ids.includes(link.sourceGoogleCalendarId)) {
            await services.eventsRepo.softDelete(link.sharedGoogleEventId, user.userId).catch(() => {});
            await services.shareLinksRepo.markRemoved(link.id).catch(() => {});
            continue;
          }
          const linkKey = sourceKey(link.sourceGoogleCalendarId, link.sourceGoogleEventId);
          if (linkKey && sourceKeys.has(linkKey)) continue;
          await services.eventsRepo.softDelete(link.sharedGoogleEventId, user.userId).catch(() => {});
          await services.shareLinksRepo.markRemoved(link.id).catch(() => {});
        }

        for (const event of events) {
          const saved = await services.eventsRepo.upsert({ ...event, updatedAt: new Date().toISOString() }).catch(() => event);
          const eventKey = sourceKey(saved.sourceGoogleCalendarId, saved.sourceGoogleEventId ?? saved.appEventId);
          const link = allLinks.find(
            (candidate) =>
              candidate.status === 'active' &&
              candidate.sharedBy === user.userId &&
              eventKey === sourceKey(candidate.sourceGoogleCalendarId, candidate.sourceGoogleEventId),
          );
          if (!link) {
            await services.share.shareEvent({ sharedCalendarId, source: saved, byUserId: user.userId, silent: true });
          } else {
            const copy = services.eventsRepo.getById(link.sharedGoogleEventId);
            if (
              copy &&
              (copy.title !== saved.title ||
                copy.description !== saved.description ||
                copy.location !== saved.location ||
                copy.start !== saved.start ||
                copy.end !== saved.end ||
                copy.color !== saved.color ||
                copy.emoji !== saved.emoji)
            ) {
              await services.share.refreshShared({ sharedCalendarId, source: saved, byUserId: user.userId });
            }
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (syncSettings.length > 0) await markSyncResult(syncSettings, 'error', message).catch(() => {});
      } finally {
        running = false;
      }
    };

    void run();
    const iv = window.setInterval(run, 2 * 60 * 1000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void run();
    };
    const onConnected = () => void run();
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('online', onConnected);
    window.addEventListener('gcal-connected', onConnected);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onConnected);
      window.removeEventListener('gcal-connected', onConnected);
    };
  }, [user]);
}
