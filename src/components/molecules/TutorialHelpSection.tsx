import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { useToast } from '@/components/Toast';
import { tutorialsApi, type Tutorial, type TutorialProgress } from '@/services/tutorials';
import BrainAvatarView from '@/components/atoms/BrainAvatar';

function formatWhen(value?: string | null) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function TutorialHelpSection() {
  const { t, i18n } = useTranslation();
  const { userInfo } = useSession();
  const { startTutorial } = useTutorial();
  const { toast } = useToast();
  const [catalog, setCatalog] = useState<Tutorial[]>([]);
  const [history, setHistory] = useState<TutorialProgress[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const [catalogRes, historyRes] = await Promise.all([
        tutorialsApi.catalog(userInfo.token, i18n.language),
        tutorialsApi.history(userInfo.token, i18n.language),
      ]);
      setCatalog(catalogRes.data.tutorials || []);
      setHistory(historyRes.data.history || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading tutorials'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, i18n.language, t]);

  useEffect(() => {
    load();
  }, [load]);

  const replay = async (tutorialId: string) => {
    if (!userInfo?.token) return;
    try {
      const response = await tutorialsApi.replay(userInfo.token, tutorialId, i18n.language);
      if (response.data.tutorial) {
        startTutorial(response.data.tutorial);
      }
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading tutorials'),
        variant: 'destructive',
      });
    }
  };

  const latest = history[0];
  const news = catalog.filter((item) => item.status === 'active');

  return (
    <View className="bg-white rounded-2xl p-4 mb-4">
      <View className="flex-row items-center mb-2">
        <BrainAvatarView expression="tip" size={48} />
        <View className="flex-1 ml-2">
          <Text className="text-lg font-bold" style={{ color: colors.primary[600] }}>
            {t('Tutorial and help')}
          </Text>
          <Text className="text-xs text-gray-500">
            {t('Last viewed')}: {formatWhen(latest?.last_viewed_at)}
          </Text>
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <>
          <Text className="font-semibold mt-2 mb-2" style={{ color: colors.gray[800] }}>
            {t('Replay tutorial')}
          </Text>
          {news.length === 0 ? (
            <Text className="text-sm text-gray-400 mb-2">{t('No tutorials yet')}</Text>
          ) : (
            news.map((item) => (
              <TouchableOpacity
                key={item._id}
                onPress={() => replay(item._id)}
                className="py-3"
                style={{ minHeight: 44 }}
              >
                <Text className="font-bold" style={{ color: colors.primary[700] }}>
                  {String(item.name)} · v{item.version}
                </Text>
                <Text className="text-xs text-gray-500">{String(item.description || '')}</Text>
              </TouchableOpacity>
            ))
          )}
          <Text className="font-semibold mt-3 mb-2" style={{ color: colors.gray[800] }}>
            {t("What's new")}
          </Text>
          {news.map((item) => (
            <Text key={`news-${item._id}`} className="text-sm text-gray-600 mb-1">
              {String(item.name)} (v{item.version})
            </Text>
          ))}
          <Text className="font-semibold mt-3 mb-2" style={{ color: colors.gray[800] }}>
            {t('Tutorial history')}
          </Text>
          {history.length === 0 ? (
            <Text className="text-sm text-gray-400">{t('No tutorials viewed yet')}</Text>
          ) : (
            history.map((item, index) => (
              <TouchableOpacity
                key={`${item.tutorial_id}-${index}`}
                onPress={() => item.tutorial_id && replay(item.tutorial_id)}
                className="py-2"
              >
                <Text className="text-sm" style={{ color: colors.gray[800] }}>
                  {item.name || item.tutorial_key} · v{item.version}
                </Text>
                <Text className="text-xs text-gray-500">
                  {item.completed ? t('Completed') : item.skipped ? t('Skipped') : t('In progress')}
                  {' · '}
                  {formatWhen(item.last_viewed_at)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}
    </View>
  );
}
