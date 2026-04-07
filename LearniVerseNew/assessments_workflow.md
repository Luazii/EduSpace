# Assessment Processes: Assignments & Tests

This document describes the functional workflows for assignments and tests (quizzes) within the LearniVerse platform, as implemented in the backend.

## 1. Assignment Management Process

The assignment process is designed for asynchronous, file-based submissions that require manual grading by an instructor.

### 1.1 Teacher/Admin Workflow (Creation & Grading)
1.  **Creation**: An instructor creates an assignment for a specific course.
    -   **Required Fields**: Title, Course ID.
    -   **Optional Fields**: Description, Deadline (Timestamp), Maximum Marks.
2.  **Publication**: Assignments are published to students upon creation (set as `isPublished: true` by default), making them visible in the course dashboard.
3.  **Monitoring**: Instructors can view a summary of submissions, including the total count and a breakdown of pending vs. graded items.
4.  **Grading**: Instructors review the latest file submission from each student.
    -   **Action**: Assign a numeric mark (up to the `maxMark`) and provide textual feedback.
    -   **Update**: Once graded, the submission record is updated with `mark`, `feedback`, `gradedAt`, and `gradedByUserId`.

### 1.2 Student Workflow (Submission)
1.  **Discovery**: Students view active assignments and their respective deadlines on their course page.
2.  **File Upload**: Students upload their work as a file. The system stores the file in Convex storage and records metadata (filename, size, MIME type).
3.  **Resubmission**: Students can upload multiple versions. The system logic identifies and highlights the `myLatestSubmission` for the student.
4.  **Review**: Once the instructor has graded the work, the student can access their marks and feedback directly within the application.

---

## 2. Test (Quiz) Management Process

The testing process focuses on automated assessments through structured quizzes with multiple-choice questions.

### 2.1 Teacher/Admin Workflow (Setup)
1.  **Quiz Configuration**: Instructors define the quiz parameters:
    -   **Availability**: Optional `startsAt` and `endsAt` timestamps for the testing window.
    -   **Constraints**: Time limit (`durationMinutes`) and `maxAttempts` allowed.
    -   **Status**: Quizzes can be in "draft" or "published" status.
2.  **Question Bank**: Instructors add questions to the quiz.
    -   **Format**: Multiple Choice (Prompt and a set of Options).
    -   **Logic**: The instructor identifies the `correctAnswer` and assigns a `weighting` (points) to each question.
3.  **Management**: Instructors can view all student attempts, including the final score and calculated success rate.

### 2.2 Student Workflow (Attempt & Completion)
1.  **Accessibility Check**: The system validates if the quiz is "published", if the current time is within the availability window, and if the student has remaining attempts.
2.  **Quiz Session**: Students select answers for each question. The UI typically follows the `position` defined by the teacher.
3.  **Auto-Grading**: Upon submission, the system immediately:
    -   Compares student answers against the stored correct answers.
    -   Calculates the total score based on the weighting of correctly answered questions.
4.  **Result Delivery**: The student’s attempt is saved (as a `quizAttempt`), recording their answers, score, and timestamp.

---

## 3. Integrated Grading & Final Marks

The results from individual assignments and quizzes are aggregated to determine the student's overall performance.

1.  **Weighting Profiles**: Each course defines its evaluation criteria:
    -   **Assignment Weight**: Percentage contribution from assignments (default 50%).
    -   **Quiz Weight**: Percentage contribution from tests/quizzes (default 50%).
2.  **Computed Results**: The system calculates a weighted average:
    -   `computedAssignmentPercent`: Average of all graded assignments.
    -   `computedQuizPercent`: Performance based on best quiz attempts.
3.  **Final Mark Publication**:
    -   **Override**: Teachers can provide an `overrideMark` for the final grade.
    -   **Transparency**: Final marks move from "draft" to "published" status.
    -   **Engagement**: Once published, students and parents can view the results, and parents can leave comments for the instructors.
