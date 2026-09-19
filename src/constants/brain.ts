import type { BrainExpression } from '@/services/tutorials';

export const BRAIN_EXPRESSIONS: BrainExpression[] = [
  'happy',
  'excited',
  'explaining',
  'thinking',
  'celebrating',
  'proud',
  'motivating',
  'curious',
  'tip',
  'studying',
  'pointing',
  'news',
  'worried',
  'sad',
  'confused',
  'surprised',
  'sleeping',
  'achievement',
  'premium',
  'teacher',
  'mentor',
];

export const BRAIN_EXPRESSION_ALIASES: Record<BrainExpression, BrainExpression> = {
  happy: 'happy',
  excited: 'excited',
  explaining: 'happy',
  thinking: 'happy',
  celebrating: 'celebrating',
  proud: 'happy',
  motivating: 'happy',
  curious: 'happy',
  tip: 'happy',
  studying: 'happy',
  pointing: 'happy',
  news: 'excited',
  worried: 'worried',
  sad: 'sad',
  confused: 'worried',
  surprised: 'excited',
  sleeping: 'sad',
  achievement: 'celebrating',
  premium: 'happy',
  teacher: 'happy',
  mentor: 'happy',
};

export const BRAIN_BUILTIN_ASSETS: Record<string, any> = {
  happy: require('@/assets/1.png'),
  excited: require('@/assets/brain.gif'),
  celebrating: require('@/assets/brain.gif'),
  sad: require('@/assets/empty.png'),
  worried: require('@/assets/shame.png'),
};

export const TUTORIAL_SECTIONS = [
  'home',
  'books',
  'videos',
  'collections',
  'talk_to_me',
  'classrooms',
  'courses',
  'plans',
] as const;

export type TutorialSection = (typeof TUTORIAL_SECTIONS)[number];

export type TourDrawer = 'menu' | 'profile';

export type TourTargetGroup = 'chrome' | 'menu' | 'profile' | 'section';

export type TourTargetDef = {
  key: string;
  label: string;
  group: TourTargetGroup;
  section?: TutorialSection;
  path?: string;
  drawer?: TourDrawer;
  icon: string;
};

export const TOUR_TARGETS: TourTargetDef[] = [
  { key: 'menu', label: 'Menu', group: 'chrome', drawer: 'menu', icon: 'menu' },
  { key: 'notifications', label: 'Notifications', group: 'chrome', icon: 'notifications' },
  { key: 'profile', label: 'Profile', group: 'chrome', drawer: 'profile', icon: 'person-circle' },
  { key: 'menu_home', label: 'Home', group: 'menu', path: '/', drawer: 'menu', icon: 'home' },
  { key: 'menu_videos', label: 'Videos', group: 'menu', path: '/videos', drawer: 'menu', icon: 'videocam' },
  { key: 'menu_books', label: 'Books', group: 'menu', path: '/books', drawer: 'menu', icon: 'book' },
  { key: 'menu_collections', label: 'Collections', group: 'menu', path: '/collections', drawer: 'menu', icon: 'albums' },
  { key: 'menu_talk_to_me', label: 'Talk to me', group: 'menu', path: '/talk_to_me', drawer: 'menu', icon: 'chatbubbles' },
  { key: 'menu_classrooms', label: 'Classrooms', group: 'menu', path: '/classrooms', drawer: 'menu', icon: 'school' },
  { key: 'menu_courses', label: 'Courses', group: 'menu', path: '/courses', drawer: 'menu', icon: 'book' },
  { key: 'menu_plans', label: 'Plans', group: 'menu', path: '/plans', drawer: 'menu', icon: 'star' },
  { key: 'menu_affiliate', label: 'Affiliate', group: 'menu', path: '/affiliate', drawer: 'menu', icon: 'people' },
  { key: 'profile_me', label: 'My profile', group: 'profile', path: '/profile', drawer: 'profile', icon: 'person' },
  { key: 'profile_subscription', label: 'Subscription', group: 'profile', path: '/subscription', drawer: 'profile', icon: 'star' },
  { key: 'profile_settings', label: 'Settings', group: 'profile', path: '/settings', drawer: 'profile', icon: 'settings' },
  { key: 'profile_invite', label: 'Invite Friends', group: 'profile', drawer: 'profile', icon: 'person-add' },
  { key: 'profile_affiliate', label: 'Affiliate', group: 'profile', path: '/affiliate', drawer: 'profile', icon: 'people' },
  { key: 'settings', label: 'Settings', group: 'profile', path: '/settings', drawer: 'profile', icon: 'settings' },
  { key: 'subscription', label: 'Subscription', group: 'profile', path: '/subscription', drawer: 'profile', icon: 'star' },
  { key: 'home_dashboard', label: 'Home', group: 'section', section: 'home', icon: 'home' },
  { key: 'study_streak', label: 'Study streak', group: 'section', section: 'home', icon: 'flame' },
  { key: 'create_collection', label: 'Create collection', group: 'section', section: 'home', icon: 'add' },
  { key: 'books_list', label: 'Books', group: 'section', section: 'books', path: '/books', icon: 'book' },
  { key: 'chat_composer', label: 'Chat', group: 'section', section: 'talk_to_me', path: '/talk_to_me', icon: 'create' },
  { key: 'chat_explore', label: 'Chat history', group: 'section', section: 'talk_to_me', path: '/talk_to_me', icon: 'list' },
  { key: 'videos_list', label: 'Videos', group: 'section', section: 'videos', path: '/videos', icon: 'videocam' },
  { key: 'collections_list', label: 'Collections', group: 'section', section: 'collections', path: '/collections', icon: 'albums' },
  { key: 'classrooms_list', label: 'Classrooms', group: 'section', section: 'classrooms', path: '/classrooms', icon: 'school' },
  { key: 'courses_list', label: 'Courses', group: 'section', section: 'courses', path: '/courses', icon: 'book' },
  { key: 'plans_list', label: 'Plans', group: 'section', section: 'plans', path: '/plans', icon: 'star' },
];

export const TOUR_TARGET_KEYS = TOUR_TARGETS.map((item) => item.key);

export const SECTION_PATHS: Record<TutorialSection, string> = {
  home: '/',
  books: '/books',
  videos: '/videos',
  collections: '/collections',
  talk_to_me: '/talk_to_me',
  classrooms: '/classrooms',
  courses: '/courses',
  plans: '/plans',
};

export const MENU_PATH_TARGETS: Record<string, string> = {
  '/': 'menu_home',
  '/videos': 'menu_videos',
  '/books': 'menu_books',
  '/collections': 'menu_collections',
  '/talk_to_me': 'menu_talk_to_me',
  '/classrooms': 'menu_classrooms',
  '/courses': 'menu_courses',
  '/plans': 'menu_plans',
  '/affiliate': 'menu_affiliate',
};

export function sectionFromPath(pathname?: string | null): TutorialSection {
  const path = pathname || '/';
  if (path.includes('/books')) return 'books';
  if (path.includes('/videos')) return 'videos';
  if (path.includes('/collections') || path.includes('/collection') || path.includes('/deck')) {
    return 'collections';
  }
  if (path.includes('/talk_to_me')) return 'talk_to_me';
  if (path.includes('/classrooms') || path.includes('/classroom')) return 'classrooms';
  if (path.includes('/courses')) return 'courses';
  if (path.includes('/plans')) return 'plans';
  return 'home';
}

export function tourTargetByKey(key?: string | null) {
  if (!key) return undefined;
  return TOUR_TARGETS.find((item) => item.key === key);
}

export function drawerForTarget(key?: string | null): TourDrawer | null {
  const target = tourTargetByKey(key);
  if (target?.drawer) return target.drawer;
  if (!key) return null;
  if (key === 'menu' || key.startsWith('menu_')) return 'menu';
  if (key === 'profile' || key.startsWith('profile_') || key === 'settings' || key === 'subscription') {
    return 'profile';
  }
  return null;
}

export function pathForTarget(key?: string | null) {
  return tourTargetByKey(key)?.path;
}

export function targetsForPicker(section: TutorialSection, group: TourTargetGroup) {
  if (group === 'section') {
    return TOUR_TARGETS.filter((item) => item.group === 'section' && item.section === section);
  }
  if (group === 'menu') {
    return TOUR_TARGETS.filter((item) => item.group === 'menu' || item.key === 'menu');
  }
  if (group === 'profile') {
    return TOUR_TARGETS.filter(
      (item) =>
        item.group === 'profile' &&
        item.key !== 'settings' &&
        item.key !== 'subscription',
    );
  }
  return TOUR_TARGETS.filter((item) => item.group === 'chrome');
}

export const TUTORIAL_PLACEMENTS = ['bottom', 'top', 'left', 'right', 'center'] as const;

export const BRAIN_EVENTS = [
  'tutorial',
  'empty',
  'error',
  'achievement',
  'premium',
  'streak',
  'news',
] as const;
