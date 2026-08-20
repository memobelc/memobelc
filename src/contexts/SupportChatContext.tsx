import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { supportApi } from '@/services/support';

type SupportChatContextType = {
  isOpen: boolean;
  unreadCount: number;
  openChat: () => void;
  closeChat: () => void;
  refreshUnread: () => Promise<void>;
};

const SupportChatContext = createContext<SupportChatContextType>({
  isOpen: false,
  unreadCount: 0,
  openChat: () => {},
  closeChat: () => {},
  refreshUnread: async () => {},
});

export function useSupportChat() {
  return useContext(SupportChatContext);
}

export function SupportChatProvider({ children }: PropsWithChildren) {
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const isAdmin = roles.includes('admin');
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!userInfo?.token || isAdmin) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await supportApi.getConversation(userInfo.token);
      setUnreadCount(response.data.ticket?.unread_for_user || 0);
    } catch {
      // keep last known count
    }
  }, [userInfo?.token, isAdmin]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  const openChat = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    refreshUnread();
  }, [refreshUnread]);

  return (
    <SupportChatContext.Provider
      value={{ isOpen, unreadCount, openChat, closeChat, refreshUnread }}
    >
      {children}
    </SupportChatContext.Provider>
  );
}
