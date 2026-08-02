import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-expo";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const user = useQuery(api.users.current);
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    Alert.alert("Sign Out?", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          await signOut();
        },
      },
    ]);
  }

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const roleColor: Record<string, string> = {
    student: "bg-sky-50 text-sky-700",
    teacher: "bg-violet-50 text-violet-700",
    admin: "bg-rose-50 text-rose-700",
    parent: "bg-emerald-50 text-emerald-700",
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        {/* Avatar */}
        <View className="items-center mb-8">
          <View className="w-24 h-24 rounded-full bg-slate-950 items-center justify-center mb-4">
            <Text className="text-white text-3xl font-black">
              {(user?.firstName?.[0] ?? user?.email?.[0] ?? "?").toUpperCase()}
            </Text>
          </View>
          <Text className="text-slate-950 text-2xl font-black">
            {user?.firstName} {user?.lastName}
          </Text>
          <Text className="text-slate-500 text-sm mt-1">{user?.email}</Text>
          <View className={`mt-3 rounded-2xl px-4 py-1.5 ${roleColor[user?.role ?? "student"]?.split(" ")[0] ?? "bg-slate-100"}`}>
            <Text className={`text-xs font-black uppercase tracking-widest ${roleColor[user?.role ?? "student"]?.split(" ")[1] ?? "text-slate-500"}`}>
              {user?.role}
            </Text>
          </View>
        </View>

        {/* Info card */}
        <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-4">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Account Details</Text>
          {[
            { label: "First Name", value: user?.firstName },
            { label: "Last Name", value: user?.lastName },
            { label: "Email", value: user?.email },
            { label: "Phone", value: user?.phone ?? "—" },
            { label: "Status", value: user?.isActive ? "Active" : "Inactive" },
          ].map(({ label, value }) => (
            <View key={label} className="flex-row items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
              <Text className="text-slate-400 text-sm">{label}</Text>
              <Text className="text-slate-950 font-semibold text-sm">{value ?? "—"}</Text>
            </View>
          ))}
        </View>

        {/* Quick links */}
        <View className="bg-white rounded-3xl p-5 border border-slate-100 mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Quick Actions</Text>
          {[
            { label: "Notifications", icon: "notifications-outline" as const, action: () => {} },
            { label: "Announcements", icon: "megaphone-outline" as const, action: () => {} },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={item.action}
              className="flex-row items-center gap-3 py-3 border-b border-slate-50 last:border-0"
            >
              <Ionicons name={item.icon} size={18} color={Colors.onSurfaceMuted} />
              <Text className="text-slate-700 text-sm flex-1">{item.label}</Text>
              <Ionicons name="chevron-forward" size={14} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign out */}
        <TouchableOpacity
          onPress={handleSignOut}
          disabled={signingOut}
          className="bg-rose-50 rounded-3xl py-4 items-center border border-rose-100"
          style={{ opacity: signingOut ? 0.6 : 1 }}
        >
          {signingOut ? (
            <ActivityIndicator color={Colors.danger} />
          ) : (
            <View className="flex-row items-center gap-2">
              <Ionicons name="log-out-outline" size={18} color={Colors.danger} />
              <Text className="text-rose-600 font-bold">Sign Out</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
