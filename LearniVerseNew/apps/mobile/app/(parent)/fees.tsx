import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function ParentFeesScreen() {
  return (
    <View className="flex-1 bg-slate-50 items-center justify-center p-5">
      <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
        <Ionicons name="card-outline" size={48} color="#94a3b8" />
        <Text className="text-xl font-bold text-slate-900 mt-4">Fee Statements</Text>
        <Text className="text-slate-500 text-center mt-2">
          View invoices and make secure payments. (Coming soon)
        </Text>
      </View>
    </View>
  );
}
