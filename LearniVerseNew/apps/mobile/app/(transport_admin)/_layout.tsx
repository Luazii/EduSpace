import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function TransportAdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.navy,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="routes" options={{ title: "Manage Routes" }} />
      <Stack.Screen name="buses" options={{ title: "Bus Assignments" }} />
      <Stack.Screen name="bookings" options={{ title: "Booking Requests" }} />
      <Stack.Screen name="notify" options={{ title: "Notify Parents" }} />
    </Stack>
  );
}
