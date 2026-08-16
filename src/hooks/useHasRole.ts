import { useEffect } from 'react';
import { useSession } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/profileContext';

export function getAssignedRoles(user?: {
  role?: string;
  roles?: string[];
} | null): string[] {
  if (user?.roles && user.roles.length > 0) {
    return user.roles;
  }
  return [user?.role || 'user'];
}

export function useHasRole() {
  const { userInfo } = useSession();
  const { activeRoleView, setActiveRoleView } = useProfile();

  const roles = getAssignedRoles(userInfo);
  const view = activeRoleView || 'all';
  const rolesKey = roles.join(',');

  useEffect(() => {
    if (!userInfo) return;
    const assigned = rolesKey.split(',').filter(Boolean);
    if (view !== 'all' && !assigned.includes(view)) {
      setActiveRoleView('all');
    }
  }, [userInfo, view, rolesKey, setActiveRoleView]);

  const hasRole = (role: string) => {
    if (!roles.includes(role)) return false;
    if (view === 'all') return true;
    return view === role;
  };

  return {
    hasRole,
    roles,
    activeRoleView: view,
    setActiveRoleView,
  };
}
