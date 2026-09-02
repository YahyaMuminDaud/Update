"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GroupButton } from "@/components/GroupButton";
import { SpinnerIcon } from "@/components/icons";
import type { GroupDTO } from "@/lib/types";

const MAX_GROUPS = 5;

export function GroupPicker() {
  const { getToken } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<GroupDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch("/api/groups", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Couldn't load your groups");
        const data = await res.json();
        if (!cancelled) setGroups(data.groups as GroupDTO[]);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load your groups");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken]);

  if (error) {
    return <p className="text-center text-sm text-danger">{error}</p>;
  }

  if (!groups) {
    return (
      <div className="flex justify-center">
        <SpinnerIcon className="h-6 w-6 text-muted" />
      </div>
    );
  }

  const atCap = groups.length >= MAX_GROUPS;

  return (
    <div className="flex flex-col items-center gap-8">
      {groups.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {groups.map((group) => (
            <GroupButton
              key={group.id}
              name={group.name}
              onClick={() => router.push(`/groups/${group.id}`)}
            />
          ))}
        </div>
      )}

      {atCap ? (
        <p className="text-sm text-muted">You&apos;re in {MAX_GROUPS} groups, the max.</p>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/groups/join")}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Join
          </button>
          <button
            type="button"
            onClick={() => router.push("/groups/create")}
            className="cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Create
          </button>
        </div>
      )}
    </div>
  );
}
