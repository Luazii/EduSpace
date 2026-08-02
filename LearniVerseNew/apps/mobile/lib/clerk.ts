import * as SecureStore from "expo-secure-store";
import type { TokenCache } from "@clerk/clerk-expo/dist/cache";

/**
 * Persists Clerk JWT tokens in the device's secure keychain.
 * Required for session persistence across app restarts on both iOS and Android.
 */
export const tokenCache: TokenCache = {
  async getToken(key: string) {
    try {
      return await SecureStore.getItemAsync(key);
    } catch {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch {
      // Silently fail on secure store errors (e.g., simulator)
    }
  },
  async clearToken(key: string) {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      // Silently fail
    }
  },
};
