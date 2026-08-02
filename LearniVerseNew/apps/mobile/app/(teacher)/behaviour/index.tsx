import { ScrollView, View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput } from "react-native";
import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export default function BehaviourScreen() {
  const user = useQuery(api.users.current);
  const teacherCourses = useQuery(
    api.teachers.getTeacherCourses,
    user ? { teacherUserId: user._id } : "skip"
  ) ?? [];
  const recentRecords = useQuery(api.behaviour.listByTeacher, {}) ?? [];
  const createRecord = useMutation(api.behaviour.create);

  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<"merit" | "demerit">("merit");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [points, setPoints] = useState("1");
  const [studentId, setStudentId] = useState<Id<"users"> | null>(null);
  const [saving, setSaving] = useState(false);

  const students = useQuery(
    api.admin.listStudents,
    {}
  ) ?? [];

  async function handleCreate() {
    if (!studentId || !category.trim() || !description.trim()) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      await createRecord({
        studentUserId: studentId,
        type,
        category: category.trim(),
        description: description.trim(),
        points: type === "merit" ? Number(points) : -Math.abs(Number(points)),
        occurredAt: Date.now(),
      });
      setShowModal(false);
      setCategory("");
      setDescription("");
      setStudentId(null);
      Alert.alert("Recorded!", `${type === "merit" ? "Merit" : "Demerit"} saved.`);
    } catch {
      Alert.alert("Error", "Could not save record.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      <View className="px-5 py-5 pb-24">
        <TouchableOpacity
          onPress={() => setShowModal(true)}
          className="flex-row items-center gap-3 bg-slate-950 rounded-3xl p-5 mb-6"
        >
          <View className="w-12 h-12 rounded-2xl bg-white/10 items-center justify-center">
            <Ionicons name="medal-outline" size={22} color="white" />
          </View>
          <View className="flex-1">
            <Text className="text-white font-bold">Record Behaviour</Text>
            <Text className="text-white/60 text-sm">Award merit or demerit points</Text>
          </View>
          <Ionicons name="add-circle" size={24} color="white" />
        </TouchableOpacity>

        <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
          Recent Records
        </Text>
        {recentRecords.length === 0 ? (
          <View className="bg-white rounded-3xl p-8 items-center border border-dashed border-slate-200">
            <Text className="text-slate-400 text-sm text-center">No behaviour records yet</Text>
          </View>
        ) : (
          <View className="gap-3">
            {recentRecords.slice(0, 20).map((record) => (
              <View key={record._id} className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className={`w-10 h-10 rounded-full items-center justify-center ${
                      record.type === "merit" ? "bg-emerald-50" : "bg-rose-50"
                    }`}>
                      <Ionicons
                        name={record.type === "merit" ? "trophy" : "warning"}
                        size={18}
                        color={record.type === "merit" ? Colors.success : Colors.danger}
                      />
                    </View>
                    <View>
                      <Text className="text-slate-950 font-semibold text-sm">{record.studentName}</Text>
                      <Text className="text-slate-400 text-xs">{record.category}</Text>
                    </View>
                  </View>
                  <View className={`rounded-xl px-2.5 py-1 ${
                    record.type === "merit" ? "bg-emerald-50" : "bg-rose-50"
                  }`}>
                    <Text className={`font-black text-sm ${
                      record.type === "merit" ? "text-emerald-700" : "text-rose-700"
                    }`}>
                      {record.points > 0 ? "+" : ""}{record.points}
                    </Text>
                  </View>
                </View>
                <Text className="text-slate-500 text-xs mt-2 ml-13">{record.description}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Create record modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <View className="flex-1 justify-end bg-black/50">
          <ScrollView className="bg-white rounded-t-3xl" keyboardShouldPersistTaps="handled">
            <View className="p-6 pb-10">
              <Text className="text-slate-950 text-xl font-black mb-5">Record Behaviour</Text>

              {/* Type toggle */}
              <View className="flex-row bg-slate-100 rounded-2xl p-1 mb-5">
                {(["merit", "demerit"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setType(t)}
                    className={`flex-1 rounded-xl py-3 items-center ${
                      type === t ? (t === "merit" ? "bg-emerald-500" : "bg-rose-500") : ""
                    }`}
                  >
                    <Text className={`font-bold capitalize ${type === t ? "text-white" : "text-slate-500"}`}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Student picker */}
              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Student</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mb-4"
              >
                <View className="flex-row gap-2">
                  {students.slice(0, 20).map((s) => (
                    <TouchableOpacity
                      key={s._id}
                      onPress={() => setStudentId(s._id)}
                      className={`rounded-2xl px-3 py-2 border ${
                        studentId === s._id ? "bg-slate-950 border-slate-950" : "bg-white border-slate-200"
                      }`}
                    >
                      <Text className={`text-sm font-semibold ${studentId === s._id ? "text-white" : "text-slate-700"}`}>
                        {s.firstName} {s.lastName}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Category</Text>
              <TextInput
                className="bg-slate-50 rounded-2xl px-4 py-3 text-slate-950 border border-slate-100 mb-4"
                placeholder="e.g., Helpfulness, Conduct"
                value={category}
                onChangeText={setCategory}
              />

              <Text className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Description</Text>
              <TextInput
                className="bg-slate-50 rounded-2xl px-4 py-3 text-slate-950 border border-slate-100 mb-4"
                placeholder="Describe the behaviour..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                value={description}
                onChangeText={setDescription}
                style={{ minHeight: 80 }}
              />

              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowModal(false)}
                  className="flex-1 bg-slate-100 rounded-2xl py-4 items-center"
                >
                  <Text className="text-slate-600 font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreate}
                  disabled={saving}
                  className="flex-1 bg-slate-950 rounded-2xl py-4 items-center"
                >
                  {saving ? <ActivityIndicator color="white" /> : (
                    <Text className="text-white font-bold">Save Record</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}
