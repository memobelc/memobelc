import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { billingApi } from '@/services/billing';
import {
  notificationsApi,
  type AdminSentNotification,
  type NotificationAudienceRole,
  type NotificationGroup,
  type NotificationGroupMember,
  type NotificationTargetType,
} from '@/services/notifications';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';
import AdminConfirmModal from '@/components/admin/AdminConfirmModal';

type AdminUser = NotificationGroupMember & {
  roles?: string[];
};

type AdminClassroom = {
  _id: string;
  name?: string;
  students?: unknown[];
  teacher_name?: string;
};

const TARGETS: NotificationTargetType[] = ['all', 'users', 'roles', 'classroom', 'group'];
const AUDIENCE_ROLES: NotificationAudienceRole[] = ['user', 'teacher', 'admin', 'affiliate'];

function roleLabel(role: string, t: (key: string) => string) {
  if (role === 'admin') return t('Admin');
  if (role === 'teacher') return t('Teacher');
  if (role === 'affiliate') return t('Affiliate');
  return t('User');
}

function targetLabel(type: NotificationTargetType, t: (key: string) => string) {
  if (type === 'all') return t('All users');
  if (type === 'users') return t('Selected users');
  if (type === 'roles') return t('By role');
  if (type === 'classroom') return t('By classroom');
  return t('By group');
}

export default function AdminNotificationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles: assignedRoles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = assignedRoles.includes('admin');

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<NotificationTargetType>('all');
  const [selectedUsers, setSelectedUsers] = useState<AdminUser[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<NotificationAudienceRole[]>([]);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<AdminUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [classrooms, setClassrooms] = useState<AdminClassroom[]>([]);
  const [groups, setGroups] = useState<NotificationGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [groupMembers, setGroupMembers] = useState<AdminUser[]>([]);
  const [groupUserSearch, setGroupUserSearch] = useState('');
  const [groupUserResults, setGroupUserResults] = useState<AdminUser[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);
  const [sent, setSent] = useState<AdminSentNotification[]>([]);
  const [confirm, setConfirm] = useState<{
    open: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    destructive?: boolean;
    onConfirm: () => void;
  }>({ open: false, title: '', message: '', onConfirm: () => {} });

  const closeConfirm = () =>
    setConfirm({ open: false, title: '', message: '', onConfirm: () => {} });

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const [groupsRes, classroomsRes, sentRes] = await Promise.all([
        notificationsApi.listGroups(userInfo.token),
        billingApi.adminClassrooms(userInfo.token),
        notificationsApi.listSent(userInfo.token),
      ]);
      setGroups(groupsRes.data.groups || []);
      setClassrooms(classroomsRes.data.classrooms || []);
      setSent(sentRes.data.notifications || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading groups'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => {
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const searchUsers = useCallback(
    async (query: string, setter: (users: AdminUser[]) => void, setBusy: (busy: boolean) => void) => {
      if (!userInfo?.token) return;
      try {
        setBusy(true);
        const response = await api.get('/admin/users', {
          headers: { Authorization: `Bearer ${userInfo.token}` },
          params: query ? { search: query } : undefined,
        });
        setter(response.data.users || []);
      } catch {
        setter([]);
      } finally {
        setBusy(false);
      }
    },
    [userInfo?.token],
  );

  useEffect(() => {
    if (!isAdmin || !userInfo?.token) return;
    const timeout = setTimeout(() => {
      searchUsers(userSearch.trim(), setUserResults, setSearchingUsers);
    }, 300);
    return () => clearTimeout(timeout);
  }, [userSearch, isAdmin, userInfo?.token, searchUsers]);

  useEffect(() => {
    if (!isAdmin || !userInfo?.token) return;
    const timeout = setTimeout(() => {
      searchUsers(groupUserSearch.trim(), setGroupUserResults, () => undefined);
    }, 300);
    return () => clearTimeout(timeout);
  }, [groupUserSearch, isAdmin, userInfo?.token, searchUsers]);

  const targetPayload = useMemo(() => {
    if (targetType === 'users') return { target_type: targetType, user_ids: selectedUsers.map((user) => user._id) };
    if (targetType === 'roles') return { target_type: targetType, roles: selectedRoles };
    if (targetType === 'classroom') return { target_type: targetType, classroom_id: classroomId || undefined };
    if (targetType === 'group') return { target_type: targetType, group_id: groupId || undefined };
    return { target_type: 'all' as const };
  }, [targetType, selectedUsers, selectedRoles, classroomId, groupId]);

  const canPreview = useMemo(() => {
    if (targetType === 'users') return selectedUsers.length > 0;
    if (targetType === 'roles') return selectedRoles.length > 0;
    if (targetType === 'classroom') return Boolean(classroomId);
    if (targetType === 'group') return Boolean(groupId);
    return true;
  }, [targetType, selectedUsers, selectedRoles, classroomId, groupId]);

  useEffect(() => {
    setPreviewCount(null);
  }, [targetType, selectedUsers, selectedRoles, classroomId, groupId]);

  const toggleUser = (user: AdminUser, list: AdminUser[], setter: (users: AdminUser[]) => void) => {
    setter(
      list.some((item) => item._id === user._id)
        ? list.filter((item) => item._id !== user._id)
        : [...list, user],
    );
  };

  const resetGroupForm = () => {
    setEditingGroupId(null);
    setGroupName('');
    setGroupDescription('');
    setGroupMembers([]);
    setGroupUserSearch('');
  };

  const startEditGroup = (group: NotificationGroup) => {
    setEditingGroupId(group._id);
    setGroupName(group.name);
    setGroupDescription(group.description || '');
    setGroupMembers(group.members?.length ? group.members : []);
  };

  const saveGroup = async () => {
    if (!userInfo?.token || !groupName.trim()) {
      toast({ message: t('Group name is required'), variant: 'destructive' });
      return;
    }
    try {
      setSavingGroup(true);
      const payload = {
        name: groupName.trim(),
        description: groupDescription.trim(),
        user_ids: groupMembers.map((member) => member._id),
      };
      if (editingGroupId) {
        await notificationsApi.updateGroup(userInfo.token, editingGroupId, payload);
      } else {
        await notificationsApi.createGroup(userInfo.token, payload);
      }
      toast({ message: t('Group saved'), variant: 'success' });
      resetGroupForm();
      load();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving group'),
        variant: 'destructive',
      });
    } finally {
      setSavingGroup(false);
    }
  };

  const deleteGroup = (group: NotificationGroup) => {
    setConfirm({
      open: true,
      title: t('Delete group'),
      message: t('Are you sure you want to delete this group?'),
      confirmLabel: t('Delete'),
      destructive: true,
      onConfirm: async () => {
        closeConfirm();
        if (!userInfo?.token) return;
        try {
          await notificationsApi.deleteGroup(userInfo.token, group._id);
          if (groupId === group._id) setGroupId(null);
          if (editingGroupId === group._id) resetGroupForm();
          toast({ message: t('Group deleted'), variant: 'success' });
          load();
        } catch (error: any) {
          toast({
            message: error.response?.data?.error || t('Error deleting group'),
            variant: 'destructive',
          });
        }
      },
    });
  };

  const deleteSent = (item: AdminSentNotification) => {
    setConfirm({
      open: true,
      title: t('Delete notification'),
      message: t('This notification will disappear from users inboxes.'),
      confirmLabel: t('Delete'),
      destructive: true,
      onConfirm: async () => {
        closeConfirm();
        if (!userInfo?.token) return;
        try {
          await notificationsApi.deleteSent(userInfo.token, item.batch_id);
          toast({ message: t('Notification deleted'), variant: 'success' });
          load();
        } catch (error: any) {
          toast({
            message: error.response?.data?.error || t('Error deleting notification'),
            variant: 'destructive',
          });
        }
      },
    });
  };

  const doSend = async () => {
    if (!userInfo?.token) return;
    try {
      setSending(true);
      const result = await notificationsApi.sendAdminCustom(userInfo.token, {
        title: title.trim(),
        body: body.trim(),
        ...targetPayload,
      });
      toast({
        message: t('Notification sent to {{count}} people.', { count: result.data.sent_to }),
        variant: 'success',
      });
      setTitle('');
      setBody('');
      setPreviewCount(null);
      load();
    } catch (error: any) {
      toast({
        message:
          error.response?.data?.error ||
          error.response?.data?.description ||
          t('Error sending notification'),
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast({ message: t('Title and message are required'), variant: 'destructive' });
      return;
    }
    if (!canPreview) {
      toast({ message: t('Select at least one recipient'), variant: 'destructive' });
      return;
    }
    try {
      const preview = await notificationsApi.previewAdmin(userInfo?.token, targetPayload);
      const count = preview.data.count || 0;
      setPreviewCount(count);
      if (count <= 0) {
        toast({ message: t('Select at least one recipient'), variant: 'destructive' });
        return;
      }
      const confirmSend = () => doSend();
      if (targetType === 'all' || count > 20) {
        setConfirm({
          open: true,
          title: t('Send notification'),
          message: t('This will send to {{count}} people.', { count }),
          confirmLabel: t('Send'),
          destructive: false,
          onConfirm: () => {
            closeConfirm();
            confirmSend();
          },
        });
        return;
      }
      confirmSend();
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error sending notification'),
        variant: 'destructive',
      });
    }
  };

  if (!isAdmin) return null;

  const renderUserPicker = (
    search: string,
    onSearch: (value: string) => void,
    results: AdminUser[],
    selected: AdminUser[],
    onToggle: (user: AdminUser) => void,
    busy?: boolean,
  ) => (
    <View>
      <TextInput
        value={search}
        onChangeText={onSearch}
        placeholder={t('Search users')}
        placeholderTextColor={colors.gray[400]}
        className="border border-gray-200 rounded-lg px-3 py-2 mb-2"
      />
      {selected.length > 0 && (
        <View className="flex-row flex-wrap mb-2">
          {selected.map((user) => (
            <TouchableOpacity
              key={user._id}
              onPress={() => onToggle(user)}
              className="flex-row items-center rounded-full px-2 py-1 mr-2 mb-2"
              style={{ backgroundColor: colors.primary[100] }}
            >
              <Text className="text-xs mr-1" style={{ color: colors.primary[700] }}>
                {user.name || user.email}
              </Text>
              <MaterialIcons name="close" size={14} color={colors.primary[700]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
      {busy ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        results.slice(0, 8).map((user) => {
          const checked = selected.some((item) => item._id === user._id);
          return (
            <TouchableOpacity
              key={user._id}
              onPress={() => onToggle(user)}
              className="flex-row items-center py-2 border-b border-gray-100"
            >
              <MaterialIcons
                name={checked ? 'check-box' : 'check-box-outline-blank'}
                size={20}
                color={colors.primary[500]}
              />
              <View className="ml-2 flex-1">
                <Text className="font-semibold" style={{ color: colors.gray[800] }}>
                  {user.name || t('(sem nome)')}
                </Text>
                <Text className="text-xs" style={{ color: colors.gray[500] }}>
                  {user.email}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  return (
    <ScrollView
      className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8"
      contentContainerStyle={{ paddingBottom: 80 }}
    >
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Send notifications')}</Text>

      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="font-bold mb-3" style={{ color: colors.gray[800] }}>
          {t('Send notification')}
        </Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={t('Notification title')}
          placeholderTextColor={colors.gray[400]}
          className="border border-gray-200 rounded-lg px-3 py-2.5 mb-2"
          maxLength={120}
        />
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder={t('Notification message')}
          placeholderTextColor={colors.gray[400]}
          className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3"
          multiline
          numberOfLines={4}
          maxLength={1000}
          style={{ minHeight: 96, textAlignVertical: 'top' }}
        />

        <Text className="font-semibold mb-2" style={{ color: colors.gray[700] }}>
          {t('Recipients')}
        </Text>
        <View className="flex-row flex-wrap mb-3">
          {TARGETS.map((type) => (
            <TouchableOpacity
              key={type}
              onPress={() => setTargetType(type)}
              className="px-3 py-1.5 rounded-full mr-2 mb-2"
              style={{
                backgroundColor: targetType === type ? colors.primary[500] : colors.gray[200],
              }}
            >
              <Text style={{ color: targetType === type ? '#fff' : colors.gray[800] }}>
                {targetLabel(type, t)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {targetType === 'users' &&
          renderUserPicker(
            userSearch,
            setUserSearch,
            userResults,
            selectedUsers,
            (user) => toggleUser(user, selectedUsers, setSelectedUsers),
            searchingUsers,
          )}

        {targetType === 'roles' &&
          AUDIENCE_ROLES.map((role) => {
            const checked = selectedRoles.includes(role);
            return (
              <TouchableOpacity
                key={role}
                onPress={() =>
                  setSelectedRoles((prev) =>
                    checked ? prev.filter((item) => item !== role) : [...prev, role],
                  )
                }
                className="flex-row items-center py-2"
              >
                <MaterialIcons
                  name={checked ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={colors.primary[500]}
                />
                <Text className="ml-2">{roleLabel(role, t)}</Text>
              </TouchableOpacity>
            );
          })}

        {targetType === 'classroom' &&
          (classrooms.length === 0 ? (
            <Text style={{ color: colors.gray[500] }}>{t('No classrooms yet')}</Text>
          ) : (
            classrooms.map((classroom) => {
              const selected = classroomId === classroom._id;
              return (
                <TouchableOpacity
                  key={classroom._id}
                  onPress={() => setClassroomId(classroom._id)}
                  className="flex-row items-center py-2"
                >
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={colors.primary[500]}
                  />
                  <View className="ml-2 flex-1">
                    <Text className="font-semibold">{classroom.name}</Text>
                    <Text className="text-xs" style={{ color: colors.gray[500] }}>
                      {classroom.teacher_name ? `${classroom.teacher_name} · ` : ''}
                      {t('{{count}} students', { count: classroom.students?.length || 0 })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ))}

        {targetType === 'group' &&
          (groups.length === 0 ? (
            <Text style={{ color: colors.gray[500] }}>{t('No groups yet')}</Text>
          ) : (
            groups.map((group) => {
              const selected = groupId === group._id;
              return (
                <TouchableOpacity
                  key={group._id}
                  onPress={() => setGroupId(group._id)}
                  className="flex-row items-center py-2"
                >
                  <MaterialIcons
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={20}
                    color={colors.primary[500]}
                  />
                  <View className="ml-2 flex-1">
                    <Text className="font-semibold">{group.name}</Text>
                    <Text className="text-xs" style={{ color: colors.gray[500] }}>
                      {t('{{count}} members', { count: group.member_count || 0 })}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          ))}

        {previewCount != null && (
          <Text className="mt-2 text-sm" style={{ color: colors.gray[600] }}>
            {t('This will send to {{count}} people.', { count: previewCount })}
          </Text>
        )}

        <TouchableOpacity
          onPress={handleSend}
          disabled={sending}
          className="mt-4 px-4 py-3 rounded-lg items-center"
          style={{ backgroundColor: sending ? colors.gray[300] : colors.primary[500] }}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold">{t('Send notification')}</Text>
          )}
        </TouchableOpacity>
      </View>

      <Text className="text-lg font-bold mb-3">{t('Sent notifications')}</Text>
      {loading ? (
        <Loading color={colors.primary[500]} classname="items-center justify-center py-4" />
      ) : sent.length === 0 ? (
        <Text className="text-center mb-4" style={{ color: colors.gray[500] }}>
          {t('No sent notifications')}
        </Text>
      ) : (
        sent.map((item) => (
          <View key={item.batch_id} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-semibold">{item.title}</Text>
            {!!item.body && (
              <Text className="text-sm mt-1" style={{ color: colors.gray[600] }}>
                {item.body}
              </Text>
            )}
            <Text className="text-xs mt-1" style={{ color: colors.gray[500] }}>
              {item.created_at ? new Date(item.created_at).toLocaleString() : ''}
              {item.target_type ? ` · ${targetLabel(item.target_type as NotificationTargetType, t)}` : ''}
              {' · '}
              {t('Sent to {{count}} people.', { count: item.sent_to })}
            </Text>
            <TouchableOpacity onPress={() => deleteSent(item)} className="mt-2">
              <Text style={{ color: colors.error[500] }}>{t('Delete')}</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <View className="bg-white rounded-xl p-4 mb-4">
        <Text className="font-bold mb-3" style={{ color: colors.gray[800] }}>
          {editingGroupId ? t('Edit group') : t('Create group')}
        </Text>
        <TextInput
          value={groupName}
          onChangeText={setGroupName}
          placeholder={t('Group name')}
          placeholderTextColor={colors.gray[400]}
          className="border border-gray-200 rounded-lg px-3 py-2.5 mb-2"
        />
        <TextInput
          value={groupDescription}
          onChangeText={setGroupDescription}
          placeholder={t('Group description')}
          placeholderTextColor={colors.gray[400]}
          className="border border-gray-200 rounded-lg px-3 py-2.5 mb-3"
        />
        {renderUserPicker(
          groupUserSearch,
          setGroupUserSearch,
          groupUserResults,
          groupMembers,
          (user) => toggleUser(user, groupMembers, setGroupMembers),
        )}
        <View className="flex-row mt-3">
          {editingGroupId ? (
            <TouchableOpacity
              onPress={resetGroupForm}
              className="px-4 py-2 rounded-lg mr-2"
              style={{ backgroundColor: colors.gray[200] }}
            >
              <Text style={{ color: colors.gray[700] }}>{t('Cancel')}</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            onPress={saveGroup}
            disabled={savingGroup}
            className="px-4 py-2 rounded-lg"
            style={{ backgroundColor: colors.primary[500] }}
          >
            {savingGroup ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold">
                {editingGroupId ? t('Save') : t('Create group')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <Text className="text-lg font-bold mb-3">{t('Notification groups')}</Text>
      {loading ? (
        <Loading color={colors.primary[500]} classname="items-center justify-center py-8" />
      ) : groups.length === 0 ? (
        <Text className="text-center" style={{ color: colors.gray[500] }}>
          {t('No groups yet')}
        </Text>
      ) : (
        groups.map((group) => (
          <View key={group._id} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-semibold">{group.name}</Text>
            {group.description ? (
              <Text className="text-sm mt-1" style={{ color: colors.gray[500] }}>
                {group.description}
              </Text>
            ) : null}
            <Text className="text-xs mt-1" style={{ color: colors.gray[500] }}>
              {t('{{count}} members', { count: group.member_count || 0 })}
            </Text>
            <View className="flex-row mt-2">
              <TouchableOpacity onPress={() => startEditGroup(group)} className="mr-4">
                <Text style={{ color: colors.primary[500] }}>{t('Edit group')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteGroup(group)}>
                <Text style={{ color: colors.error[500] }}>{t('Delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      <AdminConfirmModal
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel={confirm.confirmLabel || t('Confirm')}
        destructive={confirm.destructive}
        onCancel={closeConfirm}
        onConfirm={confirm.onConfirm}
      />
    </ScrollView>
  );
}
