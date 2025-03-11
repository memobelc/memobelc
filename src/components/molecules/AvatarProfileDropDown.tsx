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
import { MaterialIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useSession } from '@/contexts/AuthContext';
import { Avatar, AvatarImage } from '@/components/Avatar';
import { useTranslation } from 'react-i18next';
import { Picker } from '@react-native-picker/picker';
import { useProfile } from '@/contexts/profileContext';

type menuItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  disabled: boolean;
};

const menuItems: menuItem[] | [] = [];

const AvatarProfileDropDown = () => {
  const { userInfo, signOut } = useSession();
  const { language, setLanguage } = useProfile();
  const { t, i18n } = useTranslation();

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
        toValue: 300,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [open]);

  useEffect(() => {
    i18n.changeLanguage(language || 'en');
  }, [language]);

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
        <TouchableWithoutFeedback onPress={handleClose}>
          <View className="flex-1 justify-center relative items-center">
            <Animated.View
              style={{
                transform: [{ translateX }],
              }}
              className="bg-white w-[50%] absolute right-0 top-0 p-4 rounded-l-2xl"
            >
              <TouchableOpacity className="flex flex-row gap-2 items-center mb-3">
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
                <Text className="font-bold text-primary mb-1">Language</Text>
                <View className="border border-gray-200 rounded-lg overflow-hidden">
                  <Picker
                    selectedValue={language}
                    onValueChange={(itemValue) =>
                      setLanguage(itemValue || 'en')
                    }
                  >
                    <Picker.Item label="English" value="en" />
                    <Picker.Item label="Português" value="pt-BR" />
                  </Picker>
                </View>
              </View>
              <TouchableOpacity
                onPress={signOut}
                className="flex flex-row gap-2 items-center cursor-pointer"
              >
                <MaterialIcons name="logout" size={20} />
                <Text className="text-primary text-xs">{t('Log out')}</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default AvatarProfileDropDown;
