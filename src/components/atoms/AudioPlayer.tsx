import { FontAwesome6 } from '@expo/vector-icons';
import { Audio, AVPlaybackStatus } from 'expo-av';
import React, { useEffect, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';

interface IAudioProps {
  audioUri: string;
  autoPlay?: boolean;
}

export default function AudioPlayer({ audioUri, autoPlay }: IAudioProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);

  const playSound = async () => {
    if (sound) {
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
      if (!status.isLoaded) {
        console.warn('Erro no status de reprodução:', status);
        return;
      }

      if (status.didJustFinish) {
        setIsPlaying(false);
        newSound.unloadAsync();
        setSound(null);
      }
    });
  };

  useEffect(() => {
    if (autoPlay && !isAutoPlay) {
      setTimeout(() => {
        playSound();
        setIsAutoPlay(true);
      }, 500);
    }
  });

  const stopSound = async () => {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setIsPlaying(false);
      setSound(null);
    }
  };

  return (
    <View>
      {audioUri &&
        (isPlaying ? (
          <TouchableOpacity onPress={stopSound}>
            <FontAwesome6 name="circle-pause" size={48} color="black" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={playSound}>
            <FontAwesome6 name="play-circle" size={48} color="black" />
          </TouchableOpacity>
        ))}
    </View>
  );
}
