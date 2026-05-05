import { AssignmentMarker } from "@/components/teacher/assignment-marker";

type Props = {
  params: Promise<{ courseId: string; assignmentId: string }>;
};

export default async function AssignmentMarkingPage({ params }: Props) {
  const { courseId, assignmentId } = await params;
  return <AssignmentMarker courseId={courseId} assignmentId={assignmentId} />;
}
