import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

export default function AttendanceScreen() {
  const user = useQuery(api.users.current);
  const teacherCourses = useQuery(api.courses.listTeachingDashboard) ?? [];
  const markAttendance = useMutation(api.attendance.markAttendance);

  const [selectedCourse, setSelectedCourse] = useState<Id<"courses"> | null>(null);
  const [sessionDate] = useState(new Date().toISOString().split("T")[0]);
  const [saving, setSaving] = useState(false);

  const enrolledStudents = useQuery(
    api.attendance.listEnrolledStudents,
    selectedCourse ? { courseId: selectedCourse } : "skip"
  ) ?? [];

  const [attendance, setAttendance] = useState<
    Record<string, "present" | "absent" | "late" | "excused">
  >({});

  function toggleStatus(
    studentId: string,
    status: "present" | "absent" | "late" | "excused"
  ) {
    setAttendance((prev) => ({ ...prev, [studentId]: status }));
  }

  async function handleSave() {
    if (!selectedCourse) return;
    const records = enrolledStudents.map((s: any) => ({
      studentUserId: s.userId as Id<"users">,
      status: attendance[s.userId] ?? "absent",
    }));
    setSaving(true);
    try {
      await markAttendance({
        courseId: selectedCourse,
        sessionDate: new Date(sessionDate).getTime(),
        records,
      });
      Alert.alert("Saved!", "Attendance recorded for today.");
    } catch {
      Alert.alert("Error", "Could not save attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const statusColors: Record<string, { bg: string; text: string }> = {
    present: { bg: "bg-emerald-500", text: "text-white" },
    absent: { bg: "bg-rose-500", text: "text-white" },
    late: { bg: "bg-amber-500", text: "text-white" },
    excused: { bg: "bg-slate-400", text: "text-white" },
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-5 pb-24">
        {/* Date */}
        <View className="bg-white rounded-2xl px-4 py-3 border border-slate-100 mb-5">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest">Session Date</Text>
          <Text className="text-slate-950 font-bold mt-1">
            {format(new Date(sessionDate), "EEEE, MMMM d, yyyy")}
          </Text>
        </View>

        {/* Course picker */}
        <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Select Subject</Text>
        <View className="gap-2 mb-6">
          {teacherCourses.length === 0 ? (
            <View className="bg-white rounded-2xl p-5 items-center border border-dashed border-slate-200">
              <Text className="text-slate-400 text-sm">No subjects assigned</Text>
            </View>
          ) : (
            teacherCourses.map((course: any) => (
              <TouchableOpacity
                key={course._id}
                onPress={() => {
                  setSelectedCourse(course._id);
                  setAttendance({});
                }}
                className={`rounded-2xl px-4 py-3.5 border flex-row items-center justify-between ${
                  selectedCourse === course._id
                    ? "bg-sky-600 border-sky-600"
                    : "bg-white border-slate-100"
                }`}
              >
                <Text className={`font-bold ${selectedCourse === course._id ? "text-white" : "text-slate-950"}`}>
                  {course.courseName}
                </Text>
                <Text className={`text-xs ${selectedCourse === course._id ? "text-white/70" : "text-slate-400"}`}>
                  {course.courseCode}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* Students */}
        {selectedCourse && (
          <>
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Students ({enrolledStudents.length})
            </Text>
            <View className="gap-3 mb-5">
              {enrolledStudents.map((student: any) => {
                const status = attendance[student.userId] ?? "absent";
                return (
                  <View key={student.userId} className="bg-white rounded-3xl p-4 border border-slate-100">
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center gap-3">
                        <View className="w-9 h-9 rounded-full bg-slate-100 items-center justify-center">
                          <Text className="text-slate-500 font-bold text-sm">
                            {(student.firstName?.[0] ?? "?").toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-slate-950 font-semibold text-sm">
                            {student.firstName} {student.lastName}
                          </Text>
                          <Text className="text-slate-400 text-xs">{student.studentNumber ?? ""}</Text>
                        </View>
                      </View>
                    </View>
                    <View className="flex-row gap-2">
                      {(["present", "absent", "late", "excused"] as const).map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => toggleStatus(student.userId, s)}
                          className={`flex-1 py-2 rounded-xl items-center ${
                            status === s ? statusColors[s].bg : "bg-slate-100"
                          }`}
                        >
                          <Text className={`text-[10px] font-bold capitalize ${status === s ? "text-white" : "text-slate-400"}`}>
                            {s === "excused" ? "Exc." : s.charAt(0).toUpperCase() + s.slice(1, 3)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="bg-sky-600 rounded-3xl py-4 items-center"
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Save Attendance</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}
