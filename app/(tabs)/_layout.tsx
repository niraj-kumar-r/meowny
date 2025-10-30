import {
    Icon,
    Label,
    NativeTabs,
    VectorIcon,
} from "expo-router/unstable-native-tabs";
import React from "react";

import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export default function TabLayout() {
    return (
        <NativeTabs>
            <NativeTabs.Trigger name="home">
                <Label>Home</Label>
                <Icon sf="house.fill" drawable="btn_star" />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="trySql">
                <Icon src={<VectorIcon family={MaterialIcons} name="home" />} />
                <Label>SQL</Label>
            </NativeTabs.Trigger>
        </NativeTabs>
    );
}
