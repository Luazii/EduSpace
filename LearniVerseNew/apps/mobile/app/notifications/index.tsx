import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, React.ComponentProps<typeof Ionicons>["name"]> = {
  grade: "trophy-outline",
  enrollment: "school-outline",
  deadline: "time-outline",
  system: "information-circle-outline",
  booking: "calendar-outline",
  announcement: "megaphone-outline",
  meeting: "people-outline",
};

const TYPE_COLORS: Record<string, string> = {
  grade: "bg-emerald-50",
  enrollment: "bg-sky-50",
  deadline: "bg-amber-50",
  system: "bg-slate-50",
  booking: "bg-violet-50",
  announcement: "bg-rose-50",
  meeting: "bg-indigo-50",
};

export default function NotificationsScreen() {
  const notifications = useQuery(api.notifications.listMine, {}) ?? [];
  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-4 pb-24">
        {unreadCount > 0 && (
          <TouchableOpacity
            onPress={() => markAllRead({})}
            className="flex-row items-center justify-end gap-1 mb-4"
          >
            <Ionicons name="checkmark-done-outline" size={16} color={Colors.primary} />
            <Text className="text-sky-600 text-sm font-bold">Mark all read</Text>
          </TouchableOpacity>
        )}

        {notifications.length === 0 ? (
          <View className="bg-white rounded-3xl p-10 items-center border border-dashed border-slate-200 mt-4">
            <Ionicons name="notifications-outline" size={40} color={Colors.onSurfaceSubtle} />
            <Text className="text-slate-950 font-bold text-lg mt-4 text-center">
              All quiet!
            </Text>
            <Text className="text-slate-500 text-sm text-center mt-2">
              You're up to date. No new notifications.
            </Text>
          </View>
        ) : (
          <View className="gap-2">
            {notifications.map((notif) => (
              <TouchableOpacity
                key={notif._id}
                onPress={() => markRead({ notificationId: notif._id })}
                className={`rounded-3xl p-4 border ${
                  notif.isRead ? "bg-white border-slate-100" : "bg-sky-50 border-sky-100"
                }`}
              >
                <View className="flex-row items-start gap-3">
                  <View className={`w-10 h-10 rounded-2xl items-center justify-center ${TYPE_COLORS[notif.type] ?? "bg-slate-50"}`}>
                    <Ionicons
                      name={TYPE_ICONS[notif.type] ?? "ellipse-outline"}
                      size={18}
                      color={Colors.navy}
                    />
                  </View>
                  <View className="flex-1">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-slate-950 font-bold text-sm flex-1 mr-2">
                        {notif.title}
                      </Text>
                      {!notif.isRead && (
                        <View className="w-2 h-2 rounded-full bg-sky-500" />
                      )}
                    </View>
                    <Text className="text-slate-500 text-sm mt-1 leading-5">{notif.body}</Text>
                    <Text className="text-slate-400 text-xs mt-1.5">
                      {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true })}
                    </Text>
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
