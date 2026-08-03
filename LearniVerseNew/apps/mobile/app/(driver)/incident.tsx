import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";

export default function DriverIncidentScreen() {
  const routes = useQuery(api.transport.listRoutes);
  const user = useQuery(api.users.current);
  const reportIncident = useMutation(api.transport.reportIncident);

  const [incidentRouteId, setIncidentRouteId] = useState<Id<"transportRoutes"> | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (routes === undefined || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const myRoutes = routes.filter(r => r.driverUserId === user._id || r.isActive);

  async function handleSubmit() {
    if (!incidentRouteId || !title.trim() || !description.trim()) {
      Alert.alert("Missing Details", "Please select a route and provide a title and description.");
      return;
    }

    setSubmitting(true);
    try {
      await reportIncident({
        routeId: incidentRouteId,
        title: title.trim(),
        description: description.trim(),
      });
      setIncidentRouteId(null);
      setTitle("");
      setDescription("");
      Alert.alert("Incident Reported", "Transport administration has been notified.");
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Report Incident</Text>
            <Text className="text-slate-500 text-sm mt-1">Notify transport administration of an issue</Text>
          </View>

          <View className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Select Route</Text>
            <View className="gap-2 mb-6">
              {myRoutes.map(route => (
                <TouchableOpacity
                  key={route._id}
                  onPress={() => setIncidentRouteId(route._id)}
                  className={`rounded-2xl px-4 py-3 border ${
                    incidentRouteId === route._id ? "bg-rose-600 border-rose-600" : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <Text className={`font-bold ${incidentRouteId === route._id ? "text-white" : "text-slate-900"}`}>
                    {route.routeCode} - {route.name}
                  </Text>
                </TouchableOpacity>
              ))}
              {myRoutes.length === 0 && (
                <Text className="text-slate-400 italic">No routes available</Text>
              )}
            </View>

            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Issue Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Bus breakdown, Traffic delay"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 mb-6 font-medium text-slate-900"
            />

            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Details</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the incident and location if applicable"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-4 mb-6 font-medium text-slate-900 min-h-[120px]"
            />

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className={`rounded-2xl py-4 items-center ${submitting ? 'opacity-70 bg-rose-600' : 'bg-rose-600'}`}
            >
              {submitting ? <ActivityIndicator color="white" /> : <Text className="text-white font-bold text-base">Submit Report</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
