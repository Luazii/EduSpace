import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, TextInput, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";

export default function AdminEventsCreateScreen() {
  const router = useRouter();
  const createEvent = useMutation(api.events.createEvent);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [capacity, setCapacity] = useState("");
  const [daysFromNow, setDaysFromNow] = useState("7");
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!title.trim() || !description.trim() || !location.trim() || !daysFromNow.trim()) {
      Alert.alert("Missing Fields", "Please fill in all required fields.");
      return;
    }

    const eventDate = Date.now() + parseInt(daysFromNow) * 24 * 60 * 60 * 1000;
    const parsedCapacity = capacity.trim() ? parseInt(capacity) : undefined;

    setLoading(true);
    try {
      await createEvent({
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        eventDate,
        capacity: parsedCapacity,
      });
      Alert.alert("Success", "Event created successfully.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to create event.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Create Event</Text>
            <Text className="text-slate-500 text-sm mt-1">Add a new event to the calendar</Text>
          </View>

          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Event Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. End of Year Gala"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 mb-5 font-medium text-slate-900"
            />

            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this event about?"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 mb-5 font-medium text-slate-900 min-h-[100px]"
            />

            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Location</Text>
            <TextInput
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Main Hall"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 mb-5 font-medium text-slate-900"
            />

            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Days from now</Text>
                <TextInput
                  value={daysFromNow}
                  onChangeText={setDaysFromNow}
                  keyboardType="numeric"
                  placeholder="7"
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-medium text-slate-900"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Capacity (Opt)</Text>
                <TextInput
                  value={capacity}
                  onChangeText={setCapacity}
                  keyboardType="numeric"
                  placeholder="e.g. 100"
                  className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 font-medium text-slate-900"
                />
              </View>
            </View>

            <TouchableOpacity
              onPress={handleCreate}
              disabled={loading}
              className={`rounded-2xl py-4 items-center ${loading ? 'opacity-70 bg-slate-900' : 'bg-slate-900'}`}
            >
              {loading ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Create Event</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
