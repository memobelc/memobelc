import React, {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';

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

  const refreshNotifications = async () => {
    if (!userInfo?.token) return;

    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/notifications/list', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }),
        api.get('/notifications/unread_count', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        }),
      ]);

      setNotifications(listRes.data.notifications || []);
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (error) {
      console.error('Error loading notifications', error);
    }
  };

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

    // Atualiza otimisticamente no estado local
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
      // Em caso de erro, recarrega do servidor para não ficar inconsistente
      await refreshNotifications();
    }
  };

  useEffect(() => {
    if (!userInfo?.token) return;
    refreshNotifications();
  }, [userInfo?.token]);

  // Atualiza notificações quando um push chega ou o app volta para foreground (mobile)
  useEffect(() => {
    if (!userInfo?.token || Platform.OS === 'web') return;

    const notifSub = Notifications.addNotificationReceivedListener(() => {
      refreshNotifications();
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener(
      () => {
        refreshNotifications();
      },
    );

    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshNotifications();
      }
    });

    return () => {
      notifSub.remove();
      responseSub.remove();
      appStateSub.remove();
    };
  }, [userInfo?.token]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        refreshNotifications,
        markAllAsRead,
        markAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}


