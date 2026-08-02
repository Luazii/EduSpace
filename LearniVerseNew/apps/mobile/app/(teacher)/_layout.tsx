import { Stack } from "expo-router";
import { Colors } from "@/constants/colors";

export default function TeacherLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.navy,
        headerBackTitle: "Back",
      }}
    >
      <Stack.Screen name="attendance" options={{ title: "Attendance" }} />
      <Stack.Screen name="marking/index" options={{ title: "Marking" }} />
      <Stack.Screen name="marking/[assignmentId]" options={{ title: "Grade Submission" }} />
      <Stack.Screen name="gradebook/index" options={{ title: "Grade Book" }} />
      <Stack.Screen name="behaviour/index" options={{ title: "Behaviour Records" }} />
      <Stack.Screen name="reports/index" options={{ title: "Reports" }} />
    </Stack>
  );
}
