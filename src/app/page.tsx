"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { SignInButton } from "@/components/SignInButton";
import { SpinnerIcon } from "@/components/icons";

export default function Home() {
  const { user, loading, username, usernameChecked, authError } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && usernameChecked && username) {
      router.replace("/groups");
    }
  }, [user, usernameChecked, username, router]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Update</h1>

      {loading || (user && !usernameChecked) || (user && username) ? (
        <SpinnerIcon className="h-6 w-6 text-muted" />
      ) : (
        <SignInButton />
      )}

      {authError && (
        <p role="alert" className="max-w-sm text-center text-sm text-danger">
          {authError}
        </p>
      )}
    </main>
  );
}
