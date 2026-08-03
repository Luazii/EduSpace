import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";
import { Ionicons } from "@expo/vector-icons";

export default function DriverRoutesScreen() {
  const routes = useQuery(api.transport.listRoutes);
  const user = useQuery(api.users.current);

  if (routes === undefined || !user) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Driver sees all routes they are assigned to (or all if the backend listRoutes filters for them)
  // listRoutes already returns routes visible to the driver. Let's filter by driverUserId just to be sure.
  const myRoutes = routes.filter(r => r.driverUserId === user._id || r.isActive);

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">My Routes</Text>
            <Text className="text-slate-500 text-sm mt-1">Your scheduled transport routes</Text>
          </View>

          {myRoutes.length === 0 ? (
             <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
               <Ionicons name="bus-outline" size={36} color={Colors.onSurfaceSubtle} />
               <Text className="text-slate-500 text-sm mt-3 text-center">No routes assigned yet</Text>
             </View>
          ) : (
            <View className="gap-4">
              {myRoutes.map(route => (
                <View key={route._id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-3">
                      <Text className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                        {route.routeCode}
                      </Text>
                      <Text className="text-lg font-bold text-slate-900 mt-1">{route.name}</Text>
                      <Text className="text-slate-500 text-sm mt-1">
                        Bus: {route.busLabel ?? "Standard Bus"}
                      </Text>
                    </View>
                  </View>

                  {route.stops.length > 0 && (
                    <View className="mt-4 pt-4 border-t border-slate-100 gap-3">
                      {route.stops.map((stop: any, idx: number) => (
                        <View key={stop._id} className="flex-row items-center gap-3">
                          <View className="items-center justify-center w-6">
                            <View className={`w-3 h-3 rounded-full ${idx === 0 ? 'bg-emerald-500' : idx === route.stops.length - 1 ? 'bg-rose-500' : 'bg-slate-300'}`} />
                            {idx !== route.stops.length - 1 && (
                              <View className="w-0.5 h-6 bg-slate-200 absolute top-3" />
                            )}
                          </View>
                          <View className="flex-1 pb-2">
                            <Text className="text-slate-900 font-bold">{stop.label}</Text>
                            <Text className="text-slate-500 text-xs">{stop.address}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
