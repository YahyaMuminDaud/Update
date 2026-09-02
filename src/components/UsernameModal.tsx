"use client";

import { useState, type FormEvent } from "react";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@/lib/validation";
import { SpinnerIcon, XIcon } from "@/components/icons";

export function UsernameModal({
  required,
  currentUsername,
  getToken,
  onSaved,
  onClose,
}: {
  required: boolean;
  currentUsername: string | null;
  getToken: () => Promise<string | null>;
  onSaved: (username: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(currentUsername ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit =
    value.trim().length >= USERNAME_MIN_LENGTH &&
    value.trim().length <= USERNAME_MAX_LENGTH &&
    !submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error("You need to sign in first");
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: value.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't save that username");
      onSaved(data.username as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save that username");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="username-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg">
        <div className="flex items-start justify-between gap-2">
          <h2 id="username-modal-title" className="text-base font-semibold text-foreground">
            {required ? "Choose a username" : "Change your username"}
          </h2>
          {!required && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="cursor-pointer -m-1 rounded-lg p-1 text-muted hover:bg-border/40 hover:text-foreground transition-colors duration-200"
            >
              <XIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-sm text-muted">
          {required
            ? "Pick a name others will see on your complaints."
            : "This changes what shows on new complaints. Past posts keep your old name."}
        </p>

        <form onSubmit={handleSubmit} className="mt-4">
          <label htmlFor="username-input" className="sr-only">
            Username
          </label>
          <input
            id="username-input"
            type="text"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. grumpy_gopher"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {error && (
            <p role="alert" className="mt-2 text-sm text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 flex items-center justify-end gap-2">
            {!required && (
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <SpinnerIcon className="h-4 w-4" />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
