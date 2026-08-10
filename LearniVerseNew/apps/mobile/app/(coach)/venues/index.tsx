import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format, addHours, startOfHour } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export default function VenuesScreen() {
  const venues = useQuery(api.sportsVenues.listVenues, { includeInactive: false });
  const [selectedVenue, setSelectedVenue] = useState<Id<"sportsVenues"> | null>(null);

  if (venues === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (selectedVenue) {
    return (
      <VenueBooker 
        venueId={selectedVenue} 
        onClose={() => setSelectedVenue(null)} 
        venueName={venues.find(v => v._id === selectedVenue)?.name ?? "Venue"} 
      />
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24 pt-6">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Sports Venues</Text>
            <Text className="text-slate-500 text-sm mt-1">Book fields, courts, and pools</Text>
          </View>

          {venues.length === 0 ? (
            <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
              <Ionicons name="location-outline" size={36} color={Colors.onSurfaceSubtle} />
              <Text className="text-slate-500 text-sm mt-3 text-center">No venues available</Text>
            </View>
          ) : (
            <View className="gap-4">
              {venues.map((venue) => (
                <TouchableOpacity 
                  key={venue._id} 
                  onPress={() => setSelectedVenue(venue._id)}
                  className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex-row items-center justify-between"
                >
                  <View className="flex-1 pr-4">
                    <Text className="text-sky-600 text-[10px] font-black uppercase tracking-widest mb-1">
                      {venue.location ?? "Campus"}
                    </Text>
                    <Text className="text-base font-bold text-slate-900 mb-1">
                      {venue.name}
                    </Text>
                    {venue.capacity && (
                      <Text className="text-slate-500 text-xs">
                        Capacity: {venue.capacity}
                      </Text>
                    )}
                  </View>
                  <View className="w-10 h-10 bg-slate-50 rounded-full items-center justify-center">
                    <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function VenueBooker({ venueId, venueName, onClose }: { venueId: Id<"sportsVenues">; venueName: string; onClose: () => void }) {
  const bookings = useQuery(api.sportsVenues.listBookings, { venueId });
  const bookVenue = useMutation(api.sportsVenues.bookVenue);
  const [loading, setLoading] = useState(false);

  // Generate some upcoming time slots (next few hours)
  const slots = Array.from({ length: 5 }).map((_, i) => {
    const start = addHours(startOfHour(new Date()), i + 1);
    const end = addHours(start, 1);
    return { start: start.getTime(), end: end.getTime() };
  });

  const handleBook = async (start: number, end: number) => {
    setLoading(true);
    try {
      await bookVenue({
        venueId,
        title: "Training Session",
        startTime: start,
        endTime: end,
      });
      Alert.alert("Success", "Venue booked successfully!");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to book venue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onClose} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text className="text-sky-600 font-bold">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900 line-clamp-1 flex-1 text-center mr-8">{venueName}</Text>
      </View>

      <Text className="text-slate-900 font-bold text-lg mb-4">Available Slots (Today)</Text>

      {bookings === undefined ? (
        <ActivityIndicator size="large" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {slots.map((slot, i) => {
            const isBooked = bookings.some(b => 
              (slot.start >= b.startTime && slot.start < b.endTime) ||
              (slot.end > b.startTime && slot.end <= b.endTime)
            );

            return (
              <View key={i} className={`bg-white rounded-3xl p-5 mb-4 border ${isBooked ? 'border-rose-200 bg-rose-50' : 'border-slate-200'} shadow-sm flex-row justify-between items-center`}>
                <View>
                  <Text className={`font-bold text-base mb-1 ${isBooked ? 'text-rose-900' : 'text-slate-900'}`}>
                    {format(slot.start, "h:mm a")} - {format(slot.end, "h:mm a")}
                  </Text>
                  {isBooked && <Text className="text-rose-600 text-xs font-bold uppercase tracking-widest">Booked</Text>}
                </View>
                
                {!isBooked && (
                  <TouchableOpacity 
                    onPress={() => handleBook(slot.start, slot.end)}
                    disabled={loading}
                    className="bg-sky-100 rounded-xl px-4 py-2"
                  >
                    <Text className="text-sky-700 font-bold">Book</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
