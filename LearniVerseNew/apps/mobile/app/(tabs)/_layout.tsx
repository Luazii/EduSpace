import { Tabs, useRouter } from "expo-router";
import { TouchableOpacity, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Colors } from "@/constants/colors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabBarIcon({ name, color }: { name: IoniconName; color: string }) {
  return <Ionicons size={22} name={name} color={color} />;
}

function HeaderRight() {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.push("/notifications/index")}
      className="mr-4"
    >
      <Ionicons name="notifications-outline" size={22} color={Colors.navy} />
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const user = useQuery(api.users.current);
  const role = user?.role;

  // Teacher-specific tabs
  if (role === "teacher" || role === "coach") {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.onSurfaceSubtle,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.surfaceBorder,
            paddingBottom: 8,
            height: 64,
          },
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.navy,
          headerRight: () => <HeaderRight />,
        }}
      >
        <Tabs.Screen
          name="dashboard/index"
          options={{
            title: "Dashboard",
            tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="courses/index"
          options={{
            title: "My Courses",
            tabBarIcon: ({ color }) => <TabBarIcon name="book-outline" color={color} />,
          }}
        />
        {/* Hide student-only tabs */}
        <Tabs.Screen name="study/index" options={{ href: null }} />
        <Tabs.Screen name="progress/index" options={{ href: null }} />
        <Tabs.Screen name="bookings/index" options={{ href: null }} />
      </Tabs>
    );
  }

  // Admin-specific tabs — redirect to admin section
  if (role === "admin" || role === "transport_admin" || role === "driver") {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: Colors.secondary,
          tabBarInactiveTintColor: Colors.onSurfaceSubtle,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.surfaceBorder,
            paddingBottom: 8,
            height: 64,
          },
          headerStyle: { backgroundColor: Colors.surface },
          headerTintColor: Colors.navy,
          headerRight: () => <HeaderRight />,
        }}
      >
        <Tabs.Screen
          name="dashboard/index"
          options={{
            title: "Overview",
            tabBarIcon: ({ color }) => <TabBarIcon name="grid-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="courses/index"
          options={{
            title: "Subjects",
            tabBarIcon: ({ color }) => <TabBarIcon name="book-outline" color={color} />,
          }}
        />
        <Tabs.Screen name="study/index" options={{ href: null }} />
        <Tabs.Screen name="progress/index" options={{ href: null }} />
        <Tabs.Screen name="bookings/index" options={{ href: null }} />
      </Tabs>
    );
  }

  // Default student tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceSubtle,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.surfaceBorder,
          paddingBottom: 8,
          height: 64,
        },
        headerStyle: { backgroundColor: Colors.surface },
        headerTintColor: Colors.navy,
        headerRight: () => <HeaderRight />,
      }}
    >
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <TabBarIcon name="home-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="courses/index"
        options={{
          title: "Courses",
          tabBarIcon: ({ color }) => <TabBarIcon name="book-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="study/index"
        options={{
          title: "Study",
          tabBarIcon: ({ color }) => <TabBarIcon name="pencil-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress/index"
        options={{
          title: "Progress",
          tabBarIcon: ({ color }) => <TabBarIcon name="bar-chart-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings/index"
        options={{
          title: "Bookings",
          tabBarIcon: ({ color }) => <TabBarIcon name="calendar-outline" color={color} />,
        }}
      />
    </Tabs>
  );
}
