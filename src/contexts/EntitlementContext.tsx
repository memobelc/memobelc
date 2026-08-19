import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { billingApi } from '@/services/billing';
import { useSession } from '@/contexts/AuthContext';

export type ServiceAction = 'allow' | 'hide' | 'disabled' | 'disabled_upgrade' | 'redirect_plans';

export type Entitlements = {
  is_subscriber: boolean;
  has_manual_access: boolean;
  status?: string | null;
  status_code?: string | null;
  subscription?: any;
  plan?: any;
  entitlements?: any[];
  book_ids?: string[];
  services: Record<string, { action: ServiceAction; configured?: ServiceAction; code: string }>;
};

const EntitlementContext = createContext<{
  entitlements: Entitlements | null;
  loading: boolean;
  refresh: () => Promise<void>;
  serviceAction: (key: string) => ServiceAction;
  configuredAction: (key: string) => ServiceAction;
}>({
  entitlements: null,
  loading: false,
  refresh: async () => undefined,
  serviceAction: () => 'allow',
  configuredAction: () => 'allow',
});

export function EntitlementProvider({ children }: PropsWithChildren) {
  const { userInfo } = useSession();
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userInfo?.token) {
      setEntitlements(null);
      return;
    }
    try {
      setLoading(true);
      const response = await billingApi.entitlements(userInfo.token);
      setEntitlements(response.data);
    } catch {
      setEntitlements(null);
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const normalize = (action?: string): ServiceAction =>
    action === 'redirect_plans' ? 'disabled_upgrade' : ((action || 'allow') as ServiceAction);

  const serviceAction = (key: string): ServiceAction =>
    normalize(entitlements?.services?.[key]?.action);

  const configuredAction = (key: string): ServiceAction =>
    normalize(entitlements?.services?.[key]?.configured || entitlements?.services?.[key]?.action);

  return (
    <EntitlementContext.Provider value={{ entitlements, loading, refresh, serviceAction, configuredAction }}>
      {children}
    </EntitlementContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementContext);
}
