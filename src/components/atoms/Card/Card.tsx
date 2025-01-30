import { View, Image, Text } from "react-native";
import { MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';

import { colors } from "@/styles/colors";



import { styles } from "./styles";

export const Card = () => {
    return (
        <View style={styles.deckCard}>
            {/* Imagem de fundo no topo */}
            <Image
                source={require('@/assets/logo_memobelc.jpg')}
                style={styles.deckImage}
            />
            

            <View style={styles.deckInfo}>
                <Text style={styles.deckTitle}>Master Deck</Text>
                <View style={styles.deckCardBottom}>
                    <View style={styles.progressContainer}>
                    <MaterialCommunityIcons name="cards" size={24} color={colors.red[600]} />
                    <Text style={styles.deckText}>1000 out of 1200 to study</Text>
                    </View>
                    <MaterialIcons name="language" size={24} color="#000" />
                </View>
                
                
            </View>
        </View>
    );
};
