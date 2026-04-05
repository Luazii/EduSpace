import type { ReactNode } from "react";

import { RoleGuard } from "@/components/auth/role-guard";

type AdminLayoutProps = {
  children: ReactNode;
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <RoleGuard allowedRoles={["admin"]}>{children}</RoleGuard>;
}
