"use client";

import { useQuery, useMutation, useConvexAuth } from "convex/react";
import { api } from "../../convex/_generated/api";
import { format } from "date-fns";
import { 
  Bell, 
  CheckCircle2, 
  GraduationCap, 
  Clock, 
  X,
  Inbox
} from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function NotificationsHub() {
  const router = useRouter();
  const { isAuthenticated } = useConvexAuth();
  const [isOpen, setIsOpen] = useState(false);
  const notifications = useQuery(api.notifications.list, isAuthenticated ? { limit: 10 } : "skip");
  const unreadCount = (useQuery(api.notifications.getUnreadCount, isAuthenticated ? {} : "skip") ?? 0) as number;
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  if (!isAuthenticated) return null;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "grade": return <GraduationCap className="h-5 w-5 text-emerald-600" />;
      case "enrollment": return <CheckCircle2 className="h-5 w-5 text-sky-600" />;
      case "deadline": return <Clock className="h-5 w-5 text-rose-600" />;
      default: return <Bell className="h-5 w-5 text-slate-600" />;
    }
  };

  const handleNotificationClick = async (item: any) => {
    if (!item.isRead) {
      await markAsRead({ notificationId: item._id });
    }
    if (item.link) {
      setIsOpen(false);
      router.push(item.link);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="group relative rounded-2xl border border-slate-200 bg-white p-3 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
      >
        <Bell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white ring-2 ring-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-60 bg-black/5 backdrop-blur-sm" 
            onClick={() => setIsOpen(false)} 
          />
          <div className="absolute right-0 top-16 z-70 w-96 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.1)] transition-all animate-in fade-in zoom-in-95 slide-in-from-top-4">
            <header className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-5">
              <h3 className="text-lg font-bold text-slate-950">Notifications</h3>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => markAllAsRead()}
                  className="text-xs font-bold text-sky-600 hover:text-sky-700"
                >
                  Mark all as read
                </button>
                <X 
                  className="h-5 w-5 cursor-pointer text-slate-400 hover:text-slate-900" 
                  onClick={() => setIsOpen(false)}
                />
              </div>
            </header>

            <div className="max-h-128 overflow-y-auto">
              {notifications?.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-slate-500">
                  <Inbox className="h-10 w-10 text-slate-200 mb-4" />
                  <p className="text-sm font-medium">All caught up!</p>
                  <p className="text-xs text-slate-400 mt-1">New alerts will appear here.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notifications?.map((item: any) => (
                    <div 
                      key={item._id}
                      onClick={() => handleNotificationClick(item)}
                      className={cn(
                        "group relative flex flex-col gap-1 px-6 py-5 transition hover:bg-slate-50/50 cursor-pointer",
                        !item.isRead && "bg-sky-50/20"
                      )}
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-bold leading-tight text-slate-900 group-hover:text-sky-900">
                              {item.title}
                            </h4>
                            {!item.isRead && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-600" />
                            )}
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">
                            {item.body}
                          </p>
                          <div className="mt-2 flex items-center justify-between">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {format(item.createdAt, "PPP p")}
                            </p>
                            {item.link && (
                              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                Take Action
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <footer className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button className="w-full rounded-xl bg-white py-3 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-slate-100">
                View All Notification History
              </button>
            </footer>
          </div>
        </>
      )}
    </div>
  );
}
