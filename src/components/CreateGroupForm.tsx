"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GROUP_NAME_MAX_LENGTH, GROUP_NAME_MIN_LENGTH } from "@/lib/validation";
import { SpinnerIcon } from "@/components/icons";

export function CreateGroupForm() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    name.trim().length >= GROUP_NAME_MIN_LENGTH &&
    name.trim().length <= GROUP_NAME_MAX_LENGTH &&
    !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You need to sign in first");
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't create group");
      router.push(`/groups/${data.group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create group");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col items-center gap-4">
      <label htmlFor="group-name" className="sr-only">
        Group name
      </label>
      <input
        id="group-name"
        type="text"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Group name"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring"
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={!canSubmit}
        className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting && <SpinnerIcon className="h-4 w-4" />}
        Create
      </button>
    </form>
  );
}
