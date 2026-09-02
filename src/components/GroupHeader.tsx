"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { PencilIcon, SettingsIcon } from "@/components/icons";

export function GroupHeader({ groupId, groupName }: { groupId: string; groupName: string }) {
  const { user, username, editUsername } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="min-w-0">
          <div className="truncate text-base font-bold tracking-tight text-foreground">
            {groupName}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted">
            <span className="truncate">{username ?? user?.displayName}</span>
            <button
              type="button"
              onClick={editUsername}
              aria-label="Change username"
              className="cursor-pointer rounded p-0.5 hover:bg-border/40 hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <PencilIcon className="h-3 w-3" />
            </button>
          </div>
        </div>

        <Link
          href={`/groups/${groupId}/settings`}
          aria-label="Group settings"
          className="cursor-pointer inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-border/40 hover:text-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <SettingsIcon className="h-5 w-5" />
        </Link>
      </div>
    </header>
  );
}
