type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

export type TimestampLike = string | number | Date | null | undefined;

export function parseTimestamp(value: TimestampLike): Date | null {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function startOfLocalDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function formatTime(date: Date, locale: string): string {
  return date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatAbsoluteDate(date: Date, locale: string): string {
  return date.toLocaleDateString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatFriendlyDate(
  value: TimestampLike,
  t: TranslateFn,
  options?: { now?: number; locale?: string },
): string {
  const date = parseTimestamp(value);
  if (!date) return t('Date unavailable');

  const nowMs = options?.now ?? Date.now();
  const locale = options?.locale || 'en';
  const diffMs = nowMs - date.getTime();

  if (diffMs < -60_000) {
    const time = formatTime(date, locale);
    const dateLabel = formatAbsoluteDate(date, locale);
    return t('{{date}} at {{time}}', { date: dateLabel, time });
  }

  const elapsedMs = Math.max(0, diffMs);
  if (elapsedMs < 45_000) return t('Now');

  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) {
    return t('{{count}} minutes ago', { count: Math.max(1, minutes) });
  }

  const nowDate = new Date(nowMs);
  const dayDiff = Math.round(
    (startOfLocalDay(nowDate) - startOfLocalDay(date)) / 86_400_000,
  );

  if (dayDiff === 0) {
    const hours = Math.max(1, Math.floor(elapsedMs / 3_600_000));
    return t('{{count}} hours ago', { count: hours });
  }

  const time = formatTime(date, locale);
  if (dayDiff === 1) {
    return t('Yesterday at {{time}}', { time });
  }

  return t('{{date}} at {{time}}', {
    date: formatAbsoluteDate(date, locale),
    time,
  });
}
