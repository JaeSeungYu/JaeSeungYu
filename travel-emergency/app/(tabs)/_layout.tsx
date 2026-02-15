import { Tabs } from "expo-router";
import { Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Expo Go에서 insets.bottom이 0을 반환하는 경우 Android 최소값 적용
  const safeBottom =
    Platform.OS === "android"
      ? Math.max(insets.bottom, 48)
      : insets.bottom;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#DC2626",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          height: 60 + safeBottom,
          paddingBottom: 8 + safeBottom,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
        headerStyle: { backgroundColor: "#DC2626" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "긴급 연락",
          headerTitle: "여행 긴급 도우미",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>🆘</Text>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "설정",
          headerTitle: "환경설정",
          tabBarIcon: ({ color }) => (
            <Text style={{ fontSize: 24, color }}>⚙️</Text>
          ),
        }}
      />
    </Tabs>
  );
}
