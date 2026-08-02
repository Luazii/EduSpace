import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import * as DocumentPicker from "expo-document-picker";
import { useState } from "react";
import { format, isPast } from "date-fns";

export default function AssignmentDetailScreen() {
  const { courseId, assignmentId } = useLocalSearchParams<{
    courseId: string;
    assignmentId: string;
  }>();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);

  const assignment = useQuery(
    api.assignments.getById,
    assignmentId ? { assignmentId: assignmentId as Id<"assignments"> } : "skip"
  );
  const mySubmission = useQuery(
    api.submissions.getMySubmission,
    assignmentId ? { assignmentId: assignmentId as Id<"assignments"> } : "skip"
  );
  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const submit = useMutation(api.submissions.submit);

  async function handleUpload() {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
               "image/*"],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];
      if (!file) return;

      setUploading(true);

      // Get upload URL from Convex storage
      const uploadUrl = await generateUploadUrl({
        assignmentId: assignmentId as Id<"assignments">
      });

      // Upload the file
      const response = await fetch(file.uri);
      const blob = await response.blob();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: blob,
        headers: { "Content-Type": file.mimeType ?? "application/octet-stream" },
      });

      const { storageId } = await uploadResponse.json();

      // Record the submission
      await submit({
        assignmentId: assignmentId as Id<"assignments">,
        storageId,
        fileName: file.name,
        mimeType: file.mimeType ?? undefined,
        size: file.size ?? undefined,
      });

      Alert.alert("Submitted!", "Your assignment has been submitted successfully.");
    } catch (err) {
      Alert.alert("Upload Failed", "Could not submit your assignment. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  if (assignment === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const isOverdue = assignment?.deadline ? isPast(new Date(assignment.deadline)) : false;
  const hasSubmission = !!mySubmission;
  const isGraded = hasSubmission && mySubmission?.mark != null;

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Assignment",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.navy,
        }}
      />
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-5 pb-24">
          {/* Header */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
            <Text className="text-slate-950 text-xl font-black">{assignment?.title}</Text>
            {assignment?.description && (
              <Text className="text-slate-500 text-sm mt-2 leading-6">{assignment.description}</Text>
            )}
            <View className="flex-row gap-3 mt-4">
              {assignment?.maxMark && (
                <View className="bg-sky-50 rounded-xl px-3 py-1.5">
                  <Text className="text-sky-700 text-xs font-bold">Max: {assignment.maxMark} marks</Text>
                </View>
              )}
              {assignment?.deadline && (
                <View className={`rounded-xl px-3 py-1.5 ${isOverdue ? "bg-rose-50" : "bg-amber-50"}`}>
                  <Text className={`text-xs font-bold ${isOverdue ? "text-rose-700" : "text-amber-700"}`}>
                    Due: {format(assignment.deadline, "MMM d, yyyy")}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Submission status */}
          {isGraded ? (
            <View className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100 mb-4">
              <View className="flex-row items-center gap-2 mb-2">
                <Ionicons name="trophy" size={20} color={Colors.success} />
                <Text className="text-emerald-700 font-black text-sm uppercase tracking-widest">Graded</Text>
              </View>
              <Text className="text-emerald-950 text-3xl font-black">
                {mySubmission!.mark}{assignment?.maxMark ? `/${assignment.maxMark}` : ""}
              </Text>
              {mySubmission?.feedback && (
                <View className="mt-3 pt-3 border-t border-emerald-200">
                  <Text className="text-emerald-700 text-xs font-bold uppercase tracking-widest mb-1">Teacher Feedback</Text>
                  <Text className="text-emerald-800 text-sm leading-6">{mySubmission.feedback}</Text>
                </View>
              )}
            </View>
          ) : hasSubmission ? (
            <View className="bg-sky-50 rounded-3xl p-5 border border-sky-100 mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                <Text className="text-sky-700 font-black text-sm uppercase tracking-widest">Submitted</Text>
              </View>
              {mySubmission?.fileName && (
                <Text className="text-sky-600 text-sm mt-2">{mySubmission.fileName}</Text>
              )}
              <Text className="text-sky-500 text-xs mt-1">
                Submitted {format(mySubmission!.submittedAt, "MMM d, yyyy 'at' p")}
              </Text>
              <Text className="text-sky-400 text-xs mt-1">Awaiting grading...</Text>
            </View>
          ) : null}

          {/* Upload button */}
          {!hasSubmission && (
            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading || isOverdue}
              className="bg-sky-600 rounded-3xl p-5 items-center flex-row justify-center gap-3"
              style={{ opacity: uploading || isOverdue ? 0.5 : 1 }}
            >
              {uploading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={22} color="white" />
                  <Text className="text-white font-bold text-base">
                    {isOverdue ? "Submission Closed" : "Upload Submission"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {hasSubmission && !isGraded && (
            <TouchableOpacity
              onPress={handleUpload}
              disabled={uploading}
              className="bg-slate-200 rounded-3xl p-4 items-center flex-row justify-center gap-2 mt-3"
              style={{ opacity: uploading ? 0.5 : 1 }}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.onSurfaceMuted} />
              <Text className="text-slate-600 font-semibold text-sm">Resubmit</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </>
  );
}
