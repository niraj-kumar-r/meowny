import { Text, View } from "react-native";
import { Button, useTheme } from "react-native-paper";

export default function Index() {
    const theme = useTheme();
    return (
        <View
            style={{
                flex: 1,
                justifyContent: "center",
                alignItems: "center",
            }}
        >
            <Text>Edit app/index.tsx to edit this screen.</Text>
            <Button
                mode="contained"
                buttonColor={theme.colors.secondaryContainer}
                textColor={theme.colors.onSecondaryContainer}
            >
                Click Me
            </Button>
        </View>
    );
}
