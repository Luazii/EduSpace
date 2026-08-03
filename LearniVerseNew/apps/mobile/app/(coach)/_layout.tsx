import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function CoachLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.navy,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="teams" options={{ title: "My Teams" }} />
      <Stack.Screen name="training" options={{ title: "Training Sessions" }} />
      <Stack.Screen name="attendance" options={{ title: "Attendance" }} />
      <Stack.Screen name="fixtures" options={{ title: "Match Fixtures" }} />
      <Stack.Screen name="reports" options={{ title: "Performance Reports" }} />
      <Stack.Screen name="venues/index" options={{ title: "Venues", headerShown: false }} />
    </Stack>
  );
}
