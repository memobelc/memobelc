import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, AppState, useWindowDimensions } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { colors } from '@/styles/colors';
import { useTranslation } from 'react-i18next';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import BrainAvatarView from '@/components/atoms/BrainAvatar';

type StreakData = {
  current_streak: number;
  last_study_date: string | null;
  week_study_days: boolean[]; // 7 dias, começando do mais antigo (6 dias atrás) até hoje
};

const StudyStreak = () => {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const [streakData, setStreakData] = useState<StreakData>({
    current_streak: 0,
    last_study_date: null,
    week_study_days: [false, false, false, false, false, false, false],
  });
  const [loading, setLoading] = useState(true);

  const fetchStreak = async () => {
    if (!userInfo?.token) return;

    try {
      const response = await api.get('/streak/get', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });
      if (response.data) {
        setStreakData(response.data);
      }
    } catch (error) {
      console.error('Error fetching streak:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo?.token) {
      fetchStreak();
    }
  }, [userInfo?.token]);

  // Atualiza quando a tela ganha foco (usuário volta para home)
  useFocusEffect(
    useCallback(() => {
      if (userInfo?.token) {
        fetchStreak();
      }
    }, [userInfo?.token]),
  );

  // Atualiza quando o app volta para foreground
  useEffect(() => {
    if (!userInfo?.token) return;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        fetchStreak();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [userInfo?.token]);

  // Day names (short) - Monday = 0, from locale
  const dayNamesArray = [
    t('Mon'),
    t('Tue'),
    t('Wed'),
    t('Thu'),
    t('Fri'),
    t('Sat'),
    t('Sun'),
  ];

  // Calcula os dias da semana para os últimos 7 dias
  const getDayLabels = () => {
    const today = new Date();
    const labels: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dayIndex = date.getDay(); // 0 = domingo, 6 = sábado
      // Ajusta para segunda-feira = 0
      const adjustedIndex = dayIndex === 0 ? 6 : dayIndex - 1;
      labels.push(dayNamesArray[adjustedIndex]);
    }

    return labels;
  };

  const dayLabels = getDayLabels();

  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  if (loading) {
    return (
      <View
        className="bg-white rounded-2xl p-4 shadow-sm"
        style={{
          elevation: 2,
          borderWidth: 1,
          borderColor: colors.gray[200],
        }}
      >
        <Text style={{ color: colors.gray[500] }}>{t('Loading...')}</Text>
      </View>
    );
  }

  return (
    <View
      className="rounded-3xl overflow-hidden"
      style={{
        backgroundColor: colors.gray[100],
        borderWidth: 2,
        borderColor: colors.primary[500],
        elevation: 3,
        shadowColor: colors.primary[500],
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
      }}
    >
      <View
        style={{ backgroundColor: colors.primary[500] }}
        className="p-4 md:p-6 "
      >
        {/* Header com streak count - design amigável */}
        <View className="flex-row items-center justify-center mb-5 md:mb-6">
          <View className="flex-row items-center">
            {/* Ícone de fogo suave e amigável */}
            <View className="bg-white rounded-full p-2 md:p-3 mr-3 md:mr-4">
              {streakData.current_streak > 0 ? (
                <BrainAvatarView expression="celebrating" size={isMobile ? 36 : 40} />
              ) : (
                <MaterialIcons
                  name="local-fire-department"
                  size={isMobile ? 32 : 36}
                  color={colors.warning[500]}
                />
              )}
            </View>
            <View className="items-start">
              <Text
                className="text-4xl md:text-5xl font-bold"
                style={{
                  color: '#FFFFFF',
                  fontFamily: 'ComicSans',
                  textShadowColor: 'rgba(0, 0, 0, 0.15)',
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 3,
                  letterSpacing: -0.5,
                }}
              >
                {streakData.current_streak}
              </Text>
              <Text
                className="text-sm md:text-base font-semibold"
                style={{
                  color: '#FFFFFF',
                  fontFamily: 'ComicSans',
                  textShadowColor: 'rgba(0, 0, 0, 0.1)',
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 2,
                }}
              >
                {t('Days in a row!')} 🌟
              </Text>
            </View>
          </View>
        </View>

        {/* Dias da semana - visual suave e claro */}
        <View
          className="flex-row justify-between items-center bg-white/30 rounded-2xl p-3 md:p-4"
          style={{ gap: isMobile ? 4 : 8 }}
        >
          {streakData.week_study_days.map((studied, index) => {
            const isToday = index === streakData.week_study_days.length - 1;
            const dayName = dayLabels[index];
            const circleSize = isMobile ? 40 : 44;

            return (
              <View key={index} className="items-center flex-1">
                <View
                  className="rounded-full items-center justify-center mb-2"
                  style={{
                    width: circleSize,
                    height: circleSize,
                    backgroundColor: studied
                      ? colors.success[500]
                      : isToday
                        ? colors.warning[100]
                        : colors.gray[200],
                    borderWidth: isToday && !studied ? 3 : studied ? 0 : 2,
                    borderColor:
                      isToday && !studied
                        ? colors.primary[500]
                        : studied
                          ? colors.success[600]
                          : colors.gray[300],
                    shadowColor: studied ? colors.success[500] : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: studied ? 0.2 : 0,
                    shadowRadius: studied ? 4 : 0,
                    elevation: studied ? 3 : 0,
                  }}
                >
                  {studied ? (
                    <MaterialIcons
                      name="check"
                      size={isMobile ? 22 : 24}
                      color="#FFFFFF"
                    />
                  ) : !isToday ? (
                    <MaterialIcons
                      name="close"
                      size={isMobile ? 18 : 20}
                      color={colors.error[500]}
                    />
                  ) : (
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: colors.primary[500],
                      }}
                    />
                  )}
                </View>
                <Text
                  className="text-xs font-semibold mt-1"
                  style={{
                    color: '#FFFFFF',
                    fontFamily: 'ComicSans',
                    textShadowColor: 'rgba(0, 0, 0, 0.15)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2,
                  }}
                >
                  {dayName}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Mensagem motivacional - suave e encorajadora */}
        {streakData.current_streak > 0 && (
          <View className="mt-4 md:mt-5 items-center">
            <Text
              className="text-xs md:text-sm font-semibold text-center px-2"
              style={{
                color: '#FFFFFF',
                fontFamily: 'ComicSans',
                textShadowColor: 'rgba(0, 0, 0, 0.15)',
                textShadowOffset: { width: 0, height: 1 },
                textShadowRadius: 2,
              }}
            >
              {streakData.current_streak === 1
                ? t('Great start! Keep learning! 🌱')
                : streakData.current_streak < 7
                  ? t('Amazing progress! You are doing great! ⭐')
                  : streakData.current_streak < 30
                    ? t('Incredible! You are a learning champion! 🏆')
                    : t('Legendary! You are a true master! 👑')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

export default StudyStreak;
