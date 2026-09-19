import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';

export type AdminPickableUser = {
  _id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

type AdminUserMultiSelectProps = {
  token: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

function UserAvatar({ user }: { user: AdminPickableUser }) {
  const initial = (user.name || user.email || '?').trim().charAt(0).toUpperCase();
  if (user.image) {
    return <Image source={{ uri: user.image }} className="w-10 h-10 rounded-full" />;
  }
  return (
    <View
      className="w-10 h-10 rounded-full items-center justify-center"
      style={{ backgroundColor: colors.primary[100] }}
    >
      <Text style={{ color: colors.primary[600], fontWeight: '700' }}>{initial}</Text>
    </View>
  );
}

export default function AdminUserMultiSelect({
  token,
  selectedIds,
  onChange,
}: AdminUserMultiSelectProps) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<AdminPickableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const cache = useRef<Record<string, AdminPickableUser>>({});

  const remember = (list: AdminPickableUser[]) => {
    list.forEach((user) => {
      cache.current[user._id] = user;
    });
  };

  const loadUsers = useCallback(
    async (query?: string) => {
      try {
        setLoading(true);
        const response = await api.get('/admin/users', {
          headers: { Authorization: `Bearer ${token}` },
          params: query ? { search: query } : undefined,
        });
        const list: AdminPickableUser[] = response.data.users || [];
        remember(list);
        setUsers(list);
      } catch {
        setUsers([]);
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadUsers(search.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, loadUsers]);

  const selectedUsers = useMemo(
    () =>
      selectedIds.map(
        (id) =>
          cache.current[id] ||
          users.find((user) => user._id === id) || { _id: id, name: id },
      ),
    [selectedIds, users],
  );

  const toggle = (user: AdminPickableUser) => {
    cache.current[user._id] = user;
    onChange(
      selectedIds.includes(user._id)
        ? selectedIds.filter((id) => id !== user._id)
        : [...selectedIds, user._id],
    );
  };

  const visible = useMemo(() => {
    const selectedSet = new Set(selectedIds);
    const rest = users.filter((user) => !selectedSet.has(user._id));
    return [...selectedUsers, ...rest];
  }, [users, selectedIds, selectedUsers]);

  return (
    <View className="mb-3">
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder={t('Search users')}
        placeholderTextColor={colors.gray[400]}
        className="border border-gray-200 rounded-xl px-3 py-2 mb-2"
      />
      <Text className="text-xs text-gray-500 mb-2">
        {t('{{count}} selected', { count: selectedIds.length })}
      </Text>
      {loading && users.length === 0 ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : visible.length === 0 ? (
        <Text className="text-gray-400 py-2">{t('No users found')}</Text>
      ) : (
        <ScrollView
          nestedScrollEnabled
          style={{ maxHeight: 360 }}
          keyboardShouldPersistTaps="handled"
        >
          {visible.map((user) => {
            const checked = selectedIds.includes(user._id);
            return (
              <TouchableOpacity
                key={user._id}
                onPress={() => toggle(user)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={user.name || user.email || user._id}
                className="flex-row items-center py-2 border-b border-gray-100"
              >
                <Ionicons
                  name={checked ? 'checkbox' : 'square-outline'}
                  size={22}
                  color={colors.primary[500]}
                />
                <View className="ml-3">
                  <UserAvatar user={user} />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="font-semibold" numberOfLines={1}>
                    {user.name || t('(sem nome)')}
                  </Text>
                  {user.email ? (
                    <Text className="text-xs text-gray-500" numberOfLines={1}>
                      {user.email}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
