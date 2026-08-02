import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator, Linking } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  initialized: { label: "Processing", bg: "bg-amber-50", text: "text-amber-700" },
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700" },
  success: { label: "Paid", bg: "bg-emerald-50", text: "text-emerald-700" },
  failed: { label: "Failed", bg: "bg-rose-50", text: "text-rose-700" },
};

export default function PaymentsScreen() {
  const payments = useQuery(api.payments.listMine, {}) ?? [];
  const myApplications = useQuery(api.enrollments.listMine) ?? [];

  const pendingPaymentApp = myApplications.find(
    (a) => a.status === "pre_approved" && a.paymentStatus !== "paid"
  );

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-sky-600 mb-1">
            Finance
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">Payments</Text>
        </View>

        {/* CTA for pending payment */}
        {pendingPaymentApp && (
          <View className="bg-slate-950 rounded-3xl p-6 mb-6">
            <Text className="text-white text-lg font-black mb-1">Payment Required</Text>
            <Text className="text-white/60 text-sm mb-4">
              Your enrollment application has been pre-approved. Complete payment to confirm your spot.
            </Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  "Pay Now",
                  "You will be redirected to the Paystack payment portal to complete your enrollment payment.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Proceed",
                      onPress: () => {
                        // Find the Paystack URL from latest payment record
                        const latestPayment = payments.find(
                          (p) => p.applicationId === pendingPaymentApp._id && p.authorizationUrl
                        );
                        if (latestPayment?.authorizationUrl) {
                          Linking.openURL(latestPayment.authorizationUrl);
                        } else {
                          Alert.alert("Info", "Please use the web app to initialize payment.");
                        }
                      },
                    },
                  ]
                );
              }}
              className="bg-sky-500 rounded-2xl py-3.5 items-center"
            >
              <Text className="text-white font-bold">Pay Enrollment Fee</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment history */}
        <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          Payment History
        </Text>
        {payments.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
            <Ionicons name="card-outline" size={36} color={Colors.onSurfaceSubtle} />
            <Text className="text-slate-500 text-sm mt-3 text-center">No payments yet</Text>
          </View>
        ) : (
          <View className="gap-3">
            {payments.map((payment) => {
              const config = STATUS_CONFIG[payment.status] ?? STATUS_CONFIG.pending;
              return (
                <View key={payment._id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1">
                      <Text className="text-slate-950 font-bold">Enrollment Payment</Text>
                      <Text className="text-slate-400 text-xs mt-1">Ref: {payment.reference}</Text>
                      <Text className="text-slate-400 text-xs">
                        {format(payment.createdAt, "MMM d, yyyy 'at' p")}
                      </Text>
                    </View>
                    <View className="items-end gap-2">
                      <Text className="text-slate-950 font-black text-lg">
                        R{(payment.amount / 100).toFixed(2)}
                      </Text>
                      <View className={`rounded-xl px-2.5 py-1 ${config.bg}`}>
                        <Text className={`text-xs font-bold ${config.text}`}>{config.label}</Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
