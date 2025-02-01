import { View, Image, TouchableOpacity, Text } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';
import { useSession } from '@/contexts/AuthContext';

import {
    DropDown,
    DropDownContent,
    DropDownItem,
    DropDownItemSeparator,
    DropDownLabel,
    DropDownTrigger,
} from '@/components/DropDown';

import {
    Avatar, AvatarImage, AvatarFallback
} from "@/components/Avatar"

import { styles } from './styles'

const Header = () => {
    const { userInfo, signOut } = useSession();
    return (
        <View style={styles.header}>
            <View style={styles.headerContainer} >
                <Image
                    source={require('@/assets/memobelc-icon.png')}
                    style={styles.logo}
                />
                <TouchableOpacity style={styles.profileIconContainer}>
                    <DropDown>
                        <DropDownTrigger>
                            <TouchableOpacity>
                                <Avatar>
                                    <AvatarImage
                                        source={{
                                            uri: '',
                                        }}
                                    />
                                    <AvatarFallback />
                                </Avatar>
                            </TouchableOpacity>
                        </DropDownTrigger>

                        <DropDownContent>
                            <DropDownItem>
                                <TouchableOpacity className="flex flex-row gap-2 items-center">
                                    <Avatar>
                                        <AvatarImage
                                            source={{
                                                uri: '',
                                            }}
                                        />
                                        <AvatarFallback />
                                    </Avatar>
                                    <View>
                                        <Text className="text-primary text-xs">{userInfo?.name}</Text>
                                        <Text className="text-primary text-xs">{userInfo?.email}</Text>
                                    </View>

                                </TouchableOpacity>
                            </DropDownItem>
                            <DropDownItemSeparator />
                            <DropDownItem onPress={signOut} className="flex flex-row gap-2 items-center cursor-pointer"  >
                                <MaterialIcons name="logout" size={20} />
                                <Text className="text-primary text-xs">Log out</Text>
                            </DropDownItem>
                        </DropDownContent>
                    </DropDown>

                </TouchableOpacity>
            </View>
        </View>
    )

}


export default Header