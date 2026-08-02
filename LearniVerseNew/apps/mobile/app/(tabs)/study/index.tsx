import { ScrollView, View, Text, TouchableOpacity, Alert, Modal, TextInput, ActivityIndicator } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";
import { format } from "date-fns";

function TaskItem({
  task,
  onToggle,
}: {
  task: { _id: Id<"taskItems">; title: string; isComplete: boolean; description?: string };
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      className={`flex-row items-center gap-3 py-3 border-b border-slate-50 last:border-0`}
    >
      <View
        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
          task.isComplete ? "bg-emerald-500 border-emerald-500" : "border-slate-300"
        }`}
      >
        {task.isComplete && <Ionicons name="checkmark" size={14} color="white" />}
      </View>
      <View className="flex-1">
        <Text className={`text-sm font-semibold ${task.isComplete ? "text-slate-400 line-through" : "text-slate-950"}`}>
          {task.title}
        </Text>
        {task.description && (
          <Text className="text-slate-400 text-xs mt-0.5">{task.description}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

export default function StudyScreen() {
  const sessions = useQuery(api.studySessions.listMine) ?? [];
  const createSession = useMutation(api.studySessions.create);
  const completeSession = useMutation(api.studySessions.complete);
  const createTask = useMutation(api.taskItems.create);
  const toggleTask = useMutation(api.taskItems.toggle);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState("");
  const [newTask, setNewTask] = useState("");
  const [selectedSession, setSelectedSession] = useState<Id<"studySessions"> | null>(null);
  const [creating, setCreating] = useState(false);

  const sessionTasks = useQuery(
    api.taskItems.listBySession,
    selectedSession ? { studySessionId: selectedSession } : "skip"
  ) ?? [];

  async function handleCreateSession() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const id = await createSession({
        title: title.trim(),
        sessionDate: new Date().toISOString().split("T")[0],
      });
      setSelectedSession(id);
      setTitle("");
      setShowCreate(false);
    } catch {
      Alert.alert("Error", "Could not create study session.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAddTask() {
    if (!newTask.trim() || !selectedSession) return;
    await createTask({
      studySessionId: selectedSession,
      title: newTask.trim(),
      position: sessionTasks.length,
    });
    setNewTask("");
  }

  const activeSessions = sessions.filter((s) => s.status === "planned");
  const completedSessions = sessions.filter((s) => s.status === "completed");

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 pt-6 pb-24">
        {/* Header */}
        <View className="flex-row items-center justify-between mb-6">
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-sky-600 mb-1">Study</Text>
            <Text className="text-2xl font-black text-slate-950 tracking-tight">Study Sessions</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreate(true)}
            className="bg-sky-600 rounded-2xl px-4 py-2 flex-row items-center gap-2"
          >
            <Ionicons name="add" size={18} color="white" />
            <Text className="text-white font-bold text-sm">New</Text>
          </TouchableOpacity>
        </View>

        {/* Active sessions */}
        {activeSessions.length > 0 && (
          <View className="mb-6">
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">Active Sessions</Text>
            <View className="gap-3">
              {activeSessions.map((session) => (
                <View
                  key={session._id}
                  className={`bg-white rounded-3xl border overflow-hidden ${
                    selectedSession === session._id ? "border-sky-300" : "border-slate-100"
                  } shadow-sm`}
                >
                  <TouchableOpacity
                    onPress={() => setSelectedSession(
                      selectedSession === session._id ? null : session._id
                    )}
                    className="p-5 flex-row items-center justify-between"
                  >
                    <View className="flex-1">
                      <Text className="text-slate-950 font-bold">{session.title}</Text>
                      <Text className="text-slate-400 text-xs mt-0.5">
                        {format(new Date(session.sessionDate), "MMM d, yyyy")}
                      </Text>
                    </View>
                    <Ionicons
                      name={selectedSession === session._id ? "chevron-up" : "chevron-down"}
                      size={16}
                      color={Colors.onSurfaceSubtle}
                    />
                  </TouchableOpacity>

                  {selectedSession === session._id && (
                    <View className="px-5 pb-5 border-t border-slate-50">
                      {/* Tasks */}
                      {sessionTasks.map((task) => (
                        <TaskItem
                          key={task._id}
                          task={task}
                          onToggle={() => toggleTask({ taskItemId: task._id })}
                        />
                      ))}

                      {/* Add task */}
                      <View className="flex-row gap-2 mt-3">
                        <TextInput
                          className="flex-1 bg-slate-50 rounded-2xl px-4 py-3 text-slate-950 text-sm border border-slate-100"
                          placeholder="Add a task..."
                          placeholderTextColor={Colors.onSurfaceSubtle}
                          value={newTask}
                          onChangeText={setNewTask}
                          onSubmitEditing={handleAddTask}
                        />
                        <TouchableOpacity
                          onPress={handleAddTask}
                          className="bg-sky-600 rounded-2xl px-3 items-center justify-center"
                        >
                          <Ionicons name="add" size={20} color="white" />
                        </TouchableOpacity>
                      </View>

                      {/* Complete session */}
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert("Complete Session?", "Mark this study session as completed?", [
                            { text: "Cancel", style: "cancel" },
                            {
                              text: "Complete",
                              onPress: () => completeSession({ studySessionId: session._id }),
                            },
                          ]);
                        }}
                        className="bg-emerald-50 rounded-2xl py-3 items-center mt-4"
                      >
                        <Text className="text-emerald-700 font-bold text-sm">Mark Session Complete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* No active sessions */}
        {activeSessions.length === 0 && (
          <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200 mb-6">
            <Ionicons name="book-outline" size={36} color={Colors.onSurfaceSubtle} />
            <Text className="text-slate-950 font-bold text-lg mt-4 text-center">Start Studying</Text>
            <Text className="text-slate-500 text-sm text-center mt-2 leading-6">
              Create a study session and track your tasks.
            </Text>
          </View>
        )}

        {/* Completed sessions */}
        {completedSessions.length > 0 && (
          <View>
            <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
              Completed ({completedSessions.length})
            </Text>
            <View className="gap-2">
              {completedSessions.slice(0, 5).map((session) => (
                <View key={session._id} className="bg-slate-100 rounded-2xl px-5 py-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-slate-600 font-semibold text-sm">{session.title}</Text>
                    <Text className="text-slate-400 text-xs mt-0.5">
                      {format(new Date(session.sessionDate), "MMM d")}
                    </Text>
                  </View>
                  <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {/* Create session modal */}
      <Modal visible={showCreate} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6">
            <Text className="text-slate-950 text-xl font-black mb-4">New Study Session</Text>
            <TextInput
              className="bg-slate-50 rounded-2xl px-4 py-4 text-slate-950 text-base border border-slate-100 mb-4"
              placeholder="Session title (e.g., Maths Chapter 5)"
              placeholderTextColor={Colors.onSurfaceSubtle}
              value={title}
              onChangeText={setTitle}
              autoFocus
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => { setShowCreate(false); setTitle(""); }}
                className="flex-1 bg-slate-100 rounded-2xl py-4 items-center"
              >
                <Text className="text-slate-600 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleCreateSession}
                disabled={!title.trim() || creating}
                className="flex-1 bg-sky-600 rounded-2xl py-4 items-center"
                style={{ opacity: !title.trim() || creating ? 0.5 : 1 }}
              >
                {creating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-bold">Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
