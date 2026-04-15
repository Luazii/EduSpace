"use client";

import { FormEvent, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Trash2, Edit3, Plus, X, Check, Search, User, Filter, Award } from "lucide-react";

import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

export function CourseManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [filterQual, setFilterQual] = useState("");

  const courses = useQuery(api.courses.list, { 
    department: filterDept || undefined,
    qualificationId: filterQual ? (filterQual as Id<"qualifications">) : undefined
  }) ?? [];
  
  const qualifications = useQuery(api.qualifications.list) ?? [];
  const teachers = useQuery(api.teachers.list) ?? [];
  
  const filteredCourses = courses.filter(c => 
    c.courseName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.courseCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const departments = Array.from(new Set(courses.map(c => c.department))).filter(Boolean);

  const createCourse = useMutation(api.courses.create);
  const updateCourse = useMutation(api.courses.update);
  const removeCourse = useMutation(api.courses.remove);

  const [editingId, setEditingId] = useState<Id<"courses"> | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [department, setDepartment] = useState("");
  const [semester, setSemester] = useState("");
  const [price, setPrice] = useState("");
  const [qualificationId, setQualificationId] = useState("");
  const [teacherProfileId, setTeacherProfileId] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setEditingId(null);
    setCourseCode("");
    setCourseName("");
    setDescription("");
    setDepartment("");
    setSemester("");
    setPrice("");
    setQualificationId("");
    setTeacherProfileId("");
  };

  const startEdit = (course: any) => {
    setEditingId(course._id);
    setCourseCode(course.courseCode);
    setCourseName(course.courseName);
    setDescription(course.description || "");
    setDepartment(course.department);
    setSemester(course.semester?.toString() || "");
    setPrice(course.price?.toString() || "");
    setQualificationId(course.qualificationId || "");
    setTeacherProfileId(course.teacherProfileId || "");
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!courseCode.trim() || !courseName.trim()) return;

    setIsSaving(true);
    try {
      const payload = {
        courseCode: courseCode.trim(),
        courseName: courseName.trim(),
        description: description.trim() || undefined,
        department: department.trim(),
        semester: semester ? Number(semester) : undefined,
        price: price ? Number(price) : undefined,
        qualificationId: qualificationId ? (qualificationId as Id<"qualifications">) : undefined,
        teacherProfileId: teacherProfileId ? (teacherProfileId as Id<"teacherProfiles">) : undefined,
      };

      if (editingId) {
        await updateCourse({ id: editingId, ...payload });
      } else {
        await createCourse(payload);
      }
      resetForm();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
      {/* Form Sidebar */}
      <form onSubmit={onSubmit} className="h-fit sticky top-10 rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#7c4dff] mb-2">{editingId ? "Subject Record Update" : "Subject Design"}</p>
            <h2 className="text-2xl font-black text-slate-950">{editingId ? "Edit Subject" : "New Subject Listing"}</h2>
          </div>
          {editingId && <button type="button" onClick={resetForm} className="rounded-xl p-2 hover:bg-slate-50 transition"><X className="h-5 w-5 text-slate-400" /></button>}
        </header>

        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="sm:col-span-1 text-xs font-black uppercase tracking-widest text-slate-500">Subject Code
              <input value={courseCode} onChange={e => setCourseCode(e.target.value)} className="w-full mt-2 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" placeholder="MAT10" />
            </label>
            <label className="sm:col-span-2 text-xs font-black uppercase tracking-widest text-slate-500">Subject Name
              <input value={courseName} onChange={e => setCourseName(e.target.value)} className="w-full mt-2 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" placeholder="Mathematics Grade 10" />
            </label>
          </div>

          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Subject Teacher
            <div className="relative mt-2">
              <select value={teacherProfileId} onChange={e => setTeacherProfileId(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none appearance-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10">
                <option value="">Unassigned</option>
                {teachers.map(t => (
                  <option key={t._id} value={t._id}>
                    {t.user?.fullName || t.user?.email} ({t.employeeNumber || "No ID"})
                  </option>
                ))}
              </select>
              <User className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 pointer-events-none" />
            </div>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Grade Level
              <input value={department} onChange={e => setDepartment(e.target.value)} className="w-full mt-2 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" placeholder="Information Tech" />
            </label>
            <label className="text-xs font-black uppercase tracking-widest text-slate-500">Qualification
              <select value={qualificationId} onChange={e => setQualificationId(e.target.value)} className="w-full mt-2 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none appearance-none transition focus:border-sky-500">
                <option value="">General Curriculum</option>
                {qualifications.map(q => <option key={q._id} value={q._id}>{q.name}</option>)}
              </select>
            </label>
          </div>

          <label className="text-xs font-black uppercase tracking-widest text-slate-500">Description
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full mt-2 rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-bold outline-none transition focus:border-sky-500 focus:ring-4 focus:ring-sky-500/10" />
          </label>

          <button disabled={isSaving} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 py-4 text-sm font-black uppercase tracking-widest text-white transition hover:bg-slate-800 disabled:opacity-50">
            {isSaving ? "Saving..." : (editingId ? "Update Subject Record" : "Add to Registry")}
            {!isSaving && <Check className="h-4 w-4" />}
          </button>
        </div>
      </form>

      {/* List Content */}
      <div className="space-y-8">
        <header className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-[#7c4dff] mb-2">Academic Inventory</p>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 italic">Subject Registry</h1>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search subjects..."
                className="rounded-xl border border-slate-200 px-4 py-2 pl-12 text-xs font-bold outline-none transition focus:border-sky-500"
              />
            </div>
            <select 
              value={filterDept} 
              onChange={e => setFilterDept(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 outline-none hover:bg-slate-50 transition"
            >
              <option value="">All Grades</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </header>

        <div className="grid gap-4">
          {filteredCourses.length === 0 ? (
            <div className="rounded-4xl border-2 border-dashed border-slate-100 py-24 text-center">
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No subjects found matching criteria</p>
            </div>
          ) : (
            filteredCourses.map(course => (
              <article key={course._id} className="group rounded-3xl border border-slate-100 bg-white p-6 transition hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/20">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <span className="rounded-lg bg-sky-50 px-2 py-1 text-[10px] font-black text-sky-700 uppercase">{course.courseCode}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{course.department}</span>
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-950 group-hover:text-sky-600 transition">{course.courseName}</h3>
                      <p className="mt-1 text-xs font-medium text-slate-500 line-clamp-1">{course.description || "No description provided."}</p>
                    </div>
                    <div className="flex items-center gap-4 pt-2">
                       {course.teacherProfileId ? (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-emerald-600">
                          <User className="h-3 w-3" /> Assigned Staff
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-rose-500">
                          <AlertCircle className="h-3 w-3" /> Unassigned
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <Award className="h-3 w-3" /> {course.qualification?.name || "General"}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(course)} className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-sky-600 hover:border-sky-200 hover:bg-sky-50/50 transition">
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => {
                        if(confirm("Permanently archive this subject?")) {
                          removeCourse({ id: course._id });
                        }
                      }}
                      className="p-3 rounded-2xl border border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50/50 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function AlertCircle(props: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      {...props}
    >
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
