import { Redirect } from "expo-router";

/** Landing screen — immediately redirect based on auth state (handled by AuthGate in _layout) */
export default function Index() {
  return <Redirect href="/(auth)/sign-in" />;
}
