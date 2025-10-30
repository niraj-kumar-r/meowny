import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import React from "react";

import { useColorScheme } from "@/app-example/hooks/use-color-scheme";

export default function TabLayout() {
    const colorScheme = useColorScheme();

    return (
        <NativeTabs>
            <NativeTabs.Trigger name="home">
                <Label>Home</Label>
                <Icon sf="house.fill" drawable="custom_android_drawable" />
            </NativeTabs.Trigger>
            {/* <NativeTabs.Trigger name="settings">
                <Icon sf="gear" drawable="custom_settings_drawable" />
                <Label>Settings</Label>
            </NativeTabs.Trigger> */}
        </NativeTabs>
    );
}
