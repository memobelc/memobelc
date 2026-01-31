import { useState, useEffect, useCallback } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Platform } from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Loading } from '@/components/Loading';
import AudioPlayer from '@/components/atoms/AudioPlayer';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useCollection } from '@/contexts/CollectionContext';
import FlipBook from './FlipBook';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Chapter = {
  titulo?: string;
  title?: string;
  pdf_url?: string;
  audio_url?: string;
  ordem?: number;
  images_urls?: string[];
  deck_id?: string;
  has_cards?: boolean;
  user_has_saved?: boolean;
};

type Book = {
  _id: string;
  titulo: string;
  autor?: string;
  capa: string | null;
  idioma: string;
  nivel: string;
  genero?: string;
  chapters: Chapter[];
};

/** Dica de tutorial: "Arraste para o lado" com seta animada */
function SwipeTutorialHint({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const offset = useSharedValue(0);
  useEffect(() => {
    offset.value = withRepeat(
      withSequence(
        withTiming(-14, { duration: 550 }),
        withTiming(0, { duration: 550 }),
      ),
      -1,
      true,
    );
  }, [offset]);
  const arrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));
  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onDismiss}
      style={{
        position: 'absolute',
        bottom: 100,
        left: 16,
        right: 16,
        backgroundColor: 'rgba(0,0,0,0.75)',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: '#fff', fontSize: 15, marginRight: 12 }}>
        {typeof message === 'string' ? message : ''}
      </Text>
      <Animated.View style={arrowStyle}>
        <MaterialIcons name="chevron-left" size={28} color="#fff" />
      </Animated.View>
    </TouchableOpacity>
  );
}

// Evita importar módulo nativo de WebView no web
let NativeWebView: any = null;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  NativeWebView = require('react-native-webview').WebView;
}

export default function BookScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const { setCollections } = useCollection();

  const [book, setBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingCards, setSavingCards] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasOpenedWebPdf, setHasOpenedWebPdf] = useState(false);
  const [showSwipeTutorial, setShowSwipeTutorial] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchBook = async () => {
    if (!userInfo?.token || !bookId) return;

    try {
      const response = await api.get(`/books/get/${bookId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });

      if (response.data) {
        setBook(response.data);
        // Seleciona o primeiro capítulo ou capítulo único
        if (response.data.chapters && response.data.chapters.length > 0) {
          const sortedChapters = [...response.data.chapters].sort(
            (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0),
          );
          setSelectedChapter(sortedChapters[0]);
        }
      }
    } catch (error: any) {
      console.error('Error fetching book:', error);
      toast({
        message: error.response?.data?.error || t('Error loading book'),
        variant: 'destructive',
      });
      router.back();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userInfo?.token && bookId) {
      fetchBook();
    }
  }, [userInfo?.token, bookId]);

  const handlePageChange = (page: number, numberOfPages: number) => {
    setCurrentPage(page);
    setTotalPages(numberOfPages);
  };

  const getPdfViewerUrl = () => {
    if (!selectedChapter?.pdf_url) return '';
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
      selectedChapter.pdf_url,
    )}`;
  };

  const handleSaveChapterCards = async () => {
    if (!bookId || !selectedChapter?.deck_id || !userInfo?.token || selectedChapter.user_has_saved) return;
    setSavingCards(true);
    try {
      const response = await api.post(
        '/books/save-chapter-cards',
        { book_id: bookId, deck_id: selectedChapter.deck_id },
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      if (response.data?.collection_id) {
        setBook((prev) =>
          prev
            ? {
                ...prev,
                chapters: prev.chapters.map((ch) =>
                  ch.deck_id === selectedChapter.deck_id ? { ...ch, user_has_saved: true } : ch,
                ),
              }
            : null,
        );
        setSelectedChapter((prev) => (prev ? { ...prev, user_has_saved: true } : null));
        toast({ message: t('Cards added to your collection'), variant: 'success' });
        try {
          const collRes = await api.get('/collections/get_by_user', {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          });
          if (collRes.data?.collections && setCollections) setCollections(collRes.data.collections);
        } catch {
          // ignore refresh error
        }
      } else {
        toast({ message: response.data?.message || t('No cards to save'), variant: 'default' });
      }
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error saving cards'),
        variant: 'destructive',
      });
    } finally {
      setSavingCards(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading />
      </View>
    );
  }

  if (!book || !selectedChapter) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <MaterialIcons name="error-outline" size={60} color={colors.error[500]} />
        <Text className="text-lg mt-4 text-center" style={{ color: colors.gray[500] }}>
          {t('Book not found')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 px-6 py-3 rounded-lg"
          style={{ backgroundColor: colors.primary[500] }}
        >
          <Text style={{ color: '#FFFFFF' }}>{t('Back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const sortedChapters = [...book.chapters].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row justify-between items-center w-full p-3"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <MaterialCommunityIcons name="close" size={30} color={colors.gray[900]} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text
              className="font-semibold text-lg"
              style={{ color: colors.gray[900] }}
              numberOfLines={1}
            >
              {book.titulo}
            </Text>
            {book.autor && (
              <Text className="text-sm" style={{ color: colors.gray[500] }} numberOfLines={1}>
                {book.autor}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Chapter Selector (se houver múltiplos capítulos) */}
      {sortedChapters.length > 1 && (
        <View
          className="border-b border-t p-2"
          style={{ backgroundColor: colors.gray[50], borderColor: colors.gray[200] }}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {sortedChapters.map((chapter, index) => (
              <TouchableOpacity
                key={chapter.deck_id ?? index}
                onPress={() => {
                  setSelectedChapter(chapter);
                  setCurrentPage(1);
                  if (index >= 1) setShowSwipeTutorial(false);
                }}
                className={`px-4 py-2 mr-2 rounded-full ${
                  (selectedChapter?.ordem ?? 0) === (chapter.ordem ?? 0) ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color:
                      (selectedChapter?.ordem ?? 0) === (chapter.ordem ?? 0)
                        ? '#FFFFFF'
                        : colors.gray[700],
                  }}
                >
                  {chapter.titulo || chapter.title || `${t('Chapter')} ${chapter.ordem ?? index + 1}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Audio Player (se houver áudio) - altura reduzida */}
      {selectedChapter.audio_url && (
        <View
          className="flex-row items-center justify-center py-2 px-3 border-b"
          style={{ backgroundColor: colors.gray[50], borderColor: colors.gray[200] }}
        >
          <MaterialIcons
            name="headphones"
            size={20}
            color={colors.primary[500]}
            style={{ marginRight: 8 }}
          />
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: colors.gray[900] }}>
              {t('Audio')}
            </Text>
          </View>
          <AudioPlayer
            key={selectedChapter.deck_id ?? selectedChapter.ordem ?? 'audio'}
            audioUri={selectedChapter.audio_url}
            onEnd={
              sortedChapters.length >= 2 &&
              (selectedChapter?.ordem ?? 0) === (sortedChapters[0]?.ordem ?? 0)
                ? () => setShowSwipeTutorial(true)
                : undefined
            }
          />
        </View>
      )}

      {/* Viewer: imagens em formato livro (flip) ou PDF */}
      <View className="flex-1" style={{ minHeight: 0 }}>
        {(selectedChapter.images_urls?.length ?? 0) > 0 ? (
          <FlipBook
            key={selectedChapter.deck_id ?? selectedChapter.ordem ?? 0}
            images={selectedChapter.images_urls ?? []}
          />
        ) : (selectedChapter.pdf_url && selectedChapter.pdf_url.trim() !== '') ? (
          Platform.OS === 'web' ? (
            <View className="flex-1 items-center justify-center p-4">
              <MaterialIcons name="picture-as-pdf" size={60} color={colors.primary[500]} />
              <Text
                className="text-lg mt-4 text-center"
                style={{ color: colors.gray[700] }}
              >
                {t('Open the PDF to read the book')}
              </Text>
              <TouchableOpacity
                className="mt-4 px-6 py-3 rounded-lg"
                style={{ backgroundColor: colors.primary[500] }}
                onPress={() => {
                  const url = getPdfViewerUrl();
                  if (url && typeof window !== 'undefined') {
                    window.open(url, '_blank');
                    setHasOpenedWebPdf(true);
                  }
                }}
              >
                <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>
                  {t('Open PDF')}
                </Text>
              </TouchableOpacity>
              {hasOpenedWebPdf && (
                <Text
                  className="mt-2 text-xs text-center"
                  style={{ color: colors.gray[500] }}
                >
                  {t('The PDF was opened in a new browser tab.')}
                </Text>
              )}
            </View>
          ) : NativeWebView ? (
            <NativeWebView
              source={{ uri: getPdfViewerUrl() }}
              style={{ flex: 1 }}
              onLoadEnd={() => {
                setTotalPages(1);
                setCurrentPage(1);
              }}
              onError={(event: any) => {
                console.error('PDF WebView error:', event.nativeEvent);
                toast({
                  message: t('Error loading PDF'),
                  variant: 'destructive',
                });
              }}
            />
          ) : (
            <View className="flex-1 items-center justify-center p-4">
              <MaterialIcons name="error-outline" size={60} color={colors.error[500]} />
              <Text
                className="text-lg mt-4 text-center"
                style={{ color: colors.gray[500] }}
              >
                {t('Error loading PDF')}
              </Text>
            </View>
          )
        ) : (
          <View className="flex-1 items-center justify-center p-4">
            <MaterialIcons name="menu-book" size={60} color={colors.gray[400]} />
            <Text
              className="text-lg mt-4 text-center"
              style={{ color: colors.gray[500] }}
            >
              {t('No content for this chapter')}
            </Text>
          </View>
        )}
      </View>

      {/* Adicionar cartas do capítulo (só se o deck tiver cartas) - acima da safe area */}
      {selectedChapter.has_cards && (
        <View
          className="border-t px-4 py-3"
          style={{
            backgroundColor: colors.gray[50],
            borderColor: colors.gray[200],
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          {selectedChapter.user_has_saved ? (
            <View className="flex-row items-center justify-center py-2">
              <MaterialIcons name="check-circle" size={22} color={colors.gray[500]} style={{ marginRight: 8 }} />
              <Text className="text-base font-medium" style={{ color: colors.gray[600] }}>
                {t('Deck already added')}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={handleSaveChapterCards}
              disabled={savingCards}
              className="flex-row items-center justify-center py-3 px-4 rounded-xl"
              style={{ backgroundColor: colors.primary[500] }}
            >
              {savingCards ? (
                <Text className="text-base font-semibold" style={{ color: '#FFFFFF' }}>
                  {t('Adding...')}
                </Text>
              ) : (
                <>
                  <MaterialIcons name="collections-bookmark" size={22} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text className="text-base font-semibold" style={{ color: '#FFFFFF' }}>
                    {t('Add cards to my collection')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Tutorial: arraste para o próximo capítulo (após áudio do 1º capítulo) */}
      {showSwipeTutorial &&
        sortedChapters.length >= 2 &&
        (selectedChapter?.images_urls?.length ?? 0) > 0 ? (
          <SwipeTutorialHint
            message={t('Swipe to next chapter')}
            onDismiss={() => setShowSwipeTutorial(false)}
          />
        ) : null}

      {/* Page Indicator */}
      {selectedChapter.pdf_url && totalPages > 1 && (
        <View
          className="flex-row items-center justify-center p-3 border-t"
          style={{ backgroundColor: colors.gray[50], borderColor: colors.gray[200] }}
        >
          <Text className="text-sm" style={{ color: colors.gray[600] }}>
            {t('Page')} {currentPage} {t('of')} {totalPages}
          </Text>
        </View>
      )}
    </View>
  );
}
