"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Navbar() {
  const pathname = usePathname();
  const user = useQuery(api.users.current);
  const activeCourses = useQuery(api.enrollments.listMyActiveCourses);

  const role = user?.role;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const isParent = role === "parent";

  const isEnrolled = (activeCourses?.length ?? 0) > 0;
  const showStudentDashboard = isStudent && isEnrolled;

  // Role-aware dashboard destination
  const dashboardHref = isAdmin
    ? "/admin"
    : isTeacher
    ? "/teacher"
    : isParent
    ? "/parent/dashboard"
    : "/dashboard";

  const links = [
    // Apply / Applications
    {
      href: isAdmin ? "/admin/enrollments" : "/apply",
      label: isAdmin ? "Applications" : "Apply",
      show: !isTeacher && !isParent,
    },
    // Courses catalogue — everyone sees this
    { href: "/courses", label: "Courses", show: true },
    // Dashboard — role-aware
    {
      href: dashboardHref,
      label: "Dashboard",
      show: isAdmin || isTeacher || isParent || showStudentDashboard,
    },
    // Profile — everyone sees this if authenticated
    { href: "/profile", label: "Profile", show: true },
    // Book a Meeting — students and parents
    {
      href: "/bookings/teachers",
      label: "Book Meeting",
      show: (isStudent && isEnrolled) || isParent,
    },
    // My Bookings — students and parents (sent + received tabs)
    {
      href: "/bookings/my",
      label: "My Bookings",
      show: (isStudent && isEnrolled) || isParent,
    },
    // Request Meeting — teachers initiate with students/parents
    {
      href: "/bookings/with",
      label: "Request Meeting",
      show: isTeacher,
    },
    // Manage incoming + availability — teachers
    {
      href: "/bookings/requests",
      label: "My Bookings",
      show: isTeacher,
    },
  ];

  return (
    <nav className="hidden items-center gap-8 md:flex">
      {links
        .filter((link) => link.show)
        .map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "text-sm font-bold transition",
              pathname === link.href || pathname.startsWith(link.href + "/")
                ? "text-slate-950"
                : "text-slate-500 hover:text-slate-950",
            )}
          >
            {link.label}
          </Link>
        ))}
    </nav>
  );
}
