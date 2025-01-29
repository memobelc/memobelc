import { StyleSheet } from "react-native";
import { colors } from "@/styles/colors";
export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#007AFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    profileIconContainer: {
        padding: 4,
    },
    greetingContainer: {
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    greetingText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
    },
    mainText: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 20,
    },
    studyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F0FF',
        padding: 12,
        borderRadius: 30,
        width: 150,
        justifyContent: 'space-between',
    },
    studyButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    deckCard: {
        backgroundColor: '#E6F0FF',
        borderRadius: 10,
        padding: 20,
        marginHorizontal: 20,
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    deckImage: {
        width: 80,
        height: 80,
        borderRadius: 10,
    },
    deckInfo: {
        marginLeft: 20,
    },
    deckTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#007AFF',
    },
    deckText: {
        marginTop: 8,
        color: '#333',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        backgroundColor: '#007AFF',
        borderRadius: 30,
        padding: 10,
    },
});