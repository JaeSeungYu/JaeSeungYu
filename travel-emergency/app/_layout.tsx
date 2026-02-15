import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as NavigationBar from "expo-navigation-bar";
import { getDatabase } from "../src/db/database";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    // Android 네비게이션 바를 relative로 설정하여 콘텐츠와 겹치지 않도록 함
    if (Platform.OS === "android") {
      NavigationBar.setPositionAsync("relative");
      NavigationBar.setBackgroundColorAsync("#ffffff");
    }
  }, []);

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch(console.error)
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (!dbReady) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#DC2626" },
          headerTintColor: "#fff",
          headerTitleStyle: { fontWeight: "700" },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="country-select"
          options={{ title: "여행 국가 선택" }}
        />
        <Stack.Screen
          name="add-contact"
          options={{ title: "비상연락처 추가" }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}
