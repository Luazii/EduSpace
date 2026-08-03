import { Stack } from "expo-router";

export default function EventsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[eventId]" options={{ presentation: "modal" }} />
      <Stack.Screen name="ticket/[ticketId]" options={{ presentation: "modal" }} />
    </Stack>
  );
}
