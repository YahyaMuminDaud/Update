"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { CopyIcon, MegaphoneIcon, SpinnerIcon, TrashIcon } from "@/components/icons";
import type { GroupDTO, GroupMemberDTO } from "@/lib/types";

export function GroupSettings({ groupId }: { groupId: string }) {
  const { user, getToken } = useAuth();
  const router = useRouter();

  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [members, setMembers] = useState<GroupMemberDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function authedFetch(input: string, init: RequestInit = {}) {
    const token = await getToken();
    if (!token) throw new Error("You need to sign in first");
    return fetch(input, {
      ...init,
      headers: { ...init.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    });
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [groupRes, membersRes] = await Promise.all([
          authedFetch(`/api/groups/${groupId}`),
          authedFetch(`/api/groups/${groupId}/members`),
        ]);
        if (!groupRes.ok) throw new Error("Couldn't load group");
        if (!membersRes.ok) throw new Error("Couldn't load members");
        const groupData = await groupRes.json();
        const membersData = await membersRes.json();
        if (!cancelled) {
          setGroup(groupData.group as GroupDTO);
          setMembers(membersData.members as GroupMemberDTO[]);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load settings");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  async function handleRegenerate() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/groups/${groupId}/regenerate-code`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't regenerate code");
      setGroup((prev) => (prev ? { ...prev, inviteCode: data.inviteCode } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't regenerate code");
    } finally {
      setBusy(false);
    }
  }

  async function handleToggleAnnounceOnly() {
    if (!group) return;
    const next = !group.announceOnly;
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/groups/${groupId}`, {
        method: "PATCH",
        body: JSON.stringify({ announceOnly: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't update announcement mode");
      setGroup((prev) => (prev ? { ...prev, announceOnly: data.announceOnly } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update announcement mode");
    } finally {
      setBusy(false);
    }
  }

  async function handleSetAnnouncer(userId: string, makeAnnouncer: boolean) {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/groups/${groupId}/members/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: makeAnnouncer ? "ANNOUNCER" : "MEMBER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't update member role");
      setMembers((prev) =>
        prev?.map((m) => (m.userId === userId ? { ...m, role: data.role } : m)) ?? prev,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update member role");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/groups/${groupId}/members/${userId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error ?? "Couldn't remove member");
      }
      setMembers((prev) => prev?.filter((m) => m.userId !== userId) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove member");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeave() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/groups/${groupId}/leave`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't leave group");
      router.push("/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't leave group");
      setBusy(false);
    }
  }

  async function handleDelete() {
    setBusy(true);
    setError(null);
    try {
      const res = await authedFetch(`/api/groups/${groupId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Couldn't delete group");
      router.push("/groups");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't delete group");
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!group?.inviteCode) return;
    await navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (error && !group) {
    return <p className="text-center text-sm text-danger">{error}</p>;
  }

  if (!group || !members) {
    return (
      <div className="flex justify-center">
        <SpinnerIcon className="h-6 w-6 text-muted" />
      </div>
    );
  }

  const isOwner = group.role === "OWNER";

  return (
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}

      {isOwner && group.inviteCode && (
        <section className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground">Invite code</h2>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-center text-sm tracking-widest text-foreground">
              {group.inviteCode}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              aria-label="Copy invite code"
              className="cursor-pointer inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-border/40 hover:text-foreground transition-colors duration-200"
            >
              <CopyIcon className="h-4 w-4" />
            </button>
          </div>
          {copied && <p className="mt-1 text-xs text-muted">Copied</p>}
          <button
            type="button"
            onClick={handleRegenerate}
            disabled={busy}
            className="cursor-pointer mt-3 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 disabled:opacity-50"
          >
            Regenerate code
          </button>
        </section>
      )}

      {isOwner && (
        <section className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <MegaphoneIcon className="h-4 w-4 text-muted" />
                Announcement mode
              </h2>
              <p className="mt-1 text-xs text-muted">
                When on, only you and members you make announcers can post — everyone else can
                only view the feed.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={group.announceOnly}
              aria-label="Toggle announcement mode"
              onClick={handleToggleAnnounceOnly}
              disabled={busy}
              className={`cursor-pointer relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                group.announceOnly ? "bg-primary" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-background transition-transform duration-200 ${
                  group.announceOnly ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Members</h2>
        <ul className="mt-2 space-y-1">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-2 py-1">
              <span className="truncate text-sm text-foreground">
                {member.username}
                {member.role === "OWNER" && <span className="ml-2 text-xs text-muted">Owner</span>}
                {member.role === "ANNOUNCER" && (
                  <span className="ml-2 text-xs text-muted">Announcer</span>
                )}
              </span>
              {isOwner && member.userId !== user?.uid && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleSetAnnouncer(member.userId, member.role !== "ANNOUNCER")}
                    disabled={busy}
                    className="cursor-pointer rounded-lg border border-border px-2 py-1 text-xs font-medium text-foreground hover:bg-border/40 transition-colors duration-200 disabled:opacity-50"
                  >
                    {member.role === "ANNOUNCER" ? "Remove announcer" : "Make announcer"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.userId)}
                    disabled={busy}
                    aria-label={`Remove ${member.username}`}
                    className="cursor-pointer inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger transition-colors duration-200 disabled:opacity-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isOwner ? (
        <button
          type="button"
          onClick={handleDelete}
          disabled={busy}
          className="cursor-pointer w-full rounded-lg border border-danger/30 px-4 py-2 text-sm font-medium text-danger hover:bg-danger/10 transition-colors duration-200 disabled:opacity-50"
        >
          Delete group
        </button>
      ) : (
        <button
          type="button"
          onClick={handleLeave}
          disabled={busy}
          className="cursor-pointer w-full rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 disabled:opacity-50"
        >
          Leave group
        </button>
      )}
    </div>
  );
}
