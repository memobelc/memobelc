import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { Loading } from '@/components/Loading';

type AdminProfile = {
  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    roles: string[];
    member_since: string | null;
  };
  access: {
    last_access: string | null;
    total_logins: number;
    active_days: number;
    logs: {
      created_at: string | null;
      deviceName?: string;
      deviceType?: string;
      osName?: string;
      osVersion?: string;
    }[];
  };
  streak: {
    current_streak: number;
    last_study_date: string | null;
    week_study_days: boolean[];
  };
  cards: { total: number; reviewed: number; pending: number };
  collections: {
    _id: string;
    name: string;
    classroom?: string | null;
    archived_classroom?: boolean;
    total_cards: number;
    pending_cards: number;
    decks: { _id: string; name: string; total_cards: number; pending_cards: number }[];
  }[];
  classrooms: {
    _id: string;
    name: string;
    user_role?: string;
    joined_at?: string | null;
    left_at?: string | null;
    membership_active?: boolean;
  }[];
  courses: {
    _id: string;
    name: string;
    classroom_name?: string;
    progress_pct: number;
    lessons_viewed: number;
    total_lessons: number;
    activities_submitted: number;
    total_activities: number;
    avg_score: number | null;
  }[];
  chats: {
    _id: string;
    created_at: string | null;
    message_count: number;
    last_message: string;
    history: { role: string; parts?: { text: string }[] }[];
  }[];
};

function formatDate(iso?: string | null) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View className="flex-1 items-center">
      <Text className="text-xs text-gray-500 text-center">{label}</Text>
      <Text className="text-sm font-bold text-gray-800 mt-1">{value}</Text>
    </View>
  );
}

export default function AdminUserProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userId: userIdParam } = useLocalSearchParams<{ userId: string }>();
  const userId = Array.isArray(userIdParam) ? userIdParam[0] : userIdParam;
  const { userInfo } = useSession();
  const { roles: assignedRoles } = useHasRole();
  const isAssignedAdmin = assignedRoles.includes('admin');

  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openChatId, setOpenChatId] = useState<string | null>(null);

  useEffect(() => {
    if (userInfo && !isAssignedAdmin) {
      router.replace('/');
    }
  }, [userInfo, isAssignedAdmin, router]);

  useEffect(() => {
    if (!userInfo?.token || !userId || !isAssignedAdmin) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const response = await api.get(`/admin/users/${userId}/profile`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });
        if (!cancelled) setProfile(response.data);
      } catch (err: any) {
        if (!cancelled) {
          setError(
            err?.response?.data?.error || t('Error loading user profile'),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userInfo?.token, userId, isAssignedAdmin, t]);

  if (!isAssignedAdmin) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.background }}>
      <View
        className="flex-row items-center px-5 py-3 bg-white"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[200] }}
      >
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="arrow-back-circle" size={26} color={colors.primary[500]} />
        </TouchableOpacity>
        <View className="flex-1 ml-2">
          <Text className="font-extrabold text-base" numberOfLines={1}>
            {profile?.user.name || t('User profile')}
          </Text>
          <Text className="text-xs text-gray-400">{t('Admin user profile')}</Text>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : error || !profile ? (
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="alert-circle" size={40} color={colors.error[500]} />
          <Text className="mt-3 text-gray-500 text-center">
            {error || t('Error loading user profile')}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 80 }}>
          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="text-lg font-extrabold text-gray-800">
              {profile.user.name || t('(sem nome)')}
            </Text>
            <Text className="text-sm text-gray-500 mt-1">{profile.user.email}</Text>
            <View className="flex-row flex-wrap mt-2 gap-1">
              {profile.user.roles.map((role) => (
                <View
                  key={role}
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: colors.primary[100] }}
                >
                  <Text className="text-xs" style={{ color: colors.primary[700] }}>
                    {role === 'admin' ? t('Admin') : role === 'teacher' ? t('Teacher') : t('User')}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="text-xs text-gray-400 mt-2">
              {t('Membro desde')} {formatDate(profile.user.member_since)}
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Access')}</Text>
            <View className="flex-row">
              <Stat label={t('Último acesso')} value={formatDate(profile.access.last_access)} />
              <Stat label={t('Total de acessos')} value={profile.access.total_logins} />
              <Stat label={t('Dias ativos')} value={profile.access.active_days} />
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Study streak')}</Text>
            <View className="flex-row">
              <Stat label={t('Current streak')} value={profile.streak.current_streak} />
              <Stat
                label={t('Last study date')}
                value={formatDate(profile.streak.last_study_date)}
              />
            </View>
            <View className="flex-row justify-between mt-3">
              {(profile.streak.week_study_days || []).map((studied, index) => (
                <View
                  key={index}
                  className="w-8 h-8 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: studied ? colors.success[500] : colors.gray[200],
                  }}
                >
                  <MaterialIcons
                    name={studied ? 'check' : 'remove'}
                    size={14}
                    color={studied ? colors.white : colors.gray[500]}
                  />
                </View>
              ))}
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Cards')}</Text>
            <View className="flex-row">
              <Stat label={t('Total')} value={profile.cards.total} />
              <Stat label={t('Reviewed')} value={profile.cards.reviewed} />
              <Stat label={t('Pending')} value={profile.cards.pending} />
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Collections')}</Text>
            {profile.collections.length === 0 ? (
              <Text className="text-gray-400">{t('No collections')}</Text>
            ) : (
              profile.collections.map((collection) => (
                <View key={collection._id} className="mb-3 pb-3 border-b border-gray-100">
                  <Text className="font-bold text-gray-800">{collection.name}</Text>
                  <Text className="text-xs text-gray-500 mt-1">
                    {collection.classroom
                      ? collection.archived_classroom
                        ? t('Archived classroom collection')
                        : t('Classroom collection')
                      : t('Personal collection')}
                    {' · '}
                    {collection.total_cards} {t('cards')}
                  </Text>
                  {collection.decks.map((deck) => (
                    <Text key={deck._id} className="text-xs text-gray-600 mt-1">
                      {deck.name} — {deck.total_cards} {t('cards')}
                    </Text>
                  ))}
                </View>
              ))
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Classrooms')}</Text>
            {profile.classrooms.length === 0 ? (
              <Text className="text-gray-400">{t('No classrooms')}</Text>
            ) : (
              profile.classrooms.map((classroom) => (
                <View key={classroom._id} className="mb-2">
                  <Text className="font-bold text-gray-800">{classroom.name}</Text>
                  <Text className="text-xs text-gray-500">
                    {classroom.user_role === 'teacher'
                      ? t('Teacher')
                      : classroom.user_role === 'former_student'
                        ? t('Former student')
                        : t('Student')}
                    {classroom.left_at ? ` · ${t('Left at')} ${formatDate(classroom.left_at)}` : ''}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Courses')}</Text>
            {profile.courses.length === 0 ? (
              <Text className="text-gray-400">{t('No courses available yet.')}</Text>
            ) : (
              profile.courses.map((course) => (
                <View key={course._id} className="mb-3">
                  <Text className="font-bold text-gray-800">{course.name}</Text>
                  <Text className="text-xs text-gray-500">{course.classroom_name}</Text>
                  <Text className="text-xs text-gray-600 mt-1">
                    {course.progress_pct}% · {course.lessons_viewed}/{course.total_lessons}{' '}
                    {t('aulas')} · {course.activities_submitted}/{course.total_activities}{' '}
                    {t('atividades')}
                    {course.avg_score != null ? ` · ${course.avg_score}` : ''}
                  </Text>
                </View>
              ))
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Access logs')}</Text>
            {profile.access.logs.length === 0 ? (
              <Text className="text-gray-400">{t('No access logs')}</Text>
            ) : (
              profile.access.logs.slice(0, 20).map((log, index) => (
                <Text key={`${log.created_at}-${index}`} className="text-xs text-gray-600 mb-1">
                  {formatDate(log.created_at)}
                  {log.deviceName ? ` · ${log.deviceName}` : ''}
                  {log.osName ? ` · ${log.osName} ${log.osVersion || ''}` : ''}
                </Text>
              ))
            )}
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4">
            <Text className="font-bold text-gray-700 mb-3">{t('Chat')}</Text>
            {profile.chats.length === 0 ? (
              <Text className="text-gray-400">{t('No chats')}</Text>
            ) : (
              profile.chats.map((chat) => (
                <View key={chat._id} className="mb-3">
                  <TouchableOpacity
                    onPress={() =>
                      setOpenChatId((current) => (current === chat._id ? null : chat._id))
                    }
                    className="flex-row items-center"
                  >
                    <MaterialCommunityIcons
                      name="chat-outline"
                      size={18}
                      color={colors.primary[500]}
                    />
                    <View className="flex-1 ml-2">
                      <Text className="text-xs text-gray-500">
                        {formatDate(chat.created_at)} · {chat.message_count} {t('messages')}
                      </Text>
                      <Text className="text-sm text-gray-700" numberOfLines={2}>
                        {chat.last_message || t('(sem nome)')}
                      </Text>
                    </View>
                    <MaterialIcons
                      name={openChatId === chat._id ? 'expand-less' : 'expand-more'}
                      size={20}
                      color={colors.gray[500]}
                    />
                  </TouchableOpacity>
                  {openChatId === chat._id &&
                    (chat.history || []).map((message, index) => (
                      <Text
                        key={`${chat._id}-${index}`}
                        className="text-xs mt-2"
                        style={{
                          color:
                            message.role === 'user' ? colors.primary[700] : colors.gray[600],
                        }}
                      >
                        {message.role}: {message.parts?.[0]?.text || ''}
                      </Text>
                    ))}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}
