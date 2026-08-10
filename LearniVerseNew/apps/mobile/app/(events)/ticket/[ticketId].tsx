import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { format } from "date-fns";

export default function TicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  const tickets = useQuery(api.events.listMyTickets);
  const user = useQuery(api.users.current);

  if (tickets === undefined || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  const ticket = tickets.find(t => t._id === ticketId);

  if (!ticket || !ticket.event) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 p-5">
        <Text className="text-white">Ticket not found.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <View className="items-center mb-8 mt-6">
          <Text className="text-white/60 text-xs font-black uppercase tracking-widest mb-2">Digital Ticket</Text>
          <Text className="text-white text-2xl font-black text-center">{ticket.event.title}</Text>
        </View>

        <View className="bg-white rounded-3xl overflow-hidden shadow-2xl">
          <View className="p-8 items-center bg-rose-50 border-b border-rose-100 border-dashed">
            <Text className="text-rose-600 font-bold text-[10px] uppercase tracking-widest mb-4">Admit One</Text>
            
            <View className={`p-4 bg-white rounded-3xl ${ticket.status === 'valid' ? 'border-4 border-rose-100' : 'opacity-50'}`}>
              <QRCode
                value={ticket.ticketCode}
                size={200}
                color={ticket.status === 'valid' ? "#000" : "#94a3b8"}
                backgroundColor="#fff"
              />
            </View>

            {ticket.status === 'scanned' && (
              <View className="absolute inset-0 bg-white/80 items-center justify-center">
                <View className="bg-emerald-500 rounded-full w-16 h-16 items-center justify-center mb-2">
                  <Ionicons name="checkmark-outline" size={32} color="white" />
                </View>
                <Text className="text-emerald-700 font-black text-lg">SCANNED</Text>
              </View>
            )}
            {ticket.status === 'cancelled' && (
              <View className="absolute inset-0 bg-white/80 items-center justify-center">
                <View className="bg-rose-500 rounded-full w-16 h-16 items-center justify-center mb-2">
                  <Ionicons name="close-outline" size={32} color="white" />
                </View>
                <Text className="text-rose-700 font-black text-lg">CANCELLED</Text>
              </View>
            )}
          </View>

          <View className="p-8 bg-white relative">
            <View className="absolute -top-4 -left-4 w-8 h-8 bg-slate-950 rounded-full" />
            <View className="absolute -top-4 -right-4 w-8 h-8 bg-slate-950 rounded-full" />

            <View className="mb-5">
              <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Attendee</Text>
              <Text className="text-slate-900 font-bold text-base">{user.fullName ?? user.email}</Text>
            </View>

            <View className="flex-row mb-5">
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Date</Text>
                <Text className="text-slate-900 font-bold text-sm">{format(ticket.event.eventDate, "MMM do, yyyy")}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Time</Text>
                <Text className="text-slate-900 font-bold text-sm">{format(ticket.event.eventDate, "h:mm a")}</Text>
              </View>
            </View>

            <View>
              <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Location</Text>
              <Text className="text-slate-900 font-bold text-sm">{ticket.event.location}</Text>
            </View>
          </View>
        </View>

        <View className="items-center mt-8">
          <Text className="text-white/40 text-xs text-center">
            Present this QR code at the event entrance. It can only be scanned once.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
