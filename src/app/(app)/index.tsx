import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import Home from './home';
import { useSession } from '@/contexts/AuthContext';

export default function Index() {
  const { session } = useSession();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // On web, navigation context may take longer to initialize
    const delay = Platform.OS === 'web' ? 150 : 0;
    
    const timer = setTimeout(() => {
      setIsReady(true);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  if (!isReady) {
    return null; // Wait for context to be ready
  }

  if (!session) {
    return <Redirect href="/login" />;
  }

  return <Home />;
}
