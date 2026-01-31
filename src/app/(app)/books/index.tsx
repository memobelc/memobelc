import { useState, useEffect, useCallback } from 'react';
import { colors } from '@/styles/colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import api from '@/services/api';
import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { useToast } from '@/components/Toast';
import { useFocusEffect } from '@react-navigation/native';

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
  is_free: boolean;
  price?: number;
  payment_link?: string;
  chapters: Chapter[];
  collection_id?: string | null;
};

export default function BooksScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();

  const [myBooks, setMyBooks] = useState<Book[]>([]);
  const [discoverBooks, setDiscoverBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const fetchBooks = async () => {
    if (!userInfo?.token) return;

    try {
      setLoading(true);
      const response = await api.get('/books/list', {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });

      if (response.data) {
        setMyBooks(response.data.my_books || []);
        setDiscoverBooks(response.data.discover || []);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      toast({
        message: t('Error loading books'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCollection = async (book: Book) => {
    if (!userInfo?.token || userInfo?.role !== 'admin') return;
    setGeneratingId(book._id);
    try {
      const response = await api.post(
        `/books/admin/generate-collection/${book._id}`,
        {},
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      if (response.data?.collection_id || response.data?.already) {
        toast({
          message: response.data?.message || t('Collection generated successfully'),
          variant: 'success',
        });
        await fetchBooks();
      }
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error generating collection'),
        variant: 'destructive',
      });
    } finally {
      setGeneratingId(null);
    }
  };

  const handleBookPress = async (book: Book) => {
    if (book.is_free || myBooks.some((b) => b._id === book._id)) {
      router.push({
        pathname: './books/book',
        params: { bookId: book._id },
      });
    } else {
      // Livro pago - abrir link de pagamento ou mostrar modal
      if (book.payment_link) {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.open(book.payment_link, '_blank');
        } else {
          const { WebBrowser } = require('expo-web-browser');
          await WebBrowser.openBrowserAsync(book.payment_link);
        }
      } else {
        toast({
          message: t('Payment link not available'),
          variant: 'destructive',
        });
      }
    }
  };

  // Recarrega automaticamente quando a tela ganha foco (por exemplo, após criar livro)
  useFocusEffect(
    useCallback(() => {
      if (userInfo?.token) {
        fetchBooks();
      }
    }, [userInfo?.token]),
  );

  const renderBookCard = (book: Book, isMyBook: boolean) => (
    <View
      key={book._id}
      className={`p-3 items-center justify-center ${
        isMyBook ? 'w-36 mr-4' : 'w-40 mb-4'
      } rounded-lg`}
      style={{
        backgroundColor: isMyBook ? 'transparent' : colors.gray[100],
        position: 'relative',
      }}
    >
      {/* Menu admin no canto superior do livro */}
      {userInfo?.role === 'admin' && (
        <View className="absolute top-1 right-1 flex-row items-center z-10 gap-1">
          {!book.collection_id && (
            <TouchableOpacity
              onPress={() => handleGenerateCollection(book)}
              disabled={!!generatingId}
              className="px-2 py-1 rounded-full"
              style={{ backgroundColor: colors.primary[500] }}
            >
              <Text className="text-[10px] font-semibold text-white" numberOfLines={1}>
                {generatingId === book._id ? t('...') : t('Generate collection')}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: './books/admin',
                params: { bookId: book._id },
              })
            }
            className="px-1 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            <MaterialIcons name="edit" size={16} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: './books/details',
                params: { bookId: book._id },
              })
            }
            className="px-1 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          >
            <MaterialIcons name="info" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => handleBookPress(book)}
        className="items-center justify-center w-full"
      >
        {book.capa ? (
          <Image
            source={{ uri: book.capa }}
            className={`${isMyBook ? 'w-28 h-44' : 'w-32 h-48'} rounded-md mb-2`}
            resizeMode="cover"
          />
        ) : (
          <View
            className={`${isMyBook ? 'w-28 h-44' : 'w-32 h-48'} rounded-md mb-2 items-center justify-center`}
            style={{ backgroundColor: colors.gray[200] }}
          >
            <MaterialIcons name="book" size={40} color={colors.gray[400]} />
          </View>
        )}
        <Text
          className="font-[ComicSans] text-xs text-center mb-1"
          style={{ color: colors.gray[900] }}
          numberOfLines={2}
        >
          {book.titulo}
        </Text>
        {book.autor && (
          <Text
            className="text-xs text-center"
            style={{ color: colors.gray[500] }}
            numberOfLines={1}
          >
            {book.autor}
          </Text>
        )}
        {!book.is_free && !isMyBook && (
          <View
            className="mt-1 px-2 py-1 rounded-full"
            style={{ backgroundColor: colors.warning[500] }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: '#FFFFFF' }}
            >
              {book.price ? `$${book.price}` : t('Paid')}
            </Text>
          </View>
        )}
        {book.is_free && (
          <View
            className="mt-1 px-2 py-1 rounded-full"
            style={{ backgroundColor: colors.success[500] }}
          >
            <Text
              className="text-xs font-semibold"
              style={{ color: '#FFFFFF' }}
            >
              {t('Free')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <View
      className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative"
      style={Platform.OS === 'web' ? { height: '100%' } : {}}
    >
      <View className="flex-row justify-between items-center w-full bg-gray-100 -mt-2 mb-4">
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

        {userInfo?.role === 'admin' && (
          <TouchableOpacity
            onPress={() => router.push('./books/admin')}
            className="flex-row items-center"
          >
            <MaterialIcons
              name="add-circle"
              size={24}
              color={colors.primary[500]}
            />
            <Text style={{ color: colors.primary[500], marginLeft: 5 }}>
              {t('Add Book')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Loading />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 200 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Meus Livros */}
          {myBooks.length > 0 && (
            <>
              <View className="flex-row items-center justify-start pt-4 pb-3">
                <MaterialIcons
                  className="mr-2"
                  name="local-library"
                  size={24}
                  color={colors.primary[500]}
                />
                <Text
                  className="text-lg font-semibold"
                  style={{ color: colors.gray[900] }}
                >
                  {t('My Library')}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                  paddingHorizontal: 4,
                  paddingBottom: 10,
                }}
              >
                {myBooks.map((book) => renderBookCard(book, true))}
              </ScrollView>
            </>
          )}

          {/* Descobrir */}
          {discoverBooks.length > 0 && (
            <>
              <View className="flex-row items-center justify-start mt-6 mb-3">
                <Ionicons
                  className="mr-2"
                  name="library-outline"
                  size={24}
                  color={colors.primary[500]}
                />
                <Text
                  className="text-lg font-semibold"
                  style={{ color: colors.gray[900] }}
                >
                  {t('Discover')}
                </Text>
              </View>

              <View className="flex flex-row flex-wrap justify-start">
                {discoverBooks.map((book) => renderBookCard(book, false))}
              </View>
            </>
          )}

          {myBooks.length === 0 && discoverBooks.length === 0 && (
            <View className="flex-1 items-center justify-center py-20">
              <MaterialIcons name="book" size={60} color={colors.gray[400]} />
              <Text
                className="text-lg mt-4 text-center"
                style={{ color: colors.gray[500] }}
              >
                {t('No books available yet')}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
