import { Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { colors } from '@/styles/colors';
import HeaderWrapper from '@/components/organisms/header/HeaderWrapper';
import React from 'react';

export default function AppLayout() {
  const { session, isLoading, refresh_token, userInfo } = useSession();
  const backgroundColor = colors.gray[100];

  useEffect(() => {
    if (!userInfo && session && !isLoading) {
      refresh_token();
    }
  }, [session, userInfo, isLoading]);

  if (isLoading) {
    return <Loading classname="flex-1 items-center justify-center" />;
  }

  // Always render Stack - let individual screens handle redirects
  return (
    <View style={{ flex: 1 }}>
      <HeaderWrapper />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor },
        }}
      />
    </View>
  );
}
