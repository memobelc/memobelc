import { View, Image, TouchableOpacity, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSession } from '@/contexts/AuthContext';

import {
  DropDown,
  DropDownContent,
  DropDownItem,
  DropDownItemSeparator,
  DropDownTrigger,
} from '@/components/DropDown';

import { Avatar, AvatarImage } from '@/components/Avatar';

const AvatarProfileDropDown = () => {
  const { userInfo, signOut } = useSession();

  return (
    <TouchableOpacity>
      <DropDown>
        <DropDownTrigger>
          <TouchableOpacity>
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
        </DropDownTrigger>

        <DropDownContent>
          <DropDownItem>
            <TouchableOpacity className="flex flex-row gap-2 items-center">
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
                <Text className="text-primary text-xs">{userInfo?.email}</Text>
              </View>
            </TouchableOpacity>
          </DropDownItem>
          <DropDownItemSeparator />
          <DropDownItem
            onPress={signOut}
            className="flex flex-row gap-2 items-center cursor-pointer"
          >
            <MaterialIcons name="logout" size={20} />
            <Text className="text-primary text-xs">Log out</Text>
          </DropDownItem>
        </DropDownContent>
      </DropDown>
    </TouchableOpacity>
  );
};

export default AvatarProfileDropDown;
