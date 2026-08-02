import { ScrollView, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

function PlaceholderScreen({ title, icon, description }: { title: string; icon: any; description: string }) {
  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-8 pb-24 items-center justify-center min-h-[400px]">
        <View className="w-20 h-20 rounded-full bg-violet-50 items-center justify-center mb-5">
          <Ionicons name={icon} size={40} color={Colors.secondary} />
        </View>
        <Text className="text-slate-950 font-black text-xl mb-2 text-center">{title}</Text>
        <Text className="text-slate-500 text-sm text-center leading-6 max-w-[280px]">
          {description}
        </Text>
      </View>
    </ScrollView>
  );
}

export default function PerformanceAdminScreen() {
  return <PlaceholderScreen title="Performance" icon="bar-chart-outline" description="School-wide analytics and performance tracking will be available in the upcoming mobile release. Please use the web portal for now." />;
}
