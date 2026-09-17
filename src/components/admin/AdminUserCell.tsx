import { Image, Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors } from '@/styles/colors';
import { copyText } from '@/services/checkout';
import { useToast } from '@/components/Toast';

type UserLike = {
  _id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
} | null;

export default function AdminUserCell({
  user,
  userId,
}: {
  user?: UserLike;
  userId?: string;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const id = user?._id || userId || '';
  const name = user?.name || t('User');
  const initial = name.trim().charAt(0).toUpperCase() || '?';

  const openProfile = (event?: any) => {
    event?.stopPropagation?.();
    if (!id) return;
    const path = `/admin/users/${id}`;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.open(path, '_blank', 'noopener');
      return;
    }
    router.push(path);
  };

  const copyId = async (event?: any) => {
    event?.stopPropagation?.();
    if (!id) return;
    const copied = await copyText(id);
    toast({ message: copied ? t('ID copied') : id, variant: copied ? 'success' : 'destructive' });
  };

  return (
    <View className="flex-row items-center" style={{ minWidth: 160 }}>
      <Pressable
        onPress={openProfile}
        accessibilityRole="link"
        accessibilityLabel={name}
        accessibilityHint={t('Open user profile')}
        style={({ pressed }) => ({
          minHeight: 44,
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        {user?.image ? (
          <Image source={{ uri: user.image }} className="w-9 h-9 rounded-full mr-2" />
        ) : (
          <View
            className="w-9 h-9 rounded-full mr-2 items-center justify-center"
            style={{ backgroundColor: colors.primary[100] }}
          >
            <Text style={{ color: colors.primary[600], fontWeight: '700' }}>{initial}</Text>
          </View>
        )}
        <View className="flex-1">
          <Text className="font-semibold" numberOfLines={1} style={{ color: colors.gray[900] }}>
            {name}
          </Text>
          {user?.email ? (
            <Text className="text-xs" numberOfLines={1} style={{ color: colors.gray[500] }}>
              {user.email}
            </Text>
          ) : null}
        </View>
      </Pressable>
      {id ? (
        <Pressable
          onPress={copyId}
          accessibilityRole="button"
          accessibilityLabel={t('Copy ID')}
          accessibilityHint={id}
          style={({ pressed }) => ({
            minHeight: 44,
            minWidth: 44,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Text className="text-[10px]" style={{ color: colors.gray[400] }} numberOfLines={1}>
            {id.slice(-6)}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
