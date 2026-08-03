import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ParentChildrenScreen() {
  return (
    <View className="flex-1 bg-slate-50 items-center justify-center p-5">
      <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
        <Ionicons name="people-outline" size={48} color="#94a3b8" />
        <Text className="text-xl font-bold text-slate-900 mt-4">My Children</Text>
        <Text className="text-slate-500 text-center mt-2">
          View your linked children and their profiles here. (Coming soon)
        </Text>
      </View>
    </View>
  );
}
