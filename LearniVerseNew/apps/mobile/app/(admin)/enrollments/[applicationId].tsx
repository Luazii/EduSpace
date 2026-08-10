import { ScrollView, View, Text, TouchableOpacity, Alert, TextInput, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

export default function ApplicationDetailScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const application = useQuery(
    api.enrollments.getById,
    applicationId ? { applicationId: applicationId as Id<"enrollmentApplications"> } : "skip"
  );

  const approve = useMutation(api.enrollments.approveApplication);
  const reject = useMutation(api.enrollments.rejectApplication);

  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleApprove() {
    setProcessing(true);
    try {
      await approve({ applicationId: applicationId as Id<"enrollmentApplications"> });
      Alert.alert("Approved! 🎉", "Student enrollment confirmed.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Error", "Could not approve application.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    Alert.alert("Reject Application?", "This action will notify the student.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          setProcessing(true);
          try {
            await reject({ applicationId: applicationId as Id<"enrollmentApplications">, notes: notes || undefined });
            Alert.alert("Rejected", "Application rejected.", [
              { text: "OK", onPress: () => router.back() },
            ]);
          } catch {
            Alert.alert("Error", "Could not reject application.");
          } finally {
            setProcessing(false);
          }
        },
      },
    ]);
  }

  if (application === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  const canReview = application && ["submitted", "pre_approved"].includes(application.status);

  return (
    <>
      <Stack.Screen options={{ title: "Application Review", headerBackTitle: "Admissions" }} />
      <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
        <View className="px-5 py-5 pb-24">
          {/* Student info */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Student</Text>
            <Text className="text-slate-950 text-xl font-black">
              {application?.studentFirstName} {application?.studentLastName}
            </Text>
            <Text className="text-slate-500 text-sm mt-1">{application?.studentEmail}</Text>
            <View className="flex-row gap-3 mt-3">
              {application?.gradeLabel && (
                <View className="bg-slate-50 rounded-xl px-3 py-1.5">
                  <Text className="text-slate-600 text-xs font-bold">{application.gradeLabel}</Text>
                </View>
              )}
              <View className="bg-slate-50 rounded-xl px-3 py-1.5">
                <Text className="text-slate-600 text-xs font-bold capitalize">{application?.status}</Text>
              </View>
            </View>
            <Text className="text-slate-300 text-xs mt-3">
              Applied {application ? format(application.createdAt, "MMM d, yyyy 'at' p") : ""}
            </Text>
          </View>

          {/* Selected courses */}
          {application?.courses && application.courses.length > 0 && (
            <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                Selected Subjects ({application.courses.length})
              </Text>
              {application.courses.map((c: any) => (
                <View key={c._id} className="flex-row items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                  <Ionicons name="book-outline" size={14} color={Colors.primary} />
                  <Text className="text-slate-700 text-sm flex-1">{c.courseName}</Text>
                  <Text className="text-slate-400 text-xs">{c.courseCode}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Documents */}
          <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Documents
            </Text>
            {[
              { label: "Birth Certificate", id: application?.birthCertStorageId },
              { label: "Parent ID", id: application?.parentIdStorageId },
              { label: "Proof of Residence", id: application?.proofOfResidenceStorageId },
              { label: "School Report", id: application?.schoolReportStorageId },
            ].map(({ label, id }) => (
              <View key={label} className="flex-row items-center gap-2 py-2 border-b border-slate-50 last:border-0">
                <Ionicons
                  name={id ? "checkmark-circle" : "close-circle"}
                  size={16}
                  color={id ? Colors.success : Colors.danger}
                />
                <Text className="text-slate-600 text-sm flex-1">{label}</Text>
                <Text className={`text-xs font-bold ${id ? "text-emerald-600" : "text-rose-500"}`}>
                  {id ? "Uploaded" : "Missing"}
                </Text>
              </View>
            ))}
          </View>

          {/* Admin notes */}
          {canReview && (
            <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-5">
              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                Admin Notes (optional)
              </Text>
              <TextInput
                className="bg-slate-50 rounded-2xl px-4 py-3 text-slate-950 text-sm border border-slate-100"
                placeholder="Add notes for the student..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={notes}
                onChangeText={setNotes}
                style={{ minHeight: 80 }}
              />
            </View>
          )}

          {/* Action buttons */}
          {canReview && (
            <View className="gap-3">

              <TouchableOpacity
                onPress={handleApprove}
                disabled={processing}
                className="bg-emerald-600 rounded-3xl py-4 items-center"
                style={{ opacity: processing ? 0.6 : 1 }}
              >
                {processing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold text-base">Approve Enrollment</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={processing}
                className="bg-rose-50 rounded-3xl py-4 items-center border border-rose-200"
                style={{ opacity: processing ? 0.6 : 1 }}
              >
                <Text className="text-rose-600 font-bold text-base">Reject Application</Text>
              </TouchableOpacity>
            </View>
          )}

          {!canReview && application && (
            <View className="bg-slate-100 rounded-3xl p-5 items-center">
              <Text className="text-slate-500 font-semibold">
                Application is {application.status} — no further actions available.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </>
  );
}
