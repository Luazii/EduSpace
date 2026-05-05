# ADPA301 Increment 1 Status Update

Date: 2026-05-02
Repo audited: `C:\Users\lwazi\LearnerManagement\LearniVerseNew`
Audited area: Next.js app in `apps/web`
SRS baseline: ADPA301 School Management System - Semester 1 Increment 1

## Overall Position

The Next.js repo is broadly aligned with the School Management System SRS, but Increment 1 is only partially complete when matched strictly against the written use cases.

What is clearly present:
- Parent/student admission application flow
- Payment gateway integration and payment history
- Student/parent/teacher/admin role model
- Academic performance reporting, final marks, and parent comments
- Parent portal for viewing linked student reports

What is still missing or only loosely implemented:
- Explicit student admission review flow that creates a full student record in a controlled admin step
- Explicit class assignment workflow with class capacity validation
- Full fee management flow with invoice generation, fee balances, and receipts
- Dedicated mark capture flow by subject/assessment as described in the SRS
- Some SRS use cases exist only as course/enrollment equivalents rather than exact school-admin workflows

## Evidence Used

Core files reviewed:
- `apps/web/convex/schema.ts`
- `apps/web/convex/enrollments.ts`
- `apps/web/convex/payments.ts`
- `apps/web/convex/users.ts`
- `apps/web/convex/marks.ts`
- `apps/web/convex/reports.ts`
- `apps/web/convex/parentServices.ts`
- `apps/web/src/app/(app)/apply/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/payments/page.tsx`
- `apps/web/src/app/(app)/parent/students/[id]/page.tsx`
- `apps/web/src/app/(app)/admin/users/page.tsx`

## Increment 1 Use Case Audit

| SRS Use Case | Status | Repo Position |
|---|---|---|
| Apply for admission | Implemented | Parent-facing application wizard exists via `apply/page.tsx` and `convex/enrollments.ts`. |
| Student admission | Partial | The system can create student-linked records after approval/payment, but there is no clean dedicated admin-only "create student profile after review" workflow exactly matching the SRS. |
| Assign student to class | Not implemented | No dedicated class entity, class capacity check, or assign-to-class admin workflow was found. Current model uses courses/enrollments instead. |
| Fee management | Partial | Payments exist, but not the full admin fee structure/invoice/balance management flow described in the SRS. |
| Fee payment | Partial to implemented | Paystack checkout and payment verification exist, but mainly for enrollment/application payments rather than full school fee statements and receipts. |
| Capture marks | Partial | Mark storage and grading exist through assignments/quizzes/final marks, but not a simple direct "enter student mark by subject/assessment" flow matching the SRS wording. |
| Store academic record | Implemented | Academic records are persisted through submissions, quiz attempts, final marks, and report aggregation in `marks.ts` and `reports.ts`. |
| Generate reports | Implemented | Academic report aggregation exists for teachers/admins and parents. |
| View student report | Implemented | Parent report view exists in `parent/students/[id]/page.tsx`. |
| Leave a comment | Implemented | Parent comments on reports exist in `parentServices.ts` using `finalMarks.parentComments`. |

## What Has Not Been Done Yet

These are the clearest gaps against Increment 1:

1. Class assignment workflow
- No `classes` table was found.
- No admin UI for assigning a student to a class was found.
- No class capacity validation was found.
- Current enrollment is subject/course-based, not class-based.

2. Formal student admission processing
- Admission applications exist.
- Student creation is mostly automated around approval/payment and sign-in matching.
- A distinct admin review step that verifies the application, creates the student profile, links parent and student, and confirms admission is not clearly implemented as its own business workflow.

3. Full fee management
- No clear fee structure setup module was found.
- No proper outstanding balance ledger per student was found.
- No invoice generation flow was found.
- No receipt generation/download flow was clearly present.

4. Dedicated mark capture form
- Teachers can grade assignments and quizzes.
- Final academic reporting exists.
- But the exact Increment 1 use case for manually selecting a student, choosing a subject/assessment, entering a mark, and storing it through a dedicated capture-marks workflow is not clearly present as its own module.

## What Looks Done Already

1. Admission application submission
- Parent-facing application flow exists.
- Enrollment records and supporting document storage are present.

2. Parent/student linking
- Parent-to-student linking exists in `parentStudentLinks`.

3. Academic record storage and calculations
- Assignment marks, quiz attempts, weighted marks, and final marks are implemented.

4. Parent report viewing
- Parent dashboards and per-student report pages exist.

5. Parent comments on reports
- Parents can comment on report records.

6. Payment integration
- Paystack initialization and verification exist.
- Payment history UI exists.

## Features Present Beyond Increment 1

The repo already contains work that belongs more to later scope:
- Announcements
- Parent notifications
- Meetings
- Booking system
- Assignments and tests
- Submission comments
- Quiz sessions and proctoring

This means the project is not simply "behind". It is partially complete for Increment 1, but some development effort has already moved into Increment 2-type features before fully closing all Increment 1 gaps.

## Recommended Next Work

To align the repo properly with the SRS, the next highest-value items are:

1. Add a real class management module
- Create `classes` data model
- Assign students to classes
- Add capacity validation
- Notify parent/teacher after assignment

2. Add a proper admin admission workflow
- Review submitted applications
- Approve/reject in a dedicated screen
- Create student profile explicitly
- Link parent to student during admission

3. Complete fee management
- Fee structure setup
- Student fee ledger and balance
- Invoice generation
- Receipt generation

4. Add a direct marks capture workflow
- Teacher selects class/student/subject
- Teacher enters marks manually
- System stores marks and updates academic record

## Practical Summary

Current status for Increment 1:
- Fully done: 5 use cases
- Partially done: 4 use cases
- Not done: 1 major use case

Strictly speaking, the biggest missing SRS item is `Assign student to the class`, and the biggest partial areas are `Student admission`, `Fee management/payment`, and `Capture marks`.

