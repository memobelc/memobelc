import { View, Platform, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AvatarProfileDrawer from '@/components/molecules/AvatarProfileDrawer';
import MenuExploreDrawer from '@/components/molecules/MenuExploreDrawer';
import NotificationBell from '@/components/molecules/NotificationBell';
import SupportChatModal from '@/components/molecules/SupportChatModal';
import { colors } from '@/styles/colors';

const Header = () => {
  return (
    <SafeAreaView
      edges={['top']}
      className="z-50"
      style={{
        backgroundColor: colors.primary[500],
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0,
      }}
    >
      <View className="px-4 py-3">
        <View className="flex-row justify-between items-center w-[80%] md:w-full m-auto mt-0">
          <MenuExploreDrawer />
          <View className="flex-row items-center">
            <NotificationBell />
            <AvatarProfileDrawer />
          </View>
        </View>
      </View>
      <SupportChatModal />
    </SafeAreaView>
  );
};

export default Header;
