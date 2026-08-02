import { ScrollView, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export default function ReportsScreen() {
  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-8 pb-24 items-center justify-center min-h-[400px]">
        <View className="w-20 h-20 rounded-full bg-rose-50 items-center justify-center mb-5">
          <Ionicons name="document-text-outline" size={40} color={Colors.danger} />
        </View>
        <Text className="text-slate-950 font-black text-xl mb-2 text-center">Reports Module</Text>
        <Text className="text-slate-500 text-sm text-center leading-6 max-w-[280px]">
          Student reports generation and analytics will be available in the upcoming mobile release.
          Please use the web portal to generate reports for now.
        </Text>
      </View>
    </ScrollView>
  );
}
