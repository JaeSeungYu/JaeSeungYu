import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { getDatabase } from "../src/db/database";

export default function RootLayout() {
  useEffect(() => {
    getDatabase();
  }, []);

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
