import { FontAwesome6 } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/Toast';
import Slider from '@react-native-community/slider';
import { colors } from '@/styles/colors';

interface IAudioProps {
  audioUri: string;
  autoPlay?: boolean;
  onEnd?: () => void;
  introDuration?: number;
}

export default function AudioPlayer({ audioUri, autoPlay, onEnd, introDuration }: IAudioProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const player = useAudioPlayer(audioUri);
  const status = useAudioPlayerStatus(player);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const isPlaying = player.playing;
  const isLoading = !status.isLoaded || status.isBuffering;
  const currentTime = status.currentTime || 0;
  const duration = status.duration || 0;

  // Show skip intro button if intro duration is set and we're still in intro
  const showSkipIntro = introDuration && introDuration > 0 && currentTime < introDuration;

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playSound = () => {
    if (isPlaying || isLoading) return;

    try {
      player.play();
    } catch (error) {
      toast({
        message: `${t('Error playing audio')}: ${error}`,
        variant: 'destructive',
      });
    }
  };

  const pauseSound = () => {
    try {
      player.pause();
    } catch (error) {
      toast({
        message: t('Error stopping audio'),
        variant: 'destructive',
      });
    }
  };

  const skipForward = () => {
    try {
      const newTime = Math.min(currentTime + 10, duration);
      player.seekTo(newTime);
    } catch (error) {
      toast({
        message: t('Error playing audio'),
        variant: 'destructive',
      });
    }
  };

  const skipBackward = () => {
    try {
      const newTime = Math.max(currentTime - 10, 0);
      player.seekTo(newTime);
    } catch (error) {
      toast({
        message: t('Error playing audio'),
        variant: 'destructive',
      });
    }
  };

  const skipIntro = () => {
    if (introDuration) {
      try {
        player.seekTo(introDuration);
      } catch (error) {
        toast({
          message: t('Error playing audio'),
          variant: 'destructive',
        });
      }
    }
  };

  const onSeek = (value: number) => {
    try {
      player.seekTo(value);
    } catch (error) {
      toast({
        message: t('Error playing audio'),
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (autoPlay && !isAutoPlay && !isLoading && audioUri) {
      const timer = setTimeout(() => {
        playSound();
        setIsAutoPlay(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoPlay, isAutoPlay, isLoading, audioUri]);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
      onEnd?.();
    }
  }, [status.didJustFinish, onEnd]);

  // Stop audio when unmounting
  useEffect(() => {
    return () => {
      try {
        player.pause();
        player.seekTo(0);
      } catch {
        // ignore if player was already released
      }
    };
  }, [player]);

  return (
    <View style={styles.container}>
      {/* Time Display */}
      <View style={styles.timeContainer}>
        <Text style={styles.timeText}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={duration || 1}
          value={currentTime}
          onSlidingComplete={onSeek}
          minimumTrackTintColor={colors.primary[500]}
          maximumTrackTintColor={colors.gray[300]}
          thumbTintColor={colors.primary[500]}
          disabled={isLoading || !duration}
        />
      </View>

      {/* Skip Intro Button */}
      {showSkipIntro && (
        <View style={styles.skipIntroContainer}>
          <TouchableOpacity
            style={styles.skipIntroButton}
            onPress={skipIntro}
            disabled={isLoading}
          >
            <Text style={styles.skipIntroText}>{t('Skip Intro')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {/* Skip Backward */}
        <TouchableOpacity
          onPress={skipBackward}
          disabled={isLoading}
          style={styles.controlButton}
        >
          <FontAwesome6
            name="backward"
            size={18}
            color={isLoading ? colors.gray[400] : colors.gray[900]}
          />
          <Text style={styles.skipText}>-10s</Text>
        </TouchableOpacity>

        {/* Play/Pause */}
        {isPlaying ? (
          <TouchableOpacity onPress={pauseSound} style={styles.mainButton}>
            <FontAwesome6 name="circle-pause" size={30} color={colors.primary[500]} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={playSound} disabled={isLoading} style={styles.mainButton}>
            <FontAwesome6
              name="play-circle"
              size={30}
              color={isLoading ? colors.gray[400] : colors.primary[500]}
            />
          </TouchableOpacity>
        )}

        {/* Skip Forward */}
        <TouchableOpacity
          onPress={skipForward}
          disabled={isLoading}
          style={styles.controlButton}
        >
          <FontAwesome6
            name="forward"
            size={18}
            color={isLoading ? colors.gray[400] : colors.gray[900]}
          />
          <Text style={styles.skipText}>+10s</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: 2,
  },
  timeContainer: {
    alignItems: 'center',
    marginBottom: 1,
  },
  timeText: {
    fontSize: 9,
    color: colors.gray[600],
    fontWeight: '500',
  },
  sliderContainer: {
    paddingHorizontal: 4,
    marginBottom: 2,
  },
  slider: {
    width: '100%',
    height: 20,
  },
  skipIntroContainer: {
    alignItems: 'center',
    marginBottom: 2,
  },
  skipIntroButton: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 16,
  },
  skipIntroText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 8,
    color: colors.gray[600],
    marginTop: 1,
  },
});
