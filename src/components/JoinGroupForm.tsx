"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { SpinnerIcon } from "@/components/icons";

export function JoinGroupForm() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = code.trim().length > 0 && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You need to sign in first");
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't join group");
      router.push(`/groups/${data.group.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join group");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col items-center gap-4">
      <label htmlFor="invite-code" className="sr-only">
        Invite code
      </label>
      <input
        id="invite-code"
        type="text"
        autoFocus
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Invite code"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-center text-sm uppercase tracking-widest text-foreground placeholder:text-muted placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-ring"
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
        Join
      </button>
    </form>
  );
}
