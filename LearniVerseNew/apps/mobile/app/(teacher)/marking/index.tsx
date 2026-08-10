import { ScrollView, View, Text, TouchableOpacity, TextInput, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

export default function MarkingScreen() {
  const router = useRouter();
  const pendingSubmissions = useQuery(api.submissions.listNeedsGrading) ?? [];

  if (pendingSubmissions === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-5 pb-24">
        {pendingSubmissions.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
            <Ionicons name="checkmark-circle-outline" size={40} color={Colors.success} />
            <Text className="text-slate-950 font-bold text-lg mt-4 text-center">
              All Caught Up!
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-2 leading-6">
              No submissions pending grading.
            </Text>
          </View>
        ) : (
          <View className="gap-3">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
              Pending Grading ({pendingSubmissions.length})
            </Text>
            {pendingSubmissions.map((sub) => (
              <TouchableOpacity
                key={sub._id}
                onPress={() => router.push(`/(teacher)/marking/${sub._id}` as never)}
                className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
              >
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">
                      {sub.course?.courseCode ?? "Assignment"}
                    </Text>
                    <Text className="text-slate-950 font-bold">{sub.assignment?.title}</Text>
                    <Text className="text-slate-500 text-sm mt-0.5">
                      {sub.student?.fullName ?? sub.student?.email}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-1">
                      Submitted {format(sub.submittedAt, "MMM d, p")}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <View className="bg-amber-50 rounded-xl px-2.5 py-1">
                      <Text className="text-amber-700 text-xs font-bold">Grade</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
