import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as yup from 'yup';

import api from '@/services/api';
import { colors } from '@/styles/colors';
import { useSession } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { AuthLanguagePicker } from '@/components/AuthLanguagePicker';
import AsaasPaySheet from '@/components/molecules/AsaasPaySheet';
import { CheckoutField } from '@/components/atoms/CheckoutField';
import { formatCpfCnpj } from '@/services/checkout';

type PublicClassroom = {
  _id: string;
  name: string;
  description?: string;
  price?: number | null;
  checkout_url?: string;
};

export default function ClassroomCheckoutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { classroomId } = useLocalSearchParams<{ classroomId: string }>();
  const { session, signOut } = useSession();

  const [loading, setLoading] = useState(true);
  const [classroom, setClassroom] = useState<PublicClassroom | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [payVisible, setPayVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpfCnpj: '',
    coupon: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const guestSchema = yup.object().shape({
    name: yup.string().required(t('Name is required')),
    email: yup
      .string()
      .email(t('Invalid email address'))
      .required(t('Email is required')),
  });

  useEffect(() => {
    if (session) {
      signOut();
    }
  }, [session]);

  useEffect(() => {
    if (!classroomId) return;
    (async () => {
      try {
        setLoading(true);
        try {
          const response = await api.get(`/classroom/public/${classroomId}`);
          setClassroom(response.data);
          setNotFound(false);
        } catch {
          const courseRes = await api.get(`/course/public/${classroomId}`);
          const nestedId = courseRes.data?.classroom_id;
          if (!nestedId) throw new Error('missing classroom');
          const classRes = await api.get(`/classroom/public/${nestedId}`);
          setClassroom(classRes.data);
          setNotFound(false);
        }
      } catch {
        setNotFound(true);
        setClassroom(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [classroomId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const openPayment = async () => {
    const cpfDigits = formData.cpfCnpj.replace(/\D/g, '');
    if (!cpfDigits.match(/^(\d{11}|\d{14})$/)) {
      setErrors((prev) => ({ ...prev, cpfCnpj: t('Enter a valid CPF or CNPJ') }));
      toast({ message: t('Enter a valid CPF or CNPJ'), variant: 'destructive' });
      return;
    }
    try {
      setErrors({});
      await guestSchema.validate(formData, { abortEarly: false });
      setPayVisible(true);
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        const next: Record<string, string> = {};
        error.inner.forEach((err) => {
          if (err.path) next[err.path] = err.message;
        });
        setErrors(next);
        toast({ message: error.errors[0], variant: 'destructive' });
      }
    }
  };

  const handleSuccess = async () => {
    toast({
      message: t(
        'Purchase completed. Sign in with your email. If this is your first purchase, your temporary password is your CPF (numbers only). You will need to change it on first access.',
      ),
      variant: 'success',
    });
    router.replace('/login');
  };

  const priceLabel =
    classroom?.price != null
      ? `R$ ${Number(classroom.price).toFixed(2).replace('.', ',')}`
      : '';

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (notFound || !classroom) {
    return (
      <View className="flex-1 items-center justify-center p-6">
        <Text className="text-lg font-bold text-center mb-2" style={{ color: colors.primary[600] }}>
          {t('Classroom checkout unavailable')}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={{ color: colors.primary[500] }}>{t('Go to login')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" keyboardShouldPersistTaps="handled">
      <View className="w-full max-w-[440px] self-center px-5 py-6">
        <View className="items-center">
          <Image
            source={require('@/assets/logo_memobelc.jpg')}
            style={{ width: 120, height: 120 }}
          />
          <AuthLanguagePicker />
          <Text className="text-xl font-bold text-center mt-2" style={{ color: colors.primary[600] }}>
            {classroom.name}
          </Text>
          {priceLabel ? (
            <Text className="text-2xl font-bold mt-2 mb-5" style={{ color: colors.primary[500] }}>
              {priceLabel}
            </Text>
          ) : null}
        </View>

        <View className="mb-2">
          <Text className="text-base font-bold mb-3" style={{ color: colors.gray[800] }}>
            {t('Personal data')}
          </Text>
          <CheckoutField
            label={t('Your email')}
            icon="mail-outline"
            placeholder={t('Enter your email to receive the purchase')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            error={errors.email}
          />

          <CheckoutField
            label={t('Full name')}
            icon="person-outline"
            placeholder={t('Enter your full name')}
            value={formData.name}
            onChangeText={(value) => handleInputChange('name', value)}
            error={errors.name}
          />
          <CheckoutField
            label={t('Mobile')}
            icon="call-outline"
            placeholder="(11) 96123-4567"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(value) => handleInputChange('phone', value)}
          />
        </View>

        <View className="mb-4">
          <CheckoutField
            label={t('CPF or CNPJ')}
            icon="document-text-outline"
            placeholder="000.000.000-00"
            keyboardType="numeric"
            value={formData.cpfCnpj}
            onChangeText={(value) => handleInputChange('cpfCnpj', formatCpfCnpj(value))}
            error={errors.cpfCnpj}
          />
          {/* <Text className="text-sm mb-3" style={{ color: colors.gray[600] }}>
            {t('New accounts use your CPF as a temporary password. You will change it on first login.')}
          </Text> */}
          <CheckoutField
            label={t('Have a discount coupon?')}
            icon="pricetag-outline"
            placeholder={t('Coupon code')}
            autoCapitalize="characters"
            value={formData.coupon}
            onChangeText={(value) => handleInputChange('coupon', value)}
          />
        </View>

        <TouchableOpacity
          onPress={openPayment}
          className="w-full h-14 rounded-xl items-center justify-center mt-1"
          style={{ backgroundColor: colors.primary[500] }}
        >
          <Text className="text-white font-bold">{t('Continue to payment')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.replace('/login')} className="mt-4 items-center">
          <Text style={{ color: colors.primary[500] }}>{t('Go to login')}</Text>
        </TouchableOpacity>

        <AsaasPaySheet
          visible={payVisible}
          onClose={() => setPayVisible(false)}
          productType="classroom"
          productId={classroom._id}
          title={t('Choose payment method')}
          initialCpf={formData.cpfCnpj}
          initialCoupon={formData.coupon}
          hideCpfAndCoupon
          initialPhone={formData.phone}
          publicCheckout={{
            name: formData.name,
            email: formData.email,
          }}
          onSuccess={handleSuccess}
        />
      </View>
    </ScrollView>
  );
}
