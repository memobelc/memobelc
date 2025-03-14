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

const MenuExploreDrawer = () => {
  const { t } = useTranslation();

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
      disabled: true,
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

  const { userInfo, signOut } = useSession();

  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
          <View className="flex-1 justify-center relative items-center">
            <Animated.View
              style={{
                transform: [{ translateX }],
              }}
              className="bg-white w-[50%] h-[50%] absolute left-0 top-0 p-4 rounded-r-2xl"
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
              {!userInfo?.premium && (
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
              )}
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
                        className={`font-[ComicSans] ml-3 ${item.disabled ? 'text-gray-300' : 'text-primary-600'}`}
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
