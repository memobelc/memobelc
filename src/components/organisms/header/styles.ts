import { StyleSheet } from "react-native";
import { colors } from "@/styles/colors";


export const styles = StyleSheet.create({
    header: {
        backgroundColor: colors.primary[500],
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    headerContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: 'center',
        width: "80%",
        maxWidth: 1440,
        margin: "auto",
        marginTop: 0
    },
    logo: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    profileIconContainer: {
        padding: 4,
    },
})
