"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { COMPLAINT_MAX_LENGTH } from "@/lib/validation";
import { MegaphoneIcon, SpinnerIcon } from "@/components/icons";

export function ComposeBox({
  onPost,
  canPost = true,
}: {
  onPost: (body: string) => Promise<void>;
  canPost?: boolean;
}) {
  const { user, loading, usernameChecked, signInWithGoogle } = useAuth();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = COMPLAINT_MAX_LENGTH - value.length;
  const canSubmit = value.trim().length > 0 && remaining >= 0 && !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await onPost(value.trim());
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't post that. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || (user && !usernameChecked)) {
    return <div className="h-32 rounded-xl border border-border bg-card animate-pulse" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <MegaphoneIcon className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-2 text-sm text-muted">Sign in to post your own complaint to the feed.</p>
        <button
          type="button"
          onClick={() => void signInWithGoogle()}
          className="cursor-pointer mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  if (!canPost) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <MegaphoneIcon className="mx-auto h-6 w-6 text-muted" />
        <p className="mt-2 text-sm text-muted">
          This group is in announcement mode — only the owner and announcers can post.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-card p-4 focus-within:ring-2 focus-within:ring-ring transition-shadow duration-200"
    >
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="complaint-body" className="sr-only">
            What&apos;s bugging you?
          </label>
          <textarea
            id="complaint-body"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="What's bugging you?"
            rows={3}
            className="w-full resize-none bg-transparent text-base text-foreground placeholder:text-muted focus:outline-none"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
        <span
          className={`text-xs ${remaining < 0 ? "text-danger" : "text-muted"}`}
          aria-live="polite"
        >
          {remaining} characters left
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <SpinnerIcon className="h-4 w-4" />}
          Post
        </button>
      </div>
    </form>
  );
}
