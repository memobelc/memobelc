import { useSession } from '@/contexts/AuthContext';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from './styles';

export default function Index() {
    const { signOut } = useSession();
    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Image
                    source={require('@/assets/logo_memobelc.jpg')}
                    style={styles.logo}
                />
                <TouchableOpacity style={styles.profileIconContainer}>
                    <MaterialIcons name="account-circle" size={40} color="#fff" />
                </TouchableOpacity>
            </View>

            <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>GOOD EVENING, CLEBY</Text>
                <Text style={styles.mainText}>New Day, New Hack!</Text>
                <TouchableOpacity style={styles.studyButton}>
                    <Text style={styles.studyButtonText}>Study Now</Text>
                    <MaterialIcons name="arrow-forward" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>

            {/* Deck Card */}
            <View style={styles.deckCard}>
                <Image
                    source={require('@/assets/logo_memobelc.jpg')}
                    style={styles.logo}
                />
                <View style={styles.deckInfo}>
                    <Text style={styles.deckTitle}>Master Deck</Text>
                    <Text style={styles.deckText}>1000 out of 1200 to study</Text>
                    <MaterialIcons name="language" size={24} color="#000" />
                </View>
            </View>

            {/* Floating Button */}
            <TouchableOpacity style={styles.floatingButton}>
                <MaterialIcons name="add" size={40} color="#fff" />
            </TouchableOpacity>

            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                    onPress={() => {
                        // The `app/(app)/_layout.tsx` will redirect to the sign-in screen.
                        signOut();
                    }}>
                    Sign Out
                </Text>
            </View>
        </View>

    );
}
