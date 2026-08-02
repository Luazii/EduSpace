import { ScrollView, View, Text, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

export default function AnnouncementsScreen() {
  const user = useQuery(api.users.current);
  const announcements = useQuery(
    api.parentServices.listAnnouncements,
    user ? { role: user.role } : "skip"
  ) ?? [];

  if (announcements === undefined) {
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
          <Text className="text-xs font-black uppercase tracking-widest text-rose-600 mb-1">
            School
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">Announcements</Text>
        </View>

        {announcements.length === 0 ? (
          <View className="bg-white rounded-3xl p-10 items-center border border-dashed border-slate-200">
            <Ionicons name="megaphone-outline" size={40} color={Colors.onSurfaceSubtle} />
            <Text className="text-slate-950 font-bold text-lg mt-4 text-center">
              Nothing new
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-2">
              No announcements have been posted yet.
            </Text>
          </View>
        ) : (
          <View className="gap-4">
            {announcements.map((ann) => (
              <View
                key={ann._id}
                className={`bg-white rounded-3xl p-5 border shadow-sm ${
                  ann.importance === "high" ? "border-rose-200" : "border-slate-100"
                }`}
              >
                <View className="flex-row items-start gap-3">
                  <View className={`w-3 h-3 rounded-full mt-1.5 shrink-0 ${
                    ann.importance === "high" ? "bg-rose-500" : "bg-sky-500"
                  }`} />
                  <View className="flex-1">
                    <View className="flex-row items-start justify-between gap-2">
                      <Text className="text-slate-950 font-bold text-base flex-1">{ann.title}</Text>
                      {ann.importance === "high" && (
                        <View className="bg-rose-50 rounded-xl px-2 py-0.5 shrink-0">
                          <Text className="text-rose-600 text-[10px] font-black uppercase tracking-widest">
                            Important
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-slate-500 text-sm mt-2 leading-6">{ann.body}</Text>
                    <View className="flex-row items-center gap-2 mt-3 pt-3 border-t border-slate-50">
                      <Text className="text-slate-400 text-xs">
                        {ann.senderName ? `${ann.senderName} · ` : ""}
                        {format(ann.createdAt, "MMM d, yyyy")}
                      </Text>
                      {ann.targetGradeName && (
                        <View className="bg-slate-50 rounded-xl px-2 py-0.5">
                          <Text className="text-slate-500 text-[10px] font-bold">
                            {ann.targetGradeName}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
