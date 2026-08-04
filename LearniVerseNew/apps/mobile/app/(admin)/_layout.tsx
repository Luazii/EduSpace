import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.navy,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="enrollments/index" options={{ title: "Admissions" }} />
      <Stack.Screen name="enrollments/[applicationId]" options={{ title: "Application" }} />
      <Stack.Screen name="users/index" options={{ title: "User Directory" }} />
      <Stack.Screen name="courses/index" options={{ title: "Subject Catalog" }} />
      <Stack.Screen name="fees/index" options={{ title: "Fee Office" }} />
      <Stack.Screen name="timetable/index" options={{ title: "Timetable" }} />
      <Stack.Screen name="communications/index" options={{ title: "Communications" }} />
      <Stack.Screen name="performance/index" options={{ title: "Performance" }} />
      <Stack.Screen name="events/index" options={{ title: "Events Management" }} />
      <Stack.Screen name="events/create" options={{ presentation: "modal", title: "New Event" }} />
      <Stack.Screen name="events/scanner" options={{ title: "Ticket Scanner" }} />
    </Stack>
  );
}
