import { Text } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';
import { colors } from '@/styles/colors';
import Header from '@/components/organisms/header/Header';
import React from 'react';

export default function AppLayout() {
  const { session, isLoading, refresh_token, userInfo } = useSession();
  const backgroundColor = colors.gray[100];

  if (isLoading) {
    return <Loading />;
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  if (!userInfo) {
    refresh_token();
  }

  return (
    <>
      <Header />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor },
        }}
      />
    </>
  );
}
