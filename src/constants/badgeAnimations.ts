export const BADGE_ANIMATIONS = [{ id: 'coin', labelKey: 'Coin' }] as const;

export type BadgeAnimationId = (typeof BADGE_ANIMATIONS)[number]['id'];

export const DEFAULT_BADGE_ANIMATION: BadgeAnimationId = 'coin';

export function resolveBadgeAnimation(id?: string | null): BadgeAnimationId {
  const key = (id || '').trim().toLowerCase();
  if (BADGE_ANIMATIONS.some((item) => item.id === key)) {
    return key as BadgeAnimationId;
  }
  return DEFAULT_BADGE_ANIMATION;
}
