import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  draft: { label: "Draft", bg: "bg-slate-100", text: "text-slate-500" },
  submitted: { label: "Under Review", bg: "bg-amber-50", text: "text-amber-700" },
  pre_approved: { label: "Pre-Approved", bg: "bg-sky-50", text: "text-sky-700" },
  approved: { label: "Approved", bg: "bg-emerald-50", text: "text-emerald-700" },
  rejected: { label: "Rejected", bg: "bg-rose-50", text: "text-rose-700" },
};

export default function EnrollmentsAdminScreen() {
  const router = useRouter();
  const applications = useQuery(api.enrollments.listAll, {}) ?? [];

  if (applications === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  const pending = applications.filter((a) => a.status === "submitted");
  const preApproved = applications.filter((a) => a.status === "pre_approved");
  const others = applications.filter(
    (a) => !["submitted", "pre_approved"].includes(a.status)
  );

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-5 pb-24">
        {/* Stats row */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-amber-50 rounded-2xl p-3 items-center">
            <Text className="text-amber-700 text-2xl font-black">{pending.length}</Text>
            <Text className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Pending</Text>
          </View>
          <View className="flex-1 bg-sky-50 rounded-2xl p-3 items-center">
            <Text className="text-sky-700 text-2xl font-black">{preApproved.length}</Text>
            <Text className="text-sky-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Pre-Approved</Text>
          </View>
          <View className="flex-1 bg-emerald-50 rounded-2xl p-3 items-center">
            <Text className="text-emerald-700 text-2xl font-black">
              {applications.filter((a) => a.status === "approved").length}
            </Text>
            <Text className="text-emerald-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Approved</Text>
          </View>
        </View>

        {/* Pending applications */}
        {pending.length > 0 && (
          <View className="mb-6">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Awaiting Review ({pending.length})
            </Text>
            <View className="gap-3">
              {pending.map((app) => (
                <TouchableOpacity
                  key={app._id}
                  onPress={() => router.push(`/(admin)/enrollments/${app._id}` as never)}
                  className="bg-white rounded-3xl p-5 border border-amber-100 shadow-sm"
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-slate-950 font-bold">
                        {app.studentFirstName} {app.studentLastName}
                      </Text>
                      <Text className="text-slate-400 text-xs mt-0.5">{app.studentEmail}</Text>
                      <Text className="text-slate-400 text-xs mt-1">
                        {app.gradeLabel ?? "Grade unknown"}
                        {app.qualificationName ? ` · ${app.qualificationName}` : ""}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <View className="bg-amber-50 rounded-xl px-2.5 py-1">
                        <Text className="text-amber-700 text-xs font-bold">Review</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
                    </View>
                  </View>
                  <Text className="text-slate-300 text-xs mt-3">
                    {format(app.createdAt, "MMM d, yyyy")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* All applications */}
        {applications.length > 0 && (
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              All Applications ({applications.length})
            </Text>
            <View className="gap-2">
              {applications.map((app) => {
                const config = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.draft;
                return (
                  <TouchableOpacity
                    key={app._id}
                    onPress={() => router.push(`/(admin)/enrollments/${app._id}` as never)}
                    className="bg-white rounded-2xl px-4 py-3 border border-slate-100 flex-row items-center"
                  >
                    <View className="flex-1">
                      <Text className="text-slate-950 font-semibold text-sm">
                        {app.studentFirstName} {app.studentLastName}
                      </Text>
                      <Text className="text-slate-400 text-xs">{app.gradeLabel}</Text>
                    </View>
                    <View className={`rounded-xl px-2.5 py-1 ${config.bg}`}>
                      <Text className={`text-xs font-bold ${config.text}`}>{config.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {applications.length === 0 && (
          <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
            <Ionicons name="document-outline" size={36} color={Colors.onSurfaceSubtle} />
            <Text className="text-slate-500 text-sm mt-3 text-center">No applications yet</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
