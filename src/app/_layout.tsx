import React from 'react';
import { colors } from '@/styles/colors';
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '@/contexts/AuthContext';
import { useFonts } from 'expo-font';
import { Menu, PaperProvider, Portal } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '@/styles/global.css';
import { Loading } from '@/components/Loading';
import { Dialog } from '@/components/Dialog';
import { ToastProvider } from '@/components/Toast';
import { CollectionProvider } from '@/contexts/CollectionContext';
import '@/locales/i18n';
import { ProfileProvider } from '@/contexts/profileContext';
// import StripeWrapper from '@/components/molecules/StripeWrapper';

export default function Layout() {
  const backgroundColor = colors.primary[500];

  const [fontsLoaded] = useFonts({
    ComicSans: require('../../assets/fonts/ComicSans-MS-400.ttf'),
  });

  if (!fontsLoaded) {
    <Loading classname="flex-1 items-center justify-center" />;
  }
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ToastProvider>
        <PaperProvider>
          <SessionProvider>
            {/* <StripeWrapper> */}
            <ProfileProvider>
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
            </ProfileProvider>
            {/* </StripeWrapper> */}
          </SessionProvider>
        </PaperProvider>
      </ToastProvider>
    </GestureHandlerRootView>
  );
}
