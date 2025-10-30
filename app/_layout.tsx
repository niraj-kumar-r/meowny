import { DARK_THEME, LIGHT_THEME } from "@/constants/theme";
import { useMaterial3Theme } from "@pchmn/expo-material3-theme";
import { Stack } from "expo-router";
import { useMemo } from "react";
import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";

export default function RootLayout() {
    const colorScheme = useColorScheme();
    const { theme } = useMaterial3Theme();

    // ENABLE THEME OVERRIDE WITH MATERIAL3 THEME COLORS

    // const paperTheme = useMemo(
    //     () =>
    //         colorScheme === "dark"
    //             ? { ...MD3DarkTheme, ...DARK_THEME, colors: theme.dark }
    //             : { ...MD3LightTheme, ...LIGHT_THEME, colors: theme.light },
    //     [colorScheme, theme],
    // );

    const paperTheme = useMemo(
        () =>
            colorScheme === "dark"
                ? { ...MD3DarkTheme, ...DARK_THEME }
                : { ...MD3LightTheme, ...LIGHT_THEME },
        [colorScheme],
    );

    return (
        <PaperProvider theme={paperTheme}>
            <Stack />
        </PaperProvider>
    );
}
