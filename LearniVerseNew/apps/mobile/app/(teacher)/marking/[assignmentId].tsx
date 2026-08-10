import { ScrollView, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

export default function GradeSubmissionScreen() {
  const { assignmentId } = useLocalSearchParams<{ assignmentId: string }>();
  const router = useRouter();

  const pendingSubmissions = useQuery(api.submissions.listNeedsGrading) ?? [];
  const submission = pendingSubmissions.find((s) => s._id === assignmentId);
  const gradeSubmission = useMutation(api.submissions.grade);
  const releaseGrade = useMutation(api.submissions.releaseGrade);

  const [mark, setMark] = useState(submission?.mark?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission?.feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [releasing, setReleasing] = useState(false);

  if (submission === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  async function handleGrade() {
    const markNum = Number(mark);
    if (!mark.trim() || isNaN(markNum)) {
      Alert.alert("Invalid", "Please enter a valid mark.");
      return;
    }
    setSaving(true);
    try {
      await gradeSubmission({
        submissionId: assignmentId as Id<"submissions">,
        mark: markNum,
        feedback: feedback.trim() || undefined,
      });
      Alert.alert("Graded!", "The submission has been graded.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Could not save grade.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRelease() {
    setReleasing(true);
    try {
      await releaseGrade({ submissionId: assignmentId as Id<"submissions"> });
      Alert.alert("Released!", "Grade is now visible to the student.");
    } catch {
      Alert.alert("Error", "Could not release grade.");
    } finally {
      setReleasing(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Grade Submission", headerBackTitle: "Marking" }} />
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-5 pb-24">
          {/* Submission info */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
            <Text className="text-xs font-black uppercase tracking-widest text-violet-600 mb-2">
              Submission
            </Text>
            <Text className="text-slate-950 font-bold text-lg">{submission?.assignment?.title}</Text>
            <Text className="text-slate-500 text-sm mt-1">{submission?.student?.fullName ?? submission?.student?.email}</Text>
            <Text className="text-slate-400 text-xs mt-1">
              Submitted {submission ? format(submission.submittedAt, "MMM d, yyyy 'at' p") : "—"}
            </Text>
            {submission?.assignment?.maxMark && (
              <View className="mt-3 bg-slate-50 rounded-2xl px-3 py-2 self-start">
                <Text className="text-slate-600 text-sm font-bold">Max: {submission.assignment.maxMark} marks</Text>
              </View>
            )}
          </View>

          {/* File info */}
          {submission?.fileName && (
            <View className="bg-sky-50 rounded-3xl p-4 border border-sky-100 mb-4 flex-row items-center gap-3">
              <Ionicons name="document-outline" size={20} color={Colors.primary} />
              <View className="flex-1">
                <Text className="text-sky-700 font-semibold text-sm">{submission.fileName}</Text>
                <Text className="text-sky-400 text-xs mt-0.5">Submitted file</Text>
              </View>
            </View>
          )}

          {/* Mark input */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Grade</Text>
            <TextInput
              className="bg-slate-50 rounded-2xl px-4 py-4 text-slate-950 text-2xl font-black border border-slate-100 text-center"
              placeholder={submission?.assignment?.maxMark ? `0–${submission.assignment.maxMark}` : "Mark"}
              placeholderTextColor={Colors.onSurfaceSubtle}
              keyboardType="numeric"
              value={mark}
              onChangeText={setMark}
            />
          </View>

          {/* Feedback */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-5">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Feedback (optional)
            </Text>
            <TextInput
              className="bg-slate-50 rounded-2xl px-4 py-3 text-slate-950 text-sm border border-slate-100"
              placeholder="Write feedback for the student..."
              placeholderTextColor={Colors.onSurfaceSubtle}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={feedback}
              onChangeText={setFeedback}
              style={{ minHeight: 100 }}
            />
          </View>

          <View className="gap-3">
            <TouchableOpacity
              onPress={handleGrade}
              disabled={saving}
              className="bg-violet-600 rounded-3xl py-4 items-center"
              style={{ opacity: saving ? 0.6 : 1 }}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Save Grade</Text>
              )}
            </TouchableOpacity>

            {submission?.mark != null && !submission.isReleased && (
              <TouchableOpacity
                onPress={handleRelease}
                disabled={releasing}
                className="bg-emerald-600 rounded-3xl py-4 items-center"
                style={{ opacity: releasing ? 0.6 : 1 }}
              >
                {releasing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Release to Student</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </>
  );
}
