import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#DC2626",
        tabBarInactiveTintColor: "#999",
        // height를 고정하지 않고 React Navigation이 safe area를 자동 처리하도록 함
        tabBarLabelStyle: {
          fontSize: 13,
          fontWeight: "600",
        },
        // 디버그: 헤더에 insets 값 표시 (확인 후 삭제)
        headerRight: () => (
          <View style={{ marginRight: 8 }}>
            <Text style={{ color: "#fff", fontSize: 10 }}>
              B:{insets.bottom} T:{insets.top}
            </Text>
          </View>
        ),
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
