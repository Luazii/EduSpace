import { Redirect } from "expo-router";

export default function LegacyTransportScreen() {
  // This route is deprecated in favor of the new role-based dashboard route groups:
  // /(transport_admin)/..., /(driver)/..., /(parent)/...
  return <Redirect href="/(tabs)/dashboard" />;
}
