import "server-only";
import { prisma } from "@/lib/prisma";

export const MAX_GROUPS_PER_USER = 5;

export class GroupAccessError extends Error {
  status: number;
  constructor(message: string, status = 403) {
    super(message);
    this.status = status;
  }
}

export async function requireMembership(groupId: string, userId: string) {
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  });
  if (!membership) {
    throw new GroupAccessError("You're not a member of this group", 403);
  }
  return membership;
}

export async function requireOwner(groupId: string, userId: string) {
  const membership = await requireMembership(groupId, userId);
  if (membership.role !== "OWNER") {
    throw new GroupAccessError("Only the group owner can do that", 403);
  }
  return membership;
}

export async function requireCanPost(groupId: string, userId: string) {
  const membership = await requireMembership(groupId, userId);
  if (membership.role === "OWNER" || membership.role === "ANNOUNCER") {
    return membership;
  }
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { announceOnly: true },
  });
  if (group?.announceOnly) {
    throw new GroupAccessError(
      "Only the owner and announcers can post while announcement mode is on",
      403,
    );
  }
  return membership;
}
