import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import type { Id } from "@/convex/_generated/dataModel";

export default function GradeBookScreen() {
  const user = useQuery(api.users.current);
  const teacherCourses = useQuery(api.courses.listTeachingDashboard) ?? [];

  const [selectedCourse, setSelectedCourse] = useState<Id<"courses"> | null>(null);

  const students = useQuery(
    api.attendance.listEnrolledStudents,
    selectedCourse ? { courseId: selectedCourse } : "skip"
  ) ?? [];

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-5 pb-24">
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
                onPress={() => setSelectedCourse(course._id)}
                className={`rounded-2xl px-4 py-3.5 border flex-row items-center justify-between ${
                  selectedCourse === course._id
                    ? "bg-violet-600 border-violet-600"
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

        {/* Gradebook Table (List View for Mobile) */}
        {selectedCourse && (
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Students & Grades ({students.length})
            </Text>
            {students.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
                <Ionicons name="people-outline" size={32} color={Colors.onSurfaceSubtle} />
                <Text className="text-slate-500 text-sm mt-3 text-center">No students enrolled</Text>
              </View>
            ) : (
              <View className="gap-3">
                {students.map((student: any) => (
                  <View key={student.userId} className="bg-white rounded-3xl p-4 border border-slate-100 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                       <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                          <Text className="text-slate-500 font-bold text-sm">
                            {(student.firstName?.[0] ?? "?").toUpperCase()}
                          </Text>
                        </View>
                        <View>
                          <Text className="text-slate-950 font-semibold text-sm">
                            {student.firstName} {student.lastName}
                          </Text>
                          <Text className="text-slate-400 text-xs">{student.studentNumber ?? "No ID"}</Text>
                        </View>
                    </View>
                    <TouchableOpacity className="bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                      <Text className="text-slate-600 text-xs font-bold">View Marks</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
