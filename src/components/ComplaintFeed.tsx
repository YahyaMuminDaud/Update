"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { ComposeBox } from "@/components/ComposeBox";
import { ComplaintCard } from "@/components/ComplaintCard";
import { EmptyState } from "@/components/EmptyState";
import { SpinnerIcon } from "@/components/icons";
import type { ComplaintDTO } from "@/lib/types";

async function readError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    return data?.error ?? `Request failed (${res.status})`;
  } catch {
    return `Request failed (${res.status})`;
  }
}

export function ComplaintFeed({
  groupId,
  canPost = true,
  onForbidden,
}: {
  groupId: string;
  canPost?: boolean;
  onForbidden?: () => void;
}) {
  const { getToken } = useAuth();
  const [complaints, setComplaints] = useState<ComplaintDTO[] | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  async function authedFetch(input: string, init: RequestInit = {}) {
    const token = await getToken();
    if (!token) throw new Error("You need to sign in first");
    return fetch(input, {
      ...init,
      headers: {
        ...init.headers,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await authedFetch(`/api/groups/${groupId}/complaints`);
        if (res.status === 403 || res.status === 404) {
          onForbidden?.();
          return;
        }
        if (!res.ok) throw new Error(await readError(res));
        const data = await res.json();
        if (!cancelled) setComplaints(data.complaints as ComplaintDTO[]);
      } catch (err) {
        if (!cancelled) setBanner(err instanceof Error ? err.message : "Couldn't load the feed");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function handlePost(body: string) {
    const res = await authedFetch(`/api/groups/${groupId}/complaints`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const { complaint } = (await res.json()) as { complaint: ComplaintDTO };
    setComplaints((prev) => [complaint, ...(prev ?? [])]);
  }

  async function handleUpdate(id: string, body: string) {
    const res = await authedFetch(`/api/complaints/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ body }),
    });
    if (!res.ok) throw new Error(await readError(res));
    const { complaint } = (await res.json()) as { complaint: ComplaintDTO };
    setComplaints((prev) => prev?.map((c) => (c.id === id ? complaint : c)) ?? prev);
  }

  async function handleDelete(id: string) {
    const previous = complaints;
    setComplaints((prev) => prev?.filter((c) => c.id !== id) ?? prev);
    try {
      const res = await authedFetch(`/api/complaints/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
    } catch (err) {
      setComplaints(previous);
      setBanner(err instanceof Error ? err.message : "Couldn't delete that. Try again.");
    }
  }

  return (
    <div className="space-y-4">
      <ComposeBox onPost={handlePost} canPost={canPost} />

      {banner && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger"
        >
          <span>{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            className="cursor-pointer font-medium hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {complaints === null ? (
        <div className="flex justify-center py-8">
          <SpinnerIcon className="h-6 w-6 text-muted" />
        </div>
      ) : complaints.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {complaints.map((complaint) => (
            <ComplaintCard
              key={complaint.id}
              complaint={complaint}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
