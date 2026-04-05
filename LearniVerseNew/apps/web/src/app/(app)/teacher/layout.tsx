import type { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/role-guard";

type TeacherLayoutProps = {
  children: ReactNode;
};

export default function TeacherLayout({ children }: TeacherLayoutProps) {
  return <RoleGuard allowedRoles={["teacher", "admin"]}>{children}</RoleGuard>;
}
