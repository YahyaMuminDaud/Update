"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { timeAgo } from "@/lib/time";
import { COMPLAINT_MAX_LENGTH } from "@/lib/validation";
import type { ComplaintDTO } from "@/lib/types";
import { CheckIcon, PencilIcon, SpinnerIcon, TrashIcon, XIcon } from "@/components/icons";

export function ComplaintCard({
  complaint,
  onUpdate,
  onDelete,
}: {
  complaint: ComplaintDTO;
  onUpdate: (id: string, body: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const { user } = useAuth();
  const isOwner = user?.uid === complaint.authorId;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(complaint.body);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const remaining = COMPLAINT_MAX_LENGTH - draft.length;

  async function handleSave() {
    if (draft.trim().length === 0 || remaining < 0) return;
    setSaving(true);
    setError(null);
    try {
      await onUpdate(complaint.id, draft.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(complaint.id);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <article className="rounded-xl border border-border bg-card p-4 transition-colors duration-200">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate text-sm font-semibold text-foreground">
                {complaint.authorName}
              </span>
              <span className="shrink-0 text-xs text-muted">
                {timeAgo(complaint.createdAt)}
                {complaint.updatedAt !== complaint.createdAt ? " · edited" : ""}
              </span>
            </div>

            {isOwner && !editing && (
              <div className="flex shrink-0 items-center gap-1">
                {confirmingDelete ? (
                  <>
                    <span className="mr-1 text-xs text-muted">Delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      aria-label="Confirm delete"
                      className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-danger hover:bg-danger/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      {deleting ? <SpinnerIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      aria-label="Cancel delete"
                      className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(complaint.body);
                        setEditing(true);
                      }}
                      aria-label="Edit complaint"
                      className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-border/40 hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(true)}
                      aria-label="Delete complaint"
                      className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <div className="mt-2">
              <label htmlFor={`edit-${complaint.id}`} className="sr-only">
                Edit complaint
              </label>
              <textarea
                id={`edit-${complaint.id}`}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                autoFocus
                className="w-full resize-none rounded-lg border border-border bg-background p-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {error && (
                <p role="alert" className="mt-1 text-sm text-danger">
                  {error}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className={`text-xs ${remaining < 0 ? "text-danger" : "text-muted"}`}>
                  {remaining} characters left
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setError(null);
                    }}
                    disabled={saving}
                    className="cursor-pointer rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || draft.trim().length === 0 || remaining < 0}
                    className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving && <SpinnerIcon className="h-4 w-4" />}
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-1 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-foreground">
              {complaint.body}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
