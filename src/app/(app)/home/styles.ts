import { StyleSheet, Dimensions } from "react-native";
import { colors } from "@/styles/colors";

const { width } = Dimensions.get("window");


export const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "80%",
        maxWidth: 1440,
        margin: "auto",
        marginTop: 50
    },

    mainCard: {
        flex: 1,
        flexDirection: width > 768 ? "row" : "column",
        justifyContent: width > 768 ? "space-between" : "center"

    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },


    greetingContainer: {
        paddingHorizontal: 20,
        paddingTop: 30,
    },
    greetingText: {
        fontSize: width > 768 ? width * 0.015 : 12 ,
        color: '#666',
        marginBottom: 5,
        fontFamily: "ComicSans"
    },
    mainText: {
        fontSize: width * 0.035,
        fontWeight: 'bold',
        color: '#007AFF',
        marginBottom: 20,
        fontFamily: "ComicSans"
    },
    studyButton: {
        display: width > 768 ? "flex" : "none",
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E6F0FF',
        padding: 12,
        borderRadius: 30,
        width: 225,
        justifyContent: 'space-between',
    },
    studyButtonText: {
        color: '#007AFF',
        fontSize: 24,
        fontWeight: '600',
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