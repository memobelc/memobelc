import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Linking,
  useWindowDimensions,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons, Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import YoutubeIframe from 'react-native-youtube-iframe';
import { WebView } from 'react-native-webview';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { ILesson, ILessonDeck, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { StarRating } from '@/components/molecules/StarRating';
import {
  PublishStatus,
  PublishStatusFields,
} from '@/components/atoms/PublishStatusFields';
import { ModalGenerateCards } from '@/components/atoms/ModalGenerateCards';

function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?/\s]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default function LessonViewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { lessonId, lessonTitle } = useLocalSearchParams<{
    lessonId: string;
    lessonTitle: string;
  }>();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { currentCourse, currentCollection, setCurrentDeck } = useCollection();
  const { width: windowWidth } = useWindowDimensions();

  const [lesson, setLesson] = useState<ILesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [markedViewed, setMarkedViewed] = useState(false);
  const [playerSize, setPlayerSize] = useState({ width: 0, height: 0 });
  const [myRating, setMyRating] = useState<number | null>(null);
  const [lessonDecks, setLessonDecks] = useState<ILessonDeck[]>([]);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkMode, setLinkMode] = useState<'existing' | 'new'>('existing');
  const [linking, setLinking] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckStatus, setNewDeckStatus] = useState<PublishStatus>('published');
  const [newDeckScheduledAt, setNewDeckScheduledAt] = useState('');
  const [generatedCards, setGeneratedCards] = useState<{ _id: number; front: string; back: string }[]>([]);
  const [openCardGenerator, setOpenCardGenerator] = useState(false);
  const [selectedLinkDeckId, setSelectedLinkDeckId] = useState<string | null>(null);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [linkCards, setLinkCards] = useState<{ _id: string; front: string }[]>([]);
  const [useCardSubset, setUseCardSubset] = useState(false);

  const isCourseTeacher =
    !!currentCourse?.teacher_id &&
    !!lesson?.course_id &&
    String(currentCourse._id) === String(lesson.course_id) &&
    String(currentCourse.teacher_id) === String(userInfo?.user_id);

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    try {
      setLoading(true);
      const res = await api.get(`/course/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      setLesson(res.data);
      setMyRating(res.data?.my_rating ?? null);
      setLessonDecks(res.data?.decks ?? []);
    } catch {
      toast({ message: t('Failed to load lesson'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [lessonId, userInfo?.token]);

  useEffect(() => {
    fetchLesson();
  }, [fetchLesson]);

  const handleRateLesson = async (stars: number) => {
    if (!lessonId || !userInfo?.token) return;
    const previous = myRating;
    setMyRating(stars);
    try {
      await api.put(
        `/course/lesson/${lessonId}/rating`,
        { stars },
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
    } catch {
      setMyRating(previous);
      toast({ message: t('Failed to save rating'), variant: 'destructive' });
    }
  };

  const openDeck = (item: ILessonDeck) => {
    setCurrentDeck({
      _id: item.deck_id,
      name: item.name,
      image: item.image || null,
      pending_cards: item.total_cards,
      total_cards: item.total_cards,
      created_at: new Date(),
      updated_at: new Date(),
      cards: [],
      review_cards: [],
      status: item.status,
      scheduled_at: item.scheduled_at,
      lesson_linked: true,
    });
    router.push({
      pathname: '/(app)/deck',
      params: { name: item.name },
    });
  };

  const handleUnlockDeck = async (item: ILessonDeck) => {
    if (!lessonId) return;
    try {
      setUnlockingId(item.deck_id);
      const res = await api.post(
        `/course/lesson/${lessonId}/decks/${item.deck_id}/unlock`,
        {},
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      toast({ message: t('Deck added to classroom'), variant: 'success' });
      const unlocked = res.data as ILessonDeck;
      setLessonDecks((prev) =>
        prev.map((deck) => (deck.deck_id === item.deck_id ? { ...deck, ...unlocked } : deck)),
      );
      openDeck({ ...item, ...unlocked, unlocked: true });
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Failed to generate deck'),
        variant: 'destructive',
      });
    } finally {
      setUnlockingId(null);
    }
  };

  const handleUnlinkDeck = (item: ILessonDeck) => {
    if (!lessonId) return;
    Alert.alert(t('Unlink deck'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Unlink'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/course/lesson/${lessonId}/decks/${item.deck_id}`, {
              headers: { Authorization: `Bearer ${userInfo?.token}` },
            });
            setLessonDecks((prev) => prev.filter((deck) => deck.deck_id !== item.deck_id));
            toast({ message: t('Deck unlinked'), variant: 'success' });
          } catch {
            toast({ message: t('Failed to unlink deck'), variant: 'destructive' });
          }
        },
      },
    ]);
  };

  const loadDeckCards = async (deckId: string) => {
    try {
      const res = await api.get(`/card/get_cards_by_deck/${deckId}`, {
        params: { user_id: userInfo?.user_id },
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      setLinkCards((res.data?.cards || []).map((card: any) => ({
        _id: card._id,
        front: card.front,
      })));
    } catch {
      setLinkCards([]);
    }
  };

  const handleLinkDeck = async () => {
    if (!lessonId) return;
    try {
      setLinking(true);
      const payload: Record<string, unknown> = {};
      if (linkMode === 'existing') {
        if (!selectedLinkDeckId) return;
        payload.deck_id = selectedLinkDeckId;
        if (useCardSubset) payload.card_ids = selectedCardIds;
      } else {
        if (!newDeckName.trim()) return;
        payload.name = newDeckName.trim();
        payload.status = newDeckStatus;
        payload.scheduled_at =
          newDeckStatus === 'scheduled' && newDeckScheduledAt ? newDeckScheduledAt : null;
        payload.cards = generatedCards.map(({ _id, ...rest }) => rest);
      }
      const res = await api.post(`/course/lesson/${lessonId}/decks`, payload, {
        headers: { Authorization: `Bearer ${userInfo?.token}` },
      });
      setLessonDecks((prev) => {
        const next = prev.filter((deck) => deck.deck_id !== res.data.deck_id);
        return [...next, res.data];
      });
      setShowLinkModal(false);
      setSelectedLinkDeckId(null);
      setSelectedCardIds([]);
      setUseCardSubset(false);
      setNewDeckName('');
      setGeneratedCards([]);
      toast({ message: t('Deck linked to lesson'), variant: 'success' });
    } catch (error: any) {
      toast({
        message: error?.response?.data?.error || t('Failed to link deck'),
        variant: 'destructive',
      });
    } finally {
      setLinking(false);
    }
  };

  // Mark lesson as viewed for students (fire-and-forget)
  useEffect(() => {
    if (!lessonId || !userInfo?.token || markedViewed) return;
    setMarkedViewed(true);
    api
      .post(
        `/course/lesson/${lessonId}/viewed`,
        {},
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      )
      .then(() => fetchLesson())
      .catch(() => {/* silently ignore */});
  }, [lessonId, userInfo?.token]);

  const renderVideo = () => {
    if (!lesson?.video_url) {
      return (
        <View
          className="w-full items-center justify-center rounded-2xl"
          style={{ height: 200, backgroundColor: colors.gray[100] }}
        >
          <MaterialCommunityIcons
            name="video-off-outline"
            size={48}
            color={colors.gray[400]}
          />
          <Text className="text-gray-400 mt-2">{t('No video available')}</Text>
        </View>
      );
    }

    if (lesson.video_type === 'youtube') {
      const videoId = extractYoutubeId(lesson.video_url);
      if (!videoId) {
        return (
          <TouchableOpacity
            className="w-full rounded-2xl overflow-hidden items-center justify-center py-8"
            style={{ backgroundColor: colors.primary[50], borderWidth: 1, borderColor: colors.primary[200] }}
            onPress={() => Linking.openURL(lesson.video_url)}
          >
            <MaterialCommunityIcons name="youtube" size={48} color="#FF0000" />
            <Text className="text-primary-600 font-semibold mt-2">
              {t('Open on YouTube')}
            </Text>
          </TouchableOpacity>
        );
      }
      const playerWidth =
        playerSize.width > 0 ? playerSize.width : Math.min(windowWidth * 0.8, 1440);
      const playerHeight =
        playerSize.height > 0 ? playerSize.height : (playerWidth * 9) / 16;
      return (
        <View
          className="w-full rounded-2xl overflow-hidden"
          style={{ aspectRatio: 16 / 9, backgroundColor: colors.gray[900] }}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width !== playerSize.width || height !== playerSize.height) {
              setPlayerSize({ width, height });
            }
          }}
        >
          {Platform.OS === 'web' ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}`}
              title={lesson.title || 'YouTube video'}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{ width: '100%', height: '100%', border: 0 }}
              onLoad={() => setPlayerReady(true)}
            />
          ) : (
            <YoutubeIframe
              height={playerHeight}
              width={playerWidth}
              videoId={videoId}
              onReady={() => setPlayerReady(true)}
            />
          )}
          {!playerReady && (
            <View
              className="absolute inset-0 items-center justify-center"
              style={{ backgroundColor: colors.gray[900] }}
            >
              <ActivityIndicator color={colors.white} size="large" />
            </View>
          )}
        </View>
      );
    }

    if (lesson.video_type === 'upload' || lesson.video_type === 'other') {
      if (Platform.OS === 'web') {
        return (
          <View className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
            {/* Native HTML5 video element for web */}
            <video
              src={lesson.video_url}
              controls
              style={{ width: '100%', height: '100%', borderRadius: 16, background: '#000' }}
            />
          </View>
        );
      }
      // Native: use WebView with an inline HTML5 video player
      return (
        <View className="w-full rounded-2xl overflow-hidden" style={{ aspectRatio: 16 / 9 }}>
          <WebView
            source={{
              html: `<html><body style="margin:0;background:#000;display:flex;align-items:center;justify-content:center;height:100vh">
                <video src="${lesson.video_url}" controls autoplay style="width:100%;max-height:100vh" playsinline></video>
              </body></html>`,
            }}
            style={{ flex: 1 }}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
          />
        </View>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8">
      {/* Header */}
      <View className="flex-row w-full justify-between items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
          <Text style={{ color: colors.primary[500] }} className="ml-1">
            {t('Back')}
          </Text>
        </TouchableOpacity>
        <Text
          className="text-xl font-bold text-gray-800 flex-1 text-center mx-2"
          numberOfLines={1}
        >
          {lessonTitle || lesson?.title}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Video Player */}
        <View className="mb-6">{renderVideo()}</View>

        {/* Lesson info */}
        <View
          className="rounded-2xl p-5"
          style={{
            backgroundColor: colors.white,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <Text className="text-xl font-bold text-gray-800 mb-2">
            {lesson?.title}
          </Text>
          {lesson?.scheduled_at && (
            <View
              className="flex-row items-center gap-1 mb-3 px-3 py-1.5 rounded-lg self-start"
              style={{ backgroundColor: colors.warning[100] }}
            >
              <MaterialIcons name="schedule" size={14} color={colors.warning[700]} />
              <Text className="text-xs font-semibold" style={{ color: colors.warning[700] }}>
                {t('Scheduled for')} {new Date(lesson.scheduled_at).toLocaleString()}
              </Text>
            </View>
          )}
          {!!lesson?.description && (
            <Text className="text-gray-600 leading-6">{lesson.description}</Text>
          )}
          {!lesson?.description && (
            <Text className="text-gray-400 italic">{t('No description')}</Text>
          )}
          {!isCourseTeacher && (
            <View className="mt-5 pt-4" style={{ borderTopWidth: 1, borderTopColor: colors.gray[200] }}>
              <Text className="text-sm font-semibold text-gray-600 mb-2">
                {t('Rate this lesson')}
              </Text>
              <StarRating value={myRating} onChange={handleRateLesson} />
            </View>
          )}
        </View>

        <View
          className="rounded-2xl p-5 mt-4"
          style={{
            backgroundColor: colors.white,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.07,
            shadowRadius: 8,
            elevation: 2,
          }}
        >
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-lg font-bold text-gray-800">{t('Lesson decks')}</Text>
            {isCourseTeacher && (
              <TouchableOpacity
                onPress={() => {
                  setLinkMode('existing');
                  setShowLinkModal(true);
                }}
                className="flex-row items-center px-3 py-1.5 rounded-full"
                style={{ backgroundColor: colors.primary[50] }}
              >
                <MaterialIcons name="add" size={16} color={colors.primary[600]} />
                <Text className="text-xs font-semibold ml-1" style={{ color: colors.primary[600] }}>
                  {t('Link deck')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {lessonDecks.length === 0 ? (
            <Text className="text-gray-400 italic">
              {isCourseTeacher
                ? t('No decks linked to this lesson yet.')
                : t('No decks for this lesson.')}
            </Text>
          ) : (
            lessonDecks.map((item) => (
              <View
                key={item.deck_id}
                className="flex-row items-center py-3"
                style={{ borderTopWidth: 1, borderTopColor: colors.gray[100] }}
              >
                <MaterialCommunityIcons name="cards-outline" size={22} color={colors.primary[500]} />
                <View className="flex-1 mx-3">
                  <Text className="font-semibold text-gray-800">{item.name}</Text>
                  <Text className="text-xs text-gray-400">
                    {item.total_cards} {t('cards')}
                    {item.status !== 'published' ? ` · ${t(item.status === 'draft' ? 'Draft' : 'Scheduled')}` : ''}
                    {!item.whole_deck ? ` · ${t('Selected cards')}` : ''}
                  </Text>
                </View>
                {isCourseTeacher ? (
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => openDeck(item)}>
                      <Feather name="eye" size={18} color={colors.gray[500]} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleUnlinkDeck(item)}>
                      <MaterialIcons name="link-off" size={18} color={colors.error[500]} />
                    </TouchableOpacity>
                  </View>
                ) : item.unlocked ? (
                  <TouchableOpacity
                    onPress={() => openDeck(item)}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: colors.primary[50] }}
                  >
                    <Text className="text-xs font-semibold" style={{ color: colors.primary[600] }}>
                      {t('Open deck')}
                    </Text>
                  </TouchableOpacity>
                ) : item.can_unlock ? (
                  <TouchableOpacity
                    onPress={() => handleUnlockDeck(item)}
                    disabled={unlockingId === item.deck_id}
                    className="px-3 py-1.5 rounded-full"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    {unlockingId === item.deck_id ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text className="text-xs font-bold text-white">{t('Generate deck')}</Text>
                    )}
                  </TouchableOpacity>
                ) : (
                  <Text className="text-xs text-gray-400">{t('Watch the lesson to unlock')}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        transparent
        animationType="slide"
        visible={showLinkModal}
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View className="bg-white rounded-3xl w-full md:max-w-2xl p-6" style={{ maxHeight: '90%' }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold">{t('Link deck')}</Text>
                <TouchableOpacity onPress={() => setShowLinkModal(false)}>
                  <MaterialIcons name="close" size={22} color={colors.gray[600]} />
                </TouchableOpacity>
              </View>
              <View className="flex-row gap-2 mb-4">
                <TouchableOpacity
                  onPress={() => setLinkMode('existing')}
                  className="flex-1 py-2 rounded-xl items-center"
                  style={{
                    backgroundColor: linkMode === 'existing' ? colors.primary[50] : colors.gray[100],
                  }}
                >
                  <Text className="text-sm font-semibold">{t('Existing deck')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setLinkMode('new')}
                  className="flex-1 py-2 rounded-xl items-center"
                  style={{
                    backgroundColor: linkMode === 'new' ? colors.primary[50] : colors.gray[100],
                  }}
                >
                  <Text className="text-sm font-semibold">{t('New deck')}</Text>
                </TouchableOpacity>
              </View>

              {linkMode === 'existing' ? (
                <View>
                  {(currentCollection?.decks || []).map((deck) => (
                    <TouchableOpacity
                      key={deck._id}
                      onPress={() => {
                        setSelectedLinkDeckId(deck._id);
                        setSelectedCardIds([]);
                        setUseCardSubset(false);
                        loadDeckCards(deck._id);
                      }}
                      className="flex-row items-center py-2 px-3 rounded-xl mb-2"
                      style={{
                        backgroundColor:
                          selectedLinkDeckId === deck._id ? colors.primary[50] : colors.gray[100],
                      }}
                    >
                      <MaterialCommunityIcons name="cards" size={18} color={colors.primary[500]} />
                      <Text className="ml-2 flex-1 font-semibold">{deck.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {selectedLinkDeckId && (
                    <TouchableOpacity
                      onPress={() => setUseCardSubset(!useCardSubset)}
                      className="mt-2 mb-2"
                    >
                      <Text style={{ color: colors.primary[600] }} className="font-semibold">
                        {useCardSubset ? t('Use whole deck') : t('Select specific cards')}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {useCardSubset &&
                    linkCards.map((card) => {
                      const selected = selectedCardIds.includes(card._id);
                      return (
                        <TouchableOpacity
                          key={card._id}
                          onPress={() =>
                            setSelectedCardIds((prev) =>
                              selected
                                ? prev.filter((id) => id !== card._id)
                                : [...prev, card._id],
                            )
                          }
                          className="flex-row items-center py-2"
                        >
                          <MaterialIcons
                            name={selected ? 'check-box' : 'check-box-outline-blank'}
                            size={20}
                            color={selected ? colors.primary[500] : colors.gray[400]}
                          />
                          <Text className="ml-2 flex-1" numberOfLines={1}>
                            {card.front || t('Card')}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </View>
              ) : (
                <View>
                  <TextInput
                    className="border border-gray-200 rounded-xl px-3 py-3 mb-3"
                    placeholder={t('Enter name deck')}
                    value={newDeckName}
                    onChangeText={setNewDeckName}
                  />
                  <PublishStatusFields
                    status={newDeckStatus}
                    scheduledAt={newDeckScheduledAt}
                    onStatusChange={setNewDeckStatus}
                    onScheduledAtChange={setNewDeckScheduledAt}
                  />
                  <TouchableOpacity
                    className="border border-dashed rounded-2xl items-center mb-3 py-3"
                    onPress={() => setOpenCardGenerator(true)}
                  >
                    <Text style={{ color: generatedCards.length ? colors.primary[500] : colors.gray[500] }}>
                      {generatedCards.length
                        ? t(`${generatedCards.length} cards generated`)
                        : t('Generate cards with AI')}
                    </Text>
                  </TouchableOpacity>
                  <ModalGenerateCards
                    open={openCardGenerator}
                    setOpen={setOpenCardGenerator}
                    setGeneratedCards={setGeneratedCards}
                  />
                </View>
              )}

              <TouchableOpacity
                onPress={handleLinkDeck}
                disabled={linking}
                className="rounded-xl py-3 items-center mt-2"
                style={{ backgroundColor: colors.primary[500] }}
              >
                {linking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white font-bold">{t('Save')}</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
