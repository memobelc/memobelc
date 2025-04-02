import React, { ReactElement } from 'react';
import { Platform } from 'react-native';

interface StripeWrapperProps {
  children: ReactElement | ReactElement[];
}

const StripeWrapper: React.FC<StripeWrapperProps> = ({ children }) => {
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  const { StripeProvider } = require('@stripe/stripe-react-native');

  return (
    <StripeProvider publishableKey="pk_test_XXXXX">{children}</StripeProvider>
  );
};

export default StripeWrapper;
