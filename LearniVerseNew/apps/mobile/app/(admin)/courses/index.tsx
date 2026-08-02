import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export default function CoursesAdminScreen() {
  const courses = useQuery(api.courses.listAll) ?? [];

  if (courses === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-5 pb-24">
        {/* Stats */}
        <View className="bg-sky-600 rounded-3xl p-6 mb-6">
          <Text className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-1">Catalog</Text>
          <Text className="text-white text-3xl font-black mb-1">{courses.length}</Text>
          <Text className="text-white/90 text-sm">Active Subjects</Text>
        </View>

        <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          All Subjects
        </Text>

        <View className="gap-3">
          {courses.map((course) => (
            <View key={course._id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
              <View className="flex-row items-start justify-between">
                <View className="flex-1 mr-3">
                  <Text className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">
                    {course.department ?? course.courseCode}
                  </Text>
                  <Text className="text-slate-950 font-bold text-lg leading-tight mb-1">
                    {course.courseName}
                  </Text>
                  {course.description && (
                    <Text className="text-slate-500 text-xs" numberOfLines={2}>
                      {course.description}
                    </Text>
                  )}
                </View>
                <View className="bg-emerald-50 rounded-xl px-2 py-1">
                  <Text className="text-emerald-700 text-[10px] font-bold">Active</Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}
