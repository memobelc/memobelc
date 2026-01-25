import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Header from './Header';

/**
 * Wrapper that ensures navigation context is available before rendering Header
 * This fixes the "Couldn't find a LinkingContext context" error on web
 */
export default function HeaderWrapper() {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    // On web, the LinkingContext may take longer to initialize
    // Use a longer delay on web to ensure context is fully available
    const delay = Platform.OS === 'web' ? 200 : 0;
    
    const timer = setTimeout(() => {
      setCanRender(true);
    }, delay);

    return () => clearTimeout(timer);
  }, []);

  if (!canRender) {
    return null;
  }

  try {
    return <Header />;
  } catch (error) {
    // If Header still fails, return null and let it retry on next render
    console.warn('Header failed to render:', error);
    return null;
  }
}

