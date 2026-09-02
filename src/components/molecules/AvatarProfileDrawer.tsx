import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Pressable,
  Platform,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';

import { LanguageSelectWithFlags } from '@/components/atoms/LanguageSelectWithFlags';
import { RoleViewSelect } from '@/components/atoms/RoleViewSelect';

import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import { Avatar, AvatarImage } from '@/components/Avatar';
import { useProfile } from '@/contexts/profileContext';
import { colors } from '@/styles/colors';
import api from '@/services/api';
import { InviteFriendsModal } from './InviteFriendsModal';
import { useEntitlements } from '@/contexts/EntitlementContext';
import { useSupportChat } from '@/contexts/SupportChatContext';

type menuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  disabled: boolean;
};

const menuItems: menuItem[] | [] = [];

const AvatarProfileDrawer = () => {
  const { userInfo, signOut } = useSession();
  const { roles, activeRoleView, setActiveRoleView } = useHasRole();
  const { language, setLanguage } = useProfile();
  const { t, i18n } = useTranslation();
  const { entitlements } = useEntitlements();
  const { openChat, unreadCount, refreshUnread } = useSupportChat();
  const isAssignedAdmin = roles.includes('admin');

  const [open, setOpen] = useState(false);
  const [openInviteModal, setOpenInviteModal] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  // const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  // const handleSubscribe = async () => {
  //   setLoading(true);
  //   const response = await api.post(
  //     '/payment/payment_intent',
  //     {},
  //     {
  //       headers: {
  //         Authorization: `Bearer ${userInfo?.token}`,
  //       },
  //     },
  //   );

  //   const client_secret = response.data.client_secret;

  // if (!client_secret) {
  //   console.error('Erro: client_secret não foi retornado.');
  //   return;
  // }

  // Inicializar a tela de pagamento corretamente
  //   const { error } = await initPaymentSheet({
  //     merchantDisplayName: 'Memobelc',
  //     paymentIntentClientSecret: client_secret,
  //     // allowsDelayedPaymentMethods: true,
  //   });

  //   if (error) {
  //     console.error('Erro ao inicializar o PaymentSheet:', error);
  //     return;
  //   }

  //   // Exibir a tela de pagamento para o usuário
  //   const { error: paymentError } = await presentPaymentSheet();

  //   if (paymentError) {
  //     console.error('Erro ao exibir o PaymentSheet:', paymentError);
  //   } else {
  //     console.log('Pagamento realizado com sucesso!');
  //   }

  //   setLoading(false);
  // };

  const handleClose = () => {
    setOpen(false);
  };

  const translateX = useRef(new Animated.Value(-300)).current;

  useEffect(() => {
    if (open) {
      Animated.timing(translateX, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(translateX, {
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [open]);

  useEffect(() => {
    const lng = language ?? 'en';
    i18n.changeLanguage(lng);
  }, [language, i18n]);

  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)}>
        <Avatar>
          <AvatarImage
            source={
              userInfo?.image
                ? {
                    uri: userInfo?.image,
                  }
                : require('@/assets/fallback.png')
            }
          />
        </Avatar>
      </TouchableOpacity>
      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback
          onPress={(e) => {
            if (e.target === e.currentTarget) {
              handleClose();
            }
          }}
        >
          <View className="flex-1 relative">
            <Animated.View
              style={{
                position: 'absolute',
                right: 0,
                padding: 20,
                backgroundColor: 'white',
                transform: [{ translateX }],
                width: 300,
                height: '100%',
              }}
              className="bg-white  h-full w-[300px] absolute right-0 top-0 p-4 rounded-l-2xl shadow-lg"
            >
              <ScrollView showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                className="flex flex-row gap-2 items-center mb-3"
                onPress={() => {
                  router.push('/profile');
                  handleClose();
                }}
              >
                <Avatar>
                  <AvatarImage
                    source={
                      userInfo?.image
                        ? {
                            uri: userInfo?.image,
                          }
                        : require('@/assets/fallback.png')
                    }
                  />
                </Avatar>
                <View>
                  <Text className="text-primary text-xs">{userInfo?.name}</Text>
                  <Text className="text-primary text-xs">
                    {userInfo?.email}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                className="mb-3"
                onPress={() => {
                  router.push('/subscription');
                  handleClose();
                }}
              >
                <LinearGradient
                  start={{ x: 1, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  colors={[colors.warning[500], colors.warning[100]]}
                  style={{
                    display: 'flex',
                    flexDirection: 'row',
                    borderRadius: 25,
                    width: '100%',
                    paddingVertical: 8,
                    alignItems: 'center',
                  }}
                >
                  <MaterialCommunityIcons
                    className="px-3"
                    name="crown-circle"
                    size={20}
                    color="black"
                  />
                  <Text
                    className="text-sm font-bold"
                    style={{ color: colors.gray[950] }}
                  >
                    {entitlements?.is_subscriber ? t('My subscription') : t('Go premium')}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  router.push('/profile');
                  handleClose();
                }}
                className="flex flex-row gap-2 items-center cursor-pointer mb-3"
              >
                <MaterialIcons name="person" size={20} color={colors.primary[500]} />
                <Text className="text-primary text-xs">{t('My profile')}</Text>
              </TouchableOpacity>
              <View>
                {menuItems &&
                  menuItems.map((item) => {
                    const isActive = pathname === item.path;
                    return (
                      <Pressable
                        key={item.name}
                        className={`flex-row mb-3 -left-4 w-[70%] px-5 py-1 rounded-r-3xl${
                          isActive ? 'bg-orange-400' : ''
                        }`}
                        disabled={item.disabled}
                        onPress={() => {
                          router.push(item.path as `./${string}`);
                          handleClose();
                        }}
                        {...(Platform.OS === 'web'
                          ? { onMouseLeave: () => {} }
                          : {})}
                      >
                        {item.icon}
                        <Text
                          className={`font-[ComicSans] ml-3 ${item.disabled ? 'text-gray-300' : 'text-primary-600'}`}
                        >
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
              <View className="mb-3">
                <Text className="font-bold text-primary mb-1">
                  {t('Language')}
                </Text>
                <LanguageSelectWithFlags
                  value={language ?? i18n.language ?? 'en'}
                  onValueChange={(v) => setLanguage(v ?? 'en')}
                />
              </View>
              {roles.length >= 2 && (
                <View className="mb-3">
                  <Text className="font-bold text-primary mb-1">
                    {t('View as')}
                  </Text>
                  <RoleViewSelect
                    value={activeRoleView}
                    onValueChange={setActiveRoleView}
                    options={[
                      { value: 'all', label: t('All roles') },
                      ...roles.map((role) => ({
                        value: role,
                        label:
                          role === 'admin'
                            ? t('Admin')
                            : role === 'teacher'
                              ? t('Teacher')
                              : t('User'),
                      })),
                    ]}
                  />
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  setOpenInviteModal(true);
                  handleClose();
                }}
                className="flex flex-row gap-2 items-center cursor-pointer mb-3"
              >
                <MaterialIcons name="person-add" size={20} color={colors.primary[500]} />
                <Text className="text-primary text-xs">{t('Invite Friends')}</Text>
              </TouchableOpacity>
              {!isAssignedAdmin && (
                <TouchableOpacity
                  onPress={() => {
                    handleClose();
                    refreshUnread();
                    openChat();
                  }}
                  className="flex flex-row gap-2 items-center cursor-pointer mb-3"
                >
                  <MaterialIcons name="headset-mic" size={20} color={colors.primary[500]} />
                  <Text className="text-primary text-xs">{t('Support')}</Text>
                  {unreadCount > 0 ? (
                    <View
                      className="min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center"
                      style={{ backgroundColor: colors.error[500] }}
                    >
                      <Text className="text-white text-[10px] font-bold">
                        {unreadCount}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => {
                  signOut();
                  router.replace('/login');
                }}
                className="flex flex-row gap-2 items-center cursor-pointer"
              >
                <MaterialIcons name="logout" size={20} />
                <Text className="text-primary text-xs">{t('Log out')}</Text>
              </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <InviteFriendsModal
        open={openInviteModal}
        onClose={() => setOpenInviteModal(false)}
      />
    </View>
  );
};

export default AvatarProfileDrawer;
