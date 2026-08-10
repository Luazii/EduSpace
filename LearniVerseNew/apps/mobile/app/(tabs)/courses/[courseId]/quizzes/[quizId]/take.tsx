import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, BackHandler } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/colors";

export default function QuizTakeScreen() {
  const { courseId, quizId } = useLocalSearchParams<{ courseId: string; quizId: string }>();
  const router = useRouter();

  const quiz = useQuery(
    api.quizzes.getDetail,
    quizId ? { quizId: quizId as Id<"quizzes"> } : "skip"
  );
  const questions = quiz?.questions ?? [];

  const startSession = useMutation(api.quizSessions.startSession);
  const saveAnswer = useMutation(api.quizSessions.saveAnswer);
  const submitSession = useMutation(api.quizSessions.submitSession);

  const [sessionId, setSessionId] = useState<Id<"quizSessions"> | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<{ score: number; maxScore: number } | null>(null);
  const [starting, setStarting] = useState(true);

  // Start quiz session
  useEffect(() => {
    if (!quizId) return;
    startSession({ quizId: quizId as Id<"quizzes"> })
      .then((id) => {
        setSessionId(id.sessionId);
        setStarting(false);
        if (quiz?.durationMinutes) {
          setTimeLeft(quiz.durationMinutes * 60);
        }
      })
      .catch(() => {
        Alert.alert("Error", "Could not start quiz session. Please try again.");
        router.back();
      });
  }, [quizId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0 || submitted) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t && t <= 1) {
          handleSubmit();
          return 0;
        }
        return (t ?? 0) - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft, submitted]);

  // Prevent back navigation mid-quiz
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      Alert.alert(
        "Leave Quiz?",
        "Your progress will not be saved. Are you sure you want to leave?",
        [
          { text: "Stay", style: "cancel" },
          { text: "Leave", style: "destructive", onPress: () => router.back() },
        ]
      );
      return true;
    });
    return () => subscription.remove();
  }, []);

  async function handleSelectAnswer(questionId: string, answer: string) {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    if (sessionId) {
      await saveAnswer({
        sessionId,
        questionId: questionId as Id<"questions">,
        answer,
        currentQuestionIndex: currentIndex,
      }).catch(() => {});
    }
  }

  async function handleSubmit() {
    if (!sessionId || submitting) return;
    setSubmitting(true);
    try {
      const res = await submitSession({ sessionId });
      setResult({ score: res.score, maxScore: res.maxScore });
      setSubmitted(true);
    } catch {
      Alert.alert("Error", "Could not submit quiz. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (starting || quiz === undefined) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color={Colors.secondary} />
        <Text className="text-slate-500 mt-3">Preparing quiz...</Text>
      </View>
    );
  }

  // Results screen
  if (submitted && result) {
    const pct = Math.round((result.score / result.maxScore) * 100);
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 bg-slate-950 items-center justify-center px-6">
          <View className="w-32 h-32 rounded-full bg-violet-600 items-center justify-center mb-8">
            <Text className="text-white text-4xl font-black">{pct}%</Text>
          </View>
          <Text className="text-white text-3xl font-black text-center mb-2">
            {pct >= 80 ? "Excellent! 🏆" : pct >= 60 ? "Well Done! 👍" : "Keep Trying! 💪"}
          </Text>
          <Text className="text-slate-400 text-base text-center mb-2">
            You scored {result.score} out of {result.maxScore} marks
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="bg-violet-600 rounded-2xl px-10 py-4 mt-8"
          >
            <Text className="text-white font-bold text-base">Back to Quiz</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  }

  const currentQuestion = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className="flex-1 bg-slate-950">
        {/* Top bar */}
        <View className="px-5 pt-12 pb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-white/50 text-xs font-bold uppercase tracking-widest">
              Question {currentIndex + 1} of {totalQuestions}
            </Text>
            <Text className="text-white font-black text-sm mt-0.5">{quiz?.title}</Text>
          </View>
          {timeLeft !== null && (
            <View className={`rounded-2xl px-4 py-2 ${timeLeft < 60 ? "bg-rose-600" : "bg-white/10"}`}>
              <Text className={`font-black text-lg ${timeLeft < 60 ? "text-white" : "text-white"}`}>
                {formatTime(timeLeft)}
              </Text>
            </View>
          )}
        </View>

        {/* Progress bar */}
        <View className="h-1 bg-white/10 mx-5 rounded-full">
          <View
            className="h-1 bg-violet-400 rounded-full"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
          />
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-5 py-6">
            {/* Question */}
            <Text className="text-white text-xl font-bold leading-7 mb-6">
              {currentQuestion?.prompt}
            </Text>

            {/* Options */}
            <View className="gap-3">
              {currentQuestion?.options.map((option: any, i: any) => {
                const isSelected = answers[currentQuestion._id] === option;
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => handleSelectAnswer(currentQuestion._id, option)}
                    className={`rounded-2xl p-4 border ${
                      isSelected
                        ? "bg-violet-600 border-violet-500"
                        : "bg-white/10 border-white/10"
                    }`}
                  >
                    <View className="flex-row items-center gap-3">
                      <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                        isSelected ? "border-white bg-white" : "border-white/30"
                      }`}>
                        {isSelected && (
                          <View className="w-3 h-3 rounded-full bg-violet-600" />
                        )}
                      </View>
                      <Text className="text-white flex-1 text-base">{option}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </ScrollView>

        {/* Bottom nav */}
        <View className="px-5 pb-8 pt-4 flex-row gap-3">
          {currentIndex > 0 && (
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => i - 1)}
              className="bg-white/10 rounded-2xl px-6 py-4"
            >
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
          )}
          {currentIndex < totalQuestions - 1 ? (
            <TouchableOpacity
              onPress={() => setCurrentIndex((i) => i + 1)}
              disabled={!answers[currentQuestion?._id]}
              className="bg-violet-600 rounded-2xl py-4 flex-1 items-center"
              style={{ opacity: answers[currentQuestion?._id] ? 1 : 0.5 }}
            >
              <Text className="text-white font-bold">Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                const unanswered = totalQuestions - answeredCount;
                if (unanswered > 0) {
                  Alert.alert(
                    "Submit Quiz?",
                    `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Submit anyway?`,
                    [
                      { text: "Review", style: "cancel" },
                      { text: "Submit", style: "destructive", onPress: handleSubmit },
                    ]
                  );
                } else {
                  handleSubmit();
                }
              }}
              disabled={submitting}
              className="bg-emerald-600 rounded-2xl py-4 flex-1 items-center"
            >
              {submitting ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold">Submit Quiz</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </>
  );
}
