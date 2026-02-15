import { useEffect, useState } from "react";
import { Stack, SplashScreen } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getDatabase } from "../src/db/database";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    getDatabase()
      .then(() => setDbReady(true))
      .catch(console.error)
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (!dbReady) return null;

  return (
    <>
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
    </>
  );
}
