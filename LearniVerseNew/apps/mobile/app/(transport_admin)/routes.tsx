import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput, Alert } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

const SERVICE_TYPES = [
  { value: "school_run" as const, label: "School Run" },
  { value: "event" as const, label: "Event" },
  { value: "special" as const, label: "Special" },
];

export default function TransportAdminRoutesScreen() {
  const routes = useQuery(api.transport.listRoutes);
  const createRoute = useMutation(api.transport.createRoute);

  const [showAdd, setShowAdd] = useState(false);
  const [routeCode, setRouteCode] = useState("");
  const [routeName, setRouteName] = useState("");
  const [routeDescription, setRouteDescription] = useState("");
  const [capacity, setCapacity] = useState("");
  const [busLabel, setBusLabel] = useState("");
  const [stopsText, setStopsText] = useState("");
  const [serviceType, setServiceType] = useState<(typeof SERVICE_TYPES)[number]["value"]>("school_run");
  const [creatingRoute, setCreatingRoute] = useState(false);

  if (routes === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  async function handleCreateRoute() {
    if (!routeCode.trim() || !routeName.trim()) {
      Alert.alert("Missing details", "Please enter a route code and route name.");
      return;
    }

    const parsedStops = stopsText
      .split("\n")
      .map((line, index) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        const [labelPart, addressPart] = trimmed.split("|").map((part) => part.trim());
        const [fallbackLabel, fallbackAddress] = trimmed.split(",").map((part) => part.trim());
        return {
          label: labelPart || fallbackLabel || `Stop ${index + 1}`,
          address: addressPart || fallbackAddress || trimmed,
          stopOrder: index,
        };
      })
      .filter(Boolean) as Array<{ label: string; address: string; stopOrder: number }>;

    setCreatingRoute(true);
    try {
      await createRoute({
        routeCode: routeCode.trim(),
        name: routeName.trim(),
        description: routeDescription.trim() || undefined,
        serviceType,
        capacity: capacity.trim() ? Number(capacity) : undefined,
        busLabel: busLabel.trim() || undefined,
        stops: parsedStops.length > 0 ? parsedStops : [{ label: "Main Stop", address: "TBC", stopOrder: 0 }],
      });
      setShowAdd(false);
      setRouteCode("");
      setRouteName("");
      setRouteDescription("");
      setCapacity("");
      setBusLabel("");
      setStopsText("");
      Alert.alert("Route created", "The transport route is now available.");
    } catch (error) {
      Alert.alert("Could not create route", error instanceof Error ? error.message : "Please try again.");
    } finally {
      setCreatingRoute(false);
    }
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="flex-row justify-between items-center mb-6">
            <View>
              <Text className="text-2xl font-black text-slate-950 tracking-tight">Manage Routes</Text>
              <Text className="text-slate-500 text-sm mt-1">{routes.length} active routes</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowAdd(true)}
              className="bg-indigo-600 w-12 h-12 rounded-full items-center justify-center shadow-sm"
            >
              <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="gap-4">
            {routes.map(route => (
              <View key={route._id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 mr-3">
                    <Text className="text-[10px] font-black uppercase tracking-widest text-indigo-700">
                      {route.routeCode}
                    </Text>
                    <Text className="text-slate-950 text-base font-bold mt-1">{route.name}</Text>
                    <Text className="text-slate-500 text-sm mt-1">
                      {route.description ?? route.serviceType.replace("_", " ")}
                    </Text>
                    <Text className="text-slate-400 text-xs mt-2">
                      {route.stops.length} stop{route.stops.length !== 1 ? "s" : ""} • {route.totalBookings} booking{route.totalBookings !== 1 ? "s" : ""}
                    </Text>
                  </View>
                  <View className="items-end">
                    <View className={`rounded-xl px-2.5 py-1 ${route.isActive ? "bg-emerald-50" : "bg-slate-100"}`}>
                      <Text className={`text-[10px] font-black uppercase tracking-widest ${route.isActive ? "text-emerald-700" : "text-slate-500"}`}>
                        {route.isActive ? "Active" : "Hidden"}
                      </Text>
                    </View>
                    {route.driverName && (
                      <Text className="text-slate-400 text-xs mt-2">{route.driverName}</Text>
                    )}
                  </View>
                </View>

                {route.stops.length > 0 && (
                  <View className="mt-4 pt-4 border-t border-slate-100 gap-2">
                    {route.stops.slice(0, 3).map((stop: any) => (
                      <View key={stop._id} className="flex-row items-center gap-2">
                        <View className="w-2 h-2 rounded-full bg-indigo-500" />
                        <Text className="text-slate-600 text-xs">
                          {stop.label} - {stop.address}
                        </Text>
                      </View>
                    ))}
                    {route.stops.length > 3 && (
                      <Text className="text-slate-400 text-xs italic ml-4">
                        + {route.stops.length - 3} more stops
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Add Route Modal */}
      <Modal visible={showAdd} animationType="slide" presentationStyle="pageSheet">
        <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
          <View className="p-5 pt-8 pb-24">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-black text-slate-900">New Route</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Text className="text-indigo-600 font-bold">Cancel</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-3 mb-3">
              <TextInput
                className="flex-1 bg-white rounded-2xl px-4 py-3 border border-slate-200 text-slate-950 font-medium"
                placeholder="Route code (e.g. R1)"
                value={routeCode}
                onChangeText={setRouteCode}
                placeholderTextColor={Colors.onSurfaceSubtle}
                autoCapitalize="characters"
              />
              <TextInput
                className="flex-[2] bg-white rounded-2xl px-4 py-3 border border-slate-200 text-slate-950 font-medium"
                placeholder="Route name"
                value={routeName}
                onChangeText={setRouteName}
                placeholderTextColor={Colors.onSurfaceSubtle}
              />
            </View>

            <TextInput
              className="bg-white rounded-2xl px-4 py-3 border border-slate-200 text-slate-950 font-medium mb-3"
              placeholder="Description (Optional)"
              value={routeDescription}
              onChangeText={setRouteDescription}
              placeholderTextColor={Colors.onSurfaceSubtle}
            />

            <View className="flex-row gap-3 mb-3">
              <TextInput
                className="flex-1 bg-white rounded-2xl px-4 py-3 border border-slate-200 text-slate-950 font-medium"
                placeholder="Capacity"
                value={capacity}
                onChangeText={setCapacity}
                placeholderTextColor={Colors.onSurfaceSubtle}
                keyboardType="numeric"
              />
              <TextInput
                className="flex-1 bg-white rounded-2xl px-4 py-3 border border-slate-200 text-slate-950 font-medium"
                placeholder="Bus label"
                value={busLabel}
                onChangeText={setBusLabel}
                placeholderTextColor={Colors.onSurfaceSubtle}
              />
            </View>

            <View className="flex-row gap-2 mb-4">
              {SERVICE_TYPES.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => setServiceType(option.value)}
                  className={`flex-1 rounded-2xl py-3 items-center border ${
                    serviceType === option.value
                      ? "bg-indigo-600 border-indigo-600"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <Text className={`text-xs font-bold ${serviceType === option.value ? "text-white" : "text-slate-600"}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 mt-2">Route Stops</Text>
            <TextInput
              className="bg-white rounded-2xl px-4 py-3 border border-slate-200 text-slate-950 mb-6 min-h-[120px] font-medium"
              placeholder="Enter stops (one per line)&#10;Format: Label | Address&#10;Example: Stop 1 | 123 Main St"
              value={stopsText}
              onChangeText={setStopsText}
              placeholderTextColor={Colors.onSurfaceSubtle}
              multiline
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={handleCreateRoute}
              disabled={creatingRoute}
              className="bg-indigo-600 rounded-2xl py-4 items-center"
              style={{ opacity: creatingRoute ? 0.7 : 1 }}
            >
              {creatingRoute ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Create Route</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Modal>
    </View>
  );
}
