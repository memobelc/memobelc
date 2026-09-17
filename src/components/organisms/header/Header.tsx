import { View, Platform, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AvatarProfileDrawer from '@/components/molecules/AvatarProfileDrawer';
import MenuExploreDrawer from '@/components/molecules/MenuExploreDrawer';
import NotificationBell from '@/components/molecules/NotificationBell';
import SupportChatModal from '@/components/molecules/SupportChatModal';
import { colors } from '@/styles/colors';

const Header = () => {
  const insets = useSafeAreaInsets();
  // #region agent log
  fetch('http://127.0.0.1:7550/ingest/bc00b530-5fab-47e9-b067-96a2caa9e0db',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ba354b'},body:JSON.stringify({sessionId:'ba354b',runId:'web-fix',hypothesisId:'C',location:'src/components/organisms/header/Header.tsx',message:'Header insets (no SafeAreaView)',data:{top:insets.top,platform:Platform.OS},timestamp:Date.now()})}).catch(()=>{});
  fetch('http://192.168.1.176:7550/ingest/bc00b530-5fab-47e9-b067-96a2caa9e0db',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'ba354b'},body:JSON.stringify({sessionId:'ba354b',runId:'web-fix',hypothesisId:'C',location:'src/components/organisms/header/Header.tsx',message:'Header insets (no SafeAreaView)',data:{top:insets.top,platform:Platform.OS},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return (
    <View
      className="z-50"
      style={{
        backgroundColor: colors.primary[500],
        paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + insets.top,
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
    </View>
  );
};

export default Header;
