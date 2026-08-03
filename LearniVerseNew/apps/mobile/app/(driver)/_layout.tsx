import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.navy,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="routes" options={{ title: "My Routes" }} />
      <Stack.Screen name="passengers" options={{ title: "Passenger Manifest" }} />
      <Stack.Screen name="scan" options={{ title: "Scan Boarding" }} />
      <Stack.Screen name="incident" options={{ title: "Report Incident" }} />
    </Stack>
  );
}
