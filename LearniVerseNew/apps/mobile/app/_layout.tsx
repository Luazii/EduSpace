/// <reference types="nativewind/types" />
import "../global.css";

import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { tokenCache } from "@/lib/clerk";
import { convex } from "@/lib/convex";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

const CLERK_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

/** Route protection — redirect unauthenticated users to sign-in */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isSignedIn && !inAuthGroup) {
      router.replace("/(auth)/sign-in");
    } else if (isSignedIn && inAuthGroup) {
      router.replace("/(tabs)/dashboard");
    }
  }, [isLoaded, isSignedIn, segments]);

  useEffect(() => {
    if (isLoaded) {
      SplashScreen.hideAsync();
    }
  }, [isLoaded]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <>
      {/* @ts-expect-error React 19 types issue */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ClerkProvider
          publishableKey={CLERK_KEY}
          tokenCache={tokenCache}
        >
          <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
            <AuthGate>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="(teacher)" />
                <Stack.Screen name="(admin)" />
                <Stack.Screen name="(coach)" />
                <Stack.Screen name="(driver)" />
                <Stack.Screen name="(transport_admin)" />
                <Stack.Screen name="(parent)" />
                <Stack.Screen name="profile/index" options={{ presentation: "modal", headerShown: true, title: "Profile" }} />
                <Stack.Screen name="notifications/index" options={{ presentation: "modal", headerShown: true, title: "Notifications" }} />
                <Stack.Screen name="announcements/index" options={{ headerShown: true, title: "Announcements" }} />
                <Stack.Screen name="payments/index" options={{ headerShown: true, title: "Payments" }} />
                <Stack.Screen name="transport/index" options={{ headerShown: true, title: "Transport Hub" }} />
              </Stack>
            </AuthGate>
          </ConvexProviderWithClerk>
        </ClerkProvider>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </>
  );
}
