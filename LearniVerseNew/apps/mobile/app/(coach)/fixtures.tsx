import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Modal, TextInput } from "react-native";
import { useQuery, useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
// @ts-expect-error - date-fns v4 has module resolution issues
import { format } from "date-fns";
import { Id } from "@/convex/_generated/dataModel";

export default function FixturesScreen() {
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
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Match Fixtures</Text>
            <Text className="text-slate-500 text-sm mt-1">Select a team to manage fixtures</Text>
          </View>

          <View className="gap-4">
            {teams.map(team => (
              <TouchableOpacity
                key={team._id}
                onPress={() => setSelectedTeam(team._id)}
                className="bg-white rounded-3xl p-5 border border-slate-200 flex-row justify-between items-center"
              >
                <View>
                  <Text className="text-violet-600 text-xs font-black uppercase tracking-widest">{team.sportName}</Text>
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
          <TeamFixtures teamId={selectedTeam} onClose={() => setSelectedTeam(null)} />
        )}
      </Modal>
    </View>
  );
}

function TeamFixtures({ teamId, onClose }: { teamId: Id<"sportsTeams">; onClose: () => void }) {
  const fixtures = useQuery(api.coach.listFixtures, { teamId });
  const createFixture = useMutation(api.coach.createFixture);
  const recordResult = useMutation(api.coach.recordResult);
  
  const [showAdd, setShowAdd] = useState(false);
  const [opponent, setOpponent] = useState("");
  const [venue, setVenue] = useState("");
  const [isHome, setIsHome] = useState(true);
  
  const [selectedFixture, setSelectedFixture] = useState<Id<"matchFixtures"> | null>(null);
  const [ourScore, setOurScore] = useState("");
  const [opponentScore, setOpponentScore] = useState("");

  const handleCreate = () => {
    const nextWeekend = new Date();
    nextWeekend.setDate(nextWeekend.getDate() + (6 - nextWeekend.getDay()));
    nextWeekend.setHours(10, 0, 0, 0);
    
    createFixture({
      teamId,
      opponentName: opponent || "TBD",
      venue: venue || (isHome ? "Home Field" : "Away Field"),
      isHomeFixture: isHome,
      matchTime: nextWeekend.getTime(),
    });
    setShowAdd(false);
    setOpponent("");
    setVenue("");
  };

  const handleRecordResult = () => {
    if (!selectedFixture) return;
    recordResult({
      fixtureId: selectedFixture,
      ourScore: parseInt(ourScore) || 0,
      opponentScore: parseInt(opponentScore) || 0,
    });
    setSelectedFixture(null);
    setOurScore("");
    setOpponentScore("");
  };

  return (
    <View className="flex-1 bg-slate-50 pt-12 px-5">
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-2xl font-black text-slate-900">Fixtures</Text>
        <TouchableOpacity onPress={onClose}>
          <Text className="text-violet-600 font-bold">Close</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        onPress={() => setShowAdd(true)}
        className="bg-violet-600 rounded-2xl p-4 flex-row justify-center items-center gap-2 mb-6"
      >
        <Ionicons name="add" size={20} color="white" />
        <Text className="text-white font-bold">Add Fixture</Text>
      </TouchableOpacity>

      {fixtures === undefined ? (
        <ActivityIndicator size="large" />
      ) : fixtures.length === 0 ? (
        <Text className="text-slate-500 text-center mt-10">No fixtures scheduled.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {fixtures.map((fixture) => (
            <TouchableOpacity 
              key={fixture._id} 
              onPress={() => fixture.status === 'scheduled' && setSelectedFixture(fixture._id)}
              disabled={fixture.status === 'completed'}
              className="bg-white rounded-3xl p-5 mb-4 border border-slate-200"
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="text-slate-900 font-bold text-base">vs {fixture.opponentName}</Text>
                <View className={`px-2 py-1 rounded-md ${fixture.status === 'scheduled' ? 'bg-sky-100' : 'bg-slate-100'}`}>
                  <Text className={`text-[10px] font-black uppercase ${fixture.status === 'scheduled' ? 'text-sky-700' : 'text-slate-500'}`}>
                    {fixture.status}
                  </Text>
                </View>
              </View>
              
              <View className="flex-row items-center gap-2 mb-1">
                <Ionicons name="calendar-outline" size={14} color={Colors.onSurfaceSubtle} />
                <Text className="text-slate-600 text-sm">{format(fixture.matchTime, "MMM d, h:mm a")}</Text>
              </View>
              
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons name="location-outline" size={14} color={Colors.onSurfaceSubtle} />
                <Text className="text-slate-600 text-sm">{fixture.isHomeFixture ? "Home" : "Away"} • {fixture.venue}</Text>
              </View>

              {fixture.status === 'completed' && fixture.result && (
                <View className="mt-2 pt-3 border-t border-slate-100 flex-row justify-center gap-4">
                  <View className="items-center">
                    <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Us</Text>
                    <Text className="text-2xl font-black text-slate-900">{fixture.result.ourScore}</Text>
                  </View>
                  <View className="justify-center">
                    <Text className="text-slate-400 font-black text-lg">-</Text>
                  </View>
                  <View className="items-center">
                    <Text className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">Them</Text>
                    <Text className="text-2xl font-black text-slate-900">{fixture.result.opponentScore}</Text>
                  </View>
                  <View className="justify-center ml-4">
                    <Text className={`font-black uppercase tracking-widest text-sm ${
                      fixture.result.result === 'win' ? 'text-emerald-500' : 
                      fixture.result.result === 'loss' ? 'text-rose-500' : 'text-amber-500'
                    }`}>
                      {fixture.result.result}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Add Fixture Modal */}
      <Modal visible={showAdd} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white rounded-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-slate-900">New Fixture</Text>
              <TouchableOpacity onPress={() => setShowAdd(false)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Opponent</Text>
            <TextInput
              value={opponent}
              onChangeText={setOpponent}
              placeholder="e.g. St. John's"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4 font-medium"
            />
            
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Venue</Text>
            <TextInput
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. Main Field"
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6 font-medium"
            />

            <View className="flex-row gap-4 mb-6">
              <TouchableOpacity 
                onPress={() => setIsHome(true)}
                className={`flex-1 py-3 rounded-xl border ${isHome ? 'bg-violet-50 border-violet-600' : 'bg-slate-50 border-slate-200'}`}
              >
                <Text className={`text-center font-bold ${isHome ? 'text-violet-700' : 'text-slate-500'}`}>Home</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setIsHome(false)}
                className={`flex-1 py-3 rounded-xl border ${!isHome ? 'bg-violet-50 border-violet-600' : 'bg-slate-50 border-slate-200'}`}
              >
                <Text className={`text-center font-bold ${!isHome ? 'text-violet-700' : 'text-slate-500'}`}>Away</Text>
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity onPress={handleCreate} className="bg-violet-600 rounded-xl py-4 items-center">
              <Text className="text-white font-bold text-base">Schedule Match</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Record Result Modal */}
      <Modal visible={!!selectedFixture} animationType="fade" transparent>
        <View className="flex-1 bg-black/50 justify-center px-5">
          <View className="bg-white rounded-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-lg font-bold text-slate-900">Record Result</Text>
              <TouchableOpacity onPress={() => setSelectedFixture(null)}>
                <Ionicons name="close" size={24} color={Colors.onSurface} />
              </TouchableOpacity>
            </View>
            
            <View className="flex-row gap-4 mb-6">
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Our Score</Text>
                <TextInput
                  value={ourScore}
                  onChangeText={setOurScore}
                  placeholder="0"
                  keyboardType="number-pad"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-center font-black text-2xl"
                />
              </View>
              <View className="flex-1">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Opponent Score</Text>
                <TextInput
                  value={opponentScore}
                  onChangeText={setOpponentScore}
                  placeholder="0"
                  keyboardType="number-pad"
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 text-center font-black text-2xl"
                />
              </View>
            </View>
            
            <TouchableOpacity onPress={handleRecordResult} className="bg-emerald-600 rounded-xl py-4 items-center">
              <Text className="text-white font-bold text-base">Save Result</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
