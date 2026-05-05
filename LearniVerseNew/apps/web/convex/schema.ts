import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    fullName: v.optional(v.string()),
    username: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.union(
      v.literal("admin"),
      v.literal("teacher"),
      v.literal("student"),
      v.literal("parent"),
      v.literal("warehouse_admin"),
    ),
    isActive: v.boolean(),
    availableRoles: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_user_id", ["clerkUserId"])
    .index("by_email", ["email"])
    .index("by_username", ["username"])
    .index("by_role", ["role"]),
  
  parentStudentLinks: defineTable({
    parentId: v.id("users"),
    studentId: v.id("users"),
    relationship: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_parent", ["parentId"])
    .index("by_student", ["studentId"]),

  studentProfiles: defineTable({
    userId: v.id("users"),
    studentNumber: v.optional(v.string()),
    gender: v.optional(v.string()),
    dob: v.optional(v.number()),
    facultyId: v.optional(v.string()),
    qualificationId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  teacherProfiles: defineTable({
    userId: v.id("users"),
    employeeNumber: v.optional(v.string()),
    facultyId: v.optional(v.string()),
    qualificationText: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user_id", ["userId"]),

  classes: defineTable({
    name: v.string(),
    gradeName: v.string(),
    academicYear: v.string(),
    capacity: v.number(),
    classTeacherUserId: v.optional(v.id("users")),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_grade_name", ["gradeName"])
    .index("by_academic_year", ["academicYear"]),

  classAssignments: defineTable({
    classId: v.id("classes"),
    studentUserId: v.id("users"),
    assignedAt: v.number(),
    assignedByUserId: v.id("users"),
    status: v.union(v.literal("active"), v.literal("removed")),
  })
    .index("by_class", ["classId"])
    .index("by_student", ["studentUserId"])
    .index("by_class_and_student", ["classId", "studentUserId"]),

  faculties: defineTable({
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_name", ["name"]),

  qualifications: defineTable({
    facultyId: v.id("faculties"),
    name: v.string(),
    code: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.boolean(),
  }).index("by_faculty", ["facultyId"]),

  courses: defineTable({
    courseCode: v.string(),
    courseName: v.string(),
    description: v.optional(v.string()),
    semester: v.optional(v.number()),
    department: v.string(),
    price: v.optional(v.number()),
    teacherProfileId: v.optional(v.id("teacherProfiles")),
    qualificationId: v.optional(v.id("qualifications")),
    isPublished: v.boolean(),
    assignmentWeight: v.optional(v.number()), // default 50
    quizWeight: v.optional(v.number()), // default 50
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_course_code", ["courseCode"])
    .index("by_teacher_profile", ["teacherProfileId"])
    .index("by_qualification", ["qualificationId"]),

  liveSessions: defineTable({
    courseId: v.id("courses"),
    title: v.string(),
    meetingUrl: v.string(),
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(v.literal("scheduled"), v.literal("live"), v.literal("completed")),
    scheduledByUserId: v.id("users"),
    createdAt: v.number(),
  }).index("by_course", ["courseId"]),

  resources: defineTable({
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
    uploadedByUserId: v.id("users"),
    createdAt: v.number(),
  }).index("by_course", ["courseId"]),

  assignments: defineTable({
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    deadline: v.optional(v.number()),
    maxMark: v.optional(v.number()),
    isPublished: v.boolean(),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
    // Optional teacher-uploaded assignment brief / instruction document
    documentStorageId: v.optional(v.id("_storage")),
    documentFileName: v.optional(v.string()),
  }).index("by_course", ["courseId"]),

  submissions: defineTable({
    assignmentId: v.id("assignments"),
    studentUserId: v.id("users"),
    storageId: v.optional(v.id("_storage")),
    fileName: v.optional(v.string()),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
    submittedAt: v.number(),
    mark: v.optional(v.number()),
    feedback: v.optional(v.string()),
    gradedAt: v.optional(v.number()),
    gradedByUserId: v.optional(v.id("users")),
    // undefined/true = immediately visible to student; false = held until releaseGrade is called
    isReleased: v.optional(v.boolean()),
  })
    .index("by_assignment", ["assignmentId"])
    .index("by_student", ["studentUserId"])
    .index("by_assignment_and_student", ["assignmentId", "studentUserId"]),

  quizzes: defineTable({
    courseId: v.id("courses"),
    title: v.string(),
    description: v.optional(v.string()),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
    durationMinutes: v.optional(v.number()),
    maxAttempts: v.number(),
    status: v.union(v.literal("draft"), v.literal("published")),
    createdByUserId: v.id("users"),
    createdAt: v.number(),
  }).index("by_course", ["courseId"]),

  questions: defineTable({
    quizId: v.id("quizzes"),
    prompt: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.string(),
    weighting: v.number(),
    position: v.number(),
  }).index("by_quiz", ["quizId"]),

  quizAttempts: defineTable({
    quizId: v.id("quizzes"),
    studentUserId: v.id("users"),
    answers: v.array(
      v.object({
        questionId: v.id("questions"),
        answer: v.string(),
      }),
    ),
    score: v.number(),
    maxScore: v.number(),
    submittedAt: v.number(),
  })
    .index("by_quiz", ["quizId"])
    .index("by_student", ["studentUserId"])
    .index("by_quiz_and_student", ["quizId", "studentUserId"]),

  nscSubmissions: defineTable({
    studentUserId: v.id("users"),
    storageId: v.id("_storage"),
    fileName: v.string(),
    mimeType: v.optional(v.string()),
    size: v.optional(v.number()),
    subjects: v.array(
      v.object({
        name: v.string(),
        mark: v.number(),
      }),
    ),
    submittedAt: v.number(),
  }).index("by_student", ["studentUserId"]),

  enrollmentApplications: defineTable({
    // studentUserId — the Convex user who submitted the application (e.g., Parent or Student themselves)
    studentUserId: v.id("users"),
    // The actual learner being enrolled
    studentEmail: v.optional(v.string()),
    studentFirstName: v.optional(v.string()),
    studentLastName: v.optional(v.string()),
    facultyId: v.optional(v.id("faculties")),
    qualificationId: v.optional(v.id("qualifications")),
    gradeLabel: v.optional(v.string()),           // e.g. "Grade 8" — static high school grade
    selectedCourseIds: v.array(v.id("courses")),
    nscSubmissionId: v.optional(v.id("nscSubmissions")),
    // High school subject names (static SA curriculum list)
    selectedSubjectNames: v.optional(v.array(v.string())),
    currentMarks: v.optional(
      v.array(
        v.object({
          subject: v.string(),
          mark: v.number(),
        }),
      ),
    ),
    // High school registration documents
    birthCertStorageId: v.optional(v.id("_storage")),
    parentIdStorageId: v.optional(v.id("_storage")),
    proofOfResidenceStorageId: v.optional(v.id("_storage")),
    schoolReportStorageId: v.optional(v.id("_storage")),
    transferLetterStorageId: v.optional(v.id("_storage")),
    status: v.union(
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("pre_approved"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    paymentStatus: v.union(
      v.literal("not_started"),
      v.literal("pending"),
      v.literal("paid"),
    ),
    notes: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),
    reviewedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student", ["studentUserId"])
    .index("by_status", ["status"])
    .index("by_student_email", ["studentEmail"]),

  enrollments: defineTable({
    studentUserId: v.id("users"),
    courseId: v.id("courses"),
    applicationId: v.id("enrollmentApplications"),
    enrolledAt: v.number(),
    status: v.union(v.literal("active"), v.literal("completed")),
  })
    .index("by_student", ["studentUserId"])
    .index("by_course", ["courseId"])
    .index("by_application", ["applicationId"]),

  finalMarks: defineTable({
    courseId: v.id("courses"),
    studentUserId: v.id("users"),
    computedAssignmentPercent: v.optional(v.number()),
    computedQuizPercent: v.optional(v.number()),
    computedFinalMark: v.optional(v.number()),
    overrideMark: v.optional(v.number()),
    notes: v.optional(v.string()),
    parentComments: v.optional(v.array(
      v.object({
        parentId: v.id("users"),
        comment: v.string(),
        createdAt: v.number(),
      })
    )),
    status: v.union(v.literal("draft"), v.literal("published")),
    updatedAt: v.number(),
    publishedAt: v.optional(v.number()),
    publishedByUserId: v.optional(v.id("users")),
  })
    .index("by_course", ["courseId"])
    .index("by_student", ["studentUserId"])
    .index("by_course_and_student", ["courseId", "studentUserId"]),

  payments: defineTable({
    applicationId: v.id("enrollmentApplications"),
    studentUserId: v.id("users"),
    provider: v.literal("paystack"),
    reference: v.string(),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("initialized"),
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed"),
    ),
    authorizationUrl: v.optional(v.string()),
    accessCode: v.optional(v.string()),
    gatewayResponse: v.optional(v.string()),
    channel: v.optional(v.string()),
    paidAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_application", ["applicationId"])
    .index("by_student", ["studentUserId"])
    .index("by_reference", ["reference"])
    .index("by_status", ["status"]),

  feeStructures: defineTable({
    name: v.string(),
    gradeName: v.string(),
    academicYear: v.string(),
    tuitionAmount: v.number(),
    registrationAmount: v.number(),
    otherAmount: v.number(),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_grade_name", ["gradeName"])
    .index("by_grade_name_and_academic_year", ["gradeName", "academicYear"]),

  feeInvoices: defineTable({
    studentUserId: v.id("users"),
    classId: v.optional(v.id("classes")),
    feeStructureId: v.id("feeStructures"),
    invoiceNumber: v.string(),
    academicYear: v.string(),
    lineItems: v.array(
      v.object({
        label: v.string(),
        amount: v.number(),
      }),
    ),
    totalAmount: v.number(),
    amountPaid: v.number(),
    balance: v.number(),
    dueDate: v.optional(v.number()),
    status: v.union(
      v.literal("draft"),
      v.literal("issued"),
      v.literal("partially_paid"),
      v.literal("paid"),
      v.literal("overdue"),
    ),
    issuedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student", ["studentUserId"])
    .index("by_invoice_number", ["invoiceNumber"])
    .index("by_status", ["status"]),

  feeReceipts: defineTable({
    invoiceId: v.id("feeInvoices"),
    studentUserId: v.id("users"),
    receiptNumber: v.string(),
    amount: v.number(),
    paymentMethod: v.union(
      v.literal("cash"),
      v.literal("eft"),
      v.literal("card"),
      v.literal("paystack"),
    ),
    reference: v.optional(v.string()),
    receivedByUserId: v.id("users"),
    receivedAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_student", ["studentUserId"])
    .index("by_receipt_number", ["receiptNumber"]),

  manualMarks: defineTable({
    studentUserId: v.id("users"),
    courseId: v.id("courses"),
    enteredByUserId: v.id("users"),
    assessmentName: v.string(),
    assessmentType: v.union(
      v.literal("test"),
      v.literal("exam"),
      v.literal("assignment"),
      v.literal("classwork"),
      v.literal("project"),
    ),
    termLabel: v.optional(v.string()),
    maxMark: v.number(),
    mark: v.number(),
    comment: v.optional(v.string()),
    capturedAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student", ["studentUserId"])
    .index("by_course", ["courseId"])
    .index("by_course_and_student", ["courseId", "studentUserId"]),

  announcements: defineTable({
    senderId: v.id("users"),
    senderName: v.optional(v.string()),
    targetRole: v.union(v.literal("all"), v.literal("parent"), v.literal("student"), v.literal("teacher"), v.literal("parent_student")),
    targetGradeId: v.optional(v.id("faculties")),
    targetGradeName: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    importance: v.union(v.literal("normal"), v.literal("high")),
    createdAt: v.number(),
  })
    .index("by_target", ["targetRole"])
    .index("by_grade", ["targetGradeId"]),

  meetings: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    participantIds: v.array(v.id("users")), // parent, teacher, admin
    startTime: v.number(),
    endTime: v.number(),
    status: v.union(v.literal("scheduled"), v.literal("confirmed"), v.literal("completed"), v.literal("cancelled")),
    outcomeNotes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_participant", ["participantIds"]),

  rooms: defineTable({
    roomCode: v.string(),
    campus: v.string(),
    name: v.string(),
    capacity: v.optional(v.number()),
    isActive: v.boolean(),
  }).index("by_room_code", ["roomCode"]),

  timeSlots: defineTable({
    roomId: v.id("rooms"),
    slotName: v.string(),
    startTime: v.string(),
    endTime: v.string(),
    isActive: v.boolean(),
  }).index("by_room", ["roomId"]),

  bookings: defineTable({
    studentUserId: v.id("users"),
    roomId: v.id("rooms"),
    timeSlotId: v.id("timeSlots"),
    bookingDate: v.string(),
    status: v.union(v.literal("active"), v.literal("cancelled")),
    createdAt: v.number(),
  })
    .index("by_student", ["studentUserId"])
    .index("by_room", ["roomId"])
    .index("by_time_slot", ["timeSlotId"]),

  studySessions: defineTable({
    studentUserId: v.id("users"),
    title: v.string(),
    sessionDate: v.string(),
    notes: v.optional(v.string()),
    status: v.union(v.literal("planned"), v.literal("completed")),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_student", ["studentUserId"]),

  taskItems: defineTable({
    studySessionId: v.id("studySessions"),
    title: v.string(),
    description: v.optional(v.string()),
    isComplete: v.boolean(),
    position: v.number(),
  }).index("by_study_session", ["studySessionId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    type: v.union(v.literal("grade"), v.literal("enrollment"), v.literal("deadline"), v.literal("system"), v.literal("booking"), v.literal("announcement"), v.literal("meeting")),
    link: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  teacherAvailabilitySettings: defineTable({
    teacherUserId: v.id("users"),
    slotDurationMinutes: v.number(),   // 30 or 60
    workDayStart: v.string(),          // "08:00"
    workDayEnd: v.string(),            // "16:00"
    workDays: v.array(v.number()),     // [1,2,3,4,5] Mon=1 … Fri=5
    updatedAt: v.number(),
  }).index("by_teacher", ["teacherUserId"]),

  teacherBookings: defineTable({
    studentUserId: v.id("users"),
    teacherUserId: v.id("users"),
    startTime: v.number(),             // epoch ms
    endTime: v.number(),               // epoch ms
    durationMinutes: v.number(),
    meetingType: v.union(v.literal("in_person"), v.literal("online")),
    location: v.optional(v.string()),  // office address for in-person
    meetingLink: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected"),
      v.literal("reschedule_proposed"),
      v.literal("completed"),
      v.literal("cancelled"),
    ),
    // who created this booking request
    initiatedBy: v.optional(v.union(
      v.literal("student"),
      v.literal("teacher"),
      v.literal("parent"),
    )),
    proposedStartTime: v.optional(v.number()),
    proposedEndTime: v.optional(v.number()),
    studentNotes: v.optional(v.string()),
    rejectionReason: v.optional(v.string()),
    rescheduleNote: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_student", ["studentUserId"])
    .index("by_teacher", ["teacherUserId"])
    .index("by_teacher_and_time", ["teacherUserId", "startTime"]),

  conversations: defineTable({
    participantIds: v.array(v.id("users")),
    updatedAt: v.number(),
  }).index("by_participant", ["participantIds"]),

  messages: defineTable({
    conversationId: v.id("conversations"),
    senderId: v.id("users"),
    body: v.string(),
    createdAt: v.number(),
  }).index("by_conversation", ["conversationId"]),

  // Real-time quiz sessions — one per student attempt, the authoritative working copy
  quizSessions: defineTable({
    quizId: v.id("quizzes"),
    studentUserId: v.id("users"),
    startedAt: v.number(),
    endsAt: v.optional(v.number()),
    answers: v.array(
      v.object({
        questionId: v.id("questions"),
        answer: v.string(),
        answeredAt: v.number(),
      }),
    ),
    currentQuestionIndex: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("submitted"),
      v.literal("locked"),
    ),
    // Written when session is finalized
    attemptId: v.optional(v.id("quizAttempts")),
    // Stored so we can cancel the auto-lock job on early submission
    schedulerJobId: v.optional(v.id("_scheduled_functions")),
  })
    .index("by_quiz", ["quizId"])
    .index("by_student", ["studentUserId"])
    .index("by_quiz_and_student", ["quizId", "studentUserId"])
    .index("by_quiz_and_status", ["quizId", "status"]),

  // Threaded feedback on assignment submissions
  submissionComments: defineTable({
    submissionId: v.id("submissions"),
    authorId: v.id("users"),
    body: v.string(),
    lineRef: v.optional(v.string()),
    parentCommentId: v.optional(v.id("submissionComments")),
    isEdited: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_parent", ["parentCommentId"]),

  // Peer review assignments
  peerReviews: defineTable({
    submissionId: v.id("submissions"),
    reviewerUserId: v.id("users"),
    assignedByUserId: v.id("users"),
    isAnonymous: v.boolean(),
    feedback: v.optional(v.string()),
    mark: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("submitted")),
    submittedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_submission", ["submissionId"])
    .index("by_reviewer", ["reviewerUserId"]),
});
