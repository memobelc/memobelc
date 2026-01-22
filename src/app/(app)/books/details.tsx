import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import api from '@/services/api';
import { colors } from '@/styles/colors';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { Loading } from '@/components/Loading';
import { useTranslation } from 'react-i18next';

interface BookDetails {
  _id: string;
  titulo: string;
  autor?: string;
  idioma: string;
  nivel: string;
  genero?: string;
  is_free: boolean;
  price?: number;
}

interface UserItem {
  _id: string;
  name?: string;
  email?: string;
  has_book: boolean;
}

export default function BookDetailsScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const router = useRouter();
  const { t } = useTranslation();

  const [book, setBook] = useState<BookDetails | null>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);

  const loadData = async () => {
    if (!userInfo?.token || !bookId) return;

    try {
      setLoading(true);
      const response = await api.get(`/books/admin/book/${bookId}`, {
        headers: { Authorization: `Bearer ${userInfo.token}` },
      });

      setBook(response.data.book);
      setUsers(response.data.users || []);
    } catch (error: any) {
      console.error('Error loading book details:', error);
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
    loadData();
  }, [bookId, userInfo?.token]);

  const handleAssign = async (userId: string) => {
    if (!userInfo?.token || !bookId) return;
    try {
      setAssigning(userId);
      await api.post(
        '/books/admin/assign',
        { user_id: userId, book_id: bookId },
        {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        },
      );
      toast({
        message: t('Book assigned to user'),
        variant: 'success',
      });
      setUsers((prev) =>
        prev.map((u) => (u._id === userId ? { ...u, has_book: true } : u)),
      );
    } catch (error: any) {
      console.error('Error assigning book:', error);
      toast({
        message: error.response?.data?.error || t('Error assigning book'),
        variant: 'destructive',
      });
    } finally {
      setAssigning(null);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Loading />
      </View>
    );
  }

  if (!book) {
    return (
      <View className="flex-1 items-center justify-center p-4">
        <MaterialIcons name="error-outline" size={60} color={colors.error[500]} />
        <Text
          className="text-lg mt-4 text-center"
          style={{ color: colors.gray[500] }}
        >
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

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View
        className="flex-row justify-between items-center w-full p-4 border-b"
        style={{ backgroundColor: colors.gray[100], borderColor: colors.gray[200] }}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.gray[900]} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold" style={{ color: colors.gray[900] }}>
          {t('Book details')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* Info do livro */}
        <View className="mb-6">
          <Text className="text-xl font-semibold" style={{ color: colors.gray[900] }}>
            {book.titulo}
          </Text>
          {book.autor && (
            <Text className="text-sm mt-1" style={{ color: colors.gray[600] }}>
              {t('Author')}: {book.autor}
            </Text>
          )}
          <Text className="text-sm mt-1" style={{ color: colors.gray[600] }}>
            {t('Language')}: {book.idioma}
          </Text>
          <Text className="text-sm mt-1" style={{ color: colors.gray[600] }}>
            {t('Level')}: {book.nivel}
          </Text>
          {book.genero && (
            <Text className="text-sm mt-1" style={{ color: colors.gray[600] }}>
              {t('Genre')}: {book.genero}
            </Text>
          )}
          <Text className="text-sm mt-1" style={{ color: colors.gray[600] }}>
              {book.is_free
                ? t('Free book')
                : t('Paid book') + (book.price ? ` - $${book.price}` : '')}
          </Text>
        </View>

        {/* Lista de usuários */}
        <Text className="text-lg font-semibold mb-3" style={{ color: colors.gray[900] }}>
          {t('Users with access')}
        </Text>

        {users.length === 0 ? (
          <Text style={{ color: colors.gray[500] }}>{t('No users found')}</Text>
        ) : (
          users.map((user) => (
            <View
              key={user._id}
              className="flex-row items-center justify-between mb-3 p-3 rounded-lg"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text
                  className="text-sm font-semibold"
                  style={{ color: colors.gray[900] }}
                  numberOfLines={1}
                >
                  {user.name || t('No name')}
                </Text>
                <Text
                  className="text-xs mt-1"
                  style={{ color: colors.gray[600] }}
                  numberOfLines={1}
                >
                  {user.email || t('No email')}
                </Text>
              </View>

              {user.has_book ? (
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: colors.success[500] }}
                >
                  <Text className="text-xs" style={{ color: '#FFFFFF' }}>
                    {t('Has access')}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  disabled={assigning === user._id}
                  onPress={() => handleAssign(user._id)}
                  className="px-3 py-2 rounded-full"
                  style={{ backgroundColor: colors.primary[500] }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: '#FFFFFF' }}
                  >
                    {assigning === user._id ? t('Assigning...') : t('Give access')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}