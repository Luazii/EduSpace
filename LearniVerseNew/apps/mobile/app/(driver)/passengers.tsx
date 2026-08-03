import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";

export default function DriverPassengersScreen() {
  const bookings = useQuery(api.transport.listMyBookings);

  if (bookings === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const approvedBookings = bookings.filter(b => b.status === "approved");

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Passenger Manifest</Text>
            <Text className="text-slate-500 text-sm mt-1">{approvedBookings.length} approved passengers</Text>
          </View>

          {approvedBookings.length === 0 ? (
             <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
               <Ionicons name="people-outline" size={36} color={Colors.onSurfaceSubtle} />
               <Text className="text-slate-500 text-sm mt-3 text-center">No passengers scheduled</Text>
             </View>
          ) : (
            <View className="gap-3">
              {approvedBookings.map((booking) => (
                <View key={booking._id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
                  <View className="flex-row items-start justify-between mb-2">
                    <View className="flex-1">
                      <Text className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">
                        {booking.route?.routeCode}
                      </Text>
                      <Text className="text-base font-bold text-slate-900">
                        {booking.learner?.fullName ?? "Learner"}
                      </Text>
                    </View>
                    <Ionicons name="person-circle-outline" size={32} color={Colors.onSurfaceSubtle} />
                  </View>

                  <View className="bg-slate-50 rounded-xl p-3 flex-row gap-4 mt-2">
                    <View className="flex-1 border-r border-slate-200">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pick-up</Text>
                      <Text className="text-sm font-semibold text-slate-700">{booking.pickupStop?.label ?? "Any"}</Text>
                    </View>
                    <View className="flex-1 pl-2">
                      <Text className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Drop-off</Text>
                      <Text className="text-sm font-semibold text-slate-700">{booking.dropoffStop?.label ?? "Any"}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
