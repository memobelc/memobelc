import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useSession } from '@/contexts/AuthContext';
import { useTourTargets } from '@/contexts/TourTargetContext';
import TutorialOverlay from '@/components/organisms/TutorialOverlay';
import { tutorialsApi, type Tutorial } from '@/services/tutorials';
import {
  SECTION_PATHS,
  drawerForTarget,
  pathForTarget,
  sectionFromPath,
} from '@/constants/brain';

type TutorialContextType = {
  tutorial: Tutorial | null;
  visible: boolean;
  startTutorial: (tutorial: Tutorial) => void;
  refreshTutorial: () => Promise<void>;
};

const TutorialContext = createContext<TutorialContextType>({
  tutorial: null,
  visible: false,
  startTutorial: () => {},
  refreshTutorial: async () => {},
});

export function useTutorial() {
  return useContext(TutorialContext);
}

export function TutorialProvider({ children }: PropsWithChildren) {
  const { userInfo } = useSession();
  const { i18n } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { requestDrawer } = useTourTargets();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [visible, setVisible] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const startedAt = useRef<number>(Date.now());
  const autoStarted = useRef(new Set<string>());
  const section = sectionFromPath(pathname);

  const durationMs = () => Date.now() - startedAt.current;

  const sendEvent = useCallback(
    async (type: string, index?: number) => {
      if (!userInfo?.token || !tutorial?._id) return;
      try {
        await tutorialsApi.event(userInfo.token, tutorial._id, {
          type,
          step_index: index ?? stepIndex,
          duration_ms: durationMs(),
        });
      } catch {
        // Tour should never block the app.
      }
    },
    [userInfo?.token, tutorial?._id, stepIndex],
  );

  const startTutorial = useCallback(
    (next: Tutorial) => {
      setTutorial(next);
      setStepIndex(0);
      setVisible(true);
      startedAt.current = Date.now();
      const targetSection = next.section || 'home';
      const targetPath = SECTION_PATHS[targetSection] || '/';
      if (sectionFromPath(pathname) !== targetSection) {
        router.replace(targetPath as any);
      }
    },
    [pathname, router],
  );

  const refreshTutorial = useCallback(async () => {
    if (!userInfo?.token) {
      setTutorial(null);
      setVisible(false);
      autoStarted.current.clear();
      requestDrawer(null);
      return;
    }
    if (visible) return;
    try {
      const response = await tutorialsApi.me(userInfo.token, i18n.language, section);
      const next = response.data.tutorial;
      if (next && !autoStarted.current.has(section)) {
        autoStarted.current.add(section);
        startTutorial(next);
        await tutorialsApi.event(userInfo.token, next._id, { type: 'view', step_index: 0 });
      }
    } catch {
      // Ignore fetch errors so login is never blocked.
    }
  }, [userInfo?.token, i18n.language, section, startTutorial, visible, requestDrawer]);

  useEffect(() => {
    refreshTutorial();
  }, [refreshTutorial]);

  const currentStep = tutorial?.steps?.[stepIndex];

  useEffect(() => {
    if (!visible) {
      requestDrawer(null);
      return;
    }
    requestDrawer(drawerForTarget(currentStep?.target_key));
  }, [visible, currentStep?.target_key, requestDrawer]);

  const close = () => {
    setVisible(false);
    setTutorial(null);
    requestDrawer(null);
  };

  const onNext = async () => {
    const nextIndex = Math.min(stepIndex + 1, (tutorial?.steps.length || 1) - 1);
    await sendEvent('next', stepIndex);
    setStepIndex(nextIndex);
    await sendEvent('step_view', nextIndex);
  };

  const onBack = async () => {
    const nextIndex = Math.max(stepIndex - 1, 0);
    await sendEvent('back', stepIndex);
    setStepIndex(nextIndex);
  };

  const onSkip = async () => {
    if (userInfo?.token && tutorial?._id) {
      try {
        await tutorialsApi.skip(userInfo.token, tutorial._id, {
          step_index: stepIndex,
          duration_ms: durationMs(),
        });
      } catch {
        // ignore
      }
    }
    close();
  };

  const onFinish = async () => {
    if (userInfo?.token && tutorial?._id) {
      try {
        await tutorialsApi.complete(userInfo.token, tutorial._id, durationMs());
      } catch {
        // ignore
      }
    }
    close();
  };

  const onTap = async () => {
    const path = pathForTarget(currentStep?.target_key);
    if (path && pathname !== path) {
      router.push(path as any);
    }
    const isLast = stepIndex >= (tutorial?.steps.length || 1) - 1;
    if (isLast) {
      await onFinish();
      return;
    }
    await onNext();
  };

  return (
    <TutorialContext.Provider
      value={{ tutorial, visible, startTutorial, refreshTutorial }}
    >
      {children}
      {visible && tutorial ? (
        <TutorialOverlay
          tutorial={tutorial}
          stepIndex={stepIndex}
          onNext={onNext}
          onBack={onBack}
          onSkip={onSkip}
          onFinish={onFinish}
          onTap={onTap}
        />
      ) : null}
    </TutorialContext.Provider>
  );
}
