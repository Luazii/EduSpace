import { QuizDetailClient } from "@/components/course/quiz-detail-client";

type QuizDetailPageProps = {
  params: Promise<{
    courseId: string;
    quizId: string;
  }>;
};

export default async function QuizDetailPage({ params }: QuizDetailPageProps) {
  const { courseId, quizId } = await params;

  return <QuizDetailClient courseId={courseId} quizId={quizId} />;
}
