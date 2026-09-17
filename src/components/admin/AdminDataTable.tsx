import { createElement, type ReactNode } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';

export type AdminColumn<T> = {
  key: string;
  label: string;
  sortable?: boolean;
  flex?: number;
  hint?: string;
  render: (row: T) => ReactNode;
};

type Props<T extends { _id?: string }> = {
  columns: AdminColumn<T>[];
  rows: T[];
  loading?: boolean;
  emptyLabel?: string;
  sort?: string;
  onSort?: (key: string) => void;
  onRowPress?: (row: T) => void;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
};

function hitStyle(pressed: boolean) {
  return {
    minHeight: 44,
    opacity: pressed ? 0.8 : 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  };
}

export default function AdminDataTable<T extends { _id?: string }>({
  columns,
  rows,
  loading,
  emptyLabel,
  sort,
  onSort,
  onRowPress,
  page = 0,
  pageSize = 20,
  total = 0,
  onPageChange,
}: Props<T>) {
  const { t } = useTranslation();
  const pages = Math.max(1, Math.ceil((total || 0) / pageSize));
  const sortField = (sort || '').replace(/^-/, '');
  const sortDir = (sort || '').startsWith('-') ? 'desc' : 'asc';

  const headerLabel = (col: AdminColumn<T>) => {
    const mark = sortField === col.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '';
    return `${col.label}${mark}`;
  };

  const pagination = onPageChange ? (
    <View className="flex-row items-center justify-between mt-3 px-1">
      <Text style={{ color: colors.gray[500] }}>
        {t('Page {{page}} of {{pages}}', { page: page + 1, pages })}
      </Text>
      <View className="flex-row">
        <Pressable
          disabled={page <= 0}
          onPress={() => onPageChange(Math.max(0, page - 1))}
          accessibilityRole="button"
          accessibilityLabel={t('Previous')}
          style={({ pressed }) => ({ ...hitStyle(pressed), paddingHorizontal: 12, justifyContent: 'center', opacity: page <= 0 ? 0.4 : 1 })}
        >
          <Text style={{ color: colors.primary[600] }}>{t('Previous')}</Text>
        </Pressable>
        <Pressable
          disabled={page + 1 >= pages}
          onPress={() => onPageChange(page + 1)}
          accessibilityRole="button"
          accessibilityLabel={t('Next')}
          style={({ pressed }) => ({ ...hitStyle(pressed), paddingHorizontal: 12, justifyContent: 'center', opacity: page + 1 >= pages ? 0.4 : 1 })}
        >
          <Text style={{ color: colors.primary[600] }}>{t('Next')}</Text>
        </Pressable>
      </View>
    </View>
  ) : null;

  if (loading) {
    return (
      <View className="bg-white rounded-xl overflow-hidden">
        {Array.from({ length: 6 }).map((_, index) => (
          <View key={`sk-${index}`} className="px-4 py-4 border-b border-gray-100">
            <View className="h-4 rounded mb-2" style={{ backgroundColor: colors.gray[200], width: '40%' }} />
            <View className="h-3 rounded" style={{ backgroundColor: colors.gray[100], width: '70%' }} />
          </View>
        ))}
      </View>
    );
  }

  if (!rows.length) {
    return (
      <View className="bg-white rounded-xl px-4 py-10 items-center">
        <Text style={{ color: colors.gray[500] }}>{emptyLabel || t('No results for these filters')}</Text>
        {pagination}
      </View>
    );
  }

  if (Platform.OS === 'web') {
    const th = (col: AdminColumn<T>) =>
      createElement(
        'th',
        {
          key: col.key,
          className: 'text-left p-3 text-sm font-semibold',
          style: {
            position: 'sticky',
            top: 0,
            background: colors.white,
            zIndex: 2,
            color: colors.gray[700],
            borderBottom: `1px solid ${colors.gray[200]}`,
            cursor: col.sortable ? 'pointer' : 'default',
            minHeight: 44,
          },
          title: col.hint || col.label,
          onClick: col.sortable && onSort ? () => onSort(col.key) : undefined,
        },
        headerLabel(col),
      );

    const body = rows.map((row, index) =>
      createElement(
        'tr',
        {
          key: row._id || String(index),
          onClick: onRowPress ? () => onRowPress(row) : undefined,
          style: {
            cursor: onRowPress ? 'pointer' : 'default',
            borderBottom: `1px solid ${colors.gray[100]}`,
          },
        },
        columns.map((col) =>
          createElement(
            'td',
            { key: col.key, className: 'p-3 align-middle', style: { minHeight: 44 } },
            col.render(row),
          ),
        ),
      ),
    );

    return (
      <View>
        {createElement(
          'div',
          {
            className: 'overflow-auto rounded-xl border bg-white',
            style: { maxHeight: '70vh', borderColor: colors.gray[200] },
          },
          createElement(
            'table',
            { className: 'w-full border-collapse', style: { minWidth: 960 } },
            createElement('thead', null, createElement('tr', null, ...columns.map(th))),
            createElement('tbody', null, ...body),
          ),
        )}
        {pagination}
      </View>
    );
  }

  return (
    <View>
      {rows.map((row, index) => (
        <Pressable
          key={row._id || String(index)}
          onPress={onRowPress ? () => onRowPress(row) : undefined}
          accessibilityRole={onRowPress ? 'button' : undefined}
          style={({ pressed }) => ({
            backgroundColor: colors.white,
            borderRadius: 14,
            padding: 14,
            marginBottom: 10,
            opacity: pressed && onRowPress ? 0.9 : 1,
          })}
        >
          {columns.map((col) => (
            <View key={col.key} className="mb-2">
              <Text className="text-xs mb-1" style={{ color: colors.gray[500] }} accessibilityHint={col.hint}>
                {col.label}
              </Text>
              <View>{col.render(row)}</View>
            </View>
          ))}
        </Pressable>
      ))}
      {pagination}
    </View>
  );
}
