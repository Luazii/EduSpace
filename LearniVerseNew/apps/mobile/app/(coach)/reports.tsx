import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
// @ts-expect-error - date-fns v4 has module resolution issues
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export default function ReportsScreen() {
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
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Performance Reports</Text>
            <Text className="text-slate-500 text-sm mt-1">Select a team to evaluate players</Text>
          </View>

          <View className="gap-4">
            {teams.map(team => (
              <TouchableOpacity
                key={team._id}
                onPress={() => setSelectedTeam(team._id)}
                className="bg-white rounded-3xl p-5 border border-slate-200 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-rose-600 text-xs font-black uppercase tracking-widest">{team.sportName}</Text>
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
          <TeamRosterSelector teamId={selectedTeam} onClose={() => setSelectedTeam(null)} />
        )}
      </Modal>
    </View>
  );
}

function TeamRosterSelector({ teamId, onClose }: { teamId: Id<"sportsTeams">; onClose: () => void }) {
  const roster = useQuery(api.coach.getTeamRoster, { teamId });
  const [selectedStudent, setSelectedStudent] = useState<{ id: Id<"users">, name: string } | null>(null);

  if (selectedStudent) {
    return <StudentEvaluations 
      teamId={teamId} 
      studentUserId={selectedStudent.id} 
      studentName={selectedStudent.name} 
      onClose={() => setSelectedStudent(null)} 
    />;
  }

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-black text-slate-900">Select Player</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-rose-600 font-bold">Close</Text>
        </TouchableOpacity>
      </View>

      {roster === undefined ? (
        <ActivityIndicator size="large" />
      ) : roster.length === 0 ? (
        <Text className="text-slate-500 text-center mt-10">No players assigned to this team.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {roster.map((member) => (
            <TouchableOpacity 
              key={member._id} 
              onPress={() => setSelectedStudent({ id: member.studentUserId as Id<"users">, name: member.studentName })}
              className="bg-white rounded-3xl p-5 mb-4 border border-slate-200 flex-row justify-between items-center"
            >
              <Text className="text-slate-900 font-bold text-base">{member.studentName}</Text>
              <Ionicons name="chevron-forward" size={20} color={Colors.onSurfaceSubtle} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function StudentEvaluations({ teamId, studentUserId, studentName, onClose }: { teamId: Id<"sportsTeams">; studentUserId: Id<"users">; studentName: string; onClose: () => void }) {
  // We need sportId for createReport, so we get the team to get its sportId
  const team = useQuery(api.coach.listMyTeams)?.find(t => t._id === teamId);
  const reports = useQuery(api.coach.listReports, { studentUserId, sportId: team?.sportId });
  const createReport = useMutation(api.coach.createReport);
  
  const [showAdd, setShowAdd] = useState(false);
  const [score, setScore] = useState("");
  const [comments, setComments] = useState("");

  const handleCreate = () => {
    if (!team) return;
    createReport({
      studentUserId,
      sportId: team.sportId,
      performanceScore: parseInt(score) || undefined,
      comments,
    });
    setShowAdd(false);
    setScore("");
    setComments("");
  };

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <TouchableOpacity onPress={onClose} className="flex-row items-center gap-1">
          <Ionicons name="chevron-back" size={20} color={Colors.primary} />
          <Text className="text-rose-600 font-bold">Back</Text>
        </TouchableOpacity>
        <Text className="text-xl font-black text-slate-900">{studentName}</Text>
        <View className="w-12" /> {/* Spacer */}
      </View>

      <TouchableOpacity 
        onPress={() => setShowAdd(true)}
        className="bg-rose-600 rounded-2xl p-4 flex-row justify-center items-center gap-2 mb-6"
      >
        <Ionicons name="document-text-outline" size={20} color="white" />
        <Text className="text-white font-bold">Write Evaluation</Text>
      </TouchableOpacity>

      {reports === undefined ? (
        <ActivityIndicator size="large" />
      ) : reports.length === 0 ? (
        <Text className="text-slate-500 text-center mt-10">No reports found for this player.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {reports.map((report) => (
            <View key={report._id} className="bg-white rounded-3xl p-5 mb-4 border border-slate-200">
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-slate-900 font-bold text-base">{format(report.evaluationDate, "MMM d, yyyy")}</Text>
                {report.performanceScore && (
                  <View className="bg-rose-100 px-2 py-1 rounded-md">
                    <Text className="text-rose-700 text-xs font-black">Score: {report.performanceScore}/100</Text>
                  </View>
                )}
              </View>
              <Text className="text-slate-600 text-sm mt-2">{report.comments}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Report Modal */}
      <Modal visible={showAdd} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white rounded-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-slate-900">New Evaluation</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Performance Score (Optional)</Text>
            <TextInput
              value={score}
              onChangeText={setScore}
              placeholder="e.g. 85"
              keyboardType="number-pad"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 font-medium"
            />
            
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Comments</Text>
            <TextInput
              value={comments}
              onChangeText={setComments}
              placeholder="Detailed feedback..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 font-medium min-h-[100px]"
            />
            
            <TouchableOpacity onPress={handleCreate} disabled={!comments} className={`rounded-xl py-4 items-center ${comments ? 'bg-rose-600' : 'bg-slate-300'}`}>
              <Text className="text-white font-bold text-base">Save Evaluation</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
