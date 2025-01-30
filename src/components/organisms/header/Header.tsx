import { View, Image, TouchableOpacity } from "react-native";
import { MaterialIcons } from '@expo/vector-icons';

import { styles } from './styles'

const Header = () => {
    return (
        <View style={styles.header}>
            <View style={styles.headerContainer} >
            <Image
                source={require('@/assets/memobelc-icon.png')}
                style={styles.logo}
            />
            <TouchableOpacity style={styles.profileIconContainer}>
                <MaterialIcons name="account-circle" size={40} color="#fff" />
            </TouchableOpacity>
        </View>
        </View>
    )

}


export default Header