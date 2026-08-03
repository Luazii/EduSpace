import { View, Text, TouchableOpacity, ScrollView, Animated } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { useEffect, useRef } from "react";

export default function TrackBusScreen() {
  const router = useRouter();
  const { routeId, routeCode } = useLocalSearchParams<{ routeId: string; routeCode: string }>();
  
  // Animation value for the bus moving along a "route"
  const busPosition = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Infinite looping animation to simulate bus movement
    Animated.loop(
      Animated.sequence([
        Animated.timing(busPosition, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(busPosition, {
          toValue: 0,
          duration: 4000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [busPosition]);

  const translateY = busPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [20, 280] // Maps to the visual height of our "route" line
  });

  return (
    <View className="flex-1 bg-slate-900">
      <View className="flex-row items-center justify-between p-5 pt-12 bg-slate-950">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/10 rounded-full items-center justify-center">
          <Ionicons name="arrow-back" size={20} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-black text-lg tracking-tight">Live Tracker</Text>
        <View className="w-10 h-10" />
      </View>

      <View className="p-5 bg-slate-950 pb-8 border-b border-slate-800">
        <Text className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
          {routeCode ?? "Route"}
        </Text>
        <Text className="text-white text-2xl font-black">Morning School Run</Text>
        <View className="flex-row items-center gap-2 mt-2">
          <View className="w-2 h-2 rounded-full bg-emerald-500" />
          <Text className="text-slate-400 text-sm">Bus is currently en route</Text>
        </View>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-8">
          <View className="relative">
            {/* The Route Line */}
            <View className="absolute left-[19px] top-[10px] bottom-[10px] w-1 bg-slate-800 rounded-full" />
            
            {/* The Animated Bus */}
            <Animated.View 
              style={{ transform: [{ translateY }] }} 
              className="absolute left-[3px] z-10 w-9 h-9 bg-emerald-500 rounded-full items-center justify-center border-4 border-slate-900 shadow-xl shadow-emerald-500/20"
            >
              <Ionicons name="bus" size={14} color="white" />
            </Animated.View>

            {/* Stops */}
            <View className="gap-24">
              <View className="flex-row items-center gap-6">
                <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border-4 border-slate-900 z-0">
                  <View className="w-2 h-2 bg-slate-400 rounded-full" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">North Campus</Text>
                  <Text className="text-slate-500 text-xs mt-1">Departed 07:15 AM</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-6">
                <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border-4 border-slate-900 z-0">
                  <View className="w-2 h-2 bg-slate-400 rounded-full" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">Central Station</Text>
                  <Text className="text-slate-500 text-xs mt-1">Expected 07:30 AM</Text>
                </View>
              </View>

              <View className="flex-row items-center gap-6">
                <View className="w-10 h-10 rounded-full bg-slate-800 items-center justify-center border-4 border-slate-900 z-0">
                  <View className="w-2 h-2 bg-slate-400 rounded-full" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base">South Gate</Text>
                  <Text className="text-slate-500 text-xs mt-1">Expected 07:45 AM</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View className="px-5 mt-4 mb-10">
          <View className="bg-slate-800/50 p-5 rounded-3xl border border-slate-700">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-slate-700 items-center justify-center">
                <Ionicons name="person" size={20} color={Colors.onSurfaceSubtle} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Driver</Text>
                <Text className="text-white font-bold text-base">John Doe</Text>
              </View>
              <TouchableOpacity className="w-10 h-10 bg-emerald-500/20 rounded-full items-center justify-center">
                <Ionicons name="call" size={18} color="#10b981" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
