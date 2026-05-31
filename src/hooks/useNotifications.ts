import { useEffect, useState, useCallback } from 'react';
import type { AppNotification, UserRole } from '@/types';
import { services } from '@/services/container';

export function useNotifications(role: UserRole | null) {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [permission, setPermission] = useState<NotificationPermission>(services.notifications.getPermission());

  useEffect(() => {
    if (!role) return;
    return services.notifications.subscribe(role, setItems);
  }, [role]);

  const requestPermission = useCallback(async () => {
    const p = await services.notifications.requestPermission();
    setPermission(p);
    return p;
  }, []);

  const markAllRead = useCallback(async () => {
    if (role) await services.notifications.markAllRead(role);
  }, [role]);

  const unreadCount = items.filter((n) => !n.read).length;

  return { items, unreadCount, permission, requestPermission, markAllRead };
}
