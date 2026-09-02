"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GroupSettings } from "@/components/GroupSettings";
import { ArrowLeftIcon } from "@/components/icons";

export default function GroupSettingsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <Link
        href={`/groups/${id}`}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors duration-200"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back
      </Link>
      <h1 className="mt-4 mb-6 text-xl font-bold tracking-tight text-foreground">Group settings</h1>
      <GroupSettings groupId={id} />
    </main>
  );
}
