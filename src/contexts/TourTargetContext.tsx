import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';

import type { TourDrawer } from '@/constants/brain';

export type TourRect = { x: number; y: number; width: number; height: number };

type TourTargetContextType = {
  register: (key: string, rect: TourRect) => void;
  unregister: (key: string) => void;
  getRect: (key?: string | null) => TourRect | null;
  version: number;
  requestedDrawer: TourDrawer | null;
  requestDrawer: (drawer: TourDrawer | null) => void;
};

const TourTargetContext = createContext<TourTargetContextType>({
  register: () => {},
  unregister: () => {},
  getRect: () => null,
  version: 0,
  requestedDrawer: null,
  requestDrawer: () => {},
});

export function useTourTargets() {
  return useContext(TourTargetContext);
}

export function TourTargetProvider({ children }: PropsWithChildren) {
  const rects = useRef<Record<string, TourRect>>({});
  const [version, setVersion] = useState(0);
  const [requestedDrawer, setRequestedDrawer] = useState<TourDrawer | null>(null);

  const register = useCallback((key: string, rect: TourRect) => {
    const prev = rects.current[key];
    if (
      prev &&
      prev.x === rect.x &&
      prev.y === rect.y &&
      prev.width === rect.width &&
      prev.height === rect.height
    ) {
      return;
    }
    rects.current[key] = rect;
    setVersion((current) => current + 1);
  }, []);

  const unregister = useCallback((key: string) => {
    if (!rects.current[key]) return;
    delete rects.current[key];
    setVersion((current) => current + 1);
  }, []);

  const getRect = useCallback((key?: string | null) => {
    if (!key) return null;
    return rects.current[key] || null;
  }, []);

  const requestDrawer = useCallback((drawer: TourDrawer | null) => {
    setRequestedDrawer(drawer);
  }, []);

  const value = useMemo(
    () => ({ register, unregister, getRect, version, requestedDrawer, requestDrawer }),
    [register, unregister, getRect, version, requestedDrawer, requestDrawer],
  );

  return <TourTargetContext.Provider value={value}>{children}</TourTargetContext.Provider>;
}
