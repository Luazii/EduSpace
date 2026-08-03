import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
// @ts-expect-error
import { format } from "date-fns";

export default function ParentTransportScreen() {
  const router = useRouter();
  const routes = useQuery(api.transport.listRoutes) ?? [];
  const bookings = useQuery(api.transport.listMyBookings) ?? [];
  const learners = useQuery(api.transport.listMyLearners) ?? [];
  const requestBooking = useMutation(api.transport.requestBooking);

  const [selectedLearnerId, setSelectedLearnerId] = useState<Id<"users"> | null>(null);
  const [bookingRouteId, setBookingRouteId] = useState<Id<"transportRoutes"> | null>(null);
  const [pickupStopId, setPickupStopId] = useState<Id<"transportRouteStops"> | null>(null);
  const [dropoffStopId, setDropoffStopId] = useState<Id<"transportRouteStops"> | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const activeRoutes = routes.filter(r => r.isActive);
  const selectedRoute = activeRoutes.find(r => r._id === bookingRouteId);

  async function handleRequest() {
    if (!selectedLearnerId || !bookingRouteId) {
      Alert.alert("Missing Details", "Please select a child and a route.");
      return;
    }

    setSubmitting(true);
    try {
      await requestBooking({
        routeId: bookingRouteId,
        learnerUserId: selectedLearnerId,
        pickupStopId: pickupStopId ?? undefined,
        dropoffStopId: dropoffStopId ?? undefined,
        notes: notes.trim() || undefined,
      });
      setSelectedLearnerId(null);
      setBookingRouteId(null);
      setPickupStopId(null);
      setDropoffStopId(null);
      setNotes("");
      Alert.alert("Success", "Transport request submitted for approval.");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-8">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Transport Booking</Text>
            <Text className="text-slate-500 text-sm mt-1">Request bus transport for your children</Text>
          </View>

          {learners.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
              <Text className="text-slate-500 text-center">No linked children found. Contact admin.</Text>
            </View>
          ) : (
            <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-8">
              <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">1. Select Child</Text>
              <View className="gap-2 mb-6">
                {learners.map(learner => {
                  if (!learner) return null;
                  return (
                  <TouchableOpacity
                    key={learner.studentId}
                    onPress={() => setSelectedLearnerId(learner.studentId)}
                    className={`rounded-2xl px-4 py-3 border flex-row items-center justify-between ${
                      selectedLearnerId === learner.studentId ? 'bg-sky-600 border-sky-600' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <Text className={`font-bold ${selectedLearnerId === learner.studentId ? 'text-white' : 'text-slate-900'}`}>
                      {learner.fullName}
                    </Text>
                    {selectedLearnerId === learner.studentId && <Ionicons name="checkmark-circle" size={20} color="white" />}
                  </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">2. Select Route</Text>
              <View className="gap-2 mb-6">
                {activeRoutes.map(route => (
                  <TouchableOpacity
                    key={route._id}
                    onPress={() => {
                      setBookingRouteId(route._id);
                      setPickupStopId(null);
                      setDropoffStopId(null);
                    }}
                    className={`rounded-2xl px-4 py-3 border flex-row items-center justify-between ${
                      bookingRouteId === route._id ? 'bg-emerald-600 border-emerald-600' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <View>
                      <Text className={`text-[10px] font-black uppercase tracking-widest mb-0.5 ${bookingRouteId === route._id ? 'text-emerald-200' : 'text-emerald-600'}`}>
                        {route.routeCode}
                      </Text>
                      <Text className={`font-bold ${bookingRouteId === route._id ? 'text-white' : 'text-slate-900'}`}>
                        {route.name}
                      </Text>
                    </View>
                    {bookingRouteId === route._id && <Ionicons name="checkmark-circle" size={20} color="white" />}
                  </TouchableOpacity>
                ))}
                {activeRoutes.length === 0 && <Text className="text-slate-500 italic">No available routes</Text>}
              </View>

              {selectedRoute && selectedRoute.stops.length > 0 && (
                <View className="mb-6 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">3. Pick-up Stop (Optional)</Text>
                  <View className="gap-2 mb-5">
                    {selectedRoute.stops.map((stop: any) => (
                      <TouchableOpacity
                        key={stop._id}
                        onPress={() => setPickupStopId(stop._id)}
                        className={`rounded-xl px-3 py-2 border ${
                          pickupStopId === stop._id ? 'bg-sky-100 border-sky-300' : 'bg-white border-slate-200'
                        }`}
                      >
                        <Text className={`font-semibold text-sm ${pickupStopId === stop._id ? 'text-sky-800' : 'text-slate-700'}`}>
                          {stop.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">4. Drop-off Stop (Optional)</Text>
                  <View className="gap-2">
                    {selectedRoute.stops.map((stop: any) => (
                      <TouchableOpacity
                        key={stop._id}
                        onPress={() => setDropoffStopId(stop._id)}
                        className={`rounded-xl px-3 py-2 border ${
                          dropoffStopId === stop._id ? 'bg-indigo-100 border-indigo-300' : 'bg-white border-slate-200'
                        }`}
                      >
                        <Text className={`font-semibold text-sm ${dropoffStopId === stop._id ? 'text-indigo-800' : 'text-slate-700'}`}>
                          {stop.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Notes (Optional)</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Any special instructions"
                className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 mb-6 font-medium text-slate-900"
              />

              <TouchableOpacity
                onPress={handleRequest}
                disabled={submitting || !selectedLearnerId || !bookingRouteId}
                className={`rounded-2xl py-4 items-center ${submitting ? 'opacity-70' : ''} ${selectedLearnerId && bookingRouteId ? 'bg-slate-900' : 'bg-slate-300'}`}
              >
                {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Submit Request</Text>}
              </TouchableOpacity>
            </View>
          )}

          <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">My Bookings</Text>
          <View className="gap-3">
            {bookings.length === 0 ? (
              <View className="bg-white rounded-3xl p-6 items-center border border-slate-200">
                <Text className="text-slate-400">No past bookings.</Text>
              </View>
            ) : (
              bookings.map((booking) => (
                <View key={booking._id} className="bg-white rounded-2xl p-4 border border-slate-100 flex-row justify-between items-center shadow-sm">
                  <View className="flex-1 pr-4">
                    <Text className="text-slate-900 font-bold">{booking.learner?.fullName ?? "Learner"}</Text>
                    <Text className="text-slate-500 text-xs mt-1">{booking.route?.routeCode} • {booking.route?.name}</Text>
                    <Text className="text-slate-400 text-[10px] mt-1">{format(new Date(booking.createdAt), "MMM d, h:mm a")}</Text>
                  </View>
                  <View className="items-end gap-2">
                    <View className={`px-2.5 py-1.5 rounded-md ${
                      booking.status === 'approved' ? 'bg-emerald-50' : 
                      booking.status === 'rejected' ? 'bg-rose-50' : 'bg-amber-50'
                    }`}>
                      <Text className={`text-[10px] font-black uppercase tracking-widest ${
                        booking.status === 'approved' ? 'text-emerald-700' : 
                        booking.status === 'rejected' ? 'text-rose-700' : 'text-amber-700'
                      }`}>
                        {booking.status}
                      </Text>
                    </View>
                    
                    {booking.status === 'approved' && booking.route && (
                      <TouchableOpacity 
                        onPress={() => router.push(`/(parent)/transport/track/${booking.routeId}?routeCode=${booking.route?.routeCode}` as never)}
                        className="bg-slate-900 px-3 py-1.5 rounded-lg flex-row items-center gap-1"
                      >
                        <Ionicons name="location" size={12} color="white" />
                        <Text className="text-white text-[10px] font-bold uppercase tracking-widest">Track</Text>
                      </TouchableOpacity>
                    )}
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
