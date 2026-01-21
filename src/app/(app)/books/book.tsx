import { useState, useEffect } from 'react';
import { Text, TouchableOpacity, View, ScrollView, Platform, Image } from 'react-native';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Loading } from '@/components/Loading';
import AudioPlayer from '@/components/atoms/AudioPlayer';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import FlipBook from './FlipBook';

type Chapter = {
  titulo: string;
  pdf_url: string;
  audio_url?: string;
  ordem: number;
  images_urls?: string[];
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

  const [book, setBook] = useState<Book | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [hasOpenedWebPdf, setHasOpenedWebPdf] = useState(false);

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
            (a, b) => a.ordem - b.ordem,
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
    // Usa Google Docs Viewer para evitar download automático e renderizar em tela
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(
      selectedChapter.pdf_url,
    )}`;
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

  const sortedChapters = [...book.chapters].sort((a, b) => a.ordem - b.ordem);

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
                key={index}
                onPress={() => {
                  setSelectedChapter(chapter);
                  setCurrentPage(1);
                }}
                className={`px-4 py-2 mr-2 rounded-full ${
                  selectedChapter?.ordem === chapter.ordem ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <Text
                  className="text-sm font-medium"
                  style={{
                    color:
                      selectedChapter?.ordem === chapter.ordem
                        ? '#FFFFFF'
                        : colors.gray[700],
                  }}
                >
                  {chapter.titulo || `${t('Chapter')} ${chapter.ordem}`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Audio Player (se houver áudio) */}
      {selectedChapter.audio_url && (
        <View
          className="flex-row items-center justify-center p-4 border-b"
          style={{ backgroundColor: colors.gray[50], borderColor: colors.gray[200] }}
        >
          <MaterialIcons
            name="headphones"
            size={24}
            color={colors.primary[500]}
            style={{ marginRight: 10 }}
          />
          <View className="flex-1">
            <Text className="text-sm font-medium" style={{ color: colors.gray[900] }}>
              {t('Audio')}
            </Text>
          </View>
          <AudioPlayer audioUri={selectedChapter.audio_url} />
        </View>
      )}

      {/* Viewer: imagens em formato livro ou PDF */}
      <View className="flex-1">
        {selectedChapter.images_urls && selectedChapter.images_urls.length > 0 ? (
          Platform.OS === 'web' ? (
            <ScrollView
              className="flex-1"
              contentContainerStyle={{ paddingVertical: 16, alignItems: 'center' }}
            >
              {selectedChapter.images_urls.map((uri, idx) => (
                <Image
                  key={idx}
                  source={{ uri }}
                  style={{ width: '90%', height: 500, resizeMode: 'contain', marginBottom: 16 }}
                />
              ))}
            </ScrollView>
          ) : (
            <FlipBook images={selectedChapter.images_urls} />
          )
        ) : selectedChapter.pdf_url ? (
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
            <MaterialIcons name="error-outline" size={60} color={colors.error[500]} />
            <Text
              className="text-lg mt-4 text-center"
              style={{ color: colors.gray[500] }}
            >
              {t('PDF not available')}
            </Text>
          </View>
        )}
      </View>

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
