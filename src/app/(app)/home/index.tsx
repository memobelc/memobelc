import { useSession } from '@/contexts/AuthContext';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from './styles';
import { Card } from '@/components/atoms/Card/Card';
import { getGreeting } from '@/utils/greeting';

export default function Home() {
    const { userInfo, signOut } = useSession();
    return (
        <View style={styles.container}>

            <View style={styles.mainCard}>
            <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>{getGreeting()}, {userInfo?.name.toUpperCase()}!</Text>
                <Text style={styles.mainText}>New Day, New Strength!</Text>
                <TouchableOpacity style={styles.studyButton}>
                    <Text style={styles.studyButtonText}>Study Now</Text>
                    <MaterialIcons name="arrow-forward" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            </View>



            {/* Deck Card */}



            {/* Floating Button */}
            <TouchableOpacity style={styles.floatingButton}>
                <MaterialIcons name="add" size={40} color="#fff" />
            </TouchableOpacity>

        </View>

    );
}
