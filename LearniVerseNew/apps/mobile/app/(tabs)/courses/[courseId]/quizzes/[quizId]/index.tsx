import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

export default function QuizDetailScreen() {
  const { courseId, quizId } = useLocalSearchParams<{ courseId: string; quizId: string }>();
  const router = useRouter();

  const quiz = useQuery(
    api.quizzes.getById,
    quizId ? { quizId: quizId as Id<"quizzes"> } : "skip"
  );
  const myAttempts = useQuery(
    api.quizAttempts.listMine,
    quizId ? { quizId: quizId as Id<"quizzes"> } : "skip"
  ) ?? [];

  if (quiz === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const remainingAttempts = quiz ? quiz.maxAttempts - myAttempts.length : 0;
  const bestAttempt = myAttempts.length > 0
    ? myAttempts.reduce((best, a) => a.score > best.score ? a : best)
    : null;

  const canStart = remainingAttempts > 0 && quiz?.status === "published";

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Quiz",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.navy,
        }}
      />
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-5 pb-24">
          {/* Quiz info */}
          <View className="bg-violet-600 rounded-3xl p-6 mb-5">
            <Text className="text-white/70 text-[10px] font-black uppercase tracking-widest mb-2">Quiz</Text>
            <Text className="text-white text-2xl font-black">{quiz?.title}</Text>
            {quiz?.description && (
              <Text className="text-white/70 text-sm mt-2">{quiz.description}</Text>
            )}
            <View className="flex-row gap-3 mt-4">
              <View className="bg-white/20 rounded-2xl px-3 py-2 items-center">
                <Text className="text-white text-lg font-black">{quiz?.durationMinutes ?? "∞"}</Text>
                <Text className="text-white/60 text-[10px]">minutes</Text>
              </View>
              <View className="bg-white/20 rounded-2xl px-3 py-2 items-center">
                <Text className="text-white text-lg font-black">{remainingAttempts}</Text>
                <Text className="text-white/60 text-[10px]">attempts left</Text>
              </View>
              {myAttempts.length > 0 && bestAttempt && (
                <View className="bg-white/20 rounded-2xl px-3 py-2 items-center">
                  <Text className="text-white text-lg font-black">
                    {Math.round((bestAttempt.score / bestAttempt.maxScore) * 100)}%
                  </Text>
                  <Text className="text-white/60 text-[10px]">best score</Text>
                </View>
              )}
            </View>
          </View>

          {/* Best attempt */}
          {bestAttempt && (
            <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Best Attempt</Text>
              <View className="flex-row items-center gap-4">
                <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center">
                  <Text className="text-emerald-600 font-black text-lg">
                    {Math.round((bestAttempt.score / bestAttempt.maxScore) * 100)}%
                  </Text>
                </View>
                <View>
                  <Text className="text-slate-950 font-bold">
                    {bestAttempt.score}/{bestAttempt.maxScore} marks
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5">
                    {format(bestAttempt.submittedAt, "MMM d, yyyy 'at' p")}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Past attempts */}
          {myAttempts.length > 1 && (
            <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                All Attempts ({myAttempts.length})
              </Text>
              {myAttempts.map((attempt, i) => (
                <View key={attempt._id} className="flex-row items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <Text className="text-slate-500 text-sm">Attempt {i + 1}</Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="text-slate-950 font-bold text-sm">
                      {attempt.score}/{attempt.maxScore}
                    </Text>
                    <Text className="text-slate-400 text-xs">
                      ({Math.round((attempt.score / attempt.maxScore) * 100)}%)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Start button */}
          {canStart ? (
            <TouchableOpacity
              onPress={() =>
                router.push(`/(tabs)/courses/${courseId}/quizzes/${quizId}/take`)
              }
              className="bg-violet-600 rounded-3xl p-5 items-center flex-row justify-center gap-3"
            >
              <Ionicons name="play-circle-outline" size={24} color="white" />
              <Text className="text-white font-bold text-base">
                {myAttempts.length > 0 ? "Start New Attempt" : "Start Quiz"}
              </Text>
            </TouchableOpacity>
          ) : (
            <View className="bg-slate-100 rounded-3xl p-5 items-center">
              <Ionicons name="lock-closed-outline" size={24} color={Colors.onSurfaceMuted} />
              <Text className="text-slate-500 font-semibold mt-2">
                {remainingAttempts === 0 ? "No attempts remaining" : "Quiz not available"}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
