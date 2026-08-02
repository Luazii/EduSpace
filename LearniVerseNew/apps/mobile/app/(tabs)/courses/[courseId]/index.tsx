import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useState } from "react";
import { format } from "date-fns";

type Tab = "overview" | "assignments" | "quizzes" | "resources";

export default function CourseDetailScreen() {
  const { courseId } = useLocalSearchParams<{ courseId: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  const course = useQuery(
    api.courses.getById,
    courseId ? { courseId: courseId as Id<"courses"> } : "skip"
  );
  const assignments = useQuery(
    api.assignments.listByCourse,
    courseId ? { courseId: courseId as Id<"courses"> } : "skip"
  ) ?? [];
  const quizzes = useQuery(
    api.quizzes.listByCourse,
    courseId ? { courseId: courseId as Id<"courses"> } : "skip"
  ) ?? [];
  const resources = useQuery(
    api.resources.listByCourse,
    courseId ? { courseId: courseId as Id<"courses"> } : "skip"
  ) ?? [];

  if (course === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }
  if (!course) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 px-6">
        <Text className="text-slate-950 text-lg font-bold text-center">Course not found</Text>
      </View>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>["name"] }[] = [
    { key: "overview", label: "Overview", icon: "home-outline" },
    { key: "assignments", label: "Tasks", icon: "clipboard-outline" },
    { key: "quizzes", label: "Quizzes", icon: "help-circle-outline" },
    { key: "resources", label: "Files", icon: "folder-outline" },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: course.courseCode,
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.navy,
        }}
      />
      <View className="flex-1 bg-slate-50">
        {/* Course header */}
        <View className="bg-sky-600 px-5 py-6">
          <Text className="text-white/70 text-[10px] font-black uppercase tracking-widest">
            {course.department}
          </Text>
          <Text className="text-white text-xl font-black mt-1">{course.courseName}</Text>
        </View>

        {/* Tabs */}
        <View className="bg-white border-b border-slate-100 flex-row">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 items-center py-3 border-b-2 ${
                activeTab === tab.key
                  ? "border-sky-600"
                  : "border-transparent"
              }`}
            >
              <Ionicons
                name={tab.icon}
                size={16}
                color={activeTab === tab.key ? Colors.primary : Colors.onSurfaceSubtle}
              />
              <Text
                className={`text-[10px] font-bold mt-1 ${
                  activeTab === tab.key ? "text-sky-600" : "text-slate-400"
                }`}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="px-5 py-5 pb-24">
            {activeTab === "overview" && (
              <View className="gap-4">
                {course.description && (
                  <View className="bg-white rounded-3xl p-5 border border-slate-100">
                    <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</Text>
                    <Text className="text-slate-600 text-sm leading-6">{course.description}</Text>
                  </View>
                )}
                <View className="bg-white rounded-3xl p-5 border border-slate-100">
                  <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Quick Stats</Text>
                  <View className="flex-row gap-3">
                    <View className="flex-1 bg-slate-50 rounded-2xl p-3 items-center">
                      <Text className="text-sky-600 text-xl font-black">{assignments.length}</Text>
                      <Text className="text-slate-500 text-xs mt-1">Assignments</Text>
                    </View>
                    <View className="flex-1 bg-slate-50 rounded-2xl p-3 items-center">
                      <Text className="text-violet-600 text-xl font-black">{quizzes.length}</Text>
                      <Text className="text-slate-500 text-xs mt-1">Quizzes</Text>
                    </View>
                    <View className="flex-1 bg-slate-50 rounded-2xl p-3 items-center">
                      <Text className="text-emerald-600 text-xl font-black">{resources.length}</Text>
                      <Text className="text-slate-500 text-xs mt-1">Resources</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {activeTab === "assignments" && (
              <View className="gap-3">
                {assignments.length === 0 ? (
                  <View className="bg-white rounded-3xl p-8 items-center border border-slate-100">
                    <Ionicons name="clipboard-outline" size={32} color={Colors.onSurfaceSubtle} />
                    <Text className="text-slate-500 text-sm mt-3 text-center">No assignments yet</Text>
                  </View>
                ) : (
                  assignments.filter((a) => a.isPublished).map((assignment) => (
                    <TouchableOpacity
                      key={assignment._id}
                      onPress={() => router.push(`/(tabs)/courses/${courseId}/assignments/${assignment._id}`)}
                      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          <Text className="text-slate-950 font-bold text-sm">{assignment.title}</Text>
                          {assignment.description && (
                            <Text className="text-slate-500 text-xs mt-1" numberOfLines={2}>
                              {assignment.description}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
                      </View>
                      {assignment.deadline && (
                        <View className="flex-row items-center gap-1.5 mt-3">
                          <Ionicons name="time-outline" size={12} color={Colors.warning} />
                          <Text className="text-amber-600 text-xs font-bold">
                            Due {format(assignment.deadline, "MMM d, yyyy")}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {activeTab === "quizzes" && (
              <View className="gap-3">
                {quizzes.length === 0 ? (
                  <View className="bg-white rounded-3xl p-8 items-center border border-slate-100">
                    <Ionicons name="help-circle-outline" size={32} color={Colors.onSurfaceSubtle} />
                    <Text className="text-slate-500 text-sm mt-3 text-center">No quizzes available</Text>
                  </View>
                ) : (
                  quizzes.filter((q) => q.status === "published").map((quiz) => (
                    <TouchableOpacity
                      key={quiz._id}
                      onPress={() => router.push(`/(tabs)/courses/${courseId}/quizzes/${quiz._id}`)}
                      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                    >
                      <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                          <Text className="text-slate-950 font-bold text-sm">{quiz.title}</Text>
                          {quiz.description && (
                            <Text className="text-slate-500 text-xs mt-1" numberOfLines={1}>
                              {quiz.description}
                            </Text>
                          )}
                        </View>
                        <View className="bg-violet-50 rounded-xl px-2 py-1">
                          <Text className="text-violet-700 text-xs font-bold">
                            {quiz.durationMinutes}min
                          </Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-3 mt-3">
                        <Text className="text-slate-400 text-xs">
                          Max {quiz.maxAttempts} attempt{quiz.maxAttempts !== 1 ? "s" : ""}
                        </Text>
                        {quiz.startsAt && (
                          <Text className="text-slate-400 text-xs">
                            Opens {format(quiz.startsAt, "MMM d")}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </View>
            )}

            {activeTab === "resources" && (
              <View className="gap-3">
                {resources.length === 0 ? (
                  <View className="bg-white rounded-3xl p-8 items-center border border-slate-100">
                    <Ionicons name="folder-open-outline" size={32} color={Colors.onSurfaceSubtle} />
                    <Text className="text-slate-500 text-sm mt-3 text-center">No resources uploaded yet</Text>
                  </View>
                ) : (
                  resources.map((resource) => (
                    <View key={resource._id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                      <View className="flex-row items-center gap-3">
                        <View className="w-10 h-10 rounded-2xl bg-sky-50 items-center justify-center">
                          <Ionicons name="document-outline" size={20} color={Colors.primary} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-slate-950 font-semibold text-sm">{resource.title}</Text>
                          {resource.fileName && (
                            <Text className="text-slate-400 text-xs mt-0.5">{resource.fileName}</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}
