import { QuizBuilder } from "@/components/teacher/quiz-builder";

type Props = {
  params: Promise<{ courseId: string; quizId: string }>;
};

export default async function QuizBuildPage({ params }: Props) {
  const { courseId, quizId } = await params;
  return <QuizBuilder courseId={courseId} quizId={quizId} />;
}
