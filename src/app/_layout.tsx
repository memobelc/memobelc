import React from 'react';
import { colors } from '@/styles/colors';
import { Stack } from 'expo-router';
import { SessionProvider, useSession } from '@/contexts/AuthContext';

export default function Layout() {
    const backgroundColor = colors.primary[500];
    const { session, isLoading, refresh_token } = useSession();

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






