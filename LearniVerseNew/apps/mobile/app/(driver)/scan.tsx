import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";

export default function DriverScanScreen() {
  const bookings = useQuery(api.transport.listMyBookings);
  const recordScan = useMutation(api.transport.recordScan);
  
  const [loadingIds, setLoadingIds] = useState<Record<string, boolean>>({});

  if (bookings === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const approvedBookings = bookings.filter(b => b.status === "approved");

  async function handleScan(booking: any, scanType: "board" | "dropoff") {
    const key = `${booking._id}-${scanType}`;
    setLoadingIds(prev => ({ ...prev, [key]: true }));
    try {
      await recordScan({
        bookingId: booking._id,
        routeId: booking.routeId,
        learnerUserId: booking.learnerUserId,
        scanType,
      });
      Alert.alert("Success", `${scanType === "board" ? "Boarding" : "Drop-off"} recorded for ${booking.learner?.fullName ?? "Learner"}.`);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setLoadingIds(prev => ({ ...prev, [key]: false }));
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Scan Boarding</Text>
            <Text className="text-slate-500 text-sm mt-1">Manually board or drop-off passengers</Text>
          </View>

          {approvedBookings.length === 0 ? (
             <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
               <Ionicons name="scan-outline" size={36} color={Colors.onSurfaceSubtle} />
               <Text className="text-slate-500 text-sm mt-3 text-center">No passengers to scan</Text>
             </View>
          ) : (
            <View className="gap-4">
              {approvedBookings.map((booking) => (
                <View key={booking._id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex-row items-center justify-between">
                  <View className="flex-1 pr-4">
                    <Text className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mb-1">
                      {booking.route?.routeCode}
                    </Text>
                    <Text className="text-base font-bold text-slate-900">
                      {booking.learner?.fullName ?? "Learner"}
                    </Text>
                  </View>
                  <View className="flex-row gap-2">
                    <TouchableOpacity 
                      onPress={() => handleScan(booking, "board")}
                      disabled={loadingIds[`${booking._id}-board`]}
                      className="bg-emerald-100 rounded-xl px-4 py-3 items-center justify-center flex-row gap-1"
                    >
                      {loadingIds[`${booking._id}-board`] ? <ActivityIndicator size="small" color={Colors.primary} /> : (
                        <>
                          <Ionicons name="arrow-up" size={16} color="#059669" />
                          <Text className="text-emerald-700 font-bold text-xs">Board</Text>
                        </>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleScan(booking, "dropoff")}
                      disabled={loadingIds[`${booking._id}-dropoff`]}
                      className="bg-rose-100 rounded-xl px-4 py-3 items-center justify-center flex-row gap-1"
                    >
                      {loadingIds[`${booking._id}-dropoff`] ? <ActivityIndicator size="small" color="#e11d48" /> : (
                        <>
                          <Ionicons name="arrow-down" size={16} color="#e11d48" />
                          <Text className="text-rose-700 font-bold text-xs">Drop</Text>
                        </>
                      )}
                    </TouchableOpacity>
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
