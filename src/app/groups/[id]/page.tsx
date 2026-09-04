"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { GroupHeader } from "@/components/GroupHeader";
import { ComplaintFeed } from "@/components/ComplaintFeed";
import { SpinnerIcon } from "@/components/icons";
import type { GroupDTO } from "@/lib/types";

export default function GroupFeedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading, getToken, usernameChecked, username } = useAuth();
  const [group, setGroup] = useState<GroupDTO | null>(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user || !usernameChecked || !username) return;
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      const res = await fetch(`/api/groups/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 403 || res.status === 404) {
        if (!cancelled) setForbidden(true);
        return;
      }
      if (res.ok && !cancelled) {
        const data = await res.json();
        setGroup(data.group as GroupDTO);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, user, usernameChecked, username, getToken]);

  useEffect(() => {
    if (forbidden) router.replace("/groups");
  }, [forbidden, router]);

  if (!group) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <SpinnerIcon className="h-6 w-6 text-muted" />
      </main>
    );
  }

  return (
    <>
      <GroupHeader groupId={id} groupName={group.name} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <ComplaintFeed
          groupId={id}
          canPost={group.role !== "MEMBER" || !group.announceOnly}
          onForbidden={() => setForbidden(true)}
        />
      </main>
    </>
  );
}
