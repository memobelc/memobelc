import React from 'react';
import { colors } from '@/styles/colors';
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '@/contexts/AuthContext';
import { useFonts } from "expo-font";

export default function Layout() {
    const backgroundColor = colors.primary[500];
    const { session, isLoading, refresh_token } = useSession();


    const [fontsLoaded] = useFonts({
        "ComicSans": require("../../assets/fonts/ComicSans-MS-400.ttf"),
      });

    return (
        <SessionProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor },
                }}
            />
        </SessionProvider>
    );
}






