import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export default function CoursesScreen() {
  const router = useRouter();
  const activeCourses = useQuery(api.enrollments.listMyActiveCourses);

  if (activeCourses === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-sky-600 mb-1">
            My Learning
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">
            My Subjects
          </Text>
          <Text className="text-slate-500 text-sm mt-1">
            {activeCourses.length} active subject{activeCourses.length !== 1 ? "s" : ""}
          </Text>
        </View>

        {activeCourses.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center border border-slate-100">
            <Ionicons name="book-outline" size={40} color={Colors.onSurfaceSubtle} />
            <Text className="text-slate-950 font-bold text-lg mt-4 text-center">
              No subjects yet
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-2 leading-6">
              Complete your enrollment application to get access to your subjects.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {activeCourses.filter(Boolean).map((course, idx) => {
              const gradients = [
                "bg-sky-600",
                "bg-violet-600",
                "bg-emerald-600",
                "bg-rose-600",
                "bg-amber-600",
                "bg-indigo-600",
              ];
              const accent = gradients[idx % gradients.length];

              return (
                <TouchableOpacity
                  key={course._id}
                  onPress={() => router.push(`/(tabs)/courses/${course._id}`)}
                  className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm"
                >
                  {/* Accent bar */}
                  <View className={`${accent} px-5 py-4`}>
                    <Text className="text-white/70 text-[10px] font-black uppercase tracking-widest">
                      {course.department ?? course.courseCode}
                    </Text>
                    <Text className="text-white text-lg font-bold mt-1 leading-tight">
                      {course.courseName}
                    </Text>
                  </View>

                  {/* Body */}
                  <View className="px-5 py-4">
                    {course.description ? (
                      <Text className="text-slate-500 text-sm leading-6 mb-3" numberOfLines={2}>
                        {course.description}
                      </Text>
                    ) : null}

                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center gap-1.5">
                        <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                        <Text className="text-slate-500 text-xs">Active Enrollment</Text>
                      </View>
                      <View className="flex-row items-center gap-1.5">
                        <Text className="text-sky-700 text-xs font-bold">Open Classroom</Text>
                        <Ionicons name="arrow-forward" size={14} color={Colors.primary} />
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
