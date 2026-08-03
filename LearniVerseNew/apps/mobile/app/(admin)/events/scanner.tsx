import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Colors } from "@/constants/colors";

export default function TicketScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const scanTicket = useMutation(api.events.scanTicket);

  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center p-5">
        <Text className="text-white text-center mb-5">We need your permission to show the camera.</Text>
        <TouchableOpacity onPress={requestPermission} className="bg-emerald-600 px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleBarCodeScanned({ type, data }: { type: string; data: string }) {
    if (scanned || loading) return;
    setScanned(true);
    setLoading(true);

    try {
      const response = await scanTicket({ ticketCode: data });
      setResult({
        success: true,
        message: `Validated! ${response.attendeeName} for ${response.eventName}.`,
      });
    } catch (error) {
      setResult({
        success: false,
        message: error instanceof Error ? error.message : "Invalid Ticket.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      {/* On web, CameraView may not work properly for QR without HTTPS or proper setup, but this is React Native Expo */}
      {Platform.OS === 'web' ? (
         <View className="flex-1 items-center justify-center bg-slate-900">
           <Text className="text-white">Scanner is not supported on web in development.</Text>
         </View>
      ) : (
        <CameraView 
          style={StyleSheet.absoluteFillObject}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          <View className="flex-1 bg-black/40 p-5">
            <View className="flex-row items-center justify-between pt-12 mb-8">
              <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-white/20 rounded-full items-center justify-center">
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
              <Text className="text-white font-black text-lg tracking-tight">Scan Tickets</Text>
              <View className="w-10 h-10" />
            </View>

            <View className="flex-1 items-center justify-center">
              <View className="w-64 h-64 border-2 border-white/50 rounded-3xl items-center justify-center relative overflow-hidden">
                <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-500 rounded-tl-3xl" />
                <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-500 rounded-tr-3xl" />
                <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-500 rounded-bl-3xl" />
                <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-500 rounded-br-3xl" />
                {loading && <ActivityIndicator size="large" color="#10b981" />}
              </View>
              <Text className="text-white/70 text-center mt-6 font-medium">Position the QR code within the frame</Text>
            </View>

            {result && (
              <View className={`p-6 rounded-3xl mb-8 ${result.success ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                <View className="flex-row items-center gap-3 mb-2">
                  <Ionicons name={result.success ? "checkmark-circle" : "warning"} size={24} color="white" />
                  <Text className="text-white font-black text-xl">{result.success ? "Success" : "Error"}</Text>
                </View>
                <Text className="text-white font-medium mb-4">{result.message}</Text>
                <TouchableOpacity 
                  onPress={() => {
                    setResult(null);
                    setScanned(false);
                  }}
                  className="bg-black/20 py-3 rounded-xl items-center"
                >
                  <Text className="text-white font-bold">Scan Next Ticket</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </CameraView>
      )}
    </View>
  );
}
