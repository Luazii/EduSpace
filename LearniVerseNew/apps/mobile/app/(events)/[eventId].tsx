import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
// @ts-expect-error
import { format } from "date-fns";

export default function EventDetailsScreen() {
  const { eventId } = useLocalSearchParams<{ eventId: string }>();
  const router = useRouter();
  
  const events = useQuery(api.events.listEvents, {});
  const getTicket = useMutation(api.events.getTicket);

  const [loading, setLoading] = useState(false);

  if (events === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const event = events.find(e => e._id === eventId);
  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50 p-5">
        <Text className="text-slate-500">Event not found.</Text>
      </View>
    );
  }

  async function handleGetTicket() {
    setLoading(true);
    try {
      const ticketId = await getTicket({ eventId: event!._id });
      Alert.alert("Success", "You have secured your ticket!", [
        { text: "View Ticket", onPress: () => router.push(`/(events)/ticket/${ticketId}` as never) }
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to get ticket.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="h-48 bg-rose-600 justify-end p-5">
          <Text className="text-white text-xs font-black uppercase tracking-widest mb-1">
            EduSpace Event
          </Text>
          <Text className="text-white text-3xl font-black">{event.title}</Text>
        </View>

        <View className="p-5 pb-24">
          <View className="flex-row items-center gap-4 mb-6">
            <View className="bg-white p-3 rounded-2xl border border-slate-200 items-center justify-center min-w-[70px]">
              <Text className="text-slate-500 font-bold text-[10px] uppercase">{format(event.eventDate, "MMM")}</Text>
              <Text className="text-slate-900 font-black text-xl">{format(event.eventDate, "d")}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-base">{format(event.eventDate, "EEEE, MMMM do, yyyy")}</Text>
              <Text className="text-slate-500 text-sm mt-0.5">{format(event.eventDate, "h:mm a")}</Text>
            </View>
          </View>

          <View className="flex-row items-center gap-4 mb-8">
            <View className="bg-white p-3 rounded-2xl border border-slate-200 items-center justify-center w-[70px]">
              <Ionicons name="location" size={24} color={Colors.primary} />
            </View>
            <View className="flex-1">
              <Text className="text-slate-900 font-bold text-base">Location</Text>
              <Text className="text-slate-500 text-sm mt-0.5">{event.location}</Text>
            </View>
          </View>

          <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">About this Event</Text>
          <Text className="text-slate-700 text-base leading-6 mb-8">
            {event.description}
          </Text>

          <TouchableOpacity
            onPress={handleGetTicket}
            disabled={loading}
            className={`rounded-3xl py-4 flex-row justify-center items-center gap-2 ${loading ? 'opacity-70 bg-rose-600' : 'bg-rose-600'}`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Ionicons name="ticket-outline" size={20} color="white" />
                <Text className="text-white font-bold text-lg">Get Free Ticket</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
