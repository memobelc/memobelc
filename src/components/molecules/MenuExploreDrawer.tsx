import {
  View,
  TouchableOpacity,
  Text,
  Modal,
  TouchableWithoutFeedback,
  Animated,
  Pressable,
  Platform,
} from 'react-native';
import {
  MaterialIcons,
  FontAwesome6,
  Octicons,
  MaterialCommunityIcons,
  Entypo,
  Ionicons,
} from '@expo/vector-icons';
import { cloneElement, isValidElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { usePathname, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import api from '@/services/api';
import { useEntitlements, type ServiceAction } from '@/contexts/EntitlementContext';
import SubscribeModal from '@/components/molecules/SubscribeModal';
import { supportApi } from '@/services/support';

function menuAction(action: ServiceAction | string): ServiceAction {
  if (action === 'redirect_plans') return 'disabled_upgrade';
  return action as ServiceAction;
}

const MenuExploreDrawer = () => {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { hasRole, activeRoleView } = useHasRole();
  const isAdmin = hasRole('admin');
  const { serviceAction, configuredAction, entitlements } = useEntitlements();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [hasCourses, setHasCourses] = useState(false);
  const [hasStudentClassroom, setHasStudentClassroom] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);

  useEffect(() => {
    if (!userInfo?.token) {
      setHasCourses(false);
      setHasStudentClassroom(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [coursesRes, classroomsRes] = await Promise.all([
          api.get('/course/mine', {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }),
          api.get('/classroom/get_classrooms', {
            headers: { Authorization: `Bearer ${userInfo.token}` },
          }),
        ]);
        if (cancelled) return;
        setHasCourses((coursesRes.data?.courses || []).length > 0);
        setHasStudentClassroom(
          (classroomsRes.data?.classrooms || []).some(
            (classroom: { user_role?: string }) => classroom.user_role === 'student',
          ),
        );
      } catch {
        if (!cancelled) {
          setHasCourses(false);
          setHasStudentClassroom(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userInfo?.token, open, activeRoleView]);

  useEffect(() => {
    if (!open || !isAdmin || !userInfo?.token) return;
    let cancelled = false;
    supportApi
      .adminListTickets(userInfo.token)
      .then((response) => {
        if (!cancelled) setSupportUnread(response.data.unread_total || 0);
      })
      .catch(() => {
        if (!cancelled) setSupportUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, [open, userInfo?.token, isAdmin]);

  const menuItems = [
    {
      name: t('Home'),
      path: '/',
      icon: <Octicons name="home" size={24} />,
      disabled: false,
      serviceKey: 'home',
    },
    {
      name: t('Videos'),
      path: '/videos',
      icon: <MaterialIcons name="video-library" size={24} />,
      disabled: false,
      serviceKey: 'videos',
    },
    {
      name: t('Books'),
      path: '/books',
      icon: <MaterialCommunityIcons name="bookshelf" size={24} />,
      disabled: false,
      serviceKey: 'books',
    },
    {
      name: t('Collections'),
      path: '/collections',
      icon: <MaterialIcons name="collections-bookmark" size={24} />,
      disabled: false,
      serviceKey: 'collections',
    },
    {
      name: t('Talk to me'),
      path: '/talk_to_me',
      icon: <Entypo name="chat" size={24} color="black" />,
      disabled: false,
      serviceKey: 'talk_to_me',
    },
  ];

  if (hasRole('teacher') || hasStudentClassroom) {
    menuItems.push({
      name: t('Classrooms'),
      path: '/classrooms',
      icon: (
        <MaterialCommunityIcons name="google-classroom" size={24} color="black" />
      ),
      disabled: false,
      serviceKey: 'classrooms',
    });
  }

  if (!hasRole('teacher') && hasCourses) {
    menuItems.push({
      name: t('Courses'),
      path: '/courses',
      icon: (
        <MaterialCommunityIcons
          name="book-open-page-variant"
          size={24}
          color="black"
        />
      ),
      disabled: false,
      serviceKey: 'courses',
    });
  }

  menuItems.push({
    name: t('Plans'),
    path: '/plans',
    icon: <MaterialCommunityIcons name="crown" size={24} />,
    disabled: false,
    serviceKey: '',
  });

  if (hasRole('admin')) {
    menuItems.push(
      { name: t('Users'), path: '/admin/users', icon: <MaterialIcons name="people" size={24} />, disabled: false, serviceKey: '' },
      { name: t('Plans admin'), path: '/admin/plans', icon: <MaterialIcons name="workspace-premium" size={24} />, disabled: false, serviceKey: '' },
      { name: t('Purchases and subscriptions'), path: '/admin/subscriptions', icon: <MaterialIcons name="receipt-long" size={24} />, disabled: false, serviceKey: '' },
      { name: t('Coupons'), path: '/admin/coupons', icon: <MaterialIcons name="local-offer" size={24} />, disabled: false, serviceKey: '' },
      { name: t('Book bundles'), path: '/admin/bundles', icon: <MaterialCommunityIcons name="bookshelf" size={24} />, disabled: false, serviceKey: '' },
      { name: t('Service access'), path: '/admin/access', icon: <MaterialIcons name="lock" size={24} />, disabled: false, serviceKey: '' },
      { name: t('External sales'), path: '/admin/external-sales', icon: <MaterialIcons name="point-of-sale" size={24} />, disabled: false, serviceKey: '' },
      { name: t('Support'), path: '/admin/support', icon: <MaterialIcons name="headset-mic" size={24} />, disabled: false, serviceKey: '' },
    );
  }

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
        toValue: -300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [open]);
  return (
    <View>
      <TouchableOpacity onPress={() => setOpen(true)}>
        <MaterialIcons name="menu" size={24} color="white" />
      </TouchableOpacity>
      <Modal
        transparent
        animationType="fade"
        visible={open}
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View className="flex-1 relative">
            <Animated.View
              style={{
                backgroundColor: 'white',
                width: 300,
                padding: 20,
                height: '100%',
                transform: [{ translateX }],
              }}
              className="bg-white h-full w-[300px] absolute left-0 top-0 p-4 rounded-r-2xl shadow-lg"
            >
              <View className="flex-row mb-6">
                <FontAwesome6
                  name="bars-staggered"
                  size={24}
                  color={colors.gray[300]}
                />
                <Text
                  className="font-[ComicSans] font-bold ml-3"
                  style={{ color: colors.primary[600] }}
                >
                  {t('Explore')}
                </Text>
              </View>
              {!entitlements?.is_subscriber && (
                <TouchableOpacity className="mb-3" onPress={() => { router.push('/plans'); handleClose(); }}>
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
                      {t('Go premium')}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
              <View>
                {menuItems.filter((item) => {
                  if (!item.serviceKey) return true;
                  return configuredAction(item.serviceKey) !== 'hide' && menuAction(serviceAction(item.serviceKey)) !== 'hide';
                }).map((item) => {
                  const configured = item.serviceKey ? configuredAction(item.serviceKey) : 'allow';
                  const action = item.serviceKey ? menuAction(serviceAction(item.serviceKey)) : 'allow';
                  const isDisabled = item.disabled || configured === 'disabled' || action === 'disabled';
                  const isGated = configured === 'disabled_upgrade' && action !== 'allow';
                  const isMuted = isDisabled || isGated;
                  const isActive = pathname === item.path && !isMuted;
                  const iconColor = isMuted ? colors.gray[400] : undefined;
                  const icon = isValidElement(item.icon) && iconColor
                    ? cloneElement(item.icon, { color: iconColor } as any)
                    : item.icon;
                  return (
                    <Pressable
                      key={item.path + item.name}
                      className={`flex-row items-center mb-3 -left-4 w-[90%] px-5 py-1 rounded-r-3xl ${
                        isActive ? 'bg-orange-400' : ''
                      }`}
                      disabled={isDisabled}
                      onPress={() => {
                        if (isGated) {
                          handleClose();
                          setTimeout(() => setSubscribeOpen(true), 320);
                          return;
                        }
                        router.push(item.path as `./${string}`);
                        handleClose();
                      }}
                      {...(Platform.OS === 'web'
                        ? { onMouseLeave: () => {} }
                        : {})}
                    >
                      {icon}
                      <Text
                        className={`font-[ComicSans] ml-3 ${
                          isMuted ? 'text-gray-400' : 'text-primary-600 font-bold'
                        }`}
                      >
                        {item.name}
                      </Text>
                      {item.path === '/admin/support' && supportUnread > 0 ? (
                        <View
                          className="min-w-[18px] h-[18px] px-1 rounded-full items-center justify-center ml-2"
                          style={{ backgroundColor: colors.error[500] }}
                        >
                          <Text className="text-white text-[10px] font-bold">
                            {supportUnread > 99 ? '99+' : supportUnread}
                          </Text>
                        </View>
                      ) : null}
                      {isGated ? (
                        <Ionicons
                          name="star"
                          size={16}
                          color={colors.warning[500]}
                          style={{ marginLeft: 8 }}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <SubscribeModal visible={subscribeOpen} onClose={() => setSubscribeOpen(false)} />
    </View>
  );
};

export default MenuExploreDrawer;
