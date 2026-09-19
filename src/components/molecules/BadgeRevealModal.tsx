import { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  Animated,
  Easing,
  StyleSheet,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import type { ProfileBadge } from '@/services/profile';
import {
  resolveBadgeAnimation,
  type BadgeAnimationId,
} from '@/constants/badgeAnimations';

type BadgeRevealModalProps = {
  visible: boolean;
  badge: ProfileBadge | null;
  onClose: () => void;
};

const COIN_SIZE = 250;

function BadgeFace({ badge, size }: { badge: ProfileBadge; size: number }) {
  if (badge.image) {
    return (
      <Image
        source={{ uri: badge.image }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: colors.primary[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MaterialCommunityIcons name="medal" size={size * 0.45} color={colors.primary[600]} />
    </View>
  );
}

function CoinFace({ badge }: { badge: ProfileBadge }) {
  return (
    <View
      style={{
        width: COIN_SIZE,
        height: COIN_SIZE,
        borderRadius: COIN_SIZE / 2,
        overflow: 'hidden',
        backgroundColor: colors.warning[100],
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BadgeFace badge={badge} size={COIN_SIZE} />
    </View>
  );
}

function CoinAnimation({ badge, playing }: { badge: ProfileBadge; playing: boolean }) {
  const spin = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    spin.stopAnimation();
    scale.stopAnimation();
    spin.setValue(0);
    scale.setValue(0.2);
    if (!playing) return;

    Animated.parallel([
      Animated.timing(spin, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 1400,
        easing: Easing.out(Easing.back(1.12)),
        useNativeDriver: true,
      }),
    ]).start();
  }, [playing, badge._id, spin, scale]);

  const frontRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });
  const backRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '900deg'],
  });
  const frontOpacity = spin.interpolate({
    inputRange: [0, 0.124, 0.125, 0.374, 0.375, 0.624, 0.625, 0.874, 0.875, 1],
    outputRange: [1, 1, 0, 0, 1, 1, 0, 0, 1, 1],
  });
  const backOpacity = spin.interpolate({
    inputRange: [0, 0.124, 0.125, 0.374, 0.375, 0.624, 0.625, 0.874, 0.875, 1],
    outputRange: [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
  });

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View style={{ width: COIN_SIZE, height: COIN_SIZE }}>
        <Animated.View
          style={[
            styles.coinFace,
            {
              opacity: frontOpacity,
              transform: [{ perspective: 1200 }, { rotateY: frontRotate }],
            },
          ]}
        >
          <CoinFace badge={badge} />
        </Animated.View>
        <Animated.View
          style={[
            styles.coinFace,
            {
              opacity: backOpacity,
              transform: [{ perspective: 1200 }, { rotateY: backRotate }],
            },
          ]}
        >
          <CoinFace badge={badge} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function BadgeAnimationView({
  kind,
  badge,
  playing,
}: {
  kind: BadgeAnimationId;
  badge: ProfileBadge;
  playing: boolean;
}) {
  switch (kind) {
    case 'coin':
    default:
      return <CoinAnimation badge={badge} playing={playing} />;
  }
}

export function BadgeRevealModal({ visible, badge, onClose }: BadgeRevealModalProps) {
  const { t } = useTranslation();
  const textOpacity = useRef(new Animated.Value(0)).current;
  const animation = resolveBadgeAnimation(badge?.animation);
  const playing = visible && !!badge;

  useEffect(() => {
    textOpacity.stopAnimation();
    textOpacity.setValue(0);
    if (!playing) return;

    const timeout = setTimeout(() => {
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }).start();
    }, 1100);

    return () => clearTimeout(timeout);
  }, [playing, badge?._id, textOpacity]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 items-center justify-center px-6"
        style={{ backgroundColor: colors.overlay.dark }}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={t('Close')}
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        {badge ? (
          <TouchableOpacity
            activeOpacity={1}
            className="w-full max-w-[420px] rounded-2xl p-6 items-center"
            style={{ backgroundColor: colors.white }}
          >
            <BadgeAnimationView kind={animation} badge={badge} playing={playing} />
            <Animated.View style={{ opacity: textOpacity, marginTop: 20, alignItems: 'center', width: '100%' }}>
              <Text className="text-lg font-bold text-gray-800 text-center">{badge.name}</Text>
              {!!badge.description && (
                <Text className="text-sm text-gray-500 text-center mt-2">{badge.description}</Text>
              )}
            </Animated.View>
            <TouchableOpacity onPress={onClose} className="mt-5 py-2 items-center">
              <Text className="font-semibold" style={{ color: colors.gray[500] }}>
                {t('Close')}
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  coinFace: {
    position: 'absolute',
    width: COIN_SIZE,
    height: COIN_SIZE,
  },
});
