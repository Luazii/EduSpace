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
      icon: <LayoutDashboard className="h-5 w-5" />,
      show: isAdmin || isTeacher || isParent || (isStudent && isEnrolled),
    },
    {
      href: "/courses",
      label: "Subjects",
      icon: <BookOpen className="h-5 w-5" />,
      show: true,
    },
    {
      href: isAdmin ? "/admin/enrollments" : "/apply",
      label: isAdmin ? "Applications" : "Apply",
      icon: <ClipboardList className="h-5 w-5" />,
      show: !isTeacher && !isParent,
    },
    {
      href: isTeacher ? "/bookings/with" : "/bookings/teachers",
      label: isTeacher ? "Request" : "Book",
      icon: <Calendar className="h-5 w-5" />,
      show: (isStudent && isEnrolled) || isParent || isTeacher,
    },
    {
      href: isTeacher ? "/bookings/requests" : "/bookings/my",
      label: "Bookings",
      icon: <Users className="h-5 w-5" />,
      show: (isStudent && isEnrolled) || isParent || isTeacher,
    },
    {
      href: "/profile",
      label: "Profile",
      icon: <User className="h-5 w-5" />,
      show: true,
    },
  ];

  const visible = items.filter((item) => item.show);

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden pb-safe">
      <div className="mx-3 mb-4">
        <nav className="flex items-center justify-around rounded-[2rem] bg-white/90 backdrop-blur-xl shadow-[0_8px_40px_rgba(15,23,42,0.18)] border border-black/5 px-2 py-3">
          {visible.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 min-w-0 flex-1"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-2xl transition-all duration-200",
                    isActive
                      ? "bg-slate-950 text-white shadow-lg shadow-slate-950/20 scale-110"
                      : "text-slate-400 hover:text-slate-700",
                  )}
                >
                  {item.icon}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold tracking-wide leading-none transition-colors",
                    isActive ? "text-slate-950" : "text-slate-400",
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
