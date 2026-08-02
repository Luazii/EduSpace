import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-rose-500";
  return (
    <View className="h-2 bg-slate-100 rounded-full overflow-hidden mt-2">
      <View className={`h-2 ${color} rounded-full`} style={{ width: `${pct}%` }} />
    </View>
  );
}

export default function ProgressScreen() {
  const overview = useQuery(api.progress.getOverview);
  const finalMarks = useQuery(api.marks.getMyFinalMarks);

  if (overview === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-sky-600 mb-1">
            Academic
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">My Progress</Text>
          <Text className="text-slate-500 text-sm mt-1">Assessment reporting and marks</Text>
        </View>

        {/* Final marks */}
        {finalMarks && finalMarks.length > 0 && (
          <View className="mb-6">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Final Marks</Text>
            <View className="gap-3">
              {finalMarks.filter((m) => m.status === "published").map((mark) => {
                const finalVal = mark.overrideMark ?? mark.computedFinalMark;
                return (
                  <View key={mark._id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-slate-950 font-bold">{mark.courseName}</Text>
                        <Text className="text-slate-400 text-xs mt-0.5">{mark.courseCode}</Text>
                      </View>
                      {finalVal != null && (
                        <View className={`rounded-2xl px-3 py-1.5 ${
                          finalVal >= 80 ? "bg-emerald-50" :
                          finalVal >= 60 ? "bg-amber-50" : "bg-rose-50"
                        }`}>
                          <Text className={`font-black text-lg ${
                            finalVal >= 80 ? "text-emerald-700" :
                            finalVal >= 60 ? "text-amber-700" : "text-rose-700"
                          }`}>
                            {Math.round(finalVal)}%
                          </Text>
                        </View>
                      )}
                    </View>
                    {finalVal != null && <ProgressBar value={finalVal} max={100} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Per-course overview */}
        {overview.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
            <Ionicons name="bar-chart-outline" size={40} color={Colors.onSurfaceSubtle} />
            <Text className="text-slate-950 font-bold text-lg mt-4 text-center">
              No assessment data yet
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-2 leading-6">
              Complete quizzes and submit assignments to see your progress here.
            </Text>
          </View>
        ) : (
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Course Breakdown
            </Text>
            <View className="gap-4">
              {overview.map((entry) => (
                <View
                  key={entry.courseId}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                >
                  <Text className="text-sky-600 text-[10px] font-black uppercase tracking-widest">
                    {entry.courseCode}
                  </Text>
                  <Text className="text-slate-950 font-bold text-base mt-1">{entry.courseName}</Text>

                  <View className="flex-row gap-3 mt-4">
                    <View className="flex-1 bg-violet-50 rounded-2xl p-3">
                      <Text className="text-violet-700 text-xl font-black">{entry.attemptsCount}</Text>
                      <Text className="text-violet-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        Quiz Attempts
                      </Text>
                      {typeof entry.highestScore === "number" && (
                        <Text className="text-violet-400 text-xs mt-1">
                          Best: {entry.highestScore}%
                        </Text>
                      )}
                    </View>
                    <View className="flex-1 bg-sky-50 rounded-2xl p-3">
                      <Text className="text-sky-700 text-xl font-black">{entry.submittedAssignmentsCount}</Text>
                      <Text className="text-sky-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        Submitted
                      </Text>
                      <Text className="text-sky-400 text-xs mt-1">
                        {entry.gradedAssignmentsCount} graded
                      </Text>
                    </View>
                    <View className="flex-1 bg-amber-50 rounded-2xl p-3">
                      <Text className="text-amber-700 text-xl font-black">{entry.pendingAssignmentsCount}</Text>
                      <Text className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                        Pending
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
