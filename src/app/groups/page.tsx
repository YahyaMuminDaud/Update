"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GroupPicker } from "@/components/GroupPicker";
import { SignInButton } from "@/components/SignInButton";
import { SpinnerIcon } from "@/components/icons";

export default function GroupsPage() {
  const { user, loading, username, usernameChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const ready = user && usernameChecked && username;

  return (
    <>
      <header className="flex justify-end px-4 py-3">
        <SignInButton />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Complainathon</h1>

        {ready ? <GroupPicker /> : <SpinnerIcon className="h-6 w-6 text-muted" />}
      </main>
    </>
  );
}
