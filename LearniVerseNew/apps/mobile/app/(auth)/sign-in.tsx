import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSignIn, useOAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

WebBrowser.maybeCompleteAuthSession();

export default function SignInScreen() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const handleGoogleSignIn = async () => {
    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow();
      if (createdSessionId && setOAuthActive) {
        await setOAuthActive({ session: createdSessionId });
        router.replace("/(tabs)/dashboard");
      }
    } catch (err: any) {
      if (err?.message?.includes("already signed in") || err?.errors?.[0]?.code === "session_exists") {
        router.replace("/(tabs)/dashboard");
      } else {
        console.error("OAuth error", err);
      }
    }
  };

  async function handleSignIn() {
    if (!isLoaded || !email.trim() || !password) return;

    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: email.trim().toLowerCase(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert("Sign In", "Additional verification required. Please check your email.");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "An error occurred. Please try again.";
      Alert.alert("Sign In Failed", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-slate-950"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          {/* Logo */}
          <View className="mb-12">
            <View className="w-14 h-14 rounded-2xl bg-sky-600 items-center justify-center mb-6">
              <Text className="text-white text-xl font-black">ES</Text>
            </View>
            <Text className="text-white text-3xl font-black tracking-tight">
              Welcome back
            </Text>
            <Text className="text-slate-400 text-base mt-2 leading-6">
              Sign in to your EduSpace account to continue your learning journey.
            </Text>
          </View>

          {/* Form */}
          <View className="gap-4">
            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                Email Address
              </Text>
              <TextInput
                className="bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-white text-base"
                placeholder="student@school.com"
                placeholderTextColor={Colors.onSurfaceSubtle}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                Password
              </Text>
              <View className="flex-row items-center bg-white/10 border border-white/10 rounded-2xl px-4">
                <TextInput
                  className="flex-1 py-4 text-white text-base"
                  placeholder="••••••••"
                  placeholderTextColor={Colors.onSurfaceSubtle}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color={Colors.onSurfaceSubtle}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleSignIn}
              disabled={loading || !email || !password}
              className="bg-sky-600 rounded-2xl py-4 items-center mt-2"
              style={{ opacity: loading || !email || !password ? 0.6 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text className="text-white text-base font-bold">Sign In</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-white/10" />
              <Text className="text-slate-400 font-bold px-4">OR</Text>
              <View className="flex-1 h-[1px] bg-white/10" />
            </View>

            <TouchableOpacity
              onPress={handleGoogleSignIn}
              className="bg-white/5 border border-white/10 rounded-2xl py-4 items-center flex-row justify-center"
            >
              <Ionicons name="logo-google" size={20} color="white" />
              <Text className="text-white text-base font-bold ml-3">Continue with Google</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View className="flex-row justify-center mt-8 gap-1">
            <Text className="text-slate-500 text-sm">Don't have an account?</Text>
            <Link href="/(auth)/sign-up">
              <Text className="text-sky-400 text-sm font-bold">Sign up</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
