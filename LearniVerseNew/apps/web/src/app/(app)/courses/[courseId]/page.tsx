import { CourseDetailClient } from "@/components/course/course-detail-client";

type CourseDetailPageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function CourseDetailPage({
  params,
}: CourseDetailPageProps) {
  const { courseId } = await params;

  return <CourseDetailClient courseId={courseId} />;
}
