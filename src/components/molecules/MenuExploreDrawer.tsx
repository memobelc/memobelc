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
} from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { colors } from '@/styles/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import { usePathname, useRouter } from 'expo-router';

const menuItems = [
  {
    name: 'Home',
    path: '/',
    icon: <Octicons name="home" size={24} />,
    disabled: false,
  },
  {
    name: 'Videos',
    path: '/videos',
    icon: <MaterialIcons name="video-library" size={24} />,
    disabled: false,
  },
  {
    name: 'Books',
    path: '/books',
    icon: <MaterialCommunityIcons name="bookshelf" size={24} />,
    disabled: false,
  },
  {
    name: 'Collections',
    path: '/collections',
    icon: <MaterialIcons name="collections-bookmark" size={24} />,
    disabled: false,
  },
];

const MenuExploreDrawer = () => {
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
                  {' '}
                  Explore
                </Text>
              </View>
              <View>
                {menuItems.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Pressable
                      key={item.name}
                      className={`flex-row mb-3 -left-4 w-[70%] px-5 py-1 rounded-r-3xl ${
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
