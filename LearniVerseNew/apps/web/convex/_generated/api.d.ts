/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as assignments from "../assignments.js";
import type * as attendance from "../attendance.js";
import type * as bookings from "../bookings.js";
import type * as calendar from "../calendar.js";
import type * as classes from "../classes.js";
import type * as courses from "../courses.js";
import type * as enrollments from "../enrollments.js";
import type * as faculties from "../faculties.js";
import type * as fees from "../fees.js";
import type * as invitations from "../invitations.js";
import type * as liveSessions from "../liveSessions.js";
import type * as manualMarks from "../manualMarks.js";
import type * as marks from "../marks.js";
import type * as meetings from "../meetings.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as parentServices from "../parentServices.js";
import type * as payments from "../payments.js";
import type * as peerReviews from "../peerReviews.js";
import type * as progress from "../progress.js";
import type * as qualifications from "../qualifications.js";
import type * as quizSessions from "../quizSessions.js";
import type * as quizzes from "../quizzes.js";
import type * as reports from "../reports.js";
import type * as resources from "../resources.js";
import type * as rooms from "../rooms.js";
import type * as seed from "../seed.js";
import type * as sports from "../sports.js";
import type * as studySessions from "../studySessions.js";
import type * as submissionComments from "../submissionComments.js";
import type * as submissions from "../submissions.js";
import type * as taskItems from "../taskItems.js";
import type * as teacherBookings from "../teacherBookings.js";
import type * as teachers from "../teachers.js";
import type * as timeSlots from "../timeSlots.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  assignments: typeof assignments;
  attendance: typeof attendance;
  bookings: typeof bookings;
  calendar: typeof calendar;
  classes: typeof classes;
  courses: typeof courses;
  enrollments: typeof enrollments;
  faculties: typeof faculties;
  fees: typeof fees;
  invitations: typeof invitations;
  liveSessions: typeof liveSessions;
  manualMarks: typeof manualMarks;
  marks: typeof marks;
  meetings: typeof meetings;
  messages: typeof messages;
  notifications: typeof notifications;
  parentServices: typeof parentServices;
  payments: typeof payments;
  peerReviews: typeof peerReviews;
  progress: typeof progress;
  qualifications: typeof qualifications;
  quizSessions: typeof quizSessions;
  quizzes: typeof quizzes;
  reports: typeof reports;
  resources: typeof resources;
  rooms: typeof rooms;
  seed: typeof seed;
  sports: typeof sports;
  studySessions: typeof studySessions;
  submissionComments: typeof submissionComments;
  submissions: typeof submissions;
  taskItems: typeof taskItems;
  teacherBookings: typeof teacherBookings;
  teachers: typeof teachers;
  timeSlots: typeof timeSlots;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
