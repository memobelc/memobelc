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
} from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { colors } from '@/styles/colors';
import { usePathname, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useSession } from '@/contexts/AuthContext';
import { useHasRole } from '@/hooks/useHasRole';
import api from '@/services/api';

const MenuExploreDrawer = () => {
  const { t } = useTranslation();
  const { userInfo } = useSession();
  const { hasRole, activeRoleView } = useHasRole();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hasCourses, setHasCourses] = useState(false);
  const [hasStudentClassroom, setHasStudentClassroom] = useState(false);

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

  const menuItems = [
    {
      name: t('Home'),
      path: '/',
      icon: <Octicons name="home" size={24} />,
      disabled: false,
    },
    {
      name: t('Videos'),
      path: '/videos',
      icon: <MaterialIcons name="video-library" size={24} />,
      disabled: false,
    },
    {
      name: t('Books'),
      path: '/books',
      icon: <MaterialCommunityIcons name="bookshelf" size={24} />,
      disabled: false,
    },
    {
      name: t('Collections'),
      path: '/collections',
      icon: <MaterialIcons name="collections-bookmark" size={24} />,
      disabled: false,
    },
    {
      name: t('Talk to me'),
      path: '/talk_to_me',
      icon: <Entypo name="chat" size={24} color="black" />,
      disabled: false,
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
    });
  }

  if (hasRole('admin')) {
    menuItems.push({
      name: t('Users'),
      path: '/admin/users',
      icon: <MaterialIcons name="people" size={24} />,
      disabled: false,
    });
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
              {/* {!userInfo?.premium && (
                <TouchableOpacity className="mb-3">
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
              )} */}
              <View>
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Pressable
                      key={item.name}
                      className={`flex-row mb-3 -left-4 w-[90%] px-5 py-1 rounded-r-3xl ${
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
                        className={`font-[ComicSans] ml-3 ${
                          item.disabled ? 'text-gray-300' : 'text-primary-600'
                        }`}
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default MenuExploreDrawer;
