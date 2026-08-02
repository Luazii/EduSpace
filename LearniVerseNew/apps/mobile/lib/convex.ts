import { ConvexReactClient } from "convex/react";
import Constants from "expo-constants";

const convexUrl =
  process.env.EXPO_PUBLIC_CONVEX_URL ??
  (Constants.expoConfig?.extra?.convexUrl as string | undefined) ??
  "";

if (!convexUrl) {
  console.warn("EXPO_PUBLIC_CONVEX_URL is not set. Convex features will not work.");
}

export const convex = new ConvexReactClient(convexUrl);
