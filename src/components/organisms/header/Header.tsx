import { View } from 'react-native';

import { useSession } from '@/contexts/AuthContext';

import { styles } from './styles';
import AvatarProfileDropDown from '@/components/molecules/AvatarProfileDropDown';
import MenuExploreDrawer from '@/components/molecules/MenuExploreDrawer';

const Header = () => {
  const { userInfo, signOut } = useSession();

  return (
    <View style={styles.header}>
      <View style={styles.headerContainer}>
        <MenuExploreDrawer />

        <AvatarProfileDropDown />
      </View>
    </View>
  );
};

export default Header;
