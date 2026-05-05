import { CourseGradebook } from "@/components/teacher/course-gradebook";

type Props = {
  params: Promise<{ courseId: string }>;
};

export default async function GradebookPage({ params }: Props) {
  const { courseId } = await params;
  return <CourseGradebook courseId={courseId} />;
}
