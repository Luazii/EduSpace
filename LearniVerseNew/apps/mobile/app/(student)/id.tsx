import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";

export default function StudentIdCardScreen() {
  const router = useRouter();
  const user = useQuery(api.users.current);

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-5">
        <Text className="text-white">User not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View className="flex-row items-center mb-8 mt-6">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/10 rounded-full items-center justify-center mr-4">
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white/60 text-xs font-black uppercase tracking-widest mb-1">Digital ID</Text>
            <Text className="text-white text-xl font-black">Student Card</Text>
          </View>
        </View>

        <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          <View className="p-8 items-center bg-sky-50 border-b border-sky-100">
            <View className="w-24 h-24 bg-sky-200 rounded-full items-center justify-center mb-4 border-4 border-white shadow-sm">
              <Ionicons name="person" size={40} color="#0284c7" />
            </View>
            <Text className="text-slate-900 font-black text-2xl mb-1 text-center">{user.fullName ?? user.firstName ?? "Student"}</Text>
            <Text className="text-sky-700 font-bold text-sm uppercase tracking-widest">{user.role}</Text>
          </View>

          <View className="p-8 items-center bg-white relative">
            <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6 text-center">
              Scan for Attendance & Transport
            </Text>
            
            <View className="p-4 bg-white rounded-3xl border-4 border-sky-100">
              <QRCode
                value={user._id}
                size={220}
                color="#000"
                backgroundColor="#fff"
              />
            </View>
          </View>
        </View>

        <View className="items-center mt-8">
          <Text className="text-white/40 text-xs text-center px-4 leading-5">
            This QR code is unique to you. Present it to your bus driver when boarding/dropping off, or to your coach for training attendance.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
