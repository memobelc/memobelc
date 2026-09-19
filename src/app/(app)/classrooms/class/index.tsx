import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  TextInput,
  Animated,
  Switch,
  Alert,
} from 'react-native';
import { Menu } from 'lucide-react-native';
import {
  MaterialIcons,
  MaterialCommunityIcons,
  Feather,
  Ionicons,
} from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { useTranslation } from 'react-i18next';
import Tooltip from 'react-native-walkthrough-tooltip';
import * as ImagePicker from 'expo-image-picker';
import * as yup from 'yup';

import api from '@/services/api';
import { copyText } from '@/services/checkout';
import { colors } from '@/styles/colors';
import { IClassroom, ICourse, ILessonNeighbor, useCollection } from '@/contexts/CollectionContext';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { imageSources, imageSourcesDeck, setImageUrl } from '@/utils/imgSource';

import { Input } from '@/components/Input';
import { useToast } from '@/components/Toast';
import { DuplicateTargetModal, DuplicateTargetType } from '@/components/molecules/DuplicateTargetModal';
import { ClassroomLessonContinue } from '@/components/molecules/ClassroomLessonContinue';
import { NotifyPeopleModal } from '@/components/molecules/NotifyPeopleModal';
import { notificationsApi } from '@/services/notifications';
import { Loading } from '@/components/Loading';
import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import BrainEmptyState from '@/components/atoms/BrainEmptyState';
import { ModalGenerateCards } from '@/components/atoms/ModalGenerateCards';
import {
  PublishStatus,
  PublishStatusFields,
  toDatetimeLocalValue,
} from '@/components/atoms/PublishStatusFields';

import { storage } from '../../../../../FirebaseConfig';

interface ICardProps {
  _id: number;
  front: string;
  back: string;
}

export default function Classroom() {
  const { t } = useTranslation();
  const router = useRouter();
  const {
    setCollections,
    currentCollection,
    setCurrentCollection,
    setCurrentDeck,
    currentClassroom,
    setCurrentClassroom,
    setCurrentCourse,
  } = useCollection();

  const { userInfo } = useSession();
  const { hasRole } = useHasRole();
  const { toast } = useToast();
  const { name } = useLocalSearchParams();

  const validationSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
  });

  const [formData, setFormData] = useState<Record<string, string>>({
    name: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [generatedCards, setGeneratedCards] = useState<ICardProps[] | []>([]);
  const [loadingCollection, setLoadingCollection] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openAddDeck, setOpenAddDeck] = useState(false);
  const [editingDeck, setEditingDeck] = useState<{
    _id: string;
    name: string;
    image?: string | null;
    status?: string;
    scheduled_at?: string | null;
  } | null>(null);
  const [deckStatus, setDeckStatus] = useState<PublishStatus>('published');
  const [deckScheduledAt, setDeckScheduledAt] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageFromGallery, setSelectedImageFromGallery] = useState<
    string | null
  >(null);
  const [modalVisible, setModalVisible] = useState(false);
  const isTeacher = hasRole('teacher');
  const canManagePeople = isTeacher || hasRole('admin');

  const [tab, setTab] = useState<'content' | 'courses' | 'people' | 'settings'>('content');
  const [showTooltip, setShowTooltip] = useState(false);
  const [openCardGenerator, setOpenCardGenerator] = useState(false);
  const [characterCounter, setCharacterCounter] = useState(0);
  const [hasCourses, setHasCourses] = useState(false);
  const [lastViewedLessons, setLastViewedLessons] = useState<ILessonNeighbor[]>([]);
  const [nextClassroomLesson, setNextClassroomLesson] = useState<ILessonNeighbor | null>(null);
  const [checkoutEnabled, setCheckoutEnabled] = useState(false);
  const [checkoutPrice, setCheckoutPrice] = useState('');
  const [savingCheckout, setSavingCheckout] = useState(false);
  const isClassroomOwner =
    String(currentClassroom?.teacher || '') === String(userInfo?.user_id || '');
  const canManageCheckout = isClassroomOwner || hasRole('admin');

  // ── Courses inline tab ────────────────────────────────────────────────────
  const [courses, setCourses] = useState<ICourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [showCreateCourse, setShowCreateCourse] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState<ICourse | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseDesc, setNewCourseDesc] = useState('');
  const [duplicateTarget, setDuplicateTarget] = useState<{
    type: DuplicateTargetType;
    sourceId: string;
    defaultName: string;
  } | null>(null);

  const [collectionCoverImage, setCollectionCoverImage] = useState<string | null>(null);
  const [collectionCoverGallery, setCollectionCoverGallery] = useState<string | null>(null);
  const [collectionCoverModalVisible, setCollectionCoverModalVisible] = useState(false);
  const [classroomCoverImage, setClassroomCoverImage] = useState<string | null>(null);
  const [classroomCoverGallery, setClassroomCoverGallery] = useState<string | null>(null);
  const [classroomCoverModalVisible, setClassroomCoverModalVisible] = useState(false);
  const [savingCollectionCover, setSavingCollectionCover] = useState(false);
  const [savingClassroomCover, setSavingClassroomCover] = useState(false);

  const [contentHeight, setContentHeight] = useState(0);
  const animation = useRef(new Animated.Value(0)).current;

  const fetchCoursesCount = async (showLoader = false) => {
    if (!currentClassroom?._id) return;
    try {
      if (showLoader) setCoursesLoading(true);
      const res = await api.get(
        `/course/by_classroom/${currentClassroom._id}`,
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      const list: ICourse[] = res.data.courses ?? [];
      setCourses(list);
      setHasCourses(list.some((course) => course.has_content));
    } catch {
      // silently fail — tab stays hidden for students
    } finally {
      if (showLoader) setCoursesLoading(false);
    }
  };

  const fetchLessonContinue = async () => {
    if (!currentClassroom?._id || !userInfo?.token || isTeacher) return;
    try {
      const res = await api.get(
        `/course/by_classroom/${currentClassroom._id}/continue`,
        { headers: { Authorization: `Bearer ${userInfo.token}` } },
      );
      setLastViewedLessons(res.data?.last_viewed || []);
      setNextClassroomLesson(res.data?.next_lesson || null);
    } catch {
      setLastViewedLessons([]);
      setNextClassroomLesson(null);
    }
  };

  useEffect(() => {
    fetchCoursesCount(tab === 'courses');
    if (tab === 'content') fetchLessonContinue();
  }, [currentClassroom?._id, tab]);

  const closeCourseModal = () => {
    setShowCreateCourse(false);
    setEditingCourse(null);
    setNewCourseName('');
    setNewCourseDesc('');
  };

  const openCreateCourseModal = () => {
    setEditingCourse(null);
    setNewCourseName('');
    setNewCourseDesc('');
    setShowCreateCourse(true);
  };

  const openEditCourseModal = (course: ICourse) => {
    setEditingCourse(course);
    setNewCourseName(course.name);
    setNewCourseDesc(course.description || '');
    setShowCreateCourse(true);
  };

  const handleSaveCourse = async () => {
    if (!newCourseName.trim()) return;
    try {
      setCreatingCourse(true);
      if (editingCourse) {
        await api.put(
          `/course/${editingCourse._id}`,
          { name: newCourseName.trim(), description: newCourseDesc.trim() },
          { headers: { Authorization: `Bearer ${userInfo?.token}` } },
        );
        toast({ message: t('Course updated successfully'), variant: 'success' });
      } else {
        await api.post(
          '/course/create',
          {
            name: newCourseName.trim(),
            description: newCourseDesc.trim(),
            classroom_id: currentClassroom?._id,
          },
          { headers: { Authorization: `Bearer ${userInfo?.token}` } },
        );
        toast({ message: t('Course created successfully'), variant: 'success' });
      }
      closeCourseModal();
      fetchCoursesCount(true);
    } catch {
      toast({
        message: editingCourse
          ? t('Failed to update course')
          : t('Failed to create course'),
        variant: 'destructive',
      });
    } finally {
      setCreatingCourse(false);
    }
  };

  const handleDeleteCourse = (course: ICourse) => {
    Alert.alert(
      t('Delete Course'),
      t('Are you sure you want to delete this course? All modules, lessons and activities will be removed.'),
      [
        { text: t('Cancel'), style: 'cancel' },
        {
          text: t('Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/course/${course._id}`, {
                headers: { Authorization: `Bearer ${userInfo?.token}` },
              });
              toast({ message: t('Course deleted'), variant: 'success' });
              fetchCoursesCount(true);
            } catch {
              toast({ message: t('Failed to delete course'), variant: 'destructive' });
            }
          },
        },
      ],
    );
  };

  const handleReorderCourse = async (index: number, direction: 'up' | 'down') => {
    if (!currentClassroom?._id) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= courses.length) return;
    const newOrder = [...courses];
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setCourses(newOrder);
    try {
      await api.put(
        `/course/by_classroom/${currentClassroom._id}/reorder`,
        { course_ids: newOrder.map((c) => c._id) },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
    } catch {
      toast({ message: t('Failed to reorder'), variant: 'destructive' });
      fetchCoursesCount(true);
    }
  };

  useEffect(() => {
    if (currentClassroom?._id) {
      fetchCollectionData();
    }
  }, [currentClassroom?._id]);

  useEffect(() => {
    setCheckoutEnabled(!!currentClassroom?.checkout_enabled);
    setCheckoutPrice(
      currentClassroom?.price === 0 || currentClassroom?.price
        ? String(currentClassroom.price)
        : '',
    );
  }, [currentClassroom?._id, currentClassroom?.checkout_enabled, currentClassroom?.price]);

  useEffect(() => {
    if (tab !== 'settings') return;
    setCollectionCoverImage(currentCollection?.image || null);
    setCollectionCoverGallery(
      currentCollection?.image?.startsWith('ct_') ? currentCollection.image : null,
    );
    const classroomCover =
      currentClassroom?.cover_image ?? currentClassroom?.image ?? null;
    setClassroomCoverImage(classroomCover);
    setClassroomCoverGallery(
      classroomCover?.startsWith('ct_') ? classroomCover : null,
    );
  }, [
    tab,
    currentCollection?.image,
    currentClassroom?.cover_image,
    currentClassroom?.image,
  ]);

  const fetchData = async () => {
    try {
      const response = await api.get('/classroom/get_classrooms', {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      if (response.status === 200) {
        setCurrentClassroom(
          response.data.classrooms.find(
            (item: IClassroom) => item._id == currentClassroom!._id,
          ),
        );
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCollectionData = async () => {
    try {
      const response = await api.get('/collections/get_by_user', {
        headers: {
          Authorization: `Bearer ${userInfo?.token}`,
        },
      });

      if (response.status === 200) {
        const updatedCollections = response.data.collections;
        setCollections(updatedCollections);
        const updated = updatedCollections.find(
          (item: { _id: string; classroom?: string | null }) =>
            item._id === currentCollection?._id ||
            item._id === currentClassroom?.collection ||
            item.classroom === currentClassroom?._id,
        );
        if (updated) {
          setCurrentCollection(updated);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert(t('Permission denied, You need to allow access to the gallery.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const pickCoverImage = async (
    setImage: React.Dispatch<React.SetStateAction<string | null>>,
    setGallery: React.Dispatch<React.SetStateAction<string | null>>,
  ) => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert(t('Permission denied, You need to allow access to the gallery.'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setGallery(null);
      setImage(result.assets[0].uri);
    }
  };

  const resolveCoverImageUrl = async (
    selected: string | null,
    galleryKey: string | null,
    fallback?: string | null,
  ) => {
    if (selected && !galleryKey) {
      const response = await fetch(selected);
      const blob = await response.blob();
      const storageRef = ref(storage, `images/decks/${Date.now()}`);
      await uploadBytes(storageRef, blob);
      return await getDownloadURL(storageRef);
    }

    return galleryKey || selected || fallback || '';
  };

  const handleSaveCollectionCover = async () => {
    const collectionId = currentCollection?._id || currentClassroom?.collection;
    if (!collectionId) return;

    try {
      setSavingCollectionCover(true);
      const imageUrl = await resolveCoverImageUrl(
        collectionCoverImage,
        collectionCoverGallery,
        currentCollection?.image,
      );
      await api.put(
        `/collections/update/${collectionId}`,
        { image: imageUrl },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      toast({
        message: t('Collection cover updated successfully'),
        variant: 'success',
      });
      await fetchCollectionData();
      await fetchData();
    } catch (error: any) {
      toast({
        message:
          error?.response?.data?.error ||
          t('Failed to update collection cover'),
        variant: 'destructive',
      });
    } finally {
      setSavingCollectionCover(false);
    }
  };

  const handleSaveClassroomCover = async () => {
    if (!currentClassroom?._id) return;

    try {
      setSavingClassroomCover(true);
      const imageUrl = await resolveCoverImageUrl(
        classroomCoverImage,
        classroomCoverGallery,
        currentClassroom.cover_image || currentClassroom.image,
      );
      const res = await api.put(
        `/classroom/${currentClassroom._id}`,
        { image: imageUrl },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      setCurrentClassroom((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toast({
        message: t('Classroom cover updated successfully'),
        variant: 'success',
      });
      await fetchData();
    } catch (error: any) {
      toast({
        message:
          error?.response?.data?.error ||
          t('Failed to update classroom cover'),
        variant: 'destructive',
      });
    } finally {
      setSavingClassroomCover(false);
    }
  };

  const renderCoverPicker = ({
    title,
    description,
    previewValue,
    selectedImage: coverSelected,
    selectedGallery,
    onPick,
    onClear,
    onOpenGallery,
    galleryVisible,
    onCloseGallery,
    onSelectGallery,
    onSave,
    saving,
  }: {
    title: string;
    description: string;
    previewValue?: string | null;
    selectedImage: string | null;
    selectedGallery: string | null;
    onPick: () => void;
    onClear: () => void;
    onOpenGallery: () => void;
    galleryVisible: boolean;
    onCloseGallery: () => void;
    onSelectGallery: (uri: unknown, key: string) => void;
    onSave: () => void;
    saving: boolean;
  }) => {
    const displayImage = selectedGallery || coverSelected || previewValue;

    return (
      <View
        className="rounded-2xl px-5 py-4 mb-4"
        style={{
          backgroundColor: colors.white,
          borderWidth: 1,
          borderColor: colors.gray[300],
        }}
      >
        <Text className="font-bold text-gray-800 mb-1">{title}</Text>
        <Text className="text-xs text-gray-500 mb-4">{description}</Text>

        <View className="flex-row items-stretch gap-3 mb-4">
          <TouchableOpacity
            onPress={onPick}
            className="flex-1 border-2 border-dashed rounded-2xl p-4 items-center justify-center"
            style={{
              borderColor: colors.primary[300],
              backgroundColor: colors.primary[50],
              minHeight: 140,
            }}
          >
            {displayImage ? (
              <View className="relative items-center justify-center">
                <Image
                  style={{ width: 120, height: 120, borderRadius: 12 }}
                  source={
                    selectedGallery || (typeof coverSelected === 'string' && coverSelected.startsWith('ct_'))
                      ? setImageUrl({ image: selectedGallery || coverSelected })
                      : typeof coverSelected === 'string'
                        ? { uri: coverSelected }
                        : setImageUrl({ image: previewValue })
                  }
                />
                <TouchableOpacity
                  onPress={onClear}
                  className="absolute -top-2 -right-2 rounded-full p-1"
                  style={{ backgroundColor: colors.error[500] }}
                >
                  <MaterialIcons name="close" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            ) : (
              <View className="items-center">
                <MaterialIcons
                  name="add-photo-alternate"
                  size={40}
                  color={colors.primary[400]}
                />
                <Text
                  className="text-center mt-2 text-sm font-medium"
                  style={{ color: colors.primary[600] }}
                >
                  {t('Tap to send an image')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onOpenGallery}
            className="rounded-2xl p-4 items-center justify-center"
            style={{ backgroundColor: colors.primary[500], minWidth: 72 }}
          >
            <MaterialCommunityIcons
              name="folder-multiple-image"
              size={28}
              color={colors.white}
            />
            <Text className="text-white text-xs font-semibold mt-2">
              {t('Gallery')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={onSave}
          disabled={saving}
          className="items-center py-3 rounded-xl"
          style={{
            backgroundColor: colors.primary[500],
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <Loading />
          ) : (
            <Text className="text-white font-semibold">{t('Save')}</Text>
          )}
        </TouchableOpacity>

        <Modal visible={galleryVisible} animationType="slide" transparent>
          <View
            className="flex-1 justify-end"
            style={{ backgroundColor: colors.overlay.light }}
          >
            <View
              className="bg-white rounded-t-3xl p-6"
              style={{ maxHeight: '80%' }}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text
                  className="text-2xl font-bold"
                  style={{ color: colors.primary[700] }}
                >
                  {t('Select an image')}
                </Text>
                <TouchableOpacity
                  onPress={onCloseGallery}
                  className="rounded-full p-2"
                  style={{ backgroundColor: colors.gray[100] }}
                >
                  <MaterialIcons name="close" size={24} color={colors.gray[700]} />
                </TouchableOpacity>
              </View>
              <ScrollView
                contentContainerStyle={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 12,
                  paddingBottom: 20,
                }}
              >
                {imageSources.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => onSelectGallery(item.uri, `ct_${item.id}`)}
                    className="rounded-xl overflow-hidden active:scale-95"
                    style={{
                      borderWidth: 2,
                      borderColor:
                        selectedGallery === `ct_${item.id}`
                          ? colors.primary[500]
                          : colors.primary[200],
                    }}
                  >
                    <Image style={{ width: 100, height: 100 }} source={item.uri} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  const HandleOpenAddDeck = () => {
    setEditingDeck(null);
    setDeckStatus('published');
    setDeckScheduledAt('');
    setOpenAddDeck(true);
  };

  const HandleOpenEditDeck = (item: {
    _id: string;
    name: string;
    image?: string | null;
    status?: string;
    scheduled_at?: string | null;
  }) => {
    setEditingDeck(item);
    handleInputChange('name', item.name || '');
    setSelectedImage(item.image || null);
    setSelectedImageFromGallery(item.image || null);
    setDeckStatus((item.status as PublishStatus) || 'published');
    setDeckScheduledAt(toDatetimeLocalValue(item.scheduled_at));
    setGeneratedCards([]);
    setOpenAddDeck(true);
  };

  const HandleDeleteDeck = (deckId: string) => {
    Alert.alert(t('Delete deck'), t('Are you sure?'), [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: t('Delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/deck/${deckId}`, {
              headers: { Authorization: `Bearer ${userInfo?.token}` },
            });
            toast({ message: t('Deck deleted successfully'), variant: 'success' });
            fetchData();
            fetchCollectionData();
          } catch {
            toast({ message: t('Failed to delete deck'), variant: 'destructive' });
          }
        },
      },
    ]);
  };

  const HandleCreateDeck = async () => {
    setErrors({});
    let url = '';

    const validateForm = async () => {
      await validationSchema.validate(formData, { abortEarly: false });
    };

    if (selectedImage && !selectedImageFromGallery) {
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const storageRef = ref(storage, `images/decks/${Date.now()}`);

      await uploadBytes(storageRef, blob);
      url = await getDownloadURL(storageRef);
    } else {
      url = selectedImageFromGallery!;
    }

    try {
      setLoading(true);
      await validateForm();
      const payload: Record<string, unknown> = {
        name: formData.name,
        image: url,
        status: deckStatus,
        scheduled_at: deckStatus === 'scheduled' && deckScheduledAt ? deckScheduledAt : null,
      };
      if (editingDeck) {
        await api.put(`/deck/${editingDeck._id}`, payload, {
          headers: { Authorization: `Bearer ${userInfo?.token}` },
        });
      } else {
        await api.post('/deck/create', {
          ...payload,
          collection_id: currentCollection?._id || currentClassroom?.collection,
          cards: generatedCards.map(({ _id, ...rest }) => rest),
        });
      }

      toast({
        message: editingDeck ? t('Deck updated successfully') : t('Deck created successfully'),
        variant: 'success',
        showProgress: true,
      });
      setOpenAddDeck(false);
      setSelectedImage(null);
      setGeneratedCards([]);
      setEditingDeck(null);
      setDeckStatus('published');
      setDeckScheduledAt('');
      handleInputChange('name', '');
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const newErrors: Record<string, string> = {};
        error.inner.forEach((err) => {
          if (err.path) newErrors[err.path] = err.message;
        });
        setErrors(newErrors);
      } else if (error instanceof Error) {
        console.error(error.message);
        toast({
          message: error.message,
          variant: 'destructive',
          showProgress: true,
        });
      } else {
        toast({
          message: t('An unexpected error has occurred'),
          variant: 'destructive',
        });
      }
    } finally {
      fetchData();
      fetchCollectionData();
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));

    setCharacterCounter(value.length);
  };

  const [email, setEmail] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [notifyAllStudents, setNotifyAllStudents] = useState(false);
  const [sendingNotify, setSendingNotify] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<{
    type: 'student' | 'guest';
    userId?: string;
    email?: string;
    name: string;
  } | null>(null);
  const [removingUser, setRemovingUser] = useState(false);

  const handleRemoveUser = async () => {
    if (!currentClassroom?._id || !removeTarget) return;
    try {
      setRemovingUser(true);
      await api.post(
        '/classroom/remove_user_in_classroom',
        {
          classroom_id: currentClassroom._id,
          ...(removeTarget.userId ? { user_id: removeTarget.userId } : {}),
          ...(removeTarget.email ? { email: removeTarget.email } : {}),
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        },
      );
      toast({
        message: t('User removed from classroom'),
        variant: 'success',
        showProgress: true,
      });
      setRemoveTarget(null);
      fetchData();
    } catch (error: any) {
      toast({
        message:
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          t('Error removing user'),
        variant: 'destructive',
      });
    } finally {
      setRemovingUser(false);
    }
  };

  const handleAddUser = async () => {
    try {
      setLoading(true);
      const response = await api.post(
        '/classroom/add_user_in_classroom',
        {
          classroom_id: currentClassroom?._id,
          email_user: email,
        },
        {
          headers: {
            Authorization: `Bearer ${userInfo?.token}`,
          },
        },
      );
      setEmail('');

      if (response.status == 200) {
        toast({
          message: t('Invitation sent successfully'),
          variant: 'success',
          showProgress: true,
        });
        fetchData();
        fetchCollectionData();
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const studentIds = (currentClassroom?.students || [])
    .map((student: any) => student?._id)
    .filter(Boolean) as string[];

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId],
    );
  };

  const openNotifyModal = (all: boolean) => {
    if (all) {
      if (studentIds.length === 0) {
        toast({ message: t('No students yet.'), variant: 'destructive' });
        return;
      }
      setNotifyAllStudents(true);
      setNotifyOpen(true);
      return;
    }
    if (selectedStudentIds.length === 0) {
      toast({ message: t('No students selected'), variant: 'destructive' });
      return;
    }
    setNotifyAllStudents(false);
    setNotifyOpen(true);
  };

  const handleNotifyStudents = async (notifyTitle: string, notifyBody: string) => {
    if (!currentClassroom?._id || !userInfo?.token) return;
    try {
      setSendingNotify(true);
      const result = await notificationsApi.sendTeacherCustom(userInfo.token, {
        classroom_id: currentClassroom._id,
        title: notifyTitle,
        body: notifyBody,
        student_ids: notifyAllStudents ? undefined : selectedStudentIds,
      });
      toast({
        message: t('Notification sent to {{count}} people.', {
          count: result.data.sent_to,
        }),
        variant: 'success',
      });
      setNotifyOpen(false);
      setSelectedStudentIds([]);
    } catch (error: any) {
      toast({
        message:
          error.response?.data?.error ||
          error.response?.data?.description ||
          t('Error sending notification'),
        variant: 'destructive',
      });
    } finally {
      setSendingNotify(false);
    }
  };

  const closeAddDeck = async () => {
    handleInputChange('name', '');
    setOpenAddDeck(false);
    setSelectedImage(null);
    setGeneratedCards([]);
    setEditingDeck(null);
    setDeckStatus('published');
    setDeckScheduledAt('');
  };

  const handleSaveCheckout = async () => {
    if (!currentClassroom?._id) return;
    const parsed =
      checkoutPrice.trim() === '' ? null : Number(checkoutPrice.replace(',', '.'));
    if (checkoutEnabled && (parsed === null || Number.isNaN(parsed) || parsed <= 0)) {
      toast({ message: t('Enter a valid classroom price'), variant: 'destructive' });
      return;
    }
    try {
      setSavingCheckout(true);
      const res = await api.put(
        `/classroom/${currentClassroom._id}`,
        { checkout_enabled: checkoutEnabled, price: parsed },
        { headers: { Authorization: `Bearer ${userInfo?.token}` } },
      );
      setCurrentClassroom((prev) => (prev ? { ...prev, ...res.data } : res.data));
      toast({ message: t('Checkout settings saved'), variant: 'success' });
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Failed to save checkout settings'),
        variant: 'destructive',
      });
    } finally {
      setSavingCheckout(false);
    }
  };

  const handleCopyCheckoutUrl = async () => {
    const url = currentClassroom?.checkout_url;
    if (!url) return;
    const copied = await copyText(url);
    toast({
      message: copied ? t('Checkout link copied') : url,
      variant: copied ? 'success' : 'destructive',
    });
  };

  const [showGuests, setShowGuests] = useState(true);
  const [showStudents, setShowStudents] = useState(true);

  const toggleGuests = () => {
    setShowGuests((prev) => !prev);
  };

  const toggleStudents = () => {
    setShowStudents((prev) => !prev);
  };

  useEffect(() => {
    setSelectedStudentIds([]);
    setNotifyOpen(false);
  }, [currentClassroom?._id]);

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View className="flex-row w-full justify-between  items-center mb-4">
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
        <Text className="w-[70%] text-center text-gray-800 text-lg font-bold">
          {name}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 200, paddingTop: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row mb-4 border-b border-gray-300">
          <TouchableOpacity
            onPress={() => setTab('content')}
            className={`px-6 py-2 ${
              tab === 'content' ? 'border-b-2 border-primary-500' : ''
            }`}
          >
            <Text
              className={`text-lg font-bold ${tab === 'content' ? 'text-primary-500' : 'text-gray-500'}`}
            >
              {t('Content')}
            </Text>
          </TouchableOpacity>
          {(isTeacher || hasCourses) && (
            <TouchableOpacity
              onPress={() => setTab('courses')}
              className={`px-6 py-2 ${
                tab === 'courses' ? 'border-b-2 border-primary-500' : ''
              }`}
            >
              <Text
                className={`text-lg font-bold ${tab === 'courses' ? 'text-primary-500' : 'text-gray-500'}`}
              >
                {t('Courses')}
              </Text>
            </TouchableOpacity>
          )}
          {canManagePeople && (
            <TouchableOpacity
              onPress={() => setTab('people')}
              className={`px-6 py-2 ${
                tab === 'people' ? 'border-b-2 border-primary-500' : ''
              }`}
            >
              <Text
                className={`text-lg font-bold ${tab === 'people' ? 'text-primary-500' : 'text-gray-500'}`}
              >
                {t('People')}
              </Text>
            </TouchableOpacity>
          )}
          {isClassroomOwner && (
            <TouchableOpacity
              onPress={() => setTab('settings')}
              className={`px-6 py-2 ${
                tab === 'settings' ? 'border-b-2 border-primary-500' : ''
              }`}
            >
              <Text
                className={`text-lg font-bold ${tab === 'settings' ? 'text-primary-500' : 'text-gray-500'}`}
              >
                {t('Settings')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {tab === 'content' ? (
          <View>
            {!isTeacher ? (
              <ClassroomLessonContinue
                lastViewed={lastViewedLessons}
                nextLesson={nextClassroomLesson}
                onOpen={(lesson) => {
                  const course = courses.find((item) => item._id === lesson.course_id);
                  if (course) setCurrentCourse(course);
                  router.push({
                    pathname: '/classrooms/class/courses/[courseId]/lesson/[lessonId]' as any,
                    params: {
                      courseId: lesson.course_id,
                      lessonId: lesson._id,
                      lessonTitle: lesson.title,
                    },
                  });
                }}
              />
            ) : null}
            <View className="">
              <View className="my-6 w-full h-48 md:h-[756px] rounded-[12px] overflow-hidden relative">
                <Image
                  source={setImageUrl({ image: currentCollection?.image })}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    resizeMode: 'cover',
                    opacity: 0.3,
                  }}
                  className="w-full h-full"
                  blurRadius={10}
                />

                <Image
                  source={setImageUrl({ image: currentCollection?.image })}
                  style={{
                    width: '100%',
                    height: '100%',
                    resizeMode: 'contain',
                  }}
                  className="w-full h-full"
                />
              </View>

              {loadingCollection && (
                <Loading
                  color={colors.primary[500]}
                  classname="flex-1 items-center justify-center"
                />
              )}

              <View>
                {currentCollection && currentCollection.decks.length > 0 ? (
                  <>
                    {currentCollection.decks.map((item) => (
                      <DeckCardSecondary
                        key={item._id}
                        name={item.name}
                        image={item.image}
                        type="deck"
                        classroom={item._id}
                        pending_cards={item.pending_cards}
                        total_cards={item.total_cards}
                        status={item.status}
                        lessonLinked={item.lesson_linked}
                        onPress={() => setCurrentDeck(item)}
                        onEdit={
                          isClassroomOwner
                            ? () => HandleOpenEditDeck(item)
                            : undefined
                        }
                        onDelete={
                          isClassroomOwner
                            ? () => HandleDeleteDeck(item._id)
                            : undefined
                        }
                      />
                    ))}
                  </>
                ) : (
                  <BrainEmptyState
                    expression="sad"
                    title={t(
                      'Your collection is empty, add a deck to your collection',
                    )}
                  />
                )}
              </View>
            </View>

            <Modal
              transparent
              animationType="slide"
              visible={openAddDeck}
              onRequestClose={closeAddDeck}
            >
              <View
                className="flex-1 justify-center items-center px-4"
                style={{
                  backgroundColor: colors.overlay?.medium || 'rgba(0,0,0,0.5)',
                }}
              >
                  <View
                    className="bg-white rounded-3xl w-full md:max-w-2xl p-6 md:p-8"
                    style={{
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 10 },
                      shadowOpacity: 0.25,
                      shadowRadius: 20,
                      elevation: 10,
                      maxHeight: '90%',
                    }}
                  >
                    <ScrollView showsVerticalScrollIndicator={false}>
                      <View className="flex flex-row justify-between items-center mb-6">
                        <View className="flex-row items-center gap-3">
                          <View
                            className="rounded-full p-2"
                            style={{ backgroundColor: colors.primary[100] }}
                          >
                            <MaterialCommunityIcons
                              name="cards"
                              size={24}
                              color={colors.primary[500]}
                            />
                          </View>
                          <Text
                            className="font-bold text-2xl md:text-3xl"
                            style={{ color: colors.primary[700] }}
                          >
                            {t(editingDeck ? 'Edit deck' : 'New deck')}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={closeAddDeck}
                          className="rounded-full p-2 active:scale-95"
                          style={{ backgroundColor: colors.gray[100] }}
                        >
                          <MaterialIcons
                            name="close"
                            size={24}
                            color={colors.gray[700]}
                          />
                        </TouchableOpacity>
                      </View>

                      <View className="mb-6">
                        <Text
                          className="text-sm font-semibold mb-3"
                          style={{ color: colors.gray[700] }}
                        >
                          {t('Deck Image')}
                        </Text>
                        <View className="flex flex-row items-stretch gap-3">
                          <TouchableOpacity
                            onPress={pickImage}
                            className="flex-1 border-2 border-dashed rounded-2xl p-6 flex items-center justify-center"
                            style={{
                              borderColor: colors.primary[300],
                              backgroundColor: colors.primary[50],
                              minHeight: 160,
                            }}
                          >
                            {selectedImage ? (
                              <View className="relative w-full h-full items-center justify-center">
                                <Image
                                  style={{
                                    width: 140,
                                    height: 140,
                                    borderRadius: 12,
                                  }}
                                  source={
                                    typeof selectedImage === 'string'
                                      ? { uri: selectedImage }
                                      : selectedImage
                                  }
                                />
                                <TouchableOpacity
                                  onPress={() => {
                                    setSelectedImage(null);
                                    setSelectedImageFromGallery(null);
                                  }}
                                  className="absolute -top-2 -right-2 rounded-full p-1"
                                  style={{ backgroundColor: colors.error[500] }}
                                >
                                  <MaterialIcons
                                    name="close"
                                    size={20}
                                    color={colors.white}
                                  />
                                </TouchableOpacity>
                              </View>
                            ) : (
                              <View className="flex-col items-center justify-center">
                                <MaterialIcons
                                  name="add-photo-alternate"
                                  size={48}
                                  color={colors.primary[400]}
                                />
                                <Text
                                  className="text-center mt-3 font-medium"
                                  style={{ color: colors.primary[600] }}
                                >
                                  {t('Tap to send an image')}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          <TouchableOpacity
                            onPress={() => setModalVisible(true)}
                            className="rounded-2xl p-4 items-center justify-center"
                            style={{
                              backgroundColor: colors.primary[500],
                              minWidth: 80,
                            }}
                          >
                            <MaterialCommunityIcons
                              name="folder-multiple-image"
                              size={32}
                              color={colors.white}
                            />
                            <Text className="text-white text-xs font-semibold mt-2">
                              {t('Gallery')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Modal
                        visible={modalVisible}
                        animationType="slide"
                        transparent
                      >
                        <View
                          className="flex-1 justify-end"
                          style={{ backgroundColor: colors.overlay.light }}
                        >
                          <View
                            className="bg-white rounded-t-3xl p-6"
                            style={{ maxHeight: '80%' }}
                          >
                            <View className="flex-row justify-between items-center mb-4">
                              <Text
                                className="text-2xl font-bold"
                                style={{ color: colors.primary[700] }}
                              >
                                {t('Select an image')}
                              </Text>
                              <TouchableOpacity
                                onPress={() => setModalVisible(false)}
                                className="rounded-full p-2"
                                style={{ backgroundColor: colors.gray[100] }}
                              >
                                <MaterialIcons
                                  name="close"
                                  size={24}
                                  color={colors.gray[700]}
                                />
                              </TouchableOpacity>
                            </View>
                            <ScrollView
                              contentContainerStyle={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 12,
                                paddingBottom: 20,
                              }}
                            >
                              {imageSourcesDeck.map((item) => (
                                <TouchableOpacity
                                  key={item.id}
                                  onPress={() => {
                                    setSelectedImage(item.uri);
                                    setSelectedImageFromGallery(
                                      `dt_${item.id}`,
                                    );
                                    setModalVisible(false);
                                  }}
                                  className="rounded-xl overflow-hidden active:scale-95"
                                  style={{
                                    borderWidth: 2,
                                    borderColor: colors.primary[200],
                                  }}
                                >
                                  <Image
                                    style={{ width: 100, height: 100 }}
                                    source={item.uri}
                                  />
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </View>
                        </View>
                      </Modal>

                      <View className="mb-6">
                        <Text
                          className="text-sm font-semibold mb-3"
                          style={{ color: colors.gray[700] }}
                        >
                          {t('Deck Name')}
                        </Text>
                        <View className="relative">
                          <Input
                            placeholder={t('Enter name deck')}
                            maxLength={25}
                            style={{
                              borderWidth: 2,
                              borderColor: errors['name']
                                ? colors.error[500]
                                : colors.gray[300],
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 14,
                              fontSize: 16,
                            }}
                            value={formData.name}
                            onChangeText={(value) =>
                              handleInputChange('name', value)
                            }
                          />
                          <Text
                            className="absolute right-4 top-4 text-xs"
                            style={{ color: colors.gray[400] }}
                          >
                            {characterCounter}/25
                          </Text>
                        </View>
                        {errors['name'] && (
                          <Text
                            className="mt-2 text-sm font-medium"
                            style={{ color: colors.error[500] }}
                          >
                            {errors['name']}
                          </Text>
                        )}
                      </View>

                      {isTeacher && (
                        <PublishStatusFields
                          status={deckStatus}
                          scheduledAt={deckScheduledAt}
                          onStatusChange={setDeckStatus}
                          onScheduledAtChange={setDeckScheduledAt}
                        />
                      )}

                      {!editingDeck && (
                      <TouchableOpacity
                        style={{
                          borderColor:
                            generatedCards.length > 0
                              ? colors.primary[500]
                              : 'gray',
                        }}
                        className="border border-dashed rounded-2xl flex items-center justify-center w-full mb-4"
                        onPress={() => setOpenCardGenerator(true)}
                      >
                        <View className="flex-row items-center justify-center px-4 py-3">
                          <MaterialCommunityIcons
                            name={
                              generatedCards.length > 0
                                ? 'cards'
                                : 'star-check-outline'
                            }
                            size={24}
                            color={
                              generatedCards.length > 0
                                ? colors.primary[500]
                                : 'gray'
                            }
                            className="mr-2"
                          />
                          <Text
                            style={{
                              color:
                                generatedCards.length > 0
                                  ? colors.primary[500]
                                  : 'gray',
                            }}
                          >
                            {generatedCards.length > 0
                              ? t(`${generatedCards.length} cards generated`)
                              : t('Generate cards with AI')}
                          </Text>
                        </View>
                      </TouchableOpacity>
                      )}

                      <View className="flex-col md:flex-row gap-3 mt-4">
                        <TouchableOpacity
                          style={{
                            backgroundColor: colors.primary[500],
                            shadowColor: colors.primary[500],
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                            elevation: 5,
                          }}
                          className="w-full md:flex-[2] rounded-xl py-4 items-center active:scale-98 order-1 md:order-2"
                          onPress={HandleCreateDeck}
                          disabled={loading}
                        >
                          {loading ? (
                            <Loading />
                          ) : (
                            <View className="flex-row items-center gap-2">
                              <MaterialIcons
                                name="check"
                                size={20}
                                color={colors.white}
                              />
                              <Text className="text-white text-base font-bold">
                                {t(editingDeck ? 'Save deck' : 'Create New deck')}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={closeAddDeck}
                          className="w-full md:flex-1 rounded-xl py-4 items-center order-2 md:order-1"
                          style={{ backgroundColor: colors.gray[200] }}
                        >
                          <Text
                            className="font-bold text-base"
                            style={{ color: colors.gray[700] }}
                          >
                            {t('Cancel')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <ModalGenerateCards
                        open={openCardGenerator}
                        setOpen={setOpenCardGenerator}
                        setGeneratedCards={setGeneratedCards}
                      />
                    </ScrollView>
                  </View>
              </View>
            </Modal>
          </View>
        ) : tab === 'courses' ? (
          <View className="py-2">
            {coursesLoading ? (
              <View className="items-center py-16">
                <Loading color={colors.primary[500]} />
              </View>
            ) : courses.length === 0 ? (
              <View className="items-center py-16">
                <MaterialCommunityIcons name="book-open-page-variant-outline" size={56} color={colors.gray[300]} />
                <Text className="text-gray-400 text-base font-semibold mt-3 text-center">
                  {isTeacher ? t('No courses yet. Create the first one!') : t('No courses available yet.')}
                </Text>
              </View>
            ) : (
              courses.map((course, index) => (
                <View
                  key={course._id}
                  className="mb-4 rounded-2xl overflow-hidden"
                  style={{
                    backgroundColor: colors.white,
                    shadowColor: colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.08,
                    shadowRadius: 8,
                    elevation: 3,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setCurrentCourse(course);
                      router.push({
                        pathname: '/classrooms/class/courses/[courseId]' as any,
                        params: { courseId: course._id, courseName: course.name },
                      });
                    }}
                  >
                    <View className="px-5 py-4" style={{ borderLeftWidth: 4, borderLeftColor: colors.primary[500] }}>
                      <View className="flex-row items-center justify-between">
                        <View className="flex-1">
                          <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
                            {course.name}
                          </Text>
                          {!!course.description && (
                            <Text className="text-sm text-gray-500 mt-1" numberOfLines={2}>
                              {course.description}
                            </Text>
                          )}
                        </View>
                        <MaterialIcons name="chevron-right" size={24} color={colors.primary[500]} />
                      </View>
                    </View>
                  </TouchableOpacity>
                  {isTeacher && (
                    <View className="flex-row items-center justify-end gap-1 px-4 pb-3">
                      <TouchableOpacity
                        onPress={() => handleReorderCourse(index, 'up')}
                        disabled={index === 0}
                        className="p-1"
                      >
                        <MaterialIcons
                          name="arrow-upward"
                          size={20}
                          color={index === 0 ? colors.gray[300] : colors.gray[600]}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleReorderCourse(index, 'down')}
                        disabled={index === courses.length - 1}
                        className="p-1"
                      >
                        <MaterialIcons
                          name="arrow-downward"
                          size={20}
                          color={
                            index === courses.length - 1
                              ? colors.gray[300]
                              : colors.gray[600]
                          }
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => openEditCourseModal(course)} className="p-1">
                        <Feather name="edit-2" size={18} color={colors.gray[600]} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setDuplicateTarget({
                            type: 'course',
                            sourceId: course._id,
                            defaultName: course.name,
                          })
                        }
                        className="p-1"
                      >
                        <MaterialCommunityIcons
                          name="content-copy"
                          size={18}
                          color={colors.gray[600]}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteCourse(course)} className="p-1">
                        <MaterialIcons name="delete-outline" size={20} color={colors.error[500]} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            )}

            {/* Create Course Modal */}
            {showCreateCourse && (
              <Modal visible={showCreateCourse} transparent animationType="fade">
                <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: colors.overlay.medium }}>
                  <View className="bg-white rounded-3xl w-full max-w-lg p-6" style={{ elevation: 10 }}>
                    <View className="flex-row justify-between items-center mb-5">
                      <Text className="text-xl font-bold" style={{ color: colors.primary[700] }}>
                        {editingCourse ? t('Edit course') : t('New Course')}
                      </Text>
                      <TouchableOpacity onPress={closeCourseModal}
                        className="rounded-full p-2" style={{ backgroundColor: colors.gray[100] }}>
                        <MaterialIcons name="close" size={20} color={colors.gray[700]} />
                      </TouchableOpacity>
                    </View>
                    <Text className="text-sm font-semibold text-gray-700 mb-2">{t('Course Name')} *</Text>
                    <TextInput
                      className="border border-gray-300 rounded-xl px-4 py-3 mb-4 text-gray-800"
                      placeholder={t('e.g. Introduction to Mathematics')}
                      value={newCourseName}
                      onChangeText={setNewCourseName}
                      maxLength={80}
                    />
                    <Text className="text-sm font-semibold text-gray-700 mb-2">{t('Description')}</Text>
                    <TextInput
                      className="border border-gray-300 rounded-xl px-4 py-3 mb-5 text-gray-800"
                      placeholder={t('Brief description of the course')}
                      value={newCourseDesc}
                      onChangeText={setNewCourseDesc}
                      multiline
                      numberOfLines={3}
                      style={{ textAlignVertical: 'top', minHeight: 72 }}
                      maxLength={300}
                    />
                    <View className="flex-row gap-3">
                      <TouchableOpacity onPress={closeCourseModal}
                        className="flex-1 rounded-xl py-3 items-center" style={{ backgroundColor: colors.gray[200] }}>
                        <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={creatingCourse || !newCourseName.trim()}
                        onPress={handleSaveCourse}
                        className="flex-[2] rounded-xl py-3 items-center"
                        style={{ backgroundColor: newCourseName.trim() ? colors.primary[500] : colors.gray[300] }}>
                        {creatingCourse ? <Loading /> : (
                          <Text className="font-bold text-white">
                            {editingCourse ? t('Save') : t('Create')}
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </Modal>
            )}
          </View>
        ) : tab === 'people' ? (
          <View style={{ flex: 1, backgroundColor: colors.background, padding: 16 }}>
            {/* Invite section */}
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: 16,
                padding: 16,
                marginBottom: 20,
                shadowColor: colors.shadow,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.07,
                shadowRadius: 6,
                elevation: 2,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.gray[700], marginBottom: 12 }}>
                {t('Add New User')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TextInput
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: colors.gray[300],
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: colors.gray[800],
                    backgroundColor: colors.gray[100],
                  }}
                  placeholder={t('Enter user email')}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={handleAddUser}
                  disabled={loading}
                  style={{
                    backgroundColor: colors.primary[500],
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 72,
                  }}
                >
                  {loading ? (
                    <Loading />
                  ) : (
                    <Text style={{ color: colors.white, fontWeight: '700', fontSize: 14 }}>{t('Add')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Guests */}
            {currentClassroom && currentClassroom.guests.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <TouchableOpacity
                  onPress={toggleGuests}
                  style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gray[700] }}>
                    {t('Guests')}
                  </Text>
                  <View
                    style={{
                      backgroundColor: colors.gray[200],
                      borderRadius: 10,
                      paddingHorizontal: 7,
                      paddingVertical: 1,
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gray[600] }}>
                      {currentClassroom.guests.length}
                    </Text>
                  </View>
                  <Tooltip
                    isVisible={showTooltip}
                    content={
                      <Text style={{ fontSize: 13 }}>
                        {t('Users not registered on the platform yet.')}
                      </Text>
                    }
                    placement="top"
                    onClose={() => setShowTooltip(false)}
                  >
                    <Pressable onPress={() => setShowTooltip(true)}>
                      <View
                        // @ts-ignore
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                      >
                        <Feather name="info" size={14} color={colors.gray[400]} />
                      </View>
                    </Pressable>
                  </Tooltip>
                  <MaterialIcons
                    name={showGuests ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                    size={20}
                    color={colors.gray[400]}
                  />
                </TouchableOpacity>

                {showGuests &&
                  currentClassroom.guests.map((item: string, index: number) => (
                    <View
                      key={item + index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: colors.white,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 10,
                        marginBottom: 6,
                      }}
                    >
                      <View
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 17,
                          backgroundColor: colors.gray[200],
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                        }}
                      >
                        <Feather name="mail" size={16} color={colors.gray[500]} />
                      </View>
                      <Text style={{ flex: 1, fontSize: 14, color: colors.gray[600] }}>{item}</Text>
                      <View
                        style={{
                          backgroundColor: colors.warning[100],
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          marginRight: 8,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.warning[700] }}>
                          {t('Pendente')}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() =>
                          setRemoveTarget({ type: 'guest', email: item, name: item })
                        }
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialIcons name="person-remove" size={20} color={colors.error[500]} />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}

            {/* Students */}
            <View>
              <TouchableOpacity
                onPress={toggleStudents}
                style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gray[700] }}>
                  {t('Students')}
                </Text>
                <View
                  style={{
                    backgroundColor: colors.primary[100],
                    borderRadius: 10,
                    paddingHorizontal: 7,
                    paddingVertical: 1,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primary[600] }}>
                    {currentClassroom?.students?.length ?? 0}
                  </Text>
                </View>
                <MaterialIcons
                  name={showStudents ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
                  size={20}
                  color={colors.gray[400]}
                />
              </TouchableOpacity>

              {showStudents && studentIds.length > 0 && (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={() =>
                      setSelectedStudentIds(
                        selectedStudentIds.length === studentIds.length ? [] : studentIds,
                      )
                    }
                    style={{
                      backgroundColor: colors.gray[100],
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.gray[700] }}>
                      {selectedStudentIds.length === studentIds.length
                        ? t('Clear selection')
                        : t('Select all')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openNotifyModal(false)}
                    style={{
                      backgroundColor:
                        selectedStudentIds.length > 0 ? colors.primary[500] : colors.gray[200],
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: selectedStudentIds.length > 0 ? colors.white : colors.gray[500],
                      }}
                    >
                      {t('Notify selected')}
                      {selectedStudentIds.length > 0 ? ` (${selectedStudentIds.length})` : ''}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => openNotifyModal(true)}
                    style={{
                      backgroundColor: colors.primary[100],
                      borderRadius: 10,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: colors.primary[700] }}>
                      {t('Notify all')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {showStudents &&
                currentClassroom &&
                currentClassroom.students.length === 0 && (
                  <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                    <MaterialCommunityIcons name="account-group-outline" size={40} color={colors.gray[300]} />
                    <Text style={{ color: colors.gray[400], marginTop: 8, fontSize: 14 }}>
                      {t('No students yet.')}
                    </Text>
                  </View>
                )}

              {showStudents &&
                currentClassroom &&
                currentClassroom.students.map((item: any, index: number) => (
                  <TouchableOpacity
                    key={item.email + index}
                    onPress={() => {
                      if (!item._id) return;
                      router.push({
                        pathname: '/classrooms/class/people/[studentId]' as any,
                        params: {
                          studentId: item._id,
                          studentName: item.name || item.email,
                          classroomId: currentClassroom?._id,
                        },
                      });
                    }}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.white,
                      borderRadius: 14,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      marginBottom: 8,
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.05,
                      shadowRadius: 4,
                      elevation: 1,
                    }}
                    activeOpacity={0.7}
                  >
                    {item._id ? (
                      <TouchableOpacity
                        onPress={(event) => {
                          event.stopPropagation();
                          toggleStudentSelection(item._id);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        style={{ marginRight: 8 }}
                      >
                        <MaterialIcons
                          name={
                            selectedStudentIds.includes(item._id)
                              ? 'check-box'
                              : 'check-box-outline-blank'
                          }
                          size={22}
                          color={colors.primary[500]}
                        />
                      </TouchableOpacity>
                    ) : null}
                    <View
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 21,
                        backgroundColor: colors.primary[100],
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Text style={{ fontSize: 17, fontWeight: '800', color: colors.primary[600] }}>
                        {(item.name || item.email)?.[0]?.toUpperCase() ?? '?'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: colors.gray[800] }}>
                        {item.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: colors.gray[500], marginTop: 1 }}>
                        {item.email}
                      </Text>
                    </View>
                    {item._id ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Text style={{ fontSize: 12, color: colors.primary[500], fontWeight: '600' }}>
                          {t('Ver perfil')}
                        </Text>
                        <MaterialIcons name="chevron-right" size={18} color={colors.primary[500]} />
                      </View>
                    ) : (
                      <MaterialIcons name="chevron-right" size={20} color={colors.gray[300]} />
                    )}
                    <TouchableOpacity
                      onPress={(event) => {
                        event.stopPropagation();
                        setRemoveTarget({
                          type: 'student',
                          userId: item._id,
                          email: item.email,
                          name: item.name || item.email,
                        });
                      }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={{ marginLeft: 8, padding: 4 }}
                    >
                      <MaterialIcons name="person-remove" size={20} color={colors.error[500]} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        ) : (
          <View className="py-2">
            {renderCoverPicker({
              title: t('Collection cover'),
              description: t('Shown on the content tab of this classroom'),
              previewValue: currentCollection?.image,
              selectedImage: collectionCoverImage,
              selectedGallery: collectionCoverGallery,
              onPick: () =>
                pickCoverImage(setCollectionCoverImage, setCollectionCoverGallery),
              onClear: () => {
                setCollectionCoverImage(null);
                setCollectionCoverGallery(null);
              },
              onOpenGallery: () => setCollectionCoverModalVisible(true),
              galleryVisible: collectionCoverModalVisible,
              onCloseGallery: () => setCollectionCoverModalVisible(false),
              onSelectGallery: (_uri, key) => {
                setCollectionCoverImage(key);
                setCollectionCoverGallery(key);
                setCollectionCoverModalVisible(false);
              },
              onSave: handleSaveCollectionCover,
              saving: savingCollectionCover,
            })}

            {renderCoverPicker({
              title: t('Classroom cover'),
              description: t('Shown on the classroom list and cards'),
              previewValue:
                currentClassroom?.cover_image ?? currentClassroom?.image,
              selectedImage: classroomCoverImage,
              selectedGallery: classroomCoverGallery,
              onPick: () =>
                pickCoverImage(setClassroomCoverImage, setClassroomCoverGallery),
              onClear: () => {
                setClassroomCoverImage(null);
                setClassroomCoverGallery(null);
              },
              onOpenGallery: () => setClassroomCoverModalVisible(true),
              galleryVisible: classroomCoverModalVisible,
              onCloseGallery: () => setClassroomCoverModalVisible(false),
              onSelectGallery: (_uri, key) => {
                setClassroomCoverImage(key);
                setClassroomCoverGallery(key);
                setClassroomCoverModalVisible(false);
              },
              onSave: handleSaveClassroomCover,
              saving: savingClassroomCover,
            })}

            {canManageCheckout ? (
              <View
                className="rounded-2xl px-5 py-4 mb-4"
                style={{
                  backgroundColor: colors.gray[100],
                  borderWidth: 1,
                  borderColor: colors.gray[300],
                }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View className="flex-1 pr-3">
                    <Text className="font-bold text-gray-800">{t('External checkout')}</Text>
                    <Text className="text-xs text-gray-500 mt-1">
                      {currentClassroom?.checkout_allowed
                        ? t('Enable a public checkout link for this classroom')
                        : t('Checkout not allowed')}
                    </Text>
                  </View>
                  {currentClassroom?.checkout_allowed ? (
                    <Switch
                      value={checkoutEnabled}
                      onValueChange={setCheckoutEnabled}
                      trackColor={{ false: colors.gray[300], true: colors.primary[200] }}
                      thumbColor={checkoutEnabled ? colors.primary[500] : colors.gray[400]}
                    />
                  ) : null}
                </View>
                {currentClassroom?.checkout_url ? (
                  <View className="flex-row items-center gap-2 mb-3">
                    <Text className="flex-1 text-xs text-gray-600" numberOfLines={2} selectable>
                      {currentClassroom.checkout_url}
                    </Text>
                    <TouchableOpacity
                      onPress={handleCopyCheckoutUrl}
                      className="px-3 py-2 rounded-xl"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Text className="text-xs font-semibold" style={{ color: colors.primary[500] }}>
                        {t('Copy link')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
                {currentClassroom?.checkout_allowed ? (
                  <>
                    <Text className="text-xs text-gray-600 mb-1">{t('Price')}</Text>
                    <TextInput
                      value={checkoutPrice}
                      onChangeText={setCheckoutPrice}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor={colors.placeholder}
                      className="h-11 px-3 rounded-xl mb-3 bg-white"
                      style={{ borderWidth: 1, borderColor: colors.gray[300] }}
                    />
                    <TouchableOpacity
                      onPress={handleSaveCheckout}
                      disabled={savingCheckout}
                      className="items-center py-3 rounded-xl"
                      style={{
                        backgroundColor: colors.primary[500],
                        opacity: savingCheckout ? 0.7 : 1,
                      }}
                    >
                      {savingCheckout ? (
                        <Loading />
                      ) : (
                        <Text className="text-white font-semibold">
                          {t('Save checkout settings')}
                        </Text>
                      )}
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : null}
          </View>
        )}
        <LinearGradient
          colors={['transparent', `${colors.gray[100]}`]}
          className="absolute bottom-0 left-0 right-0 h-60"
          pointerEvents="none"
        />
      </ScrollView>

      {tab === 'content' && isTeacher && (
        <TouchableOpacity
          className="absolute bottom-7 right-7 bg-[#007AFF] rounded-full p-2.5"
          onPress={HandleOpenAddDeck}
        >
          <MaterialIcons name="add" size={40} color={colors.gray[100]} />
        </TouchableOpacity>
      )}
      {tab === 'courses' && isTeacher && (
        <TouchableOpacity
          className="absolute bottom-7 right-0 rounded-full p-3 flex-row items-center gap-2"
          style={{ backgroundColor: colors.primary[500] }}
          onPress={openCreateCourseModal}
        >
          <MaterialIcons name="add" size={28} color={colors.white} />
          <Text className="text-white font-bold mr-2">{t('New Course')}</Text>
        </TouchableOpacity>
      )}

      <Modal visible={!!removeTarget} transparent animationType="fade">
        <View
          className="flex-1 justify-center items-center px-4"
          style={{ backgroundColor: colors.overlay.medium }}
        >
          <View className="bg-white rounded-3xl w-full max-w-lg p-6" style={{ elevation: 10 }}>
            <Text className="text-xl font-bold mb-2" style={{ color: colors.gray[800] }}>
              {t('Remove from classroom')}
            </Text>
            <Text className="text-sm mb-5" style={{ color: colors.gray[600] }}>
              {t('Are you sure you want to remove {{name}} from this classroom?', {
                name: removeTarget?.name || t('(sem nome)'),
              })}
            </Text>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setRemoveTarget(null)}
                disabled={removingUser}
                className="flex-1 rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <Text className="font-bold text-gray-700">{t('Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleRemoveUser}
                disabled={removingUser}
                className="flex-1 rounded-xl py-3 items-center"
                style={{ backgroundColor: colors.error[500] }}
              >
                {removingUser ? (
                  <Loading />
                ) : (
                  <Text className="font-bold text-white">{t('Remove user')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotifyPeopleModal
        visible={notifyOpen}
        recipientCount={notifyAllStudents ? studentIds.length : selectedStudentIds.length}
        sending={sendingNotify}
        onSend={handleNotifyStudents}
        onClose={() => setNotifyOpen(false)}
      />

      <DuplicateTargetModal
        visible={!!duplicateTarget}
        type={duplicateTarget?.type ?? 'course'}
        sourceId={duplicateTarget?.sourceId ?? ''}
        defaultName={duplicateTarget?.defaultName}
        onClose={() => setDuplicateTarget(null)}
        onSuccess={() => {
          toast({ message: t('Duplicated successfully'), variant: 'success' });
          fetchCoursesCount(true);
        }}
      />
    </View>
  );
}
