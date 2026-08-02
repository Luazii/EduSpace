import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

export default function UsersAdminScreen() {
  const users = useQuery(api.admin.listUsers) ?? [];
  const [filter, setFilter] = useState<"all" | "student" | "teacher" | "admin" | "parent">("all");

  if (users === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.secondary} />
      </View>
    );
  }

  const filteredUsers = filter === "all" ? users : users.filter((u) => u.role === filter);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-5 pb-24">
        {/* Stats */}
        <View className="flex-row gap-3 mb-6">
          <View className="flex-1 bg-sky-50 rounded-2xl p-3 items-center">
            <Text className="text-sky-700 text-2xl font-black">{users.filter((u) => u.role === "student").length}</Text>
            <Text className="text-sky-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Students</Text>
          </View>
          <View className="flex-1 bg-violet-50 rounded-2xl p-3 items-center">
            <Text className="text-violet-700 text-2xl font-black">{users.filter((u) => u.role === "teacher").length}</Text>
            <Text className="text-violet-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Teachers</Text>
          </View>
          <View className="flex-1 bg-amber-50 rounded-2xl p-3 items-center">
            <Text className="text-amber-700 text-2xl font-black">{users.filter((u) => u.role === "parent").length}</Text>
            <Text className="text-amber-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Parents</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5 flex-row">
          {(["all", "student", "teacher", "admin", "parent"] as const).map((role) => (
            <TouchableOpacity
              key={role}
              onPress={() => setFilter(role)}
              className={`rounded-2xl px-4 py-2 mr-2 border ${
                filter === role ? "bg-slate-950 border-slate-950" : "bg-white border-slate-200"
              }`}
            >
              <Text className={`font-bold capitalize text-sm ${filter === role ? "text-white" : "text-slate-600"}`}>
                {role}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* List */}
        <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          Directory ({filteredUsers.length})
        </Text>

        <View className="gap-3">
          {filteredUsers.map((user) => (
            <View key={user._id} className="bg-white rounded-3xl p-4 border border-slate-100 flex-row items-center justify-between">
              <View className="flex-row items-center gap-3 flex-1">
                <View className="w-10 h-10 rounded-full bg-slate-100 items-center justify-center">
                  <Text className="text-slate-500 font-bold text-sm">
                    {(user.firstName?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-slate-950 font-semibold text-sm" numberOfLines={1}>
                    {user.firstName} {user.lastName}
                  </Text>
                  <Text className="text-slate-400 text-xs mt-0.5" numberOfLines={1}>{user.email}</Text>
                </View>
              </View>
              <View className={`rounded-xl px-2.5 py-1 ${
                  user.role === "student" ? "bg-sky-50" :
                  user.role === "teacher" ? "bg-violet-50" :
                  user.role === "admin" ? "bg-rose-50" : "bg-amber-50"
              }`}>
                <Text className={`text-[10px] font-black uppercase tracking-widest ${
                  user.role === "student" ? "text-sky-700" :
                  user.role === "teacher" ? "text-violet-700" :
                  user.role === "admin" ? "text-rose-700" : "text-amber-700"
                }`}>
                  {user.role}
                </Text>
              </View>
            </View>
          ))}
        </View>

      </View>
    </ScrollView>
  );
}
