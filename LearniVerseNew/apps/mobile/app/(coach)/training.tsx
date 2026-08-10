import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export default function TrainingScreen() {
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
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Training Sessions</Text>
            <Text className="text-slate-500 text-sm mt-1">Select a team to view schedule</Text>
          </View>

          <View className="gap-4">
            {teams.map(team => (
              <TouchableOpacity
                key={team._id}
                onPress={() => setSelectedTeam(team._id)}
                className="bg-white rounded-3xl p-5 border border-slate-200 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-emerald-600 text-xs font-black uppercase tracking-widest">{team.sportName}</Text>
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
          <TeamTraining teamId={selectedTeam} onClose={() => setSelectedTeam(null)} />
        )}
      </Modal>
    </View>
  );
}

function TeamTraining({ teamId, onClose }: { teamId: Id<"sportsTeams">; onClose: () => void }) {
  const sessions = useQuery(api.coach.listTrainingSessions, { teamId });
  const createSession = useMutation(api.coach.createTrainingSession);
  
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [venue, setVenue] = useState("");

  const handleCreate = () => {
    // Basic implementation: set to tomorrow at 15:00 for demo purposes
    // A real app would use a date/time picker
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(15, 0, 0, 0);
    
    createSession({
      teamId,
      title: title || "Practice",
      startTime: tomorrow.getTime(),
      endTime: tomorrow.getTime() + 120 * 60000,
      venue,
    });
    setShowAdd(false);
    setTitle("");
    setVenue("");
  };

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-black text-slate-900">Schedule</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-emerald-600 font-bold">Close</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={() => setShowAdd(true)}
        className="bg-emerald-600 rounded-2xl p-4 flex-row justify-center items-center gap-2 mb-6"
      >
        <Ionicons name="calendar" size={20} color="white" />
        <Text className="text-white font-bold">Schedule Practice</Text>
      </TouchableOpacity>

      {sessions === undefined ? (
        <ActivityIndicator size="large" />
      ) : sessions.length === 0 ? (
        <Text className="text-slate-500 text-center mt-10">No sessions scheduled.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {sessions.map((session) => (
            <View key={session._id} className="bg-white rounded-3xl p-5 mb-4 border border-slate-200">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-slate-900 font-bold text-base">{session.title}</Text>
                <View className={`px-2 py-1 rounded-md ${session.status === 'scheduled' ? 'bg-sky-100' : 'bg-emerald-100'}`}>
                  <Text className={`text-[10px] font-black uppercase ${session.status === 'scheduled' ? 'text-sky-700' : 'text-emerald-700'}`}>
                    {session.status}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="time-outline" size={14} color={Colors.onSurfaceSubtle} />
                <Text className="text-slate-600 text-sm">{format(session.startTime, "MMM d, h:mm a")}</Text>
              </View>
              
              {session.venue && (
                <View className="flex-row items-center gap-2">
                  <Ionicons name="location-outline" size={14} color={Colors.onSurfaceSubtle} />
                  <Text className="text-slate-600 text-sm">{session.venue}</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Session Modal */}
      <Modal visible={showAdd} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white rounded-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-slate-900">New Session</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Tactical Practice"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 font-medium"
            />
            
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Venue</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. Field A"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 font-medium"
            />
            
            <TouchableOpacity onPress={handleCreate} className="bg-emerald-600 rounded-xl py-4 items-center">
              <Text className="text-white font-bold text-base">Create Session</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
