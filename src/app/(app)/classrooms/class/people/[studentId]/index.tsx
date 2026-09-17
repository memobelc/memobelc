import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useCollection } from '@/contexts/CollectionContext';
import { useToast } from '@/components/Toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface LessonProgress {
  _id: string;
  title: string;
  viewed: boolean;
  viewed_at: string | null;
}

interface ActivityProgress {
  _id: string;
  title: string;
  submitted: boolean;
  score: number | null;
  submitted_at: string | null;
  approved: boolean;
}

interface ModuleProgress {
  _id: string;
  name: string;
  lessons: LessonProgress[];
  activities: ActivityProgress[];
}

interface CourseProgress {
  _id: string;
  name: string;
  description: string;
  lessons_viewed: number;
  total_lessons: number;
  activities_submitted: number;
  total_activities: number;
  avg_score: number | null;
  progress_pct: number;
  modules: ModuleProgress[];
}

interface StudentProfile {
  student: { _id: string; name: string; email: string; member_since: string | null };
  access: { last_access: string | null; total_logins: number; active_days: number };
  summary: {
    total_lessons: number;
    lessons_viewed: number;
    lessons_pct: number;
    total_activities: number;
    activities_submitted: number;
    activities_pct: number;
    overall_avg_score: number | null;
    total_cards: number;
    cards_reviewed: number;
    at_risk: boolean;
    top_performer: boolean;
    xp?: number;
    badges?: string[];
  };
  courses: CourseProgress[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatRelative(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Hoje';
  if (days === 1) return 'Ontem';
  if (days < 7) return `${days} dias atrás`;
  if (days < 30) return `${Math.floor(days / 7)} sem. atrás`;
  return formatDate(iso);
}

function scoreColor(score: number | null): string {
  if (score === null) return colors.gray[400];
  if (score >= 85) return colors.success[500];
  if (score >= 60) return colors.warning[600];
  return colors.error[500];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  tint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tint: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.white,
        borderRadius: 16,
        padding: 14,
        marginHorizontal: 4,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.07,
        shadowRadius: 6,
        elevation: 2,
        borderTopWidth: 3,
        borderTopColor: tint,
      }}
    >
      <View style={{ marginBottom: 6 }}>{icon}</View>
      <Text style={{ fontSize: 22, fontWeight: '800', color: colors.gray[800] }}>{value}</Text>
      {sub ? (
        <Text style={{ fontSize: 11, color: colors.gray[400], marginTop: 1 }}>{sub}</Text>
      ) : null}
      <Text style={{ fontSize: 12, color: colors.gray[500], marginTop: 4, fontWeight: '600' }}>
        {label}
      </Text>
    </View>
  );
}

function ProgressBar({ pct, color }: { pct: number; color: string }) {
  return (
    <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.gray[100], overflow: 'hidden' }}>
      <View style={{ height: 6, width: `${Math.min(pct, 100)}%`, borderRadius: 3, backgroundColor: color }} />
    </View>
  );
}

function CourseSection({ course, t }: { course: CourseProgress; t: (k: string) => string }) {
  const [expanded, setExpanded] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  const toggleModule = (id: string) =>
    setExpandedModules((prev) => ({ ...prev, [id]: !prev[id] }));

  const barColor =
    course.avg_score === null
      ? colors.primary[500]
      : course.avg_score >= 85
      ? colors.success[500]
      : course.avg_score >= 60
      ? colors.warning[600]
      : colors.error[500];

  return (
    <View
      style={{
        backgroundColor: colors.white,
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
        elevation: 2,
      }}
    >
      <TouchableOpacity
        onPress={() => setExpanded((p) => !p)}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding: 16,
          borderLeftWidth: 4,
          borderLeftColor: barColor,
        }}
        activeOpacity={0.7}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '700', fontSize: 15, color: colors.gray[800] }} numberOfLines={1}>
            {course.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 12 }}>
            <Text style={{ fontSize: 12, color: colors.gray[500] }}>
              {course.lessons_viewed}/{course.total_lessons} {t('aulas')}
            </Text>
            <Text style={{ fontSize: 12, color: colors.gray[500] }}>
              {course.activities_submitted}/{course.total_activities} {t('atividades')}
            </Text>
            {course.avg_score !== null && (
              <Text style={{ fontSize: 12, fontWeight: '700', color: scoreColor(course.avg_score) }}>
                {course.avg_score}%
              </Text>
            )}
          </View>
          <View style={{ marginTop: 8 }}>
            <ProgressBar pct={course.progress_pct} color={barColor} />
          </View>
        </View>
        <View style={{ marginLeft: 12, alignItems: 'center' }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: barColor }}>
            {course.progress_pct}%
          </Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color={colors.gray[400]}
          />
        </View>
      </TouchableOpacity>

      {expanded &&
        course.modules.map((module) => (
          <View key={module._id} style={{ borderTopWidth: 1, borderTopColor: colors.gray[100] }}>
            <TouchableOpacity
              onPress={() => toggleModule(module._id)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 16,
                paddingVertical: 10,
                backgroundColor: colors.gray[100],
              }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="folder-outline" size={16} color={colors.primary[500]} />
              <Text
                style={{ flex: 1, marginLeft: 8, fontWeight: '600', fontSize: 13, color: colors.gray[700] }}
                numberOfLines={1}
              >
                {module.name}
              </Text>
              <MaterialIcons
                name={expandedModules[module._id] ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                size={18}
                color={colors.gray[400]}
              />
            </TouchableOpacity>

            {expandedModules[module._id] && (
              <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
                {module.lessons.length > 0 && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray[400], marginTop: 10, marginBottom: 4, letterSpacing: 0.5 }}>
                    {t('AULAS').toUpperCase()}
                  </Text>
                )}
                {module.lessons.map((lesson) => (
                  <View
                    key={lesson._id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 7,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.gray[100],
                    }}
                  >
                    <MaterialCommunityIcons
                      name={lesson.viewed ? 'play-circle' : 'play-circle-outline'}
                      size={18}
                      color={lesson.viewed ? colors.success[500] : colors.gray[300]}
                    />
                    <Text
                      style={{
                        flex: 1,
                        marginLeft: 10,
                        fontSize: 13,
                        color: lesson.viewed ? colors.gray[700] : colors.gray[400],
                      }}
                      numberOfLines={1}
                    >
                      {lesson.title}
                    </Text>
                    {lesson.viewed && lesson.viewed_at ? (
                      <Text style={{ fontSize: 11, color: colors.gray[400] }}>
                        {formatRelative(lesson.viewed_at)}
                      </Text>
                    ) : (
                      <Text style={{ fontSize: 11, color: colors.gray[300] }}>{t('Não assistida')}</Text>
                    )}
                  </View>
                ))}

                {module.activities.length > 0 && (
                  <Text style={{ fontSize: 11, fontWeight: '700', color: colors.gray[400], marginTop: 10, marginBottom: 4, letterSpacing: 0.5 }}>
                    {t('ATIVIDADES').toUpperCase()}
                  </Text>
                )}
                {module.activities.map((activity) => (
                  <View
                    key={activity._id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 7,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.gray[100],
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        activity.submitted
                          ? activity.approved
                            ? 'check-circle'
                            : 'clipboard-check-outline'
                          : 'clipboard-outline'
                      }
                      size={18}
                      color={
                        activity.submitted
                          ? activity.approved
                            ? colors.success[500]
                            : colors.primary[500]
                          : colors.gray[300]
                      }
                    />
                    <Text
                      style={{
                        flex: 1,
                        marginLeft: 10,
                        fontSize: 13,
                        color: activity.submitted ? colors.gray[700] : colors.gray[400],
                      }}
                      numberOfLines={1}
                    >
                      {activity.title}
                    </Text>
                    {activity.submitted ? (
                      <View style={{ alignItems: 'flex-end' }}>
                        {activity.score !== null && (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: scoreColor(activity.score) }}>
                            {activity.score}%
                          </Text>
                        )}
                        {activity.submitted_at && (
                          <Text style={{ fontSize: 10, color: colors.gray[400] }}>
                            {formatRelative(activity.submitted_at)}
                          </Text>
                        )}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: colors.gray[300] }}>{t('Pendente')}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function StudentProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { studentId, studentName, classroomId: classroomIdParam } = useLocalSearchParams<{
    studentId: string;
    studentName: string;
    classroomId: string;
  }>();
  const { userInfo } = useSession();
  const { currentClassroom, setCurrentClassroom } = useCollection();
  const { toast } = useToast();

  const classroomId = classroomIdParam || currentClassroom?._id;

  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!classroomId || !studentId) {
      setLoading(false);
      setError(t('Dados insuficientes para carregar o perfil.'));
      return;
    }
    setLoading(true);
    setError(null);
    api
      .get(`/classroom/${classroomId}/student/${studentId}/profile`, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      })
      .then((res) => setProfile(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.error || t('Erro ao carregar perfil do aluno.');
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, [classroomId, studentId]);

  const handleRemoveUser = async () => {
    if (!classroomId || !studentId || !userInfo?.token) return;
    try {
      setRemoving(true);
      await api.post(
        '/classroom/remove_user_in_classroom',
        { classroom_id: classroomId, user_id: studentId },
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      if (currentClassroom) {
        setCurrentClassroom({
          ...currentClassroom,
          students: (currentClassroom.students || []).filter(
            (student) => student._id !== studentId,
          ),
        });
      }
      toast({
        message: t('User removed from classroom'),
        variant: 'success',
      });
      setConfirmRemove(false);
      router.back();
    } catch (err: any) {
      toast({
        message:
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          t('Error removing user'),
        variant: 'destructive',
      });
    } finally {
      setRemoving(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        style={{
          backgroundColor: colors.white,
          paddingTop: 12,
          paddingBottom: 16,
          paddingHorizontal: 20,
          borderBottomWidth: 1,
          borderBottomColor: colors.gray[200],
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back-circle" size={26} color={colors.primary[500]} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: colors.gray[800] }} numberOfLines={1}>
            {studentName ?? t('Perfil do Aluno')}
          </Text>
          <Text style={{ fontSize: 12, color: colors.gray[400] }}>{t('Desempenho & Engajamento')}</Text>
        </View>
        <TouchableOpacity
          onPress={() => setConfirmRemove(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: colors.error[100],
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 8,
            gap: 4,
          }}
        >
          <MaterialIcons name="person-remove" size={18} color={colors.error[600]} />
          <Text style={{ fontSize: 12, fontWeight: '700', color: colors.error[600] }}>
            {t('Remove user')}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : error ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Feather name="alert-circle" size={40} color={colors.error[500]} />
          <Text style={{ marginTop: 12, color: colors.gray[500], textAlign: 'center' }}>{error}</Text>
        </View>
      ) : profile ? (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Student Info Card ────────────────────────────────────────── */}
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 20,
              padding: 20,
              marginBottom: 16,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
              elevation: 3,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: 28,
                  backgroundColor: colors.primary[100],
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 22, fontWeight: '800', color: colors.primary[600] }}>
                  {(profile.student.name || profile.student.email)?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: colors.gray[800] }}>
                    {profile.student.name || t('(sem nome)')}
                  </Text>
                  {profile.summary.top_performer && (
                    <View style={{ backgroundColor: colors.success[100], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.success[600] }}>
                        ⭐ {t('Destaque')}
                      </Text>
                    </View>
                  )}
                  {profile.summary.at_risk && !profile.summary.top_performer && (
                    <View style={{ backgroundColor: colors.error[100], borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.error[600] }}>
                        ⚠️ {t('Em risco')}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: colors.gray[500], marginTop: 2 }}>
                  {profile.student.email}
                </Text>
                {profile.student.member_since && (
                  <Text style={{ fontSize: 12, color: colors.gray[400], marginTop: 2 }}>
                    {t('Membro desde')} {formatDate(profile.student.member_since)}
                  </Text>
                )}
              </View>
            </View>

            {/* Access row */}
            <View
              style={{
                flexDirection: 'row',
                marginTop: 16,
                paddingTop: 14,
                borderTopWidth: 1,
                borderTopColor: colors.gray[100],
                gap: 16,
              }}
            >
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Feather name="clock" size={16} color={colors.primary[500]} />
                <Text style={{ fontSize: 12, color: colors.gray[500], marginTop: 4, textAlign: 'center' }}>
                  {t('Último acesso')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray[700], marginTop: 2 }}>
                  {formatRelative(profile.access.last_access)}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.gray[100] }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Feather name="log-in" size={16} color={colors.primary[500]} />
                <Text style={{ fontSize: 12, color: colors.gray[500], marginTop: 4, textAlign: 'center' }}>
                  {t('Total de acessos')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray[700], marginTop: 2 }}>
                  {profile.access.total_logins}
                </Text>
              </View>
              <View style={{ width: 1, backgroundColor: colors.gray[100] }} />
              <View style={{ flex: 1, alignItems: 'center' }}>
                <Feather name="calendar" size={16} color={colors.primary[500]} />
                <Text style={{ fontSize: 12, color: colors.gray[500], marginTop: 4, textAlign: 'center' }}>
                  {t('Dias ativos')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray[700], marginTop: 2 }}>
                  {profile.access.active_days}
                </Text>
              </View>
            </View>
          </View>

          {/* ── Insight Alert ────────────────────────────────────────────── */}
          {profile.summary.at_risk && !profile.summary.top_performer && (
            <View
              style={{
                backgroundColor: colors.error[100],
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                borderLeftWidth: 4,
                borderLeftColor: colors.error[500],
              }}
            >
              <MaterialIcons name="warning" size={20} color={colors.error[600]} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.error[700], marginBottom: 2 }}>
                  {t('Aluno em risco')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.error[600] }}>
                  {profile.summary.overall_avg_score !== null && profile.summary.overall_avg_score < 60
                    ? t('Média abaixo de 60%. Recomende revisão dos módulos anteriores.')
                    : t('Baixo engajamento detectado. Aluno acessou menos de 40% das aulas.')}
                </Text>
              </View>
            </View>
          )}
          {profile.summary.top_performer && (
            <View
              style={{
                backgroundColor: colors.success[100],
                borderRadius: 14,
                padding: 14,
                marginBottom: 16,
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                borderLeftWidth: 4,
                borderLeftColor: colors.success[500],
              }}
            >
              <MaterialIcons name="star" size={20} color={colors.success[600]} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: colors.success[700], marginBottom: 2 }}>
                  {t('Aluno destaque')}
                </Text>
                <Text style={{ fontSize: 13, color: colors.success[600] }}>
                  {t('Alta performance e bom engajamento. Considere conteúdos avançados.')}
                </Text>
              </View>
            </View>
          )}

          {/* ── Summary Stats ─────────────────────────────────────────────── */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray[500], marginBottom: 10, letterSpacing: 0.5 }}>
            {t('RESUMO GERAL').toUpperCase()}
          </Text>

          <View style={{ flexDirection: 'row', marginBottom: 10 }}>
            <StatCard
              icon={<MaterialCommunityIcons name="play-circle-outline" size={22} color={colors.primary[500]} />}
              label={t('Aulas')}
              value={`${profile.summary.lessons_viewed}/${profile.summary.total_lessons}`}
              sub={`${profile.summary.lessons_pct}% ${t('assistidas')}`}
              tint={colors.primary[500]}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="clipboard-check-outline" size={22} color={colors.warning[600]} />}
              label={t('Atividades')}
              value={`${profile.summary.activities_submitted}/${profile.summary.total_activities}`}
              sub={`${profile.summary.activities_pct}% ${t('enviadas')}`}
              tint={colors.warning[600]}
            />
          </View>
          <View style={{ flexDirection: 'row', marginBottom: 16 }}>
            <StatCard
              icon={<MaterialIcons name="grade" size={22} color={scoreColor(profile.summary.overall_avg_score)} />}
              label={t('Média geral')}
              value={profile.summary.overall_avg_score !== null ? `${profile.summary.overall_avg_score}%` : '—'}
              tint={scoreColor(profile.summary.overall_avg_score)}
            />
            <StatCard
              icon={<MaterialCommunityIcons name="cards-outline" size={22} color={colors.success[500]} />}
              label={t('Flashcards')}
              value={`${profile.summary.cards_reviewed}/${profile.summary.total_cards}`}
              sub={t('cartas revisadas')}
              tint={colors.success[500]}
            />
          </View>

          {(profile.summary.xp != null || (profile.summary.badges?.length ?? 0) > 0) && (
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <MaterialCommunityIcons name="trophy-outline" size={22} color={colors.primary[600]} />
                <Text style={{ marginLeft: 8, fontWeight: '700', color: colors.gray[800] }}>
                  {profile.summary.xp ?? 0} XP
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {(profile.summary.badges ?? [])
                  .filter((b) => b !== 'at_risk')
                  .map((badge) => (
                    <View
                      key={badge}
                      style={{
                        backgroundColor: colors.primary[50],
                        borderRadius: 99,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ fontSize: 11, fontWeight: '700', color: colors.primary[700] }}>
                        {badge === 'first_step'
                          ? t('First activity')
                          : badge === 'perfect'
                            ? t('Perfect score')
                            : badge === 'podium'
                              ? t('Podium')
                              : badge === 'top_performer'
                                ? t('Top student')
                                : badge}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}

          {/* ── Overall Progress Bar ──────────────────────────────────────── */}
          {(profile.summary.total_lessons > 0 || profile.summary.total_activities > 0) && (
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.06,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray[700] }}>
                  {t('Progresso geral no classroom')}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary[500] }}>
                  {Math.round(
                    ((profile.summary.lessons_viewed + profile.summary.activities_submitted) /
                      Math.max(profile.summary.total_lessons + profile.summary.total_activities, 1)) *
                      100,
                  )}%
                </Text>
              </View>
              <ProgressBar
                pct={Math.round(
                  ((profile.summary.lessons_viewed + profile.summary.activities_submitted) /
                    Math.max(profile.summary.total_lessons + profile.summary.total_activities, 1)) *
                    100,
                )}
                color={colors.primary[500]}
              />
            </View>
          )}

          {/* ── Per-Course Progress ───────────────────────────────────────── */}
          {profile.courses.length > 0 && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', color: colors.gray[500], marginBottom: 10, letterSpacing: 0.5 }}>
                {t('CURSOS').toUpperCase()}
              </Text>
              {profile.courses.map((course) => (
                <CourseSection key={course._id} course={course} t={t} />
              ))}
            </>
          )}

          {profile.courses.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 32 }}>
              <MaterialCommunityIcons name="book-open-page-variant-outline" size={48} color={colors.gray[300]} />
              <Text style={{ color: colors.gray[400], marginTop: 12, fontSize: 14 }}>
                {t('Nenhum curso disponível neste classroom.')}
              </Text>
            </View>
          )}
        </ScrollView>
      ) : null}

      <Modal visible={confirmRemove} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 16,
            backgroundColor: colors.overlay.medium,
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: 24,
              width: '100%',
              maxWidth: 420,
              padding: 24,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '800', color: colors.gray[800], marginBottom: 8 }}>
              {t('Remove from classroom')}
            </Text>
            <Text style={{ fontSize: 14, color: colors.gray[600], marginBottom: 20, lineHeight: 20 }}>
              {t('Are you sure you want to remove {{name}} from this classroom?', {
                name: profile?.student.name || studentName || t('(sem nome)'),
              })}
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                onPress={() => setConfirmRemove(false)}
                disabled={removing}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: colors.gray[200],
                }}
              >
                <Text style={{ fontWeight: '700', color: colors.gray[700] }}>{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRemoveUser}
                disabled={removing}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  paddingVertical: 12,
                  alignItems: 'center',
                  backgroundColor: colors.error[500],
                }}
              >
                {removing ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={{ fontWeight: '700', color: colors.white }}>{t('Remove user')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
