import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";
import { useState } from "react";

export default function BookingsScreen() {
  const router = useRouter();
  const myBookings = useQuery(api.bookings.listMine) ?? [];
  const rooms = useQuery(api.rooms.listRooms) ?? [];
  const cancelBooking = useMutation(api.bookings.cancel);
  const [tab, setTab] = useState<"rooms" | "teachers">("rooms");

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-sky-600 mb-1">
            Bookings
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">My Bookings</Text>
        </View>

        {/* Tab switch */}
        <View className="flex-row bg-slate-100 rounded-2xl p-1 mb-6">
          {(["rooms", "teachers"] as const).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 rounded-xl py-2.5 items-center ${tab === t ? "bg-white shadow-sm" : ""}`}
            >
              <Text className={`text-sm font-bold capitalize ${tab === t ? "text-slate-950" : "text-slate-400"}`}>
                {t === "rooms" ? "Room Bookings" : "Teacher Bookings"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "rooms" && (
          <>
            {/* Available rooms */}
            {rooms.filter((r) => r.isActive).length > 0 && (
              <View className="mb-6">
                <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                  Available Rooms
                </Text>
                <View className="gap-3">
                  {rooms.filter((r) => r.isActive).map((room) => (
                    <TouchableOpacity
                      key={room._id}
                      onPress={() => router.push(`/bookings/room/${room._id}` as never)}
                      className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex-row items-center gap-4"
                    >
                      <View className="w-12 h-12 rounded-2xl bg-sky-50 items-center justify-center">
                        <Ionicons name="business-outline" size={22} color={Colors.primary} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-950 font-bold">{room.name}</Text>
                        <Text className="text-slate-400 text-xs mt-0.5">{room.campus}</Text>
                        {room.capacity && (
                          <Text className="text-slate-400 text-xs">Capacity: {room.capacity}</Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* My room bookings */}
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              My Room Bookings
            </Text>
            {myBookings.filter((b) => b.status === "active").length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
                <Ionicons name="calendar-outline" size={36} color={Colors.onSurfaceSubtle} />
                <Text className="text-slate-500 text-sm mt-3 text-center">No room bookings</Text>
              </View>
            ) : (
              <View className="gap-3">
                {myBookings.filter((b) => b.status === "active").map((booking) => (
                  <View key={booking._id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1">
                        <Text className="text-slate-950 font-bold">{booking.roomName ?? "Room"}</Text>
                        <Text className="text-slate-500 text-sm mt-0.5">{booking.slotName}</Text>
                        <Text className="text-slate-400 text-xs mt-1">
                          {format(new Date(booking.bookingDate), "EEEE, MMM d, yyyy")}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert("Cancel Booking?", "Are you sure?", [
                            { text: "No", style: "cancel" },
                            {
                              text: "Cancel Booking",
                              style: "destructive",
                              onPress: () => cancelBooking({ bookingId: booking._id }),
                            },
                          ]);
                        }}
                        className="bg-rose-50 rounded-xl px-3 py-1.5"
                      >
                        <Text className="text-rose-600 text-xs font-bold">Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

        {tab === "teachers" && (
          <View>
            <TouchableOpacity
              onPress={() => router.push("/bookings/teachers" as never)}
              className="bg-sky-600 rounded-3xl p-5 flex-row items-center gap-4 mb-4"
            >
              <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
                <Ionicons name="person-outline" size={22} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold">Book a Teacher Session</Text>
                <Text className="text-white/70 text-sm mt-0.5">Find an available teacher slot</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
