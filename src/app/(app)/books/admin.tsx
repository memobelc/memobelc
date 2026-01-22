import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/styles/colors';
import { useTranslation } from 'react-i18next';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { Loading } from '@/components/Loading';
import { Input } from '@/components/Input';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { storage } from '../../../../FirebaseConfig';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import api from '@/services/api';
import * as yup from 'yup';

type Chapter = {
  titulo: string;
  pdf_url: string;
  audio_url?: string;
  ordem: number;
  pdf_file?: { uri: string; name: string };
  audio_file?: { uri: string; name: string };
  images_urls?: string[];
  images_files?: { uri: string; name: string }[];
};

export default function BookAdminScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ bookId?: string }>();
  const editingBookId = typeof params.bookId === 'string' ? params.bookId : undefined;

  const validationSchema = yup.object().shape({
    titulo: yup.string().required(t('Title is required')),
    idioma: yup.string().required(t('Language is required')),
    nivel: yup.string().required(t('Level is required')),
  });

  const [formData, setFormData] = useState({
    titulo: '',
    autor: '',
    idioma: '',
    nivel: '',
    genero: '',
    is_free: true,
    price: '',
    payment_link: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCapa, setSelectedCapa] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(false);

  // Carrega livro para edição, se bookId for passado
  useEffect(() => {
    const loadBook = async () => {
      if (!editingBookId || !userInfo?.token) return;
      try {
        const response = await api.get(`/books/admin/book/${editingBookId}`, {
          headers: { Authorization: `Bearer ${userInfo.token}` },
        });

        const book = response.data?.book;
        if (!book) return;

        setFormData({
          titulo: book.titulo || '',
          autor: book.autor || '',
          idioma: book.idioma || '',
          nivel: book.nivel || '',
          genero: book.genero || '',
          is_free: !!book.is_free,
          price: book.price ? String(book.price) : '',
          payment_link: book.payment_link || '',
        });
        if (book.capa) {
          setSelectedCapa(book.capa);
        }

        const loadedChapters: Chapter[] = (book.chapters || []).map(
          (ch: any, idx: number) => ({
            titulo: ch.titulo || '',
            pdf_url: ch.pdf_url || '',
            audio_url: ch.audio_url || undefined,
            ordem: ch.ordem || idx + 1,
            images_urls: ch.images_urls || [],
            images_files: [],
          }),
        );
        setChapters(loadedChapters);
      } catch (error) {
        console.error('Error loading book for edit:', error);
        toast({
          message: t('Error loading book'),
          variant: 'destructive',
        });
      }
    };

    loadBook();
  }, [editingBookId, userInfo?.token]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('Permission denied'), t('You need to allow access to the gallery.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedCapa(result.assets[0].uri);
    }
  };

  const pickPDF = async (chapterIndex: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const newChapters = [...chapters];
        // Ao escolher PDF, limpa imagens (modo exclusivo)
        newChapters[chapterIndex].pdf_file = {
          uri: result.assets[0].uri,
          name: result.assets[0].name || 'document.pdf',
        };
        newChapters[chapterIndex].images_files = [];
        newChapters[chapterIndex].images_urls = [];
        setChapters(newChapters);
      }
    } catch (error) {
      console.error('Error picking PDF:', error);
    }
  };

  const pickAudio = async (chapterIndex: number) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.assets && result.assets.length > 0) {
        const newChapters = [...chapters];
        newChapters[chapterIndex].audio_file = {
          uri: result.assets[0].uri,
          name: result.assets[0].name || 'audio.mp3',
        };
        setChapters(newChapters);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
    }
  };

  const addChapter = () => {
    const newChapter: Chapter = {
      titulo: '',
      pdf_url: '',
      ordem: chapters.length + 1,
      images_urls: [],
      images_files: [],
    };
    setChapters([...chapters, newChapter]);
  };

  const removeChapter = (index: number) => {
    const newChapters = chapters.filter((_, i) => i !== index);
    // Reordenar
    newChapters.forEach((chapter, i) => {
      chapter.ordem = i + 1;
    });
    setChapters(newChapters);
  };

  const updateChapter = (index: number, field: keyof Chapter, value: any) => {
    const newChapters = [...chapters];
    (newChapters[index] as any)[field] = value;
    setChapters(newChapters);
  };

  const uploadFile = async (uri: string, path: string): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    setErrors({});

    // Validar formulário
    try {
      await validationSchema.validate(formData, { abortEarly: false });
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        error.inner.forEach((err) => {
          if (err.path) {
            newErrors[err.path] = err.message;
          }
        });
        setErrors(newErrors);
        return;
      }
    }

    // Validar capa
    if (!selectedCapa) {
      setErrors({ ...errors, capa: t('Cover image is required') });
      return;
    }

    // Validar capítulos
    if (chapters.length === 0) {
      toast({
        message: t('At least one chapter is required'),
        variant: 'destructive',
      });
      return;
    }

    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      if (!chapter.titulo) {
        toast({
          message: `${t('Chapter')} ${i + 1}: ${t('Title is required')}`,
          variant: 'destructive',
        });
        return;
      }
      // Cada capítulo precisa de PDF OU imagens
      const hasPdf = !!chapter.pdf_file || !!chapter.pdf_url;
      const hasImages =
        (chapter.images_files && chapter.images_files.length > 0) ||
        (chapter.images_urls && chapter.images_urls.length > 0);
      if (!hasPdf && !hasImages) {
        toast({
          message: `${t('Chapter')} ${i + 1}: ${t('You must add a PDF or images')}`,
          variant: 'destructive',
        });
        return;
      }
    }

    setLoading(true);

    try {
      // Upload capa
      let capaUrl = '';
      if (selectedCapa) {
        capaUrl = await uploadFile(selectedCapa, `books/covers/${Date.now()}`);
      }

      // Upload capítulos
      const processedChapters: Chapter[] = [];
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        let pdf_url = chapter.pdf_url;
        let audio_url = chapter.audio_url;
        let images_urls: string[] = chapter.images_urls || [];

        // Upload PDF se houver arquivo
        if (chapter.pdf_file) {
          pdf_url = await uploadFile(
            chapter.pdf_file.uri,
            `books/chapters/${Date.now()}_${i}_${chapter.pdf_file.name}`,
          );
        }

        // Upload imagens se houver arquivos
        if (chapter.images_files && chapter.images_files.length > 0) {
          const uploadedImages: string[] = [];
          for (let j = 0; j < chapter.images_files.length; j++) {
            const img = chapter.images_files[j];
            const url = await uploadFile(
              img.uri,
              `books/chapters/images/${Date.now()}_${i}_${j}_${img.name}`,
            );
            uploadedImages.push(url);
          }
          images_urls = uploadedImages;
        }

        // Upload áudio se houver arquivo
        if (chapter.audio_file) {
          audio_url = await uploadFile(
            chapter.audio_file.uri,
            `books/audios/${Date.now()}_${i}_${chapter.audio_file.name}`,
          );
        }

        processedChapters.push({
          titulo: chapter.titulo,
          pdf_url,
          audio_url,
          ordem: chapter.ordem,
          images_urls,
        });
      }

      // Criar/atualizar livro na API
      const bookData = {
        titulo: formData.titulo,
        autor: formData.autor || undefined,
        capa: capaUrl,
        idioma: formData.idioma,
        nivel: formData.nivel,
        genero: formData.genero || undefined,
        is_free: formData.is_free,
        price: formData.price ? parseFloat(formData.price) : undefined,
        payment_link: formData.payment_link || undefined,
        chapters: processedChapters,
      };

      if (editingBookId) {
        await api.put(`/books/admin/update/${editingBookId}`, bookData, {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        });
      } else {
        await api.post('/books/admin/create', bookData, {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        });
      }

      toast({
        message: editingBookId
          ? t('Book updated successfully')
          : t('Book created successfully'),
        variant: 'success',
      });

      router.back();
    } catch (error: any) {
      console.error('Error creating book:', error);
      toast({
        message: error.response?.data?.error || t('Error creating book'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

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
          {editingBookId ? t('Edit Book') : t('Add Book')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Loading color={colors.primary[500]} />
        </View>
      ) : (
        <ScrollView
          className="flex-1 p-4"
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {/* Informações básicas */}
          <Text className="text-lg font-semibold mb-4" style={{ color: colors.gray[900] }}>
            {t('Basic Information')}
          </Text>

          <Input
            label={t('Title')}
            value={formData.titulo}
            onChangeText={(value) => setFormData({ ...formData, titulo: value })}
          />
          {errors.titulo && (
            <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
              {errors.titulo}
            </Text>
          )}

          <Input
            label={t('Author')}
            value={formData.autor}
            onChangeText={(value) => setFormData({ ...formData, autor: value })}
          />
          {errors.autor && (
            <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
              {errors.autor}
            </Text>
          )}

          <Input
            label={t('Language')}
            value={formData.idioma}
            onChangeText={(value) => setFormData({ ...formData, idioma: value })}
          />
          {errors.idioma && (
            <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
              {errors.idioma}
            </Text>
          )}

          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: colors.gray[700] }}>
              {t('Level')} <Text style={{ color: colors.error[500] }}>*</Text>
            </Text>
            <View className="flex-row">
              {['basico', 'medio', 'avancado'].map((nivel) => (
                <TouchableOpacity
                  key={nivel}
                  onPress={() => setFormData({ ...formData, nivel })}
                  className={`px-4 py-2 mr-2 rounded-lg ${
                    formData.nivel === nivel ? 'bg-primary-500' : 'bg-gray-200'
                  }`}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{
                      color: formData.nivel === nivel ? '#FFFFFF' : colors.gray[700],
                      textTransform: 'capitalize',
                    }}
                  >
                    {t(nivel)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.nivel && (
              <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
                {errors.nivel}
              </Text>
            )}
          </View>

          <Input
            label={t('Genre')}
            value={formData.genero}
            onChangeText={(value) => setFormData({ ...formData, genero: value })}
          />
          {errors.genero && (
            <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
              {errors.genero}
            </Text>
          )}

          {/* Capa */}
          <View className="mb-4">
            <Text className="text-sm font-medium mb-2" style={{ color: colors.gray[700] }}>
              {t('Cover Image')} <Text style={{ color: colors.error[500] }}>*</Text>
            </Text>
            <TouchableOpacity
              onPress={pickImage}
              className="border-2 border-dashed rounded-lg p-4 items-center justify-center"
              style={{
                        borderColor: selectedCapa ? colors.success[500] : colors.gray[300],
                backgroundColor: selectedCapa ? colors.success[100] : colors.gray[100],
              }}
            >
              {selectedCapa ? (
                <Image
                  source={{ uri: selectedCapa }}
                  className="w-full h-48 rounded-lg mb-2"
                  resizeMode="cover"
                />
              ) : (
                <>
                  <MaterialIcons name="add-photo-alternate" size={40} color={colors.gray[400]} />
                  <Text className="text-sm mt-2" style={{ color: colors.gray[500] }}>
                    {t('Tap to select cover image')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {errors.capa && (
              <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
                {errors.capa}
              </Text>
            )}
          </View>

          {/* Preço e pagamento */}
          <View className="mb-4">
            <Text className="text-lg font-semibold mb-4" style={{ color: colors.gray[900] }}>
              {t('Pricing')}
            </Text>

            <View className="flex-row items-center mb-4">
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, is_free: true })}
                className={`flex-1 px-4 py-3 mr-2 rounded-lg ${
                  formData.is_free ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <Text
                  className="text-center font-medium"
                  style={{ color: formData.is_free ? '#FFFFFF' : colors.gray[700] }}
                >
                  {t('Free')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setFormData({ ...formData, is_free: false })}
                className={`flex-1 px-4 py-3 ml-2 rounded-lg ${
                  !formData.is_free ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <Text
                  className="text-center font-medium"
                  style={{ color: !formData.is_free ? '#FFFFFF' : colors.gray[700] }}
                >
                  {t('Paid')}
                </Text>
              </TouchableOpacity>
            </View>

            {!formData.is_free && (
              <>
                <Input
                  label={t('Price')}
                  value={formData.price}
                  onChangeText={(value) => setFormData({ ...formData, price: value })}
                  keyboardType="numeric"
                />
                {errors.price && (
                  <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
                    {errors.price}
                  </Text>
                )}
                <Input
                  label={t('Payment Link')}
                  value={formData.payment_link}
                  onChangeText={(value) => setFormData({ ...formData, payment_link: value })}
                  placeholder="https://..."
                />
                {errors.payment_link && (
                  <Text className="text-xs mt-1" style={{ color: colors.error[500] }}>
                    {errors.payment_link}
                  </Text>
                )}
              </>
            )}
          </View>

          {/* Capítulos */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-semibold" style={{ color: colors.gray[900] }}>
                {t('Chapters')}
              </Text>
              <TouchableOpacity
                onPress={addChapter}
                className="flex-row items-center px-3 py-2 rounded-lg"
                style={{ backgroundColor: colors.primary[500] }}
              >
                <MaterialIcons name="add" size={20} color="#FFFFFF" />
                <Text className="text-sm font-medium ml-1" style={{ color: '#FFFFFF' }}>
                  {t('Add Chapter')}
                </Text>
              </TouchableOpacity>
            </View>

            {chapters.length === 0 ? (
              <View
                className="border-2 border-dashed rounded-lg p-8 items-center justify-center"
                style={{ borderColor: colors.gray[300] }}
              >
                <MaterialIcons name="menu-book" size={40} color={colors.gray[400]} />
                <Text className="text-sm mt-2 text-center" style={{ color: colors.gray[500] }}>
                  {t('No chapters yet. Add your first chapter!')}
                </Text>
              </View>
            ) : (
              chapters.map((chapter, index) => (
                <View
                  key={index}
                  className="border rounded-lg p-4 mb-4"
                  style={{ borderColor: colors.gray[200], backgroundColor: colors.gray[100] }}
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-md font-semibold" style={{ color: colors.gray[900] }}>
                      {t('Chapter')} {chapter.ordem}
                    </Text>
                    {chapters.length > 1 && (
                      <TouchableOpacity
                        onPress={() => removeChapter(index)}
                        style={{ padding: 4 }}
                      >
                        <MaterialIcons name="delete" size={20} color={colors.error[500]} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <Input
                    label={t('Chapter Title')}
                    value={chapter.titulo}
                    onChangeText={(value) => updateChapter(index, 'titulo', value)}
                  />

                  {/* PDF ou Imagens (mutuamente exclusivos) */}
                  <View className="mb-3">
                    <Text className="text-sm font-medium mb-1" style={{ color: colors.gray[700] }}>
                      {t('PDF')} / {t('Images')}
                    </Text>
                    <Text className="text-xs mb-2" style={{ color: colors.gray[500] }}>
                      {t(
                        'Choose only ONE option per chapter: PDF or images. When you select one, the other will be cleared.',
                      )}
                    </Text>
                    <TouchableOpacity
                      onPress={() => pickPDF(index)}
                      className="border-2 border-dashed rounded-lg p-4 items-center justify-center"
                      style={{
                        borderColor: chapter.pdf_file || chapter.pdf_url
                          ? colors.success[500]
                          : colors.gray[300],
                        backgroundColor: chapter.pdf_file || chapter.pdf_url ? '#DCFCE7' : '#E4E4E7',
                      }}
                    >
                      <MaterialIcons
                        name="picture-as-pdf"
                        size={30}
                        color={
                          chapter.pdf_file || chapter.pdf_url
                            ? colors.success[500]
                            : colors.gray[400]
                        }
                      />
                      <Text
                        className="text-xs mt-2 text-center"
                        style={{ color: colors.gray[600] }}
                      >
                        {chapter.pdf_file
                          ? chapter.pdf_file.name
                          : chapter.pdf_url
                            ? t('PDF URL set')
                            : t('Tap to select PDF')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={async () => {
                        try {
                          const result = await DocumentPicker.getDocumentAsync({
                            type: 'image/*',
                            copyToCacheDirectory: true,
                            multiple: true,
                          } as any);

                          if (result.assets && result.assets.length > 0) {
                            const newChapters = [...chapters];
                            // Ao escolher imagens, limpa PDF (modo exclusivo)
                            newChapters[index].pdf_file = undefined;
                            newChapters[index].pdf_url = '';
                            newChapters[index].images_files = result.assets.map((asset) => ({
                              uri: asset.uri,
                              name: asset.name || 'image.jpg',
                            }));
                            setChapters(newChapters);
                          }
                        } catch (error) {
                          console.error('Error picking images:', error);
                        }
                      }}
                      className="border-2 border-dashed rounded-lg p-4 items-center justify-center mt-3"
                      style={{
                        borderColor:
                          chapter.images_files && chapter.images_files.length > 0
                            ? colors.success[500]
                            : colors.gray[300],
                        backgroundColor:
                          chapter.images_files && chapter.images_files.length > 0
                            ? '#DCFCE7'
                            : '#E4E4E7',
                      }}
                    >
                      <MaterialIcons
                        name="collections-bookmark"
                        size={30}
                        color={
                          chapter.images_files && chapter.images_files.length > 0
                            ? colors.success[500]
                            : colors.gray[400]
                        }
                      />
                      <Text
                        className="text-xs mt-2 text-center"
                        style={{ color: colors.gray[600] }}
                      >
                        {chapter.images_files && chapter.images_files.length > 0
                          ? t('{{count}} image(s) selected', {
                              count: chapter.images_files.length,
                            })
                          : t('Tap to select images')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View>
                    <Text className="text-sm font-medium mb-2" style={{ color: colors.gray[700] }}>
                      {t('Audio')} ({t('Optional')})
                    </Text>
                    <TouchableOpacity
                      onPress={() => pickAudio(index)}
                      className="border-2 border-dashed rounded-lg p-4 items-center justify-center"
                      style={{
                        borderColor: chapter.audio_file || chapter.audio_url
                          ? colors.success[500]
                          : colors.gray[300],
                        backgroundColor:
                          chapter.audio_file || chapter.audio_url
                            ? colors.success[100]
                            : colors.gray[100],
                      }}
                    >
                      <MaterialIcons
                        name="audiotrack"
                        size={30}
                        color={
                          chapter.audio_file || chapter.audio_url
                            ? colors.success[500]
                            : colors.gray[400]
                        }
                      />
                      <Text
                        className="text-xs mt-2 text-center"
                        style={{ color: colors.gray[600] }}
                      >
                        {chapter.audio_file
                          ? chapter.audio_file.name
                          : chapter.audio_url
                            ? t('Audio URL set')
                            : t('Tap to select audio')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Botão salvar */}
          <TouchableOpacity
            onPress={handleSubmit}
            className="px-6 py-4 rounded-lg mb-8 items-center"
            style={{ backgroundColor: colors.primary[500] }}
          >
            <Text className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>
              {editingBookId ? t('Save Changes') : t('Create Book')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

