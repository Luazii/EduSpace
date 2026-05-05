import { QuizSessionClient } from "@/components/quiz/quiz-session-client";

type SessionPageProps = {
  params: Promise<{ courseId: string; quizId: string }>;
};

export default async function QuizSessionPage({ params }: SessionPageProps) {
  const { courseId, quizId } = await params;
  return <QuizSessionClient courseId={courseId} quizId={quizId} />;
}
