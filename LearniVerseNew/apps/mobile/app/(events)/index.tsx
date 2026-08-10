import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { format } from "date-fns";

export default function EventsIndexScreen() {
  const router = useRouter();
  const events = useQuery(api.events.listEvents, {});
  const tickets = useQuery(api.events.listMyTickets);

  if (events === undefined || tickets === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const upcomingEvents = events.filter(e => e.eventDate > Date.now());

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-8">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Events</Text>
            <Text className="text-slate-500 text-sm mt-1">Discover what's happening at EduSpace</Text>
          </View>

          {/* My Tickets Section */}
          {tickets.length > 0 && (
            <View className="mb-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-xs font-black uppercase tracking-widest text-slate-500">My Tickets</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="overflow-visible">
                <View className="flex-row gap-4 pr-5">
                  {tickets.map(ticket => (
                    <TouchableOpacity
                      key={ticket._id}
                      onPress={() => router.push(`/(events)/ticket/${ticket._id}` as never)}
                      className="bg-slate-900 rounded-3xl w-64 border border-slate-800 shadow-xl overflow-hidden"
                    >
                      <View className="p-5 border-b border-white/10">
                        <View className="flex-row justify-between items-start mb-2">
                          <View className="bg-white/10 rounded-full px-2 py-1">
                            <Text className="text-white text-[10px] font-bold uppercase">{ticket.status}</Text>
                          </View>
                          <Ionicons name="qr-code-outline" size={20} color="white" />
                        </View>
                        <Text className="text-white font-bold text-lg mb-1" numberOfLines={1}>
                          {ticket.event?.title ?? "Unknown Event"}
                        </Text>
                        <Text className="text-white/60 text-xs">
                          {ticket.event ? format(ticket.event.eventDate, "MMM d, yyyy • h:mm a") : ""}
                        </Text>
                      </View>
                      <View className="bg-rose-600 px-5 py-3 flex-row items-center justify-between">
                        <Text className="text-white font-bold text-sm">View Ticket</Text>
                        <Ionicons name="arrow-forward" size={16} color="white" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {/* Upcoming Events Section */}
          <Text className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4">Upcoming Events</Text>
          <View className="gap-4">
            {upcomingEvents.length === 0 ? (
              <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
                <Ionicons name="calendar-outline" size={48} color="#94a3b8" />
                <Text className="text-slate-500 text-center mt-4">No upcoming events found.</Text>
              </View>
            ) : (
              upcomingEvents.map(event => (
                <TouchableOpacity
                  key={event._id}
                  onPress={() => router.push(`/(events)/${event._id}` as never)}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="bg-rose-50 rounded-xl px-3 py-2 items-center justify-center">
                      <Text className="text-rose-700 font-bold text-xs uppercase">{format(event.eventDate, "MMM")}</Text>
                      <Text className="text-rose-700 font-black text-xl">{format(event.eventDate, "d")}</Text>
                    </View>
                    <View className="flex-1 ml-4">
                      <Text className="text-slate-900 font-bold text-lg leading-6">{event.title}</Text>
                      <Text className="text-slate-500 text-xs mt-1 line-clamp-2">{event.description}</Text>
                    </View>
                  </View>
                  <View className="bg-slate-50 rounded-2xl p-3 flex-row items-center gap-3">
                    <Ionicons name="location-outline" size={16} color={Colors.primary} />
                    <Text className="text-slate-700 text-xs font-semibold">{event.location}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
