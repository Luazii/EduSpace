import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { useRouter } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export default function AttendanceScreen() {
  const teams = useQuery(api.coach.listMyTeams);
  const [selectedTeam, setSelectedTeam] = useState<Id<"sportsTeams"> | null>(null);

  if (teams === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="p-5 pb-24">
          <View className="mb-6">
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Attendance</Text>
            <Text className="text-slate-500 text-sm mt-1">Select a team to mark attendance</Text>
          </View>

          <View className="gap-4">
            {teams.map(team => (
              <TouchableOpacity
                key={team._id}
                onPress={() => setSelectedTeam(team._id)}
                className="bg-white rounded-3xl p-5 border border-slate-200 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-sky-600 text-xs font-black uppercase tracking-widest">{team.sportName}</Text>
                  <Text className="text-lg font-bold text-slate-900">{team.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.onSurfaceSubtle} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <Modal visible={!!selectedTeam} animationType="slide" presentationStyle="pageSheet">
        {selectedTeam && (
          <SessionSelector teamId={selectedTeam} onClose={() => setSelectedTeam(null)} />
        )}
      </Modal>
    </View>
  );
}

function SessionSelector({ teamId, onClose }: { teamId: Id<"sportsTeams">; onClose: () => void }) {
  const sessions = useQuery(api.coach.listTrainingSessions, { teamId });
  const [selectedSession, setSelectedSession] = useState<Id<"trainingSessions"> | null>(null);

  if (selectedSession) {
    return <AttendanceMarker sessionId={selectedSession} onClose={() => setSelectedSession(null)} teamId={teamId} />;
  }

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-black text-slate-900">Select Session</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-sky-600 font-bold">Close</Text>
        </TouchableOpacity>
      </View>

      {sessions === undefined ? (
        <ActivityIndicator size="large" />
      ) : sessions.length === 0 ? (
        <Text className="text-slate-500 text-center mt-10">No sessions scheduled.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {sessions.map((session) => (
            <TouchableOpacity 
              key={session._id} 
              onPress={() => setSelectedSession(session._id)}
              className="bg-white rounded-3xl p-5 mb-4 border border-slate-200 flex-row justify-between items-center"
            >
              <View>
                <Text className="text-slate-900 font-bold text-base mb-1">{session.title}</Text>
                <View className="flex-row items-center gap-2">
                  <Ionicons name="time-outline" size={14} color={Colors.onSurfaceSubtle} />
                  <Text className="text-slate-600 text-sm">{format(session.startTime, "MMM d, h:mm a")}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function AttendanceMarker({ sessionId, teamId, onClose }: { sessionId: Id<"trainingSessions">; teamId: Id<"sportsTeams">; onClose: () => void }) {
  const router = useRouter();
  const roster = useQuery(api.coach.getTeamRoster, { teamId });
  const attendance = useQuery(api.coach.getAttendanceForSession, { sessionId });
  const mark = useMutation(api.coach.markAttendance);

  const getStatus = (studentId: Id<"users">) => {
    return attendance?.find(a => a.studentUserId === studentId)?.status;
  };

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onClose} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text className="text-sky-600 font-bold">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">Mark Register</Text>
        <TouchableOpacity 
          onPress={() => router.push(`/(coach)/training/scanner?sessionId=${sessionId}` as never)}
          className="w-10 h-10 bg-sky-100 rounded-full items-center justify-center border border-sky-200"
        >
          <Ionicons name="qr-code-outline" size={20} color="#0369a1" />
        </TouchableOpacity>
      </View>

      {roster === undefined || attendance === undefined ? (
        <ActivityIndicator size="large" />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {roster.map(member => {
            const currentStatus = getStatus(member.studentUserId as Id<"users">);
            
            return (
              <View key={member._id} className="bg-white rounded-3xl p-5 mb-4 border border-slate-200">
                <Text className="text-slate-900 font-bold text-base mb-3">{member.studentName}</Text>
                
                <View className="flex-row gap-2">
                  {[
                    { val: "present", label: "Present", color: "bg-emerald-500", text: "text-emerald-700" },
                    { val: "absent", label: "Absent", color: "bg-rose-500", text: "text-rose-700" },
                    { val: "late", label: "Late", color: "bg-amber-500", text: "text-amber-700" },
                    { val: "excused", label: "Excused", color: "bg-slate-500", text: "text-slate-700" },
                  ].map(opt => {
                    const isSelected = currentStatus === opt.val;
                    return (
                      <TouchableOpacity
                        key={opt.val}
                        onPress={() => mark({ 
                          sessionId, 
                          studentUserId: member.studentUserId as Id<"users">, 
                          status: opt.val as any 
                        })}
                        className={`flex-1 items-center justify-center py-2 rounded-xl border ${
                          isSelected ? `${opt.color} border-transparent` : `bg-white border-slate-200`
                        }`}
                      >
                        <Text className={`text-xs font-bold ${isSelected ? 'text-white' : opt.text}`}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
