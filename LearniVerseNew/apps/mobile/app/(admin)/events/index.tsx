import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
// @ts-expect-error
import { format } from "date-fns";

export default function AdminEventsIndexScreen() {
  const router = useRouter();
  const events = useQuery(api.events.listEvents, { includeInactive: true });

  if (events === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="flex-row items-center justify-between mb-8">
            <View>
              <Text className="text-2xl font-black text-slate-950 tracking-tight">Events Management</Text>
              <Text className="text-slate-500 text-sm mt-1">Manage events and scan tickets</Text>
            </View>
            <TouchableOpacity 
              onPress={() => router.push("/(admin)/events/create")}
              className="bg-slate-900 w-12 h-12 rounded-2xl items-center justify-center"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => router.push("/(admin)/events/scanner")}
            className="bg-emerald-600 rounded-3xl p-5 flex-row items-center gap-4 mb-8 shadow-sm"
          >
            <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
              <Ionicons name="qr-code-outline" size={24} color="white" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">Ticket Scanner</Text>
              <Text className="text-white/70 text-xs mt-0.5">Scan QR codes at the door</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="white" />
          </TouchableOpacity>

          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">All Events</Text>
          
          <View className="gap-4">
            {events.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
                <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
                <Text className="text-slate-500 text-center mt-4">No events created yet.</Text>
                <TouchableOpacity
                  onPress={() => router.push("/(admin)/events/create")}
                  className="mt-4 bg-slate-100 px-4 py-2 rounded-xl"
                >
                  <Text className="text-slate-900 font-bold text-xs">Create Event</Text>
                </TouchableOpacity>
              </View>
            ) : (
              events.map((event) => (
                <View key={event._id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1 pr-4">
                      <View className="flex-row items-center gap-2 mb-1">
                        <View className={`px-2 py-0.5 rounded-full ${event.isActive ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                          <Text className={`text-[10px] font-black uppercase tracking-widest ${event.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                            {event.isActive ? 'Active' : 'Draft'}
                          </Text>
                        </View>
                        <Text className="text-slate-400 text-xs">{format(event.eventDate, "MMM d, yyyy")}</Text>
                      </View>
                      <Text className="text-slate-900 font-bold text-lg">{event.title}</Text>
                    </View>
                  </View>
                  
                  <View className="flex-row gap-4 mt-2">
                    <View className="bg-slate-50 rounded-xl p-3 flex-1 items-center">
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Capacity</Text>
                      <Text className="text-slate-900 font-bold text-sm">{event.capacity ?? "Unlimited"}</Text>
                    </View>
                    <View className="bg-slate-50 rounded-xl p-3 flex-1 items-center">
                      <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Location</Text>
                      <Text className="text-slate-900 font-bold text-sm" numberOfLines={1}>{event.location}</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
