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

    void upsertFromClerk({
      clerkUserId: user.id,
      email: user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? "",
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      fullName: user.fullName ?? undefined,
      phone: user.primaryPhoneNumber?.phoneNumber ?? undefined,
    });
  }, [isLoaded, isSignedIn, upsertFromClerk, user]);

  return null;
}
