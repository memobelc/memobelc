import { Dimensions, StyleSheet } from "react-native";
import { colors } from "@/styles/colors";

const { width } = Dimensions.get("window");


export const styles = StyleSheet.create({
    deckCard: {
        width: width > 768 ? 300 : 200,
        height: width > 768 ? 250 : 150,
        backgroundColor: "#fff",
        borderRadius: 12,
        overflow: "hidden", 
        position: "relative",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 5, 
    },
    deckImage: {
        width: "100%",
        height: "60%", 
        position: "absolute",
        top: 0,
        left: 0,
    },
    deckInfo: {
        flex: 1,
        justifyContent: "flex-end",
        padding: 16,
    },
    deckTitle: {
        fontSize: width > 768 ? 18 : 14,
        fontWeight: "bold",
        color: "#333",
    },
    deckText: {
        fontSize: width > 768 ? 14 : 12,
        color: colors.red[600],
    },
    deckCardBottom: {
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems:'center'
    },
    progressContainer: {
        display: "flex",
        backgroundColor: colors.red[100],
        paddingHorizontal: 8,
        paddingVertical: 5,
        // paddingTop: 5,
        // paddingLeft:8,
        flexDirection: "row",

        borderRadius: 5,
        alignItems: "center",
        justifyContent: "center"
    }
});
