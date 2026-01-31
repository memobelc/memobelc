import { FontAwesome6 } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/Toast';

interface IAudioProps {
  audioUri: string;
  autoPlay?: boolean;
}

export default function AudioPlayer({ audioUri, autoPlay }: IAudioProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const player = useAudioPlayer(audioUri);
  const status = useAudioPlayerStatus(player);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const isPlaying = player.playing;
  const isLoading = !status.isLoaded || status.isBuffering;

  const playSound = () => {
    if (isPlaying || isLoading) return;

    try {
      player.play();
    } catch (error) {
      toast({
        message: `Erro ao tocar áudio: ${error}`,
        variant: 'destructive',
      });
    }
  };

  const stopSound = () => {
    try {
      player.pause();
      player.seekTo(0);
    } catch (error) {
      toast({
        message: t('Error stopping audio'),
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
    }
  }, [status.didJustFinish]);

  return (
    <View>
      {audioUri &&
        (isPlaying ? (
          <TouchableOpacity onPress={stopSound}>
            <FontAwesome6 name="circle-pause" size={48} color="black" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={playSound} disabled={isLoading}>
            <FontAwesome6
              name="play-circle"
              size={48}
              color={isLoading ? 'gray' : 'black'}
            />
          </TouchableOpacity>
        ))}
    </View>
  );
}
