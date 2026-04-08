"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";

import { api } from "../../convex/_generated/api";

export function UserBootstrapper() {
  const ranRef = useRef(false);
  const { isLoaded, isSignedIn, user } = useUser();
  const upsertFromClerk = useMutation(api.users.upsertFromClerk);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !user || ranRef.current) {
      return;
    }

    ranRef.current = true;

    // If the user arrived via a Clerk invitation, their publicMetadata carries
    // role: "student" set at invite time. Pass it through so they're provisioned
    // as a student automatically instead of getting the default parent role.
    const metaRole = (user.publicMetadata as { role?: string })?.role as
      | "admin" | "teacher" | "student" | "parent" | "warehouse_admin"
      | undefined;

    void upsertFromClerk({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      fullName: user.fullName ?? undefined,
      phone: user.primaryPhoneNumber?.phoneNumber ?? undefined,
      role: metaRole,
    });
  }, [isLoaded, isSignedIn, upsertFromClerk, user]);

  return null;
}
