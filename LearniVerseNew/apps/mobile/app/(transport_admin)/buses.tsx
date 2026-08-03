import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";

export default function TransportAdminBusesScreen() {
  const routes = useQuery(api.transport.listRoutes);

  if (routes === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Bus Assignments</Text>
            <Text className="text-slate-500 text-sm mt-1">View drivers and bus assignments</Text>
          </View>

          <View className="gap-4">
            {routes.map(route => (
              <View key={route._id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm flex-row justify-between items-center">
                <View>
                  <Text className="text-indigo-600 text-xs font-black uppercase tracking-widest mb-1">{route.routeCode}</Text>
                  <Text className="text-lg font-bold text-slate-900">{route.name}</Text>
                  {route.busLabel && (
                    <Text className="text-slate-500 text-sm mt-1">Bus: {route.busLabel}</Text>
                  )}
                </View>
                <View className="items-end">
                  <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Driver</Text>
                  {route.driverName ? (
                    <Text className="text-slate-900 font-semibold">{route.driverName}</Text>
                  ) : (
                    <Text className="text-amber-500 font-bold text-sm italic">Unassigned</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
