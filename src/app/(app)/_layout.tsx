import { Text } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/contexts/AuthContext';

export default function AppLayout() {
    const { session, isLoading, refresh_token } = useSession();


    if (isLoading) {
        return <Text>Loading...</Text>;
    }

    if (!session) {

        return <Redirect href="/login" />;
    }


    return <Stack />;
}
