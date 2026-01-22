import { FontAwesome6 } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { useToast } from '@/components/Toast';

interface IAudioProps {
  audioUri: string;
  autoPlay?: boolean;
}

export default function AudioPlayer({ audioUri, autoPlay }: IAudioProps) {
  const { toast } = useToast();

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const playSound = async () => {
    if (isPlaying || isLoading) return;

    setIsLoading(true);

    try {
      if (sound) {
        sound.setOnPlaybackStatusUpdate(null);
        await sound.unloadAsync();
        setSound(null);
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;

        if (status.didJustFinish) {
          setIsPlaying(false);
          newSound.setOnPlaybackStatusUpdate(null);
          newSound.unloadAsync();
          setSound(null);
        }
      });
    } catch (error) {
      toast({
        message: `Erro ao tocar áudio: ${error}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const stopSound = async () => {
    if (sound) {
      sound.setOnPlaybackStatusUpdate(null);
      await sound.stopAsync();
      await sound.unloadAsync();
      setIsPlaying(false);
      setSound(null);
    }
  };

  useEffect(() => {
    if (autoPlay && !isAutoPlay) {
      setTimeout(() => {
        playSound();
        setIsAutoPlay(true);
      }, 500);
    }
  }, [autoPlay, isAutoPlay]);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.setOnPlaybackStatusUpdate(null);
        sound.unloadAsync();
      }
    };
  }, [sound]);

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
