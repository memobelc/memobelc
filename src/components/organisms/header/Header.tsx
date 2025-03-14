import { View } from 'react-native';

import AvatarProfileDropDown from '@/components/molecules/AvatarProfileDropDown';
import MenuExploreDrawer from '@/components/molecules/MenuExploreDrawer';
import { colors } from '@/styles/colors';

const Header = () => {
  return (
    <View
      className="px-4 py-3 z-50"
      style={{ backgroundColor: colors.primary[500], zIndex: 1000 }}
    >
      <View className="flex-row justify-between items-center w-[80%] max-w-[1440] m-auto mt-0">
        <MenuExploreDrawer />
        <AvatarProfileDropDown />
      </View>
    </View>
  );
};

export default Header;
