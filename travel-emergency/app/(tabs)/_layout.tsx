import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#DC2626",
        tabBarInactiveTintColor: "#999",
        tabBarStyle: {
          height: 60,
          paddingBottom: 8,
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
