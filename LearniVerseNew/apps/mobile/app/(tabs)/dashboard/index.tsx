import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
// @ts-expect-error
import { format } from "date-fns";
import { Colors } from "@/constants/colors";

function StudentDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.current);
  const activeCourses = useQuery(api.enrollments.listMyActiveCourses);
  const applications = useQuery(api.enrollments.listMine) ?? [];
  const deadlines = useQuery(api.enrollments.listAllMyDeadlines) ?? [];
  const liveSessions = useQuery(api.enrollments.listAllMyLiveSessions) ?? [];
  const announcements = useQuery(
    api.parentServices.listAnnouncements,
    user ? { role: user.role } : "skip",
  ) ?? [];
  const claimEnrollments = useMutation(api.enrollments.claimMyEnrollments);
  const claimedRef = useRef(false);

  useEffect(() => {
    if (!user || claimedRef.current) return;
    if (user.role === "teacher" || user.role === "admin") return;
    claimedRef.current = true;
    void claimEnrollments();
  }, [user, claimEnrollments]);

  const enrolled = activeCourses && activeCourses.length > 0;
  const activeApp = applications.find((a) =>
    ["submitted", "pre_approved", "approved", "rejected"].includes(a.status)
  );

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        {/* Header greeting */}
        <View className="mb-6 flex-row items-center justify-between">
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-sky-600 mb-1">
              EduSpace
            </Text>
            <Text className="text-2xl font-black text-slate-950 tracking-tight">
              {user ? `Hello, ${user.firstName || "Student"}` : "Dashboard"}
            </Text>
          </View>
          <TouchableOpacity 
            onPress={() => router.push("/(student)/id")}
            className="w-12 h-12 bg-sky-100 rounded-2xl items-center justify-center border border-sky-200"
          >
            <Ionicons name="qr-code-outline" size={24} color="#0369a1" />
          </TouchableOpacity>
        </View>

        {/* Live sessions banner */}
        {liveSessions.length > 0 && (
          <View className="bg-slate-950 rounded-3xl p-5 mb-5">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="radio" size={16} color="#34d399" />
              <Text className="text-white text-xs font-black uppercase tracking-widest">Live Now</Text>
            </View>
            {liveSessions.slice(0, 2).map((session) => (
              <View key={session._id} className="mb-3 last:mb-0">
                <Text className="text-white/40 text-[10px] font-black uppercase tracking-widest mb-0.5">
                  {session.courseCode}
                </Text>
                <Text className="text-white font-semibold text-sm">{session.title}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className="bg-emerald-400/20 px-2 py-0.5 rounded-full">
                    <Text className="text-emerald-400 text-[10px] font-black">Happening Now</Text>
                  </View>
                  <Text className="text-white/40 text-[10px]">
                    Ends {format(session.endTime, "p")}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {enrolled ? (
          <>
            {/* My Courses */}
            <Text className="text-xs font-black uppercase tracking-widest text-sky-700 mb-3">
              My Subjects
            </Text>
            <View className="gap-3 mb-6">
              {(activeCourses ?? []).filter(Boolean).slice(0, 4).map((course) => (
                <TouchableOpacity
                  key={course!._id}
                  onPress={() => router.push(`/(tabs)/courses/${course!._id}` as never)}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm"
                >
                  <Text className="text-sky-700 text-[10px] font-black uppercase tracking-widest mb-1">
                    {course!.department ?? course!.courseCode}
                  </Text>
                  <Text className="text-slate-950 font-bold text-base">{course!.courseName}</Text>
                  <View className="flex-row items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <Text className="text-slate-400 text-xs">
                      Enrolled {new Date(course!.enrolledAt).toLocaleDateString()}
                    </Text>
                    <Ionicons name="chevron-forward" size={14} color={Colors.onSurfaceSubtle} />
                  </View>
                </TouchableOpacity>
              ))}
              {(activeCourses ?? []).filter(Boolean).length > 4 && (
                <TouchableOpacity
                  onPress={() => router.push("/(tabs)/courses")}
                  className="bg-sky-50 rounded-3xl p-4 items-center"
                >
                  <Text className="text-sky-700 text-sm font-bold">
                    View all {activeCourses!.length} subjects
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              onPress={() => router.push("/transport")}
              className="bg-emerald-600 rounded-3xl p-5 flex-row items-center gap-4 mb-4"
            >
              <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
                <Ionicons name="bus-outline" size={22} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">Transport Hub</Text>
                <Text className="text-white/70 text-xs mt-0.5">
                  Book routes, track scans, and report incidents
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push("/(events)/index")}
              className="bg-rose-600 rounded-3xl p-5 flex-row items-center gap-4 mb-6"
            >
              <View className="w-12 h-12 rounded-2xl bg-white/20 items-center justify-center">
                <Ionicons name="ticket-outline" size={22} color="white" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base">Events & Tickets</Text>
                <Text className="text-white/70 text-xs mt-0.5">
                  Discover upcoming events and get your digital tickets
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="white" />
            </TouchableOpacity>

            {/* Upcoming deadlines */}
            {deadlines.length > 0 && (
              <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-5">
                <View className="flex-row items-center gap-2 mb-4">
                  <Ionicons name="time-outline" size={18} color={Colors.primary} />
                  <Text className="text-slate-950 text-sm font-black uppercase tracking-widest">
                    Next Priorities
                  </Text>
                </View>
                {deadlines.slice(0, 3).map((deadline) => (
                  <View key={deadline._id} className="flex-row items-start gap-3 mb-3 last:mb-0">
                    <View className="w-2 h-2 rounded-full bg-sky-500 mt-1.5 shrink-0" />
                    <View className="flex-1">
                      <Text className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        {deadline.courseCode}
                      </Text>
                      <Text className="text-slate-900 font-semibold text-sm">{deadline.title}</Text>
                      <Text className="text-slate-500 text-xs mt-0.5">
                        Due {format(deadline.deadline!, "MMM d, p")}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Announcements */}
            {announcements.length > 0 && (
              <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
                <View className="flex-row items-center justify-between mb-4">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="megaphone-outline" size={18} color={Colors.danger} />
                    <Text className="text-slate-950 text-sm font-black uppercase tracking-widest">
                      School Notices
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => router.push("/announcements/index")}>
                    <Text className="text-sky-600 text-xs font-bold">View All</Text>
                  </TouchableOpacity>
                </View>
                {announcements.slice(0, 3).map((ann) => (
                  <View key={ann._id} className="flex-row items-start gap-3 mb-3 last:mb-0">
                    <View
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        ann.importance === "high" ? "bg-rose-500" : "bg-sky-500"
                      }`}
                    />
                    <View className="flex-1">
                      <Text className="text-slate-900 font-semibold text-sm">{ann.title}</Text>
                      <Text className="text-slate-500 text-xs mt-0.5" numberOfLines={2}>
                        {ann.body}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        ) : activeApp ? (
          // Application status
          <View className="bg-white rounded-3xl p-6 border border-slate-200">
            <Text className="text-violet-600 text-xs font-black uppercase tracking-widest mb-2">
              Application Status
            </Text>
            <Text className="text-slate-950 text-xl font-black mb-4">
              {activeApp.status === "submitted" ? "Under Review" :
               activeApp.status === "pre_approved" ? "Pre-Approved ✓" :
               activeApp.status === "approved" ? "Approved 🎉" :
               "Application Rejected"}
            </Text>
            <View className={`rounded-2xl p-4 ${
              activeApp.status === "approved" ? "bg-emerald-50" :
              activeApp.status === "rejected" ? "bg-rose-50" :
              "bg-amber-50"
            }`}>
              <Text className={`text-sm font-medium ${
                activeApp.status === "approved" ? "text-emerald-700" :
                activeApp.status === "rejected" ? "text-rose-700" :
                "text-amber-700"
              }`}>
                {activeApp.status === "submitted"
                  ? "Your application is being reviewed by our admissions team. We will notify you of any updates."
                  : activeApp.status === "pre_approved"
                  ? "Your application has been pre-approved. Please complete your payment to finalise enrollment."
                  : activeApp.status === "approved"
                  ? "Congratulations! Your enrollment has been approved. Your courses are now active."
                  : activeApp.notes ?? "Your application was not successful. Please contact admissions."}
              </Text>
            </View>
          </View>
        ) : (
          // No enrollment yet
          <View className="bg-white rounded-3xl p-6 border border-slate-200 items-center">
            <View className="w-16 h-16 rounded-full bg-sky-50 items-center justify-center mb-4">
              <Ionicons name="school-outline" size={32} color={Colors.primary} />
            </View>
            <Text className="text-slate-950 text-xl font-black mb-2 text-center">
              Start Your Journey
            </Text>
            <Text className="text-slate-500 text-sm text-center mb-6 leading-6">
              Apply to enroll in EduSpace and access world-class CAPS education from anywhere.
            </Text>
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/courses")}
              className="bg-sky-600 rounded-2xl px-8 py-3"
            >
              <Text className="text-white font-bold">Apply Now</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function TeacherDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.current);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-violet-600 mb-1">
            Teacher Portal
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">
            Hello, {user?.firstName ?? "Teacher"}
          </Text>
        </View>

        <View className="gap-3">
          {[
            { label: "Attendance", icon: "checkmark-circle-outline" as const, route: "/(teacher)/attendance", color: "bg-sky-50", textColor: "text-sky-700" },
            { label: "Mark Assignments", icon: "pencil-outline" as const, route: "/(teacher)/marking/index", color: "bg-violet-50", textColor: "text-violet-700" },
            { label: "Grade Book", icon: "bar-chart-outline" as const, route: "/(teacher)/gradebook/index", color: "bg-emerald-50", textColor: "text-emerald-700" },
            { label: "Behaviour Records", icon: "medal-outline" as const, route: "/(teacher)/behaviour/index", color: "bg-amber-50", textColor: "text-amber-700" },
            { label: "Reports", icon: "document-text-outline" as const, route: "/(teacher)/reports/index", color: "bg-rose-50", textColor: "text-rose-700" },
            { label: "Transport Hub", icon: "bus-outline" as const, route: "/transport", color: "bg-cyan-50", textColor: "text-cyan-700" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as never)}
              className={`${item.color} rounded-3xl p-5 flex-row items-center gap-4`}
            >
              <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center">
                <Ionicons name={item.icon} size={22} color={Colors.navy} />
              </View>
              <Text className={`${item.textColor} font-bold text-base flex-1`}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function AdminDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.current);
  const stats = useQuery(api.admin.getDashboardStats);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-violet-600 mb-1">
            Admin Portal
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">
            Hello, {user?.firstName ?? "Admin"}
          </Text>
        </View>

        {/* Stats */}
        {stats && (
          <View className="flex-row gap-3 mb-6">
            {[
              { label: "Students", value: stats.studentCount ?? 0, color: "bg-sky-50", text: "text-sky-700" },
              { label: "Courses", value: stats.courseCount ?? 0, color: "bg-violet-50", text: "text-violet-700" },
              { label: "Pending Apps", value: stats.pendingAdmissionsCount ?? 0, color: "bg-amber-50", text: "text-amber-700" },
            ].map((s) => (
              <View key={s.label} className={`${s.color} rounded-2xl p-4 flex-1 items-center`}>
                <Text className={`${s.text} text-2xl font-black`}>{s.value}</Text>
                <Text className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                  {s.label}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View className="gap-3">
          {[
            { label: "Admissions Center", icon: "person-add-outline" as const, route: "/(admin)/enrollments/index", desc: "Review enrollment applications" },
            { label: "User Directory", icon: "people-outline" as const, route: "/(admin)/users/index", desc: "Manage students & staff" },
            { label: "Subject Catalog", icon: "book-outline" as const, route: "/(admin)/courses/index", desc: "Create & manage subjects" },
            { label: "Transport Hub", icon: "bus-outline" as const, route: "/transport", desc: "Routes, bookings & incidents" },
            { label: "Fee Office", icon: "card-outline" as const, route: "/(admin)/fees/index", desc: "Invoices & payments" },
            { label: "Timetable", icon: "calendar-outline" as const, route: "/(admin)/timetable/index", desc: "Manage class schedules" },
            { label: "Communications", icon: "megaphone-outline" as const, route: "/(admin)/communications/index", desc: "Announcements & notices" },
            { label: "Performance", icon: "bar-chart-outline" as const, route: "/(admin)/performance/index", desc: "School-wide analytics" },
            { label: "Events Management", icon: "ticket-outline" as const, route: "/(admin)/events/index", desc: "Create events & scan tickets" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as never)}
              className="bg-white rounded-3xl p-5 flex-row items-center gap-4 border border-slate-100 shadow-sm"
            >
              <View className="w-12 h-12 rounded-2xl bg-slate-100 items-center justify-center">
                <Ionicons name={item.icon} size={22} color={Colors.navy} />
              </View>
              <View className="flex-1">
                <Text className="text-slate-950 font-bold text-sm">{item.label}</Text>
                <Text className="text-slate-400 text-xs mt-0.5">{item.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function CoachDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.current);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-orange-600 mb-1">
            Coach Portal
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">
            Hello, {user?.firstName ?? "Coach"}
          </Text>
        </View>
        <View className="gap-3">
          {[
            { label: "My Teams", icon: "people-outline" as const, route: "/(coach)/teams", color: "bg-orange-50", textColor: "text-orange-700" },
            { label: "Training Sessions", icon: "calendar-outline" as const, route: "/(coach)/training", color: "bg-emerald-50", textColor: "text-emerald-700" },
            { label: "Attendance", icon: "checkmark-circle-outline" as const, route: "/(coach)/attendance", color: "bg-sky-50", textColor: "text-sky-700" },
            { label: "Match Fixtures", icon: "trophy-outline" as const, route: "/(coach)/fixtures", color: "bg-violet-50", textColor: "text-violet-700" },
            { label: "Performance Reports", icon: "document-text-outline" as const, route: "/(coach)/reports", color: "bg-rose-50", textColor: "text-rose-700" },
            { label: "Venues", icon: "location-outline" as const, route: "/(coach)/venues", color: "bg-teal-50", textColor: "text-teal-700" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as never)}
              className={`${item.color} rounded-3xl p-5 flex-row items-center gap-4`}
            >
              <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center">
                <Ionicons name={item.icon} size={22} color={Colors.navy} />
              </View>
              <Text className={`${item.textColor} font-bold text-base flex-1`}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function DriverDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.current);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-cyan-600 mb-1">
            Driver Portal
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">
            Hello, {user?.firstName ?? "Driver"}
          </Text>
        </View>
        <View className="gap-3">
          {[
            { label: "My Routes", icon: "map-outline" as const, route: "/(driver)/routes", color: "bg-cyan-50", textColor: "text-cyan-700" },
            { label: "Passenger Manifest", icon: "list-outline" as const, route: "/(driver)/passengers", color: "bg-sky-50", textColor: "text-sky-700" },
            { label: "Scan Boarding", icon: "qr-code-outline" as const, route: "/(driver)/scan", color: "bg-emerald-50", textColor: "text-emerald-700" },
            { label: "Report Incident", icon: "warning-outline" as const, route: "/(driver)/incident", color: "bg-rose-50", textColor: "text-rose-700" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as never)}
              className={`${item.color} rounded-3xl p-5 flex-row items-center gap-4`}
            >
              <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center">
                <Ionicons name={item.icon} size={22} color={Colors.navy} />
              </View>
              <Text className={`${item.textColor} font-bold text-base flex-1`}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function TransportAdminDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.current);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-1">
            Transport Admin Portal
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">
            Hello, {user?.firstName ?? "Admin"}
          </Text>
        </View>
        <View className="gap-3">
          {[
            { label: "Manage Routes", icon: "map-outline" as const, route: "/(transport_admin)/routes", color: "bg-indigo-50", textColor: "text-indigo-700" },
            { label: "Bus Assignments", icon: "bus-outline" as const, route: "/(transport_admin)/buses", color: "bg-sky-50", textColor: "text-sky-700" },
            { label: "Booking Requests", icon: "ticket-outline" as const, route: "/(transport_admin)/bookings", color: "bg-emerald-50", textColor: "text-emerald-700" },
            { label: "Notify Parents", icon: "megaphone-outline" as const, route: "/(transport_admin)/notify", color: "bg-amber-50", textColor: "text-amber-700" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as never)}
              className={`${item.color} rounded-3xl p-5 flex-row items-center gap-4`}
            >
              <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center">
                <Ionicons name={item.icon} size={22} color={Colors.navy} />
              </View>
              <Text className={`${item.textColor} font-bold text-base flex-1`}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ParentDashboard() {
  const router = useRouter();
  const user = useQuery(api.users.current);

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        <View className="mb-6">
          <Text className="text-xs font-black uppercase tracking-widest text-teal-600 mb-1">
            Parent Portal
          </Text>
          <Text className="text-2xl font-black text-slate-950 tracking-tight">
            Hello, {user?.firstName ?? "Parent"}
          </Text>
        </View>
        <View className="gap-3">
          {[
            { label: "My Children", icon: "people-outline" as const, route: "/(parent)/children", color: "bg-teal-50", textColor: "text-teal-700" },
            { label: "Academic Progress", icon: "bar-chart-outline" as const, route: "/(parent)/progress", color: "bg-sky-50", textColor: "text-sky-700" },
            { label: "Book Transport", icon: "bus-outline" as const, route: "/(parent)/transport", color: "bg-emerald-50", textColor: "text-emerald-700" },
            { label: "Messages & Notices", icon: "chatbubbles-outline" as const, route: "/(parent)/messages", color: "bg-violet-50", textColor: "text-violet-700" },
            { label: "Fee Statements", icon: "card-outline" as const, route: "/(parent)/fees", color: "bg-amber-50", textColor: "text-amber-700" },
            { label: "Events & Tickets", icon: "ticket-outline" as const, route: "/(events)/index", color: "bg-rose-50", textColor: "text-rose-700" },
          ].map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => router.push(item.route as never)}
              className={`${item.color} rounded-3xl p-5 flex-row items-center gap-4`}
            >
              <View className="w-12 h-12 rounded-2xl bg-white items-center justify-center">
                <Ionicons name={item.icon} size={22} color={Colors.navy} />
              </View>
              <Text className={`${item.textColor} font-bold text-base flex-1`}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

export default function DashboardScreen() {
  const user = useQuery(api.users.current);

  if (user === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (user?.role === "teacher") return <TeacherDashboard />;
  if (user?.role === "coach") return <CoachDashboard />;
  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "transport_admin") return <TransportAdminDashboard />;
  if (user?.role === "driver") return <DriverDashboard />;
  if (user?.role === "parent") return <ParentDashboard />;
  return <StudentDashboard />;
}
