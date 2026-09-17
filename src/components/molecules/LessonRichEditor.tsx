import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import {
  RichText,
  Toolbar,
  useEditorBridge,
  TenTapStartKit,
} from '@10play/tentap-editor';
import * as ImagePicker from 'expo-image-picker';
import { MaterialIcons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { replaceDataImagesWithUploads, uploadImageToFirebase } from '@/utils/uploadImage';
import {
  APPLY_LESSON_IMAGE_SIZES_JS,
  LESSON_IMAGE_EDITOR_CSS,
  canMoveLessonImage,
  deleteLessonImage,
  listLessonImages,
  moveLessonImage,
  resizeLessonImage,
} from '@/utils/lessonEditorImages';

type LessonRichEditorProps = {
  initialContent?: string;
  courseId: string;
  lessonId: string;
  onSave: (html: string) => Promise<void>;
  saving?: boolean;
};

export function LessonRichEditor({
  initialContent = '',
  courseId,
  lessonId,
  onSave,
  saving = false,
}: LessonRichEditorProps) {
  const { t } = useTranslation();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageCount, setImageCount] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedSrc, setSelectedSrc] = useState('');
  const [widthPct, setWidthPct] = useState(100);
  const [canMoveUp, setCanMoveUp] = useState(false);
  const [canMoveDown, setCanMoveDown] = useState(false);
  const selectedIndexRef = useRef(0);
  const refreshRef = useRef<() => void>(() => {});

  selectedIndexRef.current = selectedIndex;

  const editor = useEditorBridge({
    bridgeExtensions: TenTapStartKit,
    initialContent: initialContent?.trim() ? initialContent : '<p></p>',
    avoidIosKeyboard: true,
    autofocus: false,
    onChange: () => {
      refreshRef.current();
    },
  });

  const refreshImages = useCallback(async () => {
    try {
      editor.injectCSS(LESSON_IMAGE_EDITOR_CSS, 'lesson-img-css');
      editor.injectJS(APPLY_LESSON_IMAGE_SIZES_JS);
      const html = await editor.getHTML();
      const images = listLessonImages(html);
      const nextIndex = images.length
        ? Math.min(selectedIndexRef.current, images.length - 1)
        : 0;
      setImageCount(images.length);
      setSelectedIndex(nextIndex);
      setSelectedSrc(images[nextIndex]?.src || '');
      setWidthPct(images[nextIndex]?.widthPct ?? 100);
      setCanMoveUp(canMoveLessonImage(html, nextIndex, 'up'));
      setCanMoveDown(canMoveLessonImage(html, nextIndex, 'down'));
    } catch {
      // Editor webview may not be ready yet.
    }
  }, [editor]);

  useEffect(() => {
    refreshRef.current = refreshImages;
  }, [refreshImages]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      refreshImages();
    });
    return () => cancelAnimationFrame(frame);
  }, [refreshImages]);

  const applyHtml = useCallback(
    async (transform: (html: string) => string, selectIndex?: number) => {
      const html = await editor.getHTML();
      if (selectIndex != null) {
        selectedIndexRef.current = selectIndex;
        setSelectedIndex(selectIndex);
      }
      editor.setContent(transform(html) || '<p></p>');
    },
    [editor],
  );

  const handleInsertImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.[0]) return;

    try {
      setUploadingImage(true);
      const uri = result.assets[0].uri;
      const path = `lessons/${courseId}/${lessonId}/${Date.now()}.jpg`;
      const url = await uploadImageToFirebase(uri, path);
      selectedIndexRef.current = 999;
      editor.setImage(url);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleMove = (direction: 'up' | 'down') => {
    applyHtml((html) => moveLessonImage(html, selectedIndex, direction));
  };

  const handleResize = (pct: number) => {
    const next = Math.min(100, Math.max(20, Math.round(pct)));
    setWidthPct(next);
    applyHtml((html) => resizeLessonImage(html, selectedIndex, next), selectedIndex);
  };

  const handleDelete = () => {
    const confirmDelete = () => applyHtml((html) => deleteLessonImage(html, selectedIndex));
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(t('Delete this image?'))) {
        confirmDelete();
      }
      return;
    }
    Alert.alert(t('Delete image'), t('Delete this image?'), [
      { text: t('Cancel'), style: 'cancel' },
      { text: t('Delete'), style: 'destructive', onPress: confirmDelete },
    ]);
  };

  const handleSave = async () => {
    try {
      const html = await editor.getHTML();
      let payload = html;
      if (html?.includes('data:image')) {
        setUploadingImage(true);
        payload = await replaceDataImagesWithUploads(
          html,
          `lessons/${courseId}/${lessonId}`,
        );
        if (typeof editor.setContent === 'function') {
          editor.setContent(payload);
        }
      }
      await onSave(payload);
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View className="flex-row items-center justify-end gap-2 px-4 py-2 border-b border-gray-100">
        <TouchableOpacity
          onPress={handleInsertImage}
          disabled={uploadingImage || saving}
          className="flex-row items-center px-3 py-2 rounded-xl gap-1"
          style={{ backgroundColor: colors.gray[100] }}
        >
          {uploadingImage ? (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          ) : (
            <MaterialIcons name="image" size={18} color={colors.gray[700]} />
          )}
          <Text className="text-sm font-semibold text-gray-700">{t('Insert image')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || uploadingImage}
          className="flex-row items-center px-4 py-2 rounded-xl gap-1"
          style={{ backgroundColor: colors.primary[500] }}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <MaterialIcons name="save" size={18} color={colors.white} />
          )}
          <Text className="text-sm font-semibold text-white">{t('Save content')}</Text>
        </TouchableOpacity>
      </View>

      {imageCount > 0 ? (
        <View
          className="px-4 py-3 border-b border-gray-100"
          style={{ backgroundColor: colors.gray[100] }}
        >
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs font-semibold text-gray-600">
              {t('Image {{current}} of {{total}}', {
                current: selectedIndex + 1,
                total: imageCount,
              })}
            </Text>
            {imageCount > 1 ? (
              <View className="flex-row items-center gap-1">
                <TouchableOpacity
                  onPress={() => {
                    const next = Math.max(0, selectedIndex - 1);
                    selectedIndexRef.current = next;
                    setSelectedIndex(next);
                    refreshImages();
                  }}
                  className="p-1 rounded-lg"
                  style={{ backgroundColor: colors.white }}
                >
                  <MaterialIcons name="chevron-left" size={20} color={colors.gray[700]} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const next = Math.min(imageCount - 1, selectedIndex + 1);
                    selectedIndexRef.current = next;
                    setSelectedIndex(next);
                    refreshImages();
                  }}
                  className="p-1 rounded-lg"
                  style={{ backgroundColor: colors.white }}
                >
                  <MaterialIcons name="chevron-right" size={20} color={colors.gray[700]} />
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <View className="flex-row items-center gap-3">
            {selectedSrc ? (
              <Image
                source={{ uri: selectedSrc }}
                style={{ width: 52, height: 52, borderRadius: 8, backgroundColor: colors.gray[200] }}
              />
            ) : null}
            <View className="flex-1">
              <View className="flex-row flex-wrap items-center gap-2 mb-2">
                <TouchableOpacity
                  onPress={() => handleMove('up')}
                  disabled={!canMoveUp}
                  className="flex-row items-center px-2 py-1.5 rounded-lg gap-1"
                  style={{ backgroundColor: colors.white, opacity: canMoveUp ? 1 : 0.4 }}
                >
                  <MaterialIcons name="arrow-upward" size={16} color={colors.gray[700]} />
                  <Text className="text-xs font-semibold text-gray-700">{t('Move image up')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleMove('down')}
                  disabled={!canMoveDown}
                  className="flex-row items-center px-2 py-1.5 rounded-lg gap-1"
                  style={{ backgroundColor: colors.white, opacity: canMoveDown ? 1 : 0.4 }}
                >
                  <MaterialIcons name="arrow-downward" size={16} color={colors.gray[700]} />
                  <Text className="text-xs font-semibold text-gray-700">{t('Move image down')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDelete}
                  className="p-1.5 rounded-lg"
                  style={{ backgroundColor: colors.error[100] }}
                >
                  <MaterialIcons name="delete-outline" size={18} color={colors.error[600]} />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center gap-2">
                {([
                  { label: t('Image size small'), value: 40 },
                  { label: t('Image size medium'), value: 70 },
                  { label: t('Image size large'), value: 100 },
                ] as const).map((preset) => (
                  <TouchableOpacity
                    key={preset.value}
                    onPress={() => handleResize(preset.value)}
                    className="px-2 py-1 rounded-md"
                    style={{
                      backgroundColor:
                        Math.abs(widthPct - preset.value) < 6
                          ? colors.primary[500]
                          : colors.white,
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color:
                          Math.abs(widthPct - preset.value) < 6
                            ? colors.white
                            : colors.gray[600],
                      }}
                    >
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text className="text-xs text-gray-500">{Math.round(widthPct)}%</Text>
              </View>
              <Slider
                value={widthPct}
                minimumValue={20}
                maximumValue={100}
                step={5}
                minimumTrackTintColor={colors.primary[500]}
                maximumTrackTintColor={colors.gray[300]}
                thumbTintColor={colors.primary[500]}
                onValueChange={setWidthPct}
                onSlidingComplete={handleResize}
              />
            </View>
          </View>
        </View>
      ) : null}

      <View style={{ flex: 1, minHeight: 280 }}>
        <RichText editor={editor} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </View>
  );
}
