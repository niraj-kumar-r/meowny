import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { Button, useTheme } from "react-native-paper";

export default function Home() {
    const theme = useTheme();
    const router = useRouter();
    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Text>TABSSSSSSSS</Text>
            <Button
                mode="contained"
                buttonColor={theme.colors.secondaryContainer}
                textColor={theme.colors.onSecondaryContainer}
                onPress={() => router.navigate("/")}
            >
                Diffff
            </Button>
        </View>
    );
}
