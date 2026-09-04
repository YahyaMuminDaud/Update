"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CreateGroupForm } from "@/components/CreateGroupForm";
import { ArrowLeftIcon, SpinnerIcon } from "@/components/icons";

export default function CreateGroupPage() {
  const { user, loading, username, usernameChecked } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const ready = user && usernameChecked && username;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-8 px-4">
      <Link
        href="/groups"
        className="absolute left-4 top-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back
      </Link>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">Update</h1>
      {ready ? <CreateGroupForm /> : <SpinnerIcon className="h-6 w-6 text-muted" />}
    </main>
  );
}
