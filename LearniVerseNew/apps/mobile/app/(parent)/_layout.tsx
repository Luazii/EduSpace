import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function ParentLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.navy,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="children" options={{ title: "My Children" }} />
      <Stack.Screen name="progress" options={{ title: "Academic Progress" }} />
      <Stack.Screen name="transport" options={{ title: "Book Transport" }} />
      <Stack.Screen name="messages" options={{ title: "Messages & Notices" }} />
      <Stack.Screen name="fees" options={{ title: "Fee Statements" }} />
    </Stack>
  );
}
