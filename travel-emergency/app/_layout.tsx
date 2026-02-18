import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import { getDatabase } from "../src/db/database";
import { syncMasterData } from "../src/services/masterDataSync";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    if (Platform.OS === "android") {
      (async () => {
        try {
          const NavigationBar = await import("expo-navigation-bar");
          await NavigationBar.setPositionAsync("relative");
          await NavigationBar.setBackgroundColorAsync("#FFFFFF");
          await NavigationBar.setButtonStyleAsync("dark");
        } catch {
          // expo-navigation-bar API 호환 문제 시 무시 (Expo Go 등)
        }
      })();
    }
  }, []);

  useEffect(() => {
    getDatabase()
      .then(() => {
        setDbReady(true);
        // DB 초기화 완료 후 백그라운드로 마스터 데이터 동기화
        syncMasterData().catch(() => {});
      })
      .catch(console.error)
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (!dbReady) return null;

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
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
