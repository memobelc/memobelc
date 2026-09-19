import React, { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { useTourTargets, type TourRect } from '@/contexts/TourTargetContext';

type TourTargetProps = {
  id: string;
  children: React.ReactNode;
};

export default function TourTarget({ id, children }: TourTargetProps) {
  const { register, unregister } = useTourTargets();
  const ref = useRef<View>(null);

  const measure = () => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 && height > 0) {
        const rect: TourRect = { x, y, width, height };
        register(id, rect);
      }
    });
  };

  useEffect(() => {
    return () => unregister(id);
  }, [id, unregister]);

  return (
    <View ref={ref} collapsable={false} onLayout={measure}>
      {children}
    </View>
  );
}
