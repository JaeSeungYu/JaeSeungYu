import { Tabs } from "expo-router";
import { Text, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#DC2626",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopColor: "#e5e5e5",
          borderTopWidth: 1,
          paddingTop: 4,
          // edge-to-edge 모드에서 시스템 네비게이션 바 겹침 방지
          paddingBottom: Platform.OS === "android" ? Math.max(insets.bottom, 4) : insets.bottom,
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
