import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { Notifications } from '@/utils/loadExpoNotifications';
import { ensureNotificationPermission, presentLocalNotification } from '@/utils/notifications';

import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';

const POLL_MS = 2000;

type NotificationItem = {
  _id: string;
  type: string;
  data: {
    title?: string;
    body?: string;
    [key: string]: any;
  };
  created_at: string;
  is_read: boolean;
};

type NotificationContextType = {
  notifications: NotificationItem[];
  unreadCount: number;
  refreshNotifications: () => Promise<void>;
  markAllAsRead: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType>({
  notifications: [],
  unreadCount: 0,
  refreshNotifications: async () => {},
  markAllAsRead: async () => {},
  markAsRead: async () => {},
});

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }: PropsWithChildren) {
  const { userInfo } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const seenIdsRef = useRef<Set<string> | null>(null);

  const refreshNotifications = useCallback(async () => {
    if (!userInfo?.token) return;

    try {
      const authHeaders = { Authorization: `Bearer ${userInfo.token}` };
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications/list', { headers: authHeaders }),
        api.get('/notifications/unread_count', { headers: authHeaders }),
      ]);

      const list: NotificationItem[] = listRes.data.notifications || [];
      const unread = countRes.data.unread_count || 0;
      setNotifications(list);
      setUnreadCount(unread);

      const incomingIds = list.map((item) => item._id);
      if (seenIdsRef.current === null) {
        seenIdsRef.current = new Set(incomingIds);
      } else {
        const newUnread = list.filter(
          (item) => !item.is_read && !seenIdsRef.current!.has(item._id),
        );
        incomingIds.forEach((id) => seenIdsRef.current!.add(id));
        if (newUnread.length > 0) {
          const latest = newUnread[0];
          await presentLocalNotification(latest.data?.title, latest.data?.body);
        }
      }
    } catch (error) {
      console.error('Error loading notifications', error);
    }
  }, [userInfo?.token]);

  const markAllAsRead = async () => {
    if (!userInfo?.token) return;
    try {
      await api.post(
        '/notifications/mark_as_read',
        { mark_all: true },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        },
      );
      await refreshNotifications();
    } catch (error) {
      console.error('Error marking notifications as read', error);
    }
  };

  const markAsRead = async (id: string) => {
    if (!userInfo?.token) return;

    setNotifications((prev) =>
      prev.map((n) =>
        n._id === id
          ? {
              ...n,
              is_read: true,
            }
          : n,
      ),
    );
    setUnreadCount((prev) => (prev > 0 ? prev - 1 : 0));

    try {
      await api.post(
        '/notifications/mark_as_read',
        { notification_id: id },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        },
      );
    } catch (error) {
      console.error('Error marking notification as read', error);
      await refreshNotifications();
    }
  };

  useEffect(() => {
    if (!userInfo?.token) {
      seenIdsRef.current = null;
      return;
    }
    ensureNotificationPermission().catch(() => {});
    refreshNotifications();
    const timer = setInterval(() => {
      refreshNotifications();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [userInfo?.token, refreshNotifications]);

  useEffect(() => {
    if (!userInfo?.token) return;

    let notifSub: { remove: () => void } | undefined;
    let responseSub: { remove: () => void } | undefined;

    if (Platform.OS !== 'web' && Notifications) {
      notifSub = Notifications.addNotificationReceivedListener(() => {
        refreshNotifications();
      });
      responseSub = Notifications.addNotificationResponseReceivedListener(() => {
        refreshNotifications();
      });
    }

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshNotifications();
      }
    });

    return () => {
      notifSub?.remove();
      responseSub?.remove();
      appStateSub.remove();
    };
  }, [userInfo?.token, refreshNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications: () => refreshNotifications(),
        markAllAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
