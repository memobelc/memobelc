import { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { useToast } from '@/components/Toast';
import { adminAffiliateApi, type AffiliateApplication } from '@/services/affiliate';

export default function AdminAffiliateApplicationsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userInfo } = useSession();
  const { roles } = useHasRole();
  const { toast } = useToast();
  const isAdmin = roles.includes('admin');
  const [items, setItems] = useState<AffiliateApplication[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userInfo?.token) return;
    try {
      setLoading(true);
      const response = await adminAffiliateApi.applications(userInfo.token, 'pending');
      setItems(response.data.applications || []);
    } catch (error: any) {
      toast({
        message: error.response?.data?.error || t('Error loading affiliate data'),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [userInfo?.token, t]);

  useEffect(() => {
    if (userInfo && !isAdmin) router.replace('/');
  }, [userInfo, isAdmin, router]);
  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin, load]);

  const review = async (id: string, status: string) => {
    await adminAffiliateApi.reviewApplication(userInfo?.token, id, status);
    load();
  };

  return (
    <ScrollView className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8" contentContainerStyle={{ paddingBottom: 80 }}>
      <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
        <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
        <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
      </TouchableOpacity>
      <Text className="text-2xl font-bold mb-4">{t('Applications')}</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : items.length === 0 ? (
        <Text className="text-gray-500">{t('No applications')}</Text>
      ) : (
        items.map((item) => (
          <View key={item._id} className="bg-white rounded-xl p-4 mb-3">
            <Text className="font-bold">{item.user_name || item.user_email}</Text>
            <Text className="text-sm text-gray-600">{item.product_name}</Text>
            <View className="flex-row mt-3">
              <TouchableOpacity onPress={() => review(item._id, 'approved')} className="mr-2 px-3 py-2 rounded-lg" style={{ backgroundColor: colors.primary[500] }}>
                <Text className="text-white">{t('Approve')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => review(item._id, 'rejected')} className="px-3 py-2 rounded-lg" style={{ backgroundColor: colors.gray[200] }}>
                <Text>{t('Reject')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}
