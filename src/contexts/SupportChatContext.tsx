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
  focusTicketId: string | null;
  openChat: (ticketId?: string) => void;
  closeChat: () => void;
  clearFocusTicketId: () => void;
  refreshUnread: () => Promise<void>;
};

const SupportChatContext = createContext<SupportChatContextType>({
  isOpen: false,
  unreadCount: 0,
  focusTicketId: null,
  openChat: () => {},
  closeChat: () => {},
  clearFocusTicketId: () => {},
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
  const [focusTicketId, setFocusTicketId] = useState<string | null>(null);

  const refreshUnread = useCallback(async () => {
    if (!userInfo?.token || isAdmin) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await supportApi.listTickets(userInfo.token);
      setUnreadCount(response.data.unread_total || 0);
    } catch {
      // keep last known count
    }
  }, [userInfo?.token, isAdmin]);

  useEffect(() => {
    refreshUnread();
  }, [refreshUnread]);

  const openChat = useCallback((ticketId?: string) => {
    setFocusTicketId(ticketId || null);
    setIsOpen(true);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setFocusTicketId(null);
    refreshUnread();
  }, [refreshUnread]);

  const clearFocusTicketId = useCallback(() => {
    setFocusTicketId(null);
  }, []);

  return (
    <SupportChatContext.Provider
      value={{
        isOpen,
        unreadCount,
        focusTicketId,
        openChat,
        closeChat,
        clearFocusTicketId,
        refreshUnread,
      }}
    >
      {children}
    </SupportChatContext.Provider>
  );
}
