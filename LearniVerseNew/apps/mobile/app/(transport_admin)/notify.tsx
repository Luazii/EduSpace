import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export default function TransportAdminNotifyScreen() {
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    Alert.alert("Success", "Notification sent to parents.");
    setMessage("");
  };

  return (
    <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ flexGrow: 1 }}>
      <View className="p-5 flex-1">
        <View className="mb-6 mt-4">
          <Text className="text-2xl font-black text-slate-950 tracking-tight">Notify Parents</Text>
          <Text className="text-slate-500 text-sm mt-1">Send a broadcast message</Text>
        </View>

        <View className="bg-white rounded-3xl p-5 border border-slate-200 flex-1 mb-8">
          <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Message</Text>
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder="e.g. Bus R1 is delayed by 15 minutes due to traffic."
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-4 text-slate-900 font-medium min-h-[150px] mb-6"
          />
          
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!message.trim()}
            className={`rounded-2xl py-4 items-center flex-row justify-center gap-2 ${message.trim() ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <Ionicons name="send" size={18} color="white" />
            <Text className="text-white font-bold text-base">Send Notification</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
