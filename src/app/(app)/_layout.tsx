import { Text } from 'react-native';
import { Redirect, Stack } from 'expo-router';

import { useSession } from '@/contexts/AuthContext';
import { Loading } from '@/components/Loading';

export default function AppLayout() {
    const { session, isLoading, refresh_token } = useSession();


    if (isLoading) {
        return <Loading />;
    }

    if (!session) {

        return <Redirect href="/login" />;
    }


    return <Stack />;
}
