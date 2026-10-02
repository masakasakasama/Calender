import { useEffect } from 'react';
import { httpsCallable } from 'firebase/functions';
import { APP_CONFIG } from '@/config/appConfig';
import { services } from '@/services/container';
import { firebaseFunctions } from '@/services/firebase/firebaseApp';
import type { User } from '@/types';
import {
  markSharedGoogleSyncError,
  markSharedGoogleSyncOk,
  markSharedGoogleSyncStarted,
  SHARED_GOOGLE_SYNC_REQUEST_EVENT,
  type SharedGoogleSyncResult,
} from '@/utils/sharedGoogleSyncStatus';

function googleSharedCalId(): string | null {
  return services.settingsRepo.getAppConfig().googleSharedCalendarId ?? APP_CONFIG.googleSharedCalendarId ?? null;
}

export function useGoogleSharedCalendarSync(user: User | null) {
  useEffect(() => {
    if (!user || services.backendName !== 'firebase') return;

    let running = false;
    const run = async () => {
      if (running) return;
      const googleCalendarId = googleSharedCalId();
      if (!googleCalendarId) return;

      running = true;
      markSharedGoogleSyncStarted(googleCalendarId);
      try {
        const result = await httpsCallable<unknown, SharedGoogleSyncResult>(firebaseFunctions(), 'syncSharedGoogleCalendar')({});
        markSharedGoogleSyncOk(result.data);
      } catch (error) {
        markSharedGoogleSyncError(error);
        // The server is the only Google import writer. Keep the last Firestore
        // snapshot on failure; retry on the next timer/visibility/online trigger.
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
    window.addEventListener(SHARED_GOOGLE_SYNC_REQUEST_EVENT, onConnected);
    return () => {
      window.clearInterval(iv);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('online', onConnected);
      window.removeEventListener('gcal-connected', onConnected);
      window.removeEventListener(SHARED_GOOGLE_SYNC_REQUEST_EVENT, onConnected);
    };
  }, [user]);
}
