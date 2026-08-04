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
import { useSignUp, useOAuth } from "@clerk/clerk-expo";
import { Link, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

WebBrowser.maybeCompleteAuthSession();

export default function SignUpScreen() {
  const { signUp, setActive, isLoaded } = useSignUp();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);

  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const handleGoogleSignUp = async () => {
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

  async function handleSignUp() {
    if (!isLoaded) return;
    setLoading(true);
    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress: email.trim().toLowerCase(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign up failed.";
      Alert.alert("Sign Up Failed", message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    if (!isLoaded) return;
    setVerifying(true);
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/(tabs)/dashboard");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Verification failed.";
      Alert.alert("Verification Failed", message);
    } finally {
      setVerifying(false);
    }
  }

  if (pendingVerification) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1 bg-slate-950"
      >
        <View className="flex-1 px-6 pt-20 pb-10">
          <View className="mb-12">
            <View className="w-14 h-14 rounded-2xl bg-emerald-600 items-center justify-center mb-6">
              <Ionicons name="mail" size={24} color="white" />
            </View>
            <Text className="text-white text-3xl font-black tracking-tight">
              Verify your email
            </Text>
            <Text className="text-slate-400 text-base mt-2 leading-6">
              We sent a 6-digit code to {email}. Enter it below to complete sign-up.
            </Text>
          </View>

          <View className="gap-4">
            <TextInput
              className="bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-white text-2xl text-center tracking-widest"
              placeholder="000000"
              placeholderTextColor={Colors.onSurfaceSubtle}
              keyboardType="numeric"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />

            <TouchableOpacity
              onPress={handleVerify}
              disabled={verifying || code.length < 6}
              className="bg-emerald-600 rounded-2xl py-4 items-center"
              style={{ opacity: verifying || code.length < 6 ? 0.6 : 1 }}
            >
              {verifying ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text className="text-white text-base font-bold">Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
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
          <View className="mb-10">
            <View className="w-14 h-14 rounded-2xl bg-violet-600 items-center justify-center mb-6">
              <Text className="text-white text-xl font-black">ES</Text>
            </View>
            <Text className="text-white text-3xl font-black tracking-tight">
              Create account
            </Text>
            <Text className="text-slate-400 text-base mt-2 leading-6">
              Join EduSpace — your world-class digital high school.
            </Text>
          </View>

          <View className="gap-4">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                  First Name
                </Text>
                <TextInput
                  className="bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-white text-base"
                  placeholder="Jane"
                  placeholderTextColor={Colors.onSurfaceSubtle}
                  autoCapitalize="words"
                  value={firstName}
                  onChangeText={setFirstName}
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                  Last Name
                </Text>
                <TextInput
                  className="bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-white text-base"
                  placeholder="Doe"
                  placeholderTextColor={Colors.onSurfaceSubtle}
                  autoCapitalize="words"
                  value={lastName}
                  onChangeText={setLastName}
                />
              </View>
            </View>

            <View>
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                Email Address
              </Text>
              <TextInput
                className="bg-white/10 border border-white/10 rounded-2xl px-4 py-4 text-white text-base"
                placeholder="jane@school.com"
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
                  placeholder="Min 8 characters"
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
              onPress={handleSignUp}
              disabled={loading || !firstName || !email || !password}
              className="bg-violet-600 rounded-2xl py-4 items-center mt-2"
              style={{ opacity: loading || !firstName || !email || !password ? 0.6 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text className="text-white text-base font-bold">Create Account</Text>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-white/10" />
              <Text className="text-slate-400 font-bold px-4">OR</Text>
              <View className="flex-1 h-[1px] bg-white/10" />
            </View>

            <TouchableOpacity
              onPress={handleGoogleSignUp}
              className="bg-white/5 border border-white/10 rounded-2xl py-4 items-center flex-row justify-center"
            >
              <Ionicons name="logo-google" size={20} color="white" />
              <Text className="text-white text-base font-bold ml-3">Continue with Google</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-center mt-8 gap-1">
            <Text className="text-slate-500 text-sm">Already have an account?</Text>
            <Link href="/(auth)/sign-in">
              <Text className="text-sky-400 text-sm font-bold">Sign in</Text>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
