import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
// @ts-expect-error - date-fns module resolution issue
import { format } from "date-fns";

export default function TransportAdminBookingsScreen() {
  const bookings = useQuery(api.transport.listMyBookings);
  const approveBooking = useMutation(api.transport.approveBooking);
  const rejectBooking = useMutation(api.transport.rejectBooking);

  if (bookings === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const pendingBookings = bookings.filter(b => b.status === "pending");
  const resolvedBookings = bookings.filter(b => b.status !== "pending");

  async function handleApprove(bookingId: any) {
    try {
      await approveBooking({ bookingId });
    } catch (error) {
      Alert.alert("Could not approve", error instanceof Error ? error.message : "Please try again.");
    }
  }

  async function handleReject(bookingId: any) {
    try {
      await rejectBooking({ bookingId, note: "Rejected by admin." });
    } catch (error) {
      Alert.alert("Could not reject", error instanceof Error ? error.message : "Please try again.");
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Booking Requests</Text>
            <Text className="text-slate-500 text-sm mt-1">{pendingBookings.length} pending requests</Text>
          </View>

          {pendingBookings.length > 0 && (
            <View className="mb-8 gap-4">
              <Text className="text-xs font-black uppercase tracking-widest text-indigo-400">Needs Review</Text>
              {pendingBookings.map((booking) => (
                <View key={booking._id} className="bg-white rounded-3xl p-5 border border-indigo-200 shadow-sm">
                  <View className="flex-row justify-between items-start mb-3">
                    <View className="flex-1 pr-4">
                      <Text className="text-indigo-600 text-xs font-black uppercase tracking-widest mb-1">
                        {booking.route?.routeCode ?? "Route"} • {booking.route?.name}
                      </Text>
                      <Text className="text-lg font-bold text-slate-900">{booking.learner?.fullName ?? booking.learner?.email}</Text>
                      <Text className="text-slate-500 text-xs mt-1">Requested {format(new Date(booking.createdAt), "MMM d, h:mm a")}</Text>
                    </View>
                  </View>

                  {(booking.pickupStop || booking.dropoffStop) && (
                    <View className="bg-slate-50 rounded-xl p-3 mb-4">
                      {booking.pickupStop && (
                        <Text className="text-slate-700 text-sm mb-1">
                          <Text className="font-bold text-slate-500">Pick-up:</Text> {booking.pickupStop.label}
                        </Text>
                      )}
                      {booking.dropoffStop && (
                        <Text className="text-slate-700 text-sm">
                          <Text className="font-bold text-slate-500">Drop-off:</Text> {booking.dropoffStop.label}
                        </Text>
                      )}
                    </View>
                  )}

                  <View className="flex-row gap-3 mt-2">
                    <TouchableOpacity 
                      onPress={() => handleReject(booking._id)}
                      className="flex-1 py-3 rounded-xl border border-rose-200 bg-rose-50 items-center"
                    >
                      <Text className="text-rose-600 font-bold">Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => handleApprove(booking._id)}
                      className="flex-1 py-3 rounded-xl border border-emerald-600 bg-emerald-600 items-center"
                    >
                      <Text className="text-white font-bold">Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Past Bookings</Text>
          <View className="gap-3">
            {resolvedBookings.length === 0 ? (
              <View className="bg-white rounded-3xl p-6 items-center border border-slate-200">
                <Text className="text-slate-400">No past bookings.</Text>
              </View>
            ) : (
              resolvedBookings.map((booking) => (
                <View key={booking._id} className="bg-white rounded-2xl p-4 border border-slate-100 flex-row justify-between items-center">
                  <View className="flex-1 pr-4">
                    <Text className="text-slate-900 font-bold">{booking.learner?.fullName ?? "Learner"}</Text>
                    <Text className="text-slate-500 text-xs mt-1">{booking.route?.name}</Text>
                  </View>
                  <View className={`px-2 py-1 rounded-md ${booking.status === 'approved' ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                    <Text className={`text-[10px] font-black uppercase ${booking.status === 'approved' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {booking.status}
                    </Text>
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
