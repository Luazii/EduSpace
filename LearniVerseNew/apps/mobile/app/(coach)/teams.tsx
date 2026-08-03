import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, FlatList } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { Id } from "@/convex/_generated/dataModel";

export default function TeamsScreen() {
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
            <Text className="text-2xl font-black text-slate-950 tracking-tight">My Teams</Text>
            <Text className="text-slate-500 text-sm mt-1">Manage your team rosters</Text>
          </View>

          {teams.length === 0 ? (
            <View className="bg-white rounded-3xl p-6 items-center border border-slate-200">
              <Ionicons name="people-outline" size={32} color={Colors.onSurfaceSubtle} className="mb-3" />
              <Text className="text-slate-500 text-center">You haven't been assigned to any teams yet.</Text>
            </View>
          ) : (
            <View className="gap-4">
              {teams.map(team => (
                <TouchableOpacity
                  key={team._id}
                  onPress={() => setSelectedTeam(team._id)}
                  className="bg-white rounded-3xl p-5 border border-slate-200"
                >
                  <View className="flex-row justify-between items-center mb-3">
                    <View>
                      <Text className="text-orange-600 text-xs font-black uppercase tracking-widest">{team.sportName}</Text>
                      <Text className="text-lg font-bold text-slate-900">{team.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={Colors.onSurfaceSubtle} />
                  </View>
                  <View className="bg-slate-50 self-start px-3 py-1 rounded-full border border-slate-100">
                    <Text className="text-slate-600 text-xs font-medium">{team.memberCount} Members</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={!!selectedTeam} animationType="slide" presentationStyle="pageSheet">
        {selectedTeam && (
          <TeamRoster teamId={selectedTeam} onClose={() => setSelectedTeam(null)} />
        )}
      </Modal>
    </View>
  );
}

function TeamRoster({ teamId, onClose }: { teamId: Id<"sportsTeams">; onClose: () => void }) {
  const roster = useQuery(api.coach.getTeamRoster, { teamId });
  const eligible = useQuery(api.coach.listEligibleLearners, { teamId });
  const assign = useMutation(api.coach.assignToTeam);
  const remove = useMutation(api.coach.removeMembership);
  
  const [showAdd, setShowAdd] = useState(false);

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-black text-slate-900">Roster</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-orange-600 font-bold">Close</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={() => setShowAdd(true)}
        className="bg-orange-600 rounded-2xl p-4 flex-row justify-center items-center gap-2 mb-6"
      >
        <Ionicons name="add" size={20} color="white" />
        <Text className="text-white font-bold">Add Player</Text>
      </TouchableOpacity>

      {roster === undefined ? (
        <ActivityIndicator size="large" />
      ) : roster.length === 0 ? (
        <Text className="text-slate-500 text-center mt-10">No players assigned yet.</Text>
      ) : (
        <FlatList
          data={roster}
          keyExtractor={item => item._id}
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 mb-3 flex-row justify-between items-center border border-slate-100">
              <Text className="text-slate-900 font-semibold flex-1">{item.studentName}</Text>
              <TouchableOpacity onPress={() => remove({ membershipId: item._id })}>
                <Ionicons name="trash-outline" size={20} color={Colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add Player Modal */}
      <Modal visible={showAdd} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white rounded-3xl p-5 max-h-[80%]">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-slate-900">Eligible Players</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            {eligible === undefined ? (
              <ActivityIndicator />
            ) : eligible.length === 0 ? (
              <Text className="text-slate-500 py-4">No eligible registered students found.</Text>
            ) : (
              <FlatList
                data={eligible}
                keyExtractor={item => item.studentUserId}
                renderItem={({ item }) => (
                  <View className="flex-row justify-between items-center p-3 border-b border-slate-100">
                    <Text className="text-slate-900 font-medium">
                      {item.firstName} {item.lastName}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => {
                        assign({ teamId, studentUserId: item.studentUserId as Id<"users"> });
                        setShowAdd(false);
                      }}
                      className="bg-orange-100 px-4 py-1.5 rounded-full"
                    >
                      <Text className="text-orange-700 font-bold text-sm">Add</Text>
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
