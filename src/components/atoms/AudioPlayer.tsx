import { FontAwesome6 } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/components/Toast';

interface IAudioProps {
  audioUri: string;
  autoPlay?: boolean;
  onEnd?: () => void;
}

export default function AudioPlayer({ audioUri, autoPlay, onEnd }: IAudioProps) {
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
      onEnd?.();
    }
  }, [status.didJustFinish, onEnd]);

  // Para o áudio ao desmontar (troca de capítulo ou sair da tela do livro)
  useEffect(() => {
    return () => {
      try {
        player.pause();
        player.seekTo(0);
      } catch {
        // ignora se o player já foi liberado
      }
    };
  }, [player]);

  return (
    <View>
      {audioUri &&
        (isPlaying ? (
          <TouchableOpacity onPress={stopSound}>
            <FontAwesome6 name="circle-pause" size={36} color="black" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={playSound} disabled={isLoading}>
            <FontAwesome6
              name="play-circle"
              size={36}
              color={isLoading ? 'gray' : 'black'}
            />
          </TouchableOpacity>
        ))}
    </View>
  );
}
