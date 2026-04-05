import { TeacherCourseReport } from "@/components/teacher/teacher-course-report";

type TeacherCourseReportPageProps = {
  params: Promise<{
    courseId: string;
  }>;
};

export default async function TeacherCourseReportPage({
  params,
}: TeacherCourseReportPageProps) {
  const { courseId } = await params;

  return <TeacherCourseReport courseId={courseId} />;
}
