# LearniVerse Next.js + Convex + Clerk Migration Blueprint

## Goal

Rebuild the current ASP.NET MVC application as a modern `Next.js` App Router application using:

- `Next.js` for the web app and routing
- `Clerk` for authentication and session management
- `Convex` for database, backend logic, realtime queries, and storage metadata

This blueprint keeps the education platform and leaves out the gym and trainer side of the system.

## Current App Summary

The current application is a classic ASP.NET MVC app with:

- ASP.NET Identity for auth
- Entity Framework 6 for data access
- MVC controllers + Razor views
- SQL-backed relational data model
- Azure Blob helper usage for files
- Paystack payment integration
- email and PDF helper utilities

Important current files:

- `Models/IdentityModels.cs`
- `Controllers/AccountController.cs`
- `Controllers/StudentsController.cs`
- `Controllers/CoursesController.cs`
- `Controllers/EnrollmentsController.cs`
- `Controllers/AssignmentsController.cs`
- `Controllers/QuizController.cs`
- `Controllers/ResourcesController.cs`
- `Controllers/BookingsController.cs`
- `Controllers/TeachersController.cs`
- `Controllers/AdminController.cs`
- `Web.config`

## Scope

### Keep

- auth and user onboarding
- student profiles
- teacher profiles
- faculties
- qualifications
- courses
- course classroom pages
- resources and file downloads
- assignments and submissions
- quizzes, questions, quiz attempts
- progress tracking and final marks
- study sessions and tasks
- room booking, rooms, time slots
- enrollment application flow
- NSC submission upload flow
- payments for educational enrollment
- admin dashboards and approval workflows

### Optional

- online store
- products
- cart
- orders
- reviews
- shipping and tracking
- warehouse dashboard

### Remove

- memberships
- plans
- body compositions
- food search
- food records
- meals
- workout plans
- exercises
- regimens
- workout goals
- trainers
- training activities
- training sessions
- gym payment flows
- gym landing pages and dashboards

## Migration Strategy

Do not convert this project in place.

Build a new application beside the old codebase and migrate feature-by-feature. The old project is tightly coupled to:

- MVC controller actions
- Razor view models
- EF navigation properties
- ASP.NET Identity IDs
- TempData and Session state

Trying to directly transform those patterns into Next.js will slow the project down and preserve bad boundaries.

## Recommended New Repo Structure

```text
learniverse-web/
  app/
    (marketing)/
      page.tsx
    (auth)/
      sign-in/[[...sign-in]]/page.tsx
      sign-up/[[...sign-up]]/page.tsx
    (app)/
      dashboard/page.tsx
      courses/page.tsx
      courses/[courseId]/page.tsx
      courses/[courseId]/resources/page.tsx
      courses/[courseId]/assignments/page.tsx
      courses/[courseId]/assignments/[assignmentId]/page.tsx
      courses/[courseId]/quizzes/page.tsx
      courses/[courseId]/quizzes/[quizId]/page.tsx
      courses/[courseId]/quizzes/[quizId]/take/page.tsx
      progress/page.tsx
      study-sessions/page.tsx
      bookings/page.tsx
      payments/page.tsx
      enrollments/page.tsx
      apply/page.tsx
      teacher/page.tsx
      teacher/courses/page.tsx
      teacher/assignments/page.tsx
      teacher/quizzes/page.tsx
      admin/page.tsx
      admin/faculties/page.tsx
      admin/qualifications/page.tsx
      admin/courses/page.tsx
      admin/enrollments/page.tsx
      admin/enrollments/[applicationId]/page.tsx
      admin/payments/page.tsx
      admin/rooms/page.tsx
      admin/timeslots/page.tsx
    api/
      webhooks/
        clerk/route.ts
        paystack/route.ts
      payments/
        initialize/route.ts
        verify/route.ts
    layout.tsx
    globals.css
  components/
  lib/
    auth.ts
    permissions.ts
    env.ts
    paystack.ts
    upload.ts
    utils.ts
  convex/
    schema.ts
    auth.config.ts
    users.ts
    students.ts
    teachers.ts
    faculties.ts
    qualifications.ts
    courses.ts
    enrollments.ts
    resources.ts
    assignments.ts
    submissions.ts
    quizzes.ts
    questions.ts
    quizAttempts.ts
    progress.ts
    studySessions.ts
    taskItems.ts
    bookings.ts
    rooms.ts
    timeSlots.ts
    payments.ts
    files.ts
    webhooks.ts
    seed.ts
  middleware.ts
  package.json
  tsconfig.json
  next.config.ts
```

## Auth Model with Clerk

### Replace ASP.NET Identity

Current auth logic in `AccountController` should be fully removed in the new app.

Use Clerk for:

- sign up
- sign in
- sign out
- forgot password
- email verification
- session management
- optional social auth

### App Roles

Use app-level roles stored in Convex, not just Clerk metadata checks spread throughout the UI.

Recommended role model:

- `admin`
- `teacher`
- `student`
- `warehouse_admin` only if store is kept

Recommended `users` table fields:

- `clerkUserId`
- `email`
- `firstName`
- `lastName`
- `phone`
- `role`
- `status`
- `createdAt`
- `updatedAt`

### Profile Split

Do not overload the Clerk user object with all business data.

Recommended:

- `users` table for identity + role
- `studentProfiles` for student-specific fields
- `teacherProfiles` for teacher-specific fields

## Convex Data Model

Below is the recommended first-pass schema.

### `users`

- `_id`
- `clerkUserId`
- `email`
- `firstName`
- `lastName`
- `phone`
- `role`
- `isActive`
- `createdAt`
- `updatedAt`

Indexes:

- by `clerkUserId`
- by `email`
- by `role`

### `studentProfiles`

- `_id`
- `userId`
- `studentNumber`
- `gender`
- `dob`
- `facultyId`
- `qualificationId`
- `createdAt`
- `updatedAt`

Indexes:

- by `userId`
- by `facultyId`
- by `qualificationId`

### `teacherProfiles`

- `_id`
- `userId`
- `employeeNumber`
- `facultyId`
- `qualificationText`
- `createdAt`
- `updatedAt`

Indexes:

- by `userId`
- by `facultyId`

### `faculties`

- `_id`
- `name`
- `code`
- `description`
- `isActive`

### `qualifications`

- `_id`
- `facultyId`
- `name`
- `code`
- `description`
- `isActive`

Indexes:

- by `facultyId`

### `courses`

- `_id`
- `courseCode`
- `courseName`
- `description`
- `semester`
- `department`
- `price`
- `teacherProfileId`
- `qualificationId`
- `isPublished`
- `createdAt`
- `updatedAt`

Indexes:

- by `courseCode`
- by `teacherProfileId`
- by `qualificationId`
- by `department`

### `resources`

- `_id`
- `courseId`
- `title`
- `description`
- `storageId`
- `fileName`
- `mimeType`
- `size`
- `uploadedByUserId`
- `createdAt`

Indexes:

- by `courseId`

### `assignments`

- `_id`
- `courseId`
- `teacherProfileId`
- `title`
- `description`
- `deadline`
- `maxMark`
- `isPublished`
- `createdAt`

Indexes:

- by `courseId`
- by `teacherProfileId`

### `submissions`

- `_id`
- `assignmentId`
- `studentProfileId`
- `storageId`
- `fileName`
- `submittedAt`
- `mark`
- `feedback`
- `gradedByUserId`
- `gradedAt`

Indexes:

- by `assignmentId`
- by `studentProfileId`
- by `assignmentId` + `studentProfileId`

### `quizzes`

- `_id`
- `courseId`
- `teacherProfileId`
- `title`
- `description`
- `quizDate`
- `startTime`
- `endTime`
- `durationMinutes`
- `maxAttempts`
- `status`
- `createdAt`

Indexes:

- by `courseId`
- by `teacherProfileId`
- by `quizDate`

### `questions`

- `_id`
- `quizId`
- `prompt`
- `questionType`
- `options`
- `correctAnswer`
- `weighting`
- `order`

Indexes:

- by `quizId`

### `quizAttempts`

- `_id`
- `quizId`
- `studentProfileId`
- `answers`
- `score`
- `submittedAt`

Indexes:

- by `quizId`
- by `studentProfileId`
- by `quizId` + `studentProfileId`

### `studentFinalMarks`

- `_id`
- `studentProfileId`
- `courseId`
- `finalMark`
- `publishedAt`
- `publishedByUserId`

Indexes:

- by `studentProfileId`
- by `courseId`
- by `studentProfileId` + `courseId`

### `studySessions`

- `_id`
- `studentProfileId`
- `sessionDate`
- `status`
- `createdAt`
- `completedAt`

Indexes:

- by `studentProfileId`
- by `sessionDate`

### `taskItems`

- `_id`
- `studySessionId`
- `title`
- `description`
- `isComplete`
- `position`

Indexes:

- by `studySessionId`

### `rooms`

- `_id`
- `roomCode`
- `campus`
- `name`
- `capacity`
- `isActive`

### `timeSlots`

- `_id`
- `roomId`
- `slotName`
- `startTime`
- `endTime`
- `isActive`

Indexes:

- by `roomId`

### `bookings`

- `_id`
- `studentProfileId`
- `roomId`
- `timeSlotId`
- `bookingDate`
- `status`
- `createdAt`

Indexes:

- by `studentProfileId`
- by `roomId`
- by `timeSlotId`
- by `bookingDate`

### `enrollmentApplications`

- `_id`
- `studentProfileId`
- `facultyId`
- `qualificationId`
- `selectedCourseIds`
- `status`
- `paymentStatus`
- `nscSubmissionId`
- `notes`
- `createdAt`
- `reviewedAt`
- `reviewedByUserId`

Indexes:

- by `studentProfileId`
- by `status`
- by `paymentStatus`

### `nscSubmissions`

- `_id`
- `studentProfileId`
- `documentStorageId`
- `documentFileName`
- `documentMimeType`
- `documentUrl`
- `subjects`
- `submittedAt`

Indexes:

- by `studentProfileId`

### `enrollments`

- `_id`
- `studentProfileId`
- `courseId`
- `applicationId`
- `isApproved`
- `hasPaid`
- `enrolledAt`

Indexes:

- by `studentProfileId`
- by `courseId`
- by `applicationId`

### `payments`

- `_id`
- `studentProfileId`
- `applicationId`
- `enrollmentId`
- `amount`
- `provider`
- `reference`
- `status`
- `paymentType`
- `paidAt`
- `createdAt`

Indexes:

- by `studentProfileId`
- by `reference`
- by `status`

## Convex Function Layout

### Queries

- `users:getCurrentUser`
- `students:getMyDashboard`
- `students:getMyCourses`
- `students:getMyEvents`
- `courses:listCourses`
- `courses:getCourseById`
- `resources:listByCourse`
- `assignments:listByCourse`
- `assignments:getById`
- `submissions:listByAssignment`
- `quizzes:listByCourse`
- `quizzes:getById`
- `progress:getStudentProgress`
- `bookings:listMyBookings`
- `rooms:listRooms`
- `timeSlots:listByRoom`
- `enrollments:listMyApplications`
- `enrollments:listPendingApplications`
- `payments:listMyPayments`
- `payments:listAdminPayments`

### Mutations

- `users:upsertFromClerk`
- `students:createStudentProfile`
- `teachers:createTeacherProfile`
- `courses:create`
- `courses:update`
- `courses:delete`
- `resources:create`
- `assignments:create`
- `assignments:update`
- `assignments:gradeSubmission`
- `quizzes:create`
- `quizzes:update`
- `quizzes:addQuestions`
- `quizzes:submitAttempt`
- `studySessions:create`
- `studySessions:complete`
- `taskItems:create`
- `taskItems:update`
- `taskItems:toggle`
- `bookings:create`
- `bookings:cancel`
- `enrollments:createApplication`
- `enrollments:approveApplication`
- `enrollments:rejectApplication`
- `payments:recordPayment`

### Actions

- `files:generateUploadUrl`
- `payments:initializePaystackTransaction`
- `payments:verifyPaystackTransaction`
- `emails:sendApplicationPending`
- `emails:sendApproved`
- `emails:sendRejected`
- `reports:generateInvoicePdf`

## Clerk + Convex Setup Steps

## 1. Create the new app

```bash
npx create-next-app@latest learniverse-web
cd learniverse-web
npm install
```

Choose:

- TypeScript: yes
- App Router: yes
- ESLint: yes
- Tailwind: yes
- `src/` directory: optional, but yes is fine

## 2. Install core packages

```bash
npm install @clerk/nextjs convex
npm install svix zod date-fns clsx tailwind-merge
```

Optional later:

```bash
npm install resend react-hook-form @hookform/resolvers
```

## 3. Initialize Convex

```bash
npx convex dev
```

This creates the `convex/` folder and local environment linkage.

## 4. Configure Clerk

Add:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`

## 5. Configure Clerk middleware

Protect:

- `/dashboard`
- `/courses`
- `/progress`
- `/study-sessions`
- `/bookings`
- `/payments`
- `/apply`
- `/teacher`
- `/admin`
- `/api/payments`

Leave public:

- `/`
- `/sign-in`
- `/sign-up`
- public marketing pages
- webhook endpoints with signature validation

## 6. Configure Convex auth

Use Convex's Clerk integration and define `convex/auth.config.ts` with the Clerk issuer domain.

## 7. Wrap app providers

In `app/layout.tsx`:

- `ClerkProvider`
- Convex provider integration with Clerk

## 8. Add Clerk webhook route

Use a route handler at `app/api/webhooks/clerk/route.ts` to:

- validate webhook signature
- create or update the `users` table entry
- optionally provision `studentProfiles` on first sign-up

## Route Map from MVC to Next.js

### Auth and shell

| Old MVC | New Next.js |
|---|---|
| `Account/Login` | `/sign-in` |
| `Account/Register` | `/sign-up` |
| `Account/LogOff` | Clerk sign out |
| `Home/Index` | `/` |
| `Students/Home` | `/dashboard` |
| `Teachers/Home` | `/teacher` |
| `Admin/Home` | `/admin` |

### Students

| Old MVC | New Next.js |
|---|---|
| `Students/Home` | `/dashboard` |
| `Students/MyCourses` | `/courses` |
| `Students/GetEvents` | `/dashboard` or `/courses/calendar` |
| `Students/ProgressCenter` | `/progress` |
| `Students/ViewProgress` | `/progress?courseId=...` |
| `Students/ViewProgressReport` | `/progress/report` |
| `Students/EnrollmentDetails` | `/enrollments` |

### Courses and classroom

| Old MVC | New Next.js |
|---|---|
| `Courses/Classroom` | `/courses/[courseId]` |
| `Courses/Details` | `/courses/[courseId]` |
| `Courses/Index` | `/admin/courses` |
| `Courses/Create` | `/admin/courses/new` |
| `Courses/Edit` | `/admin/courses/[courseId]/edit` |

### Resources

| Old MVC | New Next.js |
|---|---|
| `Resources/Upload` | `/teacher/resources/upload` or `/teacher/courses/[courseId]/resources/new` |
| `Resources/DownloadBlob` | `/api/files/[fileId]` or secure signed URL flow |
| `Resources/GetQrCode` | remove unless still needed |

### Assignments

| Old MVC | New Next.js |
|---|---|
| `Assignments/MyAssignments` | `/teacher/assignments` |
| `Assignments/GetAssignments` | use filters in `/teacher/assignments` |
| `Assignments/ViewSubmissions` | `/teacher/assignments/[assignmentId]/submissions` |
| `Assignments/SubmitAssignment` | `/courses/[courseId]/assignments/[assignmentId]` |
| `Assignments/Create` | `/teacher/assignments/new` |
| `Assignments/Edit` | `/teacher/assignments/[assignmentId]/edit` |

### Quizzes

| Old MVC | New Next.js |
|---|---|
| `Quiz/Index` | `/teacher/quizzes` |
| `Quiz/Create` | `/teacher/quizzes/new` |
| `Quiz/AddQuestions` | `/teacher/quizzes/[quizId]/questions` |
| `Quiz/View` | `/teacher/quizzes/[quizId]/questions` |
| `Quiz/TakeQuiz` | `/courses/[courseId]/quizzes/[quizId]/take` |
| `Quiz/Quiz` | merged into take page |
| `Quiz/Review` | `/courses/[courseId]/quizzes/[quizId]/review` |
| `Quiz/QuizSubmitted` | `/courses/[courseId]/quizzes/[quizId]/submitted` |

### Enrollments and NSC flow

| Old MVC | New Next.js |
|---|---|
| `Enrollments/SelectFaculty` | `/apply` step 1 |
| `Enrollments/SelectQualification` | `/apply` step 2 |
| `Enrollments/SelectCourses` | `/apply` step 3 |
| `Enrollments/UploadNSC` | `/apply` step 4 |
| `Enrollments/Confirmation` | `/apply/review` |
| `Enrollments/ApplicationCallBack` | `/api/payments/verify` or webhook |
| `Enrollments/EnrollmentPending` | `/apply/pending` |
| `Enrollments/PendingApplications` | `/admin/enrollments` |
| `Enrollments/RejectedApplications` | `/admin/enrollments?status=rejected` |
| `Enrollments/ReviewEnrollment` | `/admin/enrollments/[applicationId]` |
| `Enrollments/ApproveEnrollment` | action on admin page |
| `Enrollments/RejectEnrollment` | action on admin page |
| `Enrollments/DownloadNSC` | secure file endpoint |

### Bookings

| Old MVC | New Next.js |
|---|---|
| `Bookings/MyBookings` | `/bookings` |
| `Bookings/Create` | `/bookings/new` |
| `Rooms/*` | `/admin/rooms` |
| `TimeSlots/*` | `/admin/timeslots` |

### Study planner

| Old MVC | New Next.js |
|---|---|
| `StudySessions/CreateSession` | `/study-sessions/new` |
| `StudySessions/CompleteSession` | action on `/study-sessions` |
| `TaskItems/*` | managed inside `/study-sessions/[sessionId]` |

### Admin

| Old MVC | New Next.js |
|---|---|
| `Admin/Home` | `/admin` |
| `Admin/Notifications` | `/admin/notifications` |
| `Faculties/*` | `/admin/faculties` |
| `Qualifications/*` | `/admin/qualifications` |
| `Payments/Payments` | `/admin/payments` |

## Feature-by-Feature Rewrite Order

### Phase 0: Security and cleanup

- rotate all leaked secrets from `Web.config`
- disable or replace hard-coded admin bootstrapping
- inventory production data and exports
- decide whether store features stay

### Phase 1: Foundation

- create Next.js app
- install Clerk and Convex
- add middleware
- add providers
- create base layout and nav
- build role-aware dashboard shell

Exit criteria:

- user can sign up
- user can sign in
- app can read current user and role from Convex

### Phase 2: User model and profiles

- create `users`
- create `studentProfiles`
- create `teacherProfiles`
- sync Clerk users into Convex
- seed initial admins and teachers

Exit criteria:

- admin, teacher, and student dashboards route correctly

### Phase 3: Core academic catalog

- faculties
- qualifications
- courses
- teacher assignment to courses

Exit criteria:

- admin can manage academic structure
- students can browse their available courses

### Phase 4: Classroom

- classroom page
- resource listing
- resource upload
- secure file access

Exit criteria:

- teacher uploads a file
- student sees and downloads it

### Phase 5: Assignments

- create assignments
- submit assignment files
- grade submissions

Exit criteria:

- teacher creates assignment
- student submits file
- teacher grades it

### Phase 6: Quizzes

- quiz creation
- question authoring
- quiz taking page
- answer submission
- auto marking
- attempt limits

Exit criteria:

- student completes quiz
- score is stored and visible

### Phase 7: Progress

- highest quiz marks
- average marks
- assignment averages
- final marks
- calendar events if still needed

Exit criteria:

- student sees progress by course

### Phase 8: Enrollments and NSC applications

- multi-step application flow
- NSC upload
- review screen
- application persistence
- admin review
- approval and rejection

Exit criteria:

- student submits application
- admin approves or rejects it

### Phase 9: Payments

- initialize Paystack transaction
- verify transaction
- create payment records
- tie payment to application or enrollment

Exit criteria:

- successful payment updates app state correctly

### Phase 10: Bookings and study sessions

- room management
- time slots
- booking creation and cancellation
- study sessions and task items

Exit criteria:

- student can create bookings
- student can manage study sessions and tasks

### Phase 11: Optional store module

Only start this if you decide to keep ecommerce.

## What to Rewrite, Not Port

### Replace Razor view models

Current MVC view models should not be copied over directly.

Instead:

- fetch data in Convex queries
- validate forms with `zod`
- model page-specific UI state in React components

### Replace TempData and Session

Current app uses:

- `Session["UserId"]`
- `TempData[...]`

In the new app replace these with:

- Clerk session for user identity
- Convex persisted draft records for multi-step flows
- URL search params for step state where useful
- local component state only for temporary UI

### Replace EF navigation assumptions

Current code expects lazy-loaded navigation properties.

In Convex, explicitly fetch related data through queries and helper functions. Avoid pretending it is an ORM.

## File Strategy

### Recommended for uploads

Use Convex file storage for:

- assignment submissions
- NSC documents
- classroom resources

Store in Convex:

- storage ID
- file name
- mime type
- size
- owner
- related entity ID

### Secure file access

Do not expose raw storage IDs directly to the browser if authorization is needed.

Use:

- a server-side check
- then a generated file URL or controlled fetch

## Payments Strategy

### Recommended structure

- initialize payment from server-only route or Convex action
- store pending payment record before redirect
- verify on callback or webhook
- mark related application or enrollment paid only after verification

### Keep business source of truth in Convex

Do not trust only the browser redirect result.

Use webhook confirmation when possible and mark payment records idempotently by provider reference.

## Authorization Rules

### Student

- read own profile
- read own applications
- read own enrollments
- read own payments
- read only enrolled course content
- upload own submissions
- create own bookings

### Teacher

- read assigned courses
- upload course resources for assigned courses
- create assignments and quizzes for assigned courses
- grade submissions for assigned courses
- publish final marks where allowed

### Admin

- manage faculties, qualifications, courses
- review enrollment applications
- manage rooms and time slots
- view all payments
- manage user roles

## Data Migration Plan

### Export old data

Export from current SQL database:

- users from ASP.NET Identity
- students
- teachers
- faculties
- qualifications
- courses
- enrollments
- NSC submissions and subjects
- payments
- resources
- assignments
- submissions
- quizzes
- questions
- quiz attempts
- final marks
- rooms
- time slots
- bookings
- study sessions
- task items

### Transform rules

- map ASP.NET Identity user IDs to Clerk user IDs
- create a legacy ID mapping file during migration
- split auth identity from profile records
- remove all gym-linked records from the transform
- normalize names and enums while importing

### Import order

1. users
2. student profiles and teacher profiles
3. faculties
4. qualifications
5. courses
6. rooms and time slots
7. applications and enrollments
8. resources
9. assignments
10. submissions
11. quizzes
12. questions
13. quiz attempts
14. final marks
15. payments
16. bookings
17. study sessions and task items

## Immediate Risks

### 1. Secrets are committed

`Web.config` contains live or test-looking credentials for:

- SMTP
- Paystack
- Shippo
- Azure storage
- other external services

Rotate all of them before migration work continues.

### 2. IDs are auth-coupled

Current `StudentID` and `TeacherID` are tied to the auth user ID. That coupling must be broken cleanly when moving to Clerk.

### 3. Multi-step flow depends on TempData

The enrollment application flow depends on request-scoped MVC behavior. It needs to become a persisted draft flow.

### 4. Business logic lives in controllers

Much of the app logic is embedded in controller actions, not services. Expect to manually extract behavior.

## Suggested Initial Build Backlog

### Sprint 1

- scaffold Next.js app
- add Clerk
- add Convex
- add base layout
- add user sync
- add role system

### Sprint 2

- faculties
- qualifications
- courses
- dashboard shell

### Sprint 3

- classroom
- resources upload/download
- teacher course management

### Sprint 4

- assignments
- submissions
- grading

### Sprint 5

- quizzes
- marking
- progress

### Sprint 6

- enrollment application wizard
- NSC upload
- admin review

### Sprint 7

- Paystack integration
- payments dashboard

### Sprint 8

- bookings
- study sessions

## Definition of Done for the Migration

The old app can be retired when the new system supports:

- Clerk-based sign-up and sign-in
- role-based student, teacher, and admin access
- course management
- classroom resources
- assignment submission and grading
- quiz creation and completion
- progress tracking
- enrollment application and NSC uploads
- payment verification
- bookings and study sessions
- migrated production data

## Next Concrete Deliverables

The best next implementation steps are:

1. scaffold the new Next.js app in a separate folder
2. install and wire Clerk + Convex
3. create `convex/schema.ts`
4. implement user sync and role-aware dashboards
5. build the academic catalog first

If you want, the next step after this file should be the actual project bootstrap:

- create the new Next.js app in this workspace
- install Clerk and Convex
- add the base folder structure
- add the initial Convex schema
- and scaffold the first protected dashboard pages
