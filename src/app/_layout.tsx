import React from 'react';
import { colors } from '@/styles/colors';
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '@/contexts/AuthContext';
import { useFonts } from 'expo-font';

import '@/styles/global.css';
import { Loading } from '@/components/Loading';
import { Dialog } from '@/components/Dialog';
import { ToastProvider } from '@/components/Toast';
import { CollectionProvider } from '@/contexts/CollectionContext';

export default function Layout() {
  const backgroundColor = colors.primary[500];

  const [fontsLoaded] = useFonts({
    ComicSans: require('../../assets/fonts/ComicSans-MS-400.ttf'),
  });

  if (!fontsLoaded) {
    <Loading />;
  }
  return (
    <ToastProvider>
      <SessionProvider>
        <CollectionProvider>
          <Dialog>
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor },
              }}
            />
          </Dialog>
        </CollectionProvider>
      </SessionProvider>
    </ToastProvider>
  );
}
