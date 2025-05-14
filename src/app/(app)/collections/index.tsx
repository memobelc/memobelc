import { DeckCardSecondary } from '@/components/atoms/DeckCardSecondary';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '@/styles/colors';
import { useCollection } from '@/contexts/CollectionContext';
import { useTranslation } from 'react-i18next';

export default function AllCollections() {
  const { t } = useTranslation();
  const router = useRouter();
  const { collections, setCurrentCollection } = useCollection();

  return (
    <View className="flex-1 w-4/5 max-w-[1440px] mx-auto mt-8 relative">
      <View
        className="absolute top-0 left-0 right-0 flex-col w-full items-start
             justify-between z-10 bg-gray-100 -mt-2"
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center mb-3 ml-3"
        >
          <Ionicons
            name="arrow-back-circle"
            size={24}
            color={colors.primary[500]}
          />
          <Text style={{ color: colors.primary[500] }}>{t('Back')}</Text>
        </TouchableOpacity>

        {/* <TextInput
          placeholder={t('Search decks...')}
          placeholderTextColor="#888"
          className="h-14 w-full mb-3 border border-gray-300 rounded-lg pl-2 text-sm"
        /> */}
      </View>
      <View
        style={
          Platform.OS === 'web' ? { flex: 1, height: '100%' } : { flex: 1 }
        }
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: 100,
            paddingBottom: 200,
          }}
          showsVerticalScrollIndicator={false}
        >
          {collections && collections.length >= 1 && (
            <>
              {collections.map((item) => (
                <DeckCardSecondary
                  key={item._id}
                  name={item.name}
                  image={item.image}
                  type="collection"
                  pending_cards={item.pending_cards}
                  total_cards={item.total_cards}
                  onPress={() => setCurrentCollection(item)}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>

      <LinearGradient
        colors={['transparent', `${colors.gray[100]}`]}
        className="absolute bottom-0 left-0 right-0 h-28"
        pointerEvents="none"
      />
    </View>
  );
}
