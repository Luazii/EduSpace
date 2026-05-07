# Merit & Demerit System

Behaviour tracking for learners — positive merits and negative demerits awarded by teachers/admins. All records visible on student report cards, parent dashboards, and admin overviews.

---

## Tasks

### 1. Database Schema (`convex/schema.ts`)

Add a `behaviourRecords` table:

```
behaviourRecords: defineTable({
  studentUserId:   Id<"users">        // the learner
  awardedByUserId: Id<"users">        // teacher or admin who recorded it
  type:            "merit" | "demerit"
  category:        string             // e.g. "Helpfulness", "Conduct", "Punctuality"
  description:     string             // free-text e.g. "Helped clean classroom after period 3"
  points:          number             // e.g. merit = +1, demerit = -1 (configurable)
  courseId?:       Id<"courses">      // optional — link to a subject if relevant
  occurredAt:      number             // timestamp of the actual event
  createdAt:       number
})
  .index("by_student",        ["studentUserId"])
  .index("by_student_type",   ["studentUserId", "type"])
  .index("by_awarder",        ["awardedByUserId"])
  .index("by_course",         ["courseId"])
```

---

### 2. Convex Backend (`convex/behaviour.ts`)

**Mutations**
- `awardRecord` — teacher/admin creates a merit or demerit for a student
- `deleteRecord` — admin can remove an incorrectly created record
- `editRecord` — admin can correct description/points on an existing record

**Queries**
- `listForStudent({ studentUserId, limit? })` — all records for one student, newest first
- `summaryForStudent({ studentUserId })` — returns `{ merits, demerits, netPoints, categories: [...] }`
- `listForClass({ courseId })` — all records linked to a specific course
- `listRecent({ limit })` — admin feed of latest records across the school

---

### 3. Teacher UI — Award Panel (`/teacher/behaviour`)

Page where a teacher can:
- Search/select a student from their enrolled courses
- Choose type: **Merit** (green) or **Demerit** (red)
- Pick a category from a dropdown (pre-defined list + free-type)
- Write a short description
- Set points (defaults: merit = +1, demerit = -1)
- Submit → optimistic success toast

Pre-defined categories:
- Merit: Helpfulness, Academic Excellence, Leadership, Sportsmanship, Respect
- Demerit: Disruptive Behaviour, Late Submission, Truancy, Disrespect, Property Damage

---

### 4. Student View — Behaviour Tab (`/dashboard` or `/progress`)

A tab or section on the student's dashboard:
- Running **net points** total shown as a badge (e.g. `+7 pts`)
- Timeline list: date, type badge (Merit/Demerit), category, description, points
- Colour-coded rows — green for merit, red for demerit

---

### 5. Parent View (`/parent/dashboard`)

Under the child's profile panel:
- Small summary card: `Merits: 5 | Demerits: 1 | Net: +4`
- Expandable list of all records with date and description
- Parents should NOT see the name of the awarding teacher (privacy)

---

### 6. Report Card Integration

In the existing report card / final marks view (student + parent):
- Add a **"Behaviour Record"** section below academic marks
- Show:
  - Total merits count and total demerit count for the term
  - Net points
  - A one-line conduct summary auto-generated from net points:
    - ≥ 5 net → "Outstanding Conduct"
    - 1–4 net → "Good Conduct"
    - 0 net → "Satisfactory Conduct"
    - –1 to –3 net → "Conduct Requires Improvement"
    - ≤ –4 net → "Poor Conduct — Parental Engagement Recommended"
  - List of merit award descriptions (no demerits shown on student-facing report — demerits are for internal use and parent view only)

---

### 7. Admin Overview (`/admin/behaviour`)

Full school-wide dashboard:
- Table of all recent records (paginated), filterable by type/grade/date
- Top 10 merit earners and top 10 demerit earners this month
- Ability to delete/edit any record
- Export to CSV for end-of-term reports

---

### 8. Admin Portal Card (`/admin`)

Add a portal card to the admin page:
- Title: "Behaviour Records"
- Body: "Track merits and demerits across all learners."
- Icon: `ShieldCheck` or `Star`
- Link: `/admin/behaviour`

---

### 9. Clerk Middleware

Add `/teacher/behaviour(.*)` and `/admin/behaviour(.*)` to the `createRouteMatcher` in `src/middleware.ts`.

---

### 10. Seed Data (`convex/seed.ts`)

Add a `seedBehaviourRecords` mutation that creates sample records for seeded Grade 8/9 students:
- 3–5 merits per student (Helpfulness, Leadership, etc.)
- 1–2 demerits per student (Late Submission, Disruptive Behaviour)
- Spread across the past 30 days
- Awarded by the existing seeded teacher

---

## Acceptance Criteria

- [ ] Teacher can award a merit/demerit from `/teacher/behaviour` in under 10 seconds
- [ ] Record appears on the student's dashboard immediately (Convex real-time)
- [ ] Parent sees the record on their dashboard
- [ ] Report card shows conduct summary and merit list
- [ ] Admin can view, edit, and delete any record
- [ ] No demerits visible to the student on their own report card (visible to admin/parent only)
- [ ] TypeScript clean (`npx tsc --noEmit`)
- [ ] Convex types regenerated and committed after new backend file is added
