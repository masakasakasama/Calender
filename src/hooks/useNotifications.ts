import { useEffect, useState, useCallback } from 'react';
import type { AppNotification } from '@/types';
import { services } from '@/services/container';

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(services.notifications.getPermission());

  useEffect(() => services.notifications.subscribe(setItems), []);

  const requestPermission = useCallback(async () => {
    const p = await services.notifications.requestPermission();
    setPermission(p);
    return p;
  }, []);

  const markAllRead = useCallback(async () => {
    await services.notifications.markAllRead();
  }, []);

  const unreadCount = items.filter((n) => !n.read).length;

  return { items, unreadCount, permission, requestPermission, markAllRead };
}
