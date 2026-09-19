import { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  PanResponder,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import type { HighlightRect, TutorialSection } from '@/services/tutorials';
import {
  targetsForPicker,
  tourTargetByKey,
  type TourTargetGroup,
} from '@/constants/brain';

type Hotspot = {
  key: string;
  x: number;
  y: number;
  width: number;
  height: number;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
};

type Size = { width: number; height: number };
type PickerTab = 'section' | 'menu' | 'profile';

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toPercentRect(px: HighlightRect, size: Size): HighlightRect {
  if (!size.width || !size.height) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  return {
    x: clamp(px.x / size.width, 0, 1),
    y: clamp(px.y / size.height, 0, 1),
    width: clamp(px.width / size.width, 0, 1),
    height: clamp(px.height / size.height, 0, 1),
  };
}

function toPixelRect(rect: HighlightRect, size: Size): HighlightRect {
  return {
    x: rect.x * size.width,
    y: rect.y * size.height,
    width: rect.width * size.width,
    height: rect.height * size.height,
  };
}

function normalizePixels(x0: number, y0: number, x1: number, y1: number, size: Size): HighlightRect {
  const x = clamp(Math.min(x0, x1), 0, size.width);
  const y = clamp(Math.min(y0, y1), 0, size.height);
  const width = clamp(Math.abs(x1 - x0), 8, size.width - x);
  const height = clamp(Math.abs(y1 - y0), 8, size.height - y);
  return { x, y, width, height };
}

function intersectionArea(a: HighlightRect, b: HighlightRect) {
  const x = Math.max(a.x, b.x);
  const y = Math.max(a.y, b.y);
  const right = Math.min(a.x + a.width, b.x + b.width);
  const bottom = Math.min(a.y + a.height, b.y + b.height);
  return Math.max(0, right - x) * Math.max(0, bottom - y);
}

function layoutHotspots(section: TutorialSection, tab: PickerTab): Hotspot[] {
  const group: TourTargetGroup = tab === 'section' ? 'section' : tab;
  const defs = targetsForPicker(section, group);
  const layouts: Record<string, Record<string, Omit<Hotspot, 'key' | 'icon' | 'label'>>> = {
    home: {
      home_dashboard: { x: 0.04, y: 0.18, width: 0.7, height: 0.22 },
      study_streak: { x: 0.04, y: 0.48, width: 0.7, height: 0.18 },
      create_collection: { x: 0.78, y: 0.76, width: 0.16, height: 0.16 },
    },
    books: {
      books_list: { x: 0.08, y: 0.16, width: 0.84, height: 0.7 },
    },
    talk_to_me: {
      chat_explore: { x: 0.04, y: 0.1, width: 0.2, height: 0.12 },
      chat_composer: { x: 0.08, y: 0.78, width: 0.84, height: 0.14 },
    },
    videos: { videos_list: { x: 0.08, y: 0.16, width: 0.84, height: 0.7 } },
    collections: { collections_list: { x: 0.08, y: 0.16, width: 0.84, height: 0.7 } },
    classrooms: { classrooms_list: { x: 0.08, y: 0.16, width: 0.84, height: 0.7 } },
    courses: { courses_list: { x: 0.08, y: 0.16, width: 0.84, height: 0.7 } },
    plans: { plans_list: { x: 0.08, y: 0.16, width: 0.84, height: 0.7 } },
  };
  if (tab === 'section') {
    const sectionLayout = layouts[section] || {};
    return defs.map((item) => ({
      key: item.key,
      icon: item.icon as Hotspot['icon'],
      label: item.label,
      ...(sectionLayout[item.key] || { x: 0.08, y: 0.2, width: 0.84, height: 0.16 }),
    }));
  }
  return defs.map((item, index) => ({
    key: item.key,
    icon: item.icon as Hotspot['icon'],
    label: item.label,
    x: 0.08,
    y: 0.08 + index * 0.11,
    width: 0.84,
    height: 0.1,
  }));
}

function snapTarget(rect: HighlightRect, hotspots: Hotspot[]): string {
  let bestKey = '';
  let bestScore = 0;
  const selectedArea = rect.width * rect.height || 1;
  for (const hot of hotspots) {
    const overlap = intersectionArea(rect, hot);
    if (overlap <= 0) continue;
    const hotArea = hot.width * hot.height || 1;
    const score = overlap / Math.min(selectedArea, hotArea);
    if (score > bestScore) {
      bestScore = score;
      bestKey = hot.key;
    }
  }
  return bestScore >= 0.22 ? bestKey : '';
}

function AppPrint({ size, hotspots }: { size: Size; hotspots: Hotspot[] }) {
  const { t } = useTranslation();
  if (!size.width) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        width: size.width,
        height: size.height,
        backgroundColor: colors.gray[100],
        borderRadius: 16,
        overflow: 'hidden',
      }}
    >
      <View style={{ height: size.height * 0.08, backgroundColor: colors.primary[500] }} />
      {hotspots.map((hot) => (
        <View
          key={hot.key}
          style={{
            position: 'absolute',
            left: size.width * hot.x,
            top: size.height * hot.y,
            width: size.width * hot.width,
            height: size.height * hot.height,
            borderRadius: 12,
            backgroundColor: '#fff',
            borderWidth: 1,
            borderColor: colors.gray[200],
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 6,
            flexDirection: 'row',
          }}
        >
          <Ionicons name={hot.icon} size={16} color={colors.primary[500]} />
          <Text numberOfLines={1} style={{ fontSize: 11, marginLeft: 6, color: colors.gray[700] }}>
            {t(hot.label)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function SelectionFrame({ rect }: { rect: HighlightRect }) {
  return (
    <>
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: rect.y,
          backgroundColor: 'rgba(15,23,42,0.45)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: rect.y,
          left: 0,
          width: rect.x,
          height: rect.height,
          backgroundColor: 'rgba(15,23,42,0.45)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: rect.y,
          left: rect.x + rect.width,
          right: 0,
          height: rect.height,
          backgroundColor: 'rgba(15,23,42,0.45)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: rect.y + rect.height,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.45)',
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: rect.y,
          left: rect.x,
          width: rect.width,
          height: rect.height,
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: '#fff',
          borderRadius: 8,
        }}
      />
    </>
  );
}

type HighlightAreaPickerProps = {
  section: TutorialSection;
  targetKey?: string | null;
  highlightRect?: HighlightRect | null;
  onChange: (next: {
    target_key: string;
    highlight_rect: HighlightRect | null;
  }) => void;
};

export default function HighlightAreaPicker({
  section,
  targetKey,
  highlightRect,
  onChange,
}: HighlightAreaPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<PickerTab>('section');
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  const [draft, setDraft] = useState<HighlightRect | null>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const seeded = useRef(false);
  const hotspots = useMemo(() => layoutHotspots(section, tab), [section, tab]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          origin.current = { x: locationX, y: locationY };
          seeded.current = true;
          setDraft(normalizePixels(locationX, locationY, locationX + 8, locationY + 8, size));
        },
        onPanResponderMove: (event) => {
          if (!origin.current) return;
          const { locationX, locationY } = event.nativeEvent;
          setDraft(normalizePixels(origin.current.x, origin.current.y, locationX, locationY, size));
        },
        onPanResponderRelease: (event) => {
          if (!origin.current) return;
          const { locationX, locationY } = event.nativeEvent;
          setDraft(normalizePixels(origin.current.x, origin.current.y, locationX, locationY, size));
          origin.current = null;
        },
      }),
    [size],
  );

  const openPicker = () => {
    seeded.current = false;
    setDraft(null);
    setOpen(true);
  };

  const confirm = () => {
    if (!draft || !size.width) {
      onChange({ target_key: '', highlight_rect: null });
      setOpen(false);
      return;
    }
    const percent = toPercentRect(draft, size);
    onChange({
      target_key: snapTarget(percent, hotspots),
      highlight_rect: percent,
    });
    setOpen(false);
  };

  const previewSize = { width: 260, height: 150 };
  const previewRect = highlightRect ? toPixelRect(highlightRect, previewSize) : null;
  const previewHotspots = layoutHotspots(section, 'section');

  return (
    <View className="mb-2">
      <Text className="text-xs text-gray-500 mb-1">{t('Highlight area')}</Text>
      <TouchableOpacity
        onPress={openPicker}
        activeOpacity={0.8}
        className="border border-gray-200 rounded-xl overflow-hidden"
      >
        {highlightRect ? (
          <View style={{ height: previewSize.height }}>
            <AppPrint size={previewSize} hotspots={previewHotspots} />
            {previewRect ? <SelectionFrame rect={previewRect} /> : null}
          </View>
        ) : (
          <View className="px-3 py-4 items-center">
            <Ionicons name="scan-outline" size={22} color={colors.primary[500]} />
            <Text className="mt-1" style={{ color: colors.primary[500] }}>
              {t('Select highlight area')}
            </Text>
            <Text className="text-xs text-gray-400 mt-1 text-center">
              {t('Click and drag to highlight an area')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
      {highlightRect || targetKey ? (
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-xs text-gray-500">
            {targetKey ? t(tourTargetByKey(targetKey)?.label || 'Highlight area') : t('Custom area')}
          </Text>
          <TouchableOpacity onPress={() => onChange({ target_key: '', highlight_rect: null })}>
            <Text style={{ color: colors.error[600] }}>{t('Clear highlight')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(15,23,42,0.88)',
            padding: 24,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Text className="text-white text-lg font-bold mb-1">{t('Select highlight area')}</Text>
          <Text className="text-white/80 text-sm mb-3 text-center">
            {t('Click and drag to highlight an area')}
          </Text>
          <View className="flex-row mb-3" style={{ gap: 8 }}>
            {(['section', 'menu', 'profile'] as PickerTab[]).map((item) => (
              <TouchableOpacity
                key={item}
                onPress={() => setTab(item)}
                className="px-3 py-2 rounded-full"
                style={{
                  backgroundColor: tab === item ? colors.primary[500] : 'rgba(255,255,255,0.12)',
                }}
              >
                <Text className="text-white text-xs font-semibold">
                  {item === 'section' ? t('Section') : item === 'menu' ? t('Menu') : t('Profile')}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View
            onLayout={(event) => {
              const { width, height } = event.nativeEvent.layout;
              const next = { width, height };
              setSize(next);
              if (!seeded.current && highlightRect) {
                seeded.current = true;
                setDraft(toPixelRect(highlightRect, next));
              }
            }}
            style={{
              width: '100%',
              maxWidth: 720,
              aspectRatio: 16 / 10,
              ...(Platform.OS === 'web'
                ? { cursor: 'crosshair' as const, userSelect: 'none' as const }
                : {}),
            }}
            {...panResponder.panHandlers}
          >
            <AppPrint size={size} hotspots={hotspots} />
            {draft && size.width ? <SelectionFrame rect={draft} /> : null}
          </View>
          <View className="flex-row mt-4" style={{ gap: 12 }}>
            <TouchableOpacity
              onPress={() => setOpen(false)}
              className="px-4 py-3 rounded-xl border border-white/40"
            >
              <Text className="text-white font-semibold">{t('Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={confirm}
              className="px-5 py-3 rounded-xl"
              style={{ backgroundColor: colors.primary[500] }}
            >
              <Text className="text-white font-bold">{t('Confirm')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
