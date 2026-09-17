import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';

type AdminUser = {
  _id: string;
  name?: string;
  email?: string;
  cpf_cnpj?: string | null;
  role?: string;
  roles: string[];
  coins?: number;
};

function roleLabel(role: string, t: (key: string) => string) {
  if (role === 'super_admin') return t('Super admin');
  if (role === 'admin') return t('Admin');
  if (role === 'teacher') return t('Teacher');
  if (role === 'affiliate') return t('Affiliate');
  return t('User');
}

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo, refresh_token } = useSession();
  const { roles: assignedRoles } = useHasRole();
  const { toast } = useToast();

  const isAssignedAdmin = assignedRoles.includes('admin');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, string[]>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadUsers = useCallback(
    async (query?: string) => {
      if (!userInfo?.token) return;
      try {
        setLoading(true);
        const response = await api.get('/admin/users', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
          params: query ? { search: query } : undefined,
        });
        setUsers(response.data.users || []);
      } catch (error: any) {
        toast({
          message: error.response?.data?.error || t('Error loading users'),
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    },
    [userInfo?.token, t],
  );

  useEffect(() => {
    if (userInfo && !isAssignedAdmin) {
      router.replace('/');
    }
  }, [userInfo, isAssignedAdmin, router]);

  useEffect(() => {
    if (!userInfo?.token || !isAssignedAdmin) return;
    const timeout = setTimeout(() => {
      loadUsers(search.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, userInfo?.token, isAssignedAdmin, loadUsers]);

  const toggleExpand = (user: AdminUser) => {
    if (expandedId === user._id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(user._id);
    setDraftRoles((prev) => ({
      ...prev,
      [user._id]: user.roles?.length ? [...user.roles] : ['user'],
    }));
  };

  const toggleDraftRole = (userId: string, role: 'admin' | 'super_admin' | 'teacher' | 'affiliate') => {
    setDraftRoles((prev) => {
      const current = prev[userId] || [];
      const hasRole = current.includes(role);
      let next = hasRole
        ? current.filter((item) => item !== role)
        : role === 'affiliate'
          ? [...current, role]
          : [...current.filter((item) => item !== 'user'), role];
      if (next.length === 0) {
        next = ['user'];
      }
      return { ...prev, [userId]: next };
    });
  };

  const handleSave = async (user: AdminUser) => {
    if (!userInfo?.token) return;
    const nextRoles = draftRoles[user._id] || ['user'];
    const isSelf = user._id === userInfo.user_id;
    if (isSelf && !nextRoles.includes('admin')) {
      toast({
        message: t('You cannot remove your own admin role'),
        variant: 'destructive',
      });
      return;
    }

    try {
      setSavingId(user._id);
      const response = await api.patch(
        `/admin/users/${user._id}/roles`,
        { roles: nextRoles },
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      const updated: AdminUser = response.data;
      setUsers((prev) =>
        prev.map((item) => (item._id === user._id ? { ...item, ...updated } : item)),
      );
      setDraftRoles((prev) => ({ ...prev, [user._id]: updated.roles }));
      toast({
        message: t('Roles updated successfully'),
        variant: 'success',
      });
      if (isSelf) {
        await refresh_token();
      }
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error updating roles'),
        variant: 'destructive',
      });
    } finally {
      setSavingId(null);
    }
  };

  if (!isAssignedAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading />
      </View>
    );
  }

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
      <View className="flex-row items-center mb-4">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-center font-bold text-primary text-lg">
          {t('Users')}
        </Text>
        <View style={{ width: 70 }} />
      </View>

      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('Search by name, email or CPF')}
        placeholderTextColor={colors.gray[400]}
        className="border border-gray-200 rounded-lg px-4 py-2.5 mb-4 bg-white"
      />

      {loading ? (
        <Loading classname="flex-1 items-center justify-center" />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
        >
          {users.length === 0 ? (
            <Text className="text-center text-gray-500 mt-8">
              {t('No users found')}
            </Text>
          ) : (
            users.map((user) => {
              const expanded = expandedId === user._id;
              const currentDraft = draftRoles[user._id] || user.roles || [];
              const isSelf = user._id === userInfo?.user_id;
              return (
                <View
                  key={user._id}
                  className="bg-white rounded-xl p-4 mb-3"
                  style={{
                    shadowColor: '#000',
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => toggleExpand(user)}
                    className="flex-row items-center"
                  >
                    <View className="flex-1">
                      <Text className="font-bold text-primary">
                        {user.name || t('(sem nome)')}
                      </Text>
                      <Text className="text-xs text-gray-500">{user.email}</Text>
                      {user.cpf_cnpj ? (
                        <Text className="text-xs text-gray-500">
                          {t('CPF')}: {user.cpf_cnpj}
                        </Text>
                      ) : null}
                      <Text className="text-xs mt-1" style={{ color: colors.warning[700] }}>
                        {user.coins ?? 0} {t('coins')}
                      </Text>
                      <View className="flex-row flex-wrap mt-2 gap-1">
                        {(user.roles || []).map((role) => (
                          <View
                            key={role}
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: colors.primary[100] }}
                          >
                            <Text
                              className="text-xs"
                              style={{ color: colors.primary[700] }}
                            >
                              {roleLabel(role, t)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                    <MaterialIcons
                      name={expanded ? 'expand-less' : 'expand-more'}
                      size={24}
                      color={colors.primary[500]}
                    />
                  </TouchableOpacity>

                  {expanded && (
                    <View className="mt-3 pt-3 border-t border-gray-100">
                      <Text className="font-bold text-primary mb-2">
                        {t('Roles')}
                      </Text>
                      {(['admin', 'super_admin', 'teacher', 'affiliate'] as const).map((role) => {
                        const checked = currentDraft.includes(role);
                        const lockOwnAdmin = isSelf && role === 'admin' && checked;
                        return (
                          <TouchableOpacity
                            key={role}
                            disabled={lockOwnAdmin}
                            onPress={() => toggleDraftRole(user._id, role)}
                            className="flex-row items-center py-2"
                          >
                            <MaterialIcons
                              name={
                                checked ? 'check-box' : 'check-box-outline-blank'
                              }
                              size={22}
                              color={
                                lockOwnAdmin
                                  ? colors.gray[400]
                                  : colors.primary[500]
                              }
                            />
                            <Text className="ml-2 text-primary">
                              {roleLabel(role, t)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                      <TouchableOpacity
                        onPress={() => handleSave(user)}
                        disabled={savingId === user._id}
                        className="mt-2 py-2.5 rounded-lg items-center"
                        style={{ backgroundColor: colors.primary[500] }}
                      >
                        {savingId === user._id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Text className="text-white font-bold">{t('Save')}</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          router.push({
                            pathname: '/admin/users/[userId]' as any,
                            params: { userId: user._id },
                          })
                        }
                        className="mt-2 py-2.5 rounded-lg items-center flex-row justify-center"
                        style={{ backgroundColor: colors.primary[100] }}
                      >
                        <MaterialIcons
                          name="person-search"
                          size={18}
                          color={colors.primary[600]}
                        />
                        <Text
                          className="font-bold ml-2"
                          style={{ color: colors.primary[700] }}
                        >
                          {t('View profile')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}
