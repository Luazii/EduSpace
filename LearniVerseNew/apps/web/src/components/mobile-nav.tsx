"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "convex/react";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  User,
  Calendar,
  Users,
  GraduationCap,
} from "lucide-react";
import { api } from "../../convex/_generated/api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type NavItem = { href: string; label: string; icon: React.ReactNode; show: boolean };

export function MobileNav() {
  const pathname = usePathname();
  const user = useQuery(api.users.current);
  const activeCourses = useQuery(api.enrollments.listMyActiveCourses);

  const role = user?.role;
  const isAdmin = role === "admin";
  const isTeacher = role === "teacher";
  const isStudent = role === "student";
  const isParent = role === "parent";
  const isEnrolled = (activeCourses?.length ?? 0) > 0;

  const dashboardHref = isAdmin
    ? "/admin"
    : isTeacher
    ? "/teacher"
    : isParent
    ? "/parent/dashboard"
    : "/dashboard";

  const items: NavItem[] = [
    {
      href: dashboardHref,
      label: "Home",
      icon: <LayoutDashboard className="h-3.5 w-3.5" />,
      show: isAdmin || isTeacher || isParent || (isStudent && isEnrolled),
    },
    {
      href: "/courses",
      label: "Subjects",
      icon: <BookOpen className="h-3.5 w-3.5" />,
      show: true,
    },
    {
      href: isAdmin ? "/admin/enrollments" : "/apply",
      label: isAdmin ? "Applications" : "Enrol",
      icon: <GraduationCap className="h-3.5 w-3.5" />,
      show: !isTeacher && !isParent,
    },
    {
      href: isTeacher ? "/bookings/with" : "/bookings/teachers",
      label: isTeacher ? "Request" : "Book",
      icon: <Calendar className="h-3.5 w-3.5" />,
      show: (isStudent && isEnrolled) || isParent || isTeacher,
    },
    {
      href: isTeacher ? "/bookings/requests" : "/bookings/my",
      label: "Bookings",
      icon: <Users className="h-3.5 w-3.5" />,
      show: (isStudent && isEnrolled) || isParent || isTeacher,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="h-3.5 w-3.5" />,
      show: true,
    },
  ];

  const visible = items.filter((item) => item.show);

  if (visible.length === 0) return null;

  return (
    <div className="md:hidden border-t border-black/5">
      <div
        className="flex gap-2 overflow-x-auto px-4 py-2.5 scrollbar-none"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {visible.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold whitespace-nowrap transition-all duration-200",
                isActive
                  ? "bg-slate-950 text-white shadow-md shadow-slate-950/20"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700",
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
