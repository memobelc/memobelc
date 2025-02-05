import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';

export default function AllCollections() {
    const router = useRouter();

    return (
        <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
            <View className="absolute top-0 left-0 right-0 flex-col w-full  items-start
             justify-between z-10 bg-gray-100 -mt-2">
                <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-3 ml-3">
                    <Ionicons name="arrow-back-circle" size={24} color={colors.primary[500]} />
                    <Text style={{ color: colors.primary[500] }}>Back</Text>
                </TouchableOpacity>

                <TextInput
                    placeholder="Search decks..."
                    placeholderTextColor="#888"
                    className="h-14 w-full mb-3 border border-gray-300 rounded-lg pl-2 text-sm"
                />
            </View>
            <View>
                <ScrollView contentContainerStyle={{ paddingBottom: 200, paddingTop: 100 }} showsVerticalScrollIndicator={false}>
                    <DeckCardSecondary  name="Ingles" image="https://images.prismic.io/website-b2c/Zu2_orVsGrYSvo18_ingles-britanico-2-.jpg?auto=format,compress" type="collection" />
                    <DeckCardSecondary  name="Espanhol" image="https://www.agbt.com.br/wp-content/uploads/2020/02/O-Melhor-Tradutor-de-Portugu%C3%AAs-para-Espanhol.jpg" type="collection" />
                    <DeckCardSecondary  name="Italiano" image="https://laviaitalia.com.br/wp-content/uploads/2023/10/aprender-italiano-960x640-1.jpg" type="collection" />
                    <DeckCardSecondary  name="Chinês" image="https://ibrachina.com.br/wp-content/uploads/2019/11/wp1939724-scaled.jpg" type="collection" />
                    <DeckCardSecondary  name="Francês" image="https://cdn.wizard.com.br/wp-content/uploads/2019/08/14113136/moca-torre-eiffel-com-bandeira-francesa.jpg" type="collection" />
                    <DeckCardSecondary  name="Ingles" image="https://images.prismic.io/website-b2c/Zu2_orVsGrYSvo18_ingles-britanico-2-.jpg?auto=format,compress" type="collection" />
                    <DeckCardSecondary  name="Espanhol" image="https://www.agbt.com.br/wp-content/uploads/2020/02/O-Melhor-Tradutor-de-Portugu%C3%AAs-para-Espanhol.jpg" type="collection" />
                    <DeckCardSecondary  name="Italiano" image="https://laviaitalia.com.br/wp-content/uploads/2023/10/aprender-italiano-960x640-1.jpg" type="collection" />
                    <DeckCardSecondary  name="Chinês" image="https://ibrachina.com.br/wp-content/uploads/2019/11/wp1939724-scaled.jpg" type="collection" />
                    <DeckCardSecondary  name="Francês" image="https://cdn.wizard.com.br/wp-content/uploads/2019/08/14113136/moca-torre-eiffel-com-bandeira-francesa.jpg" type="collection" />
                </ScrollView>

            </View>



            <LinearGradient
                colors={['transparent', 'white']}
                className="absolute bottom-0 left-0 right-0 h-28"
                pointerEvents="none"
            />


        </View>
    );
}
