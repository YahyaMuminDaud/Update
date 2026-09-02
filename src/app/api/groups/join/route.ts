import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { parseInviteCode } from "@/lib/validation";
import { MAX_GROUPS_PER_USER } from "@/lib/groups";

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const profile = await prisma.user.findUnique({ where: { id: user.uid } });
    if (!profile) {
      return NextResponse.json({ error: "Set a username before joining a group" }, { status: 409 });
    }

    const payload = await req.json();
    const inviteCode = parseInviteCode(payload?.inviteCode);

    const group = await prisma.group.findUnique({ where: { inviteCode } });
    if (!group) {
      return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
    }

    const existing = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId: user.uid } },
    });
    if (existing) {
      return NextResponse.json({ error: "You're already in this group" }, { status: 409 });
    }

    const count = await prisma.groupMember.count({ where: { userId: user.uid } });
    if (count >= MAX_GROUPS_PER_USER) {
      return NextResponse.json(
        { error: `You can only be in ${MAX_GROUPS_PER_USER} groups at once` },
        { status: 409 },
      );
    }

    await prisma.groupMember.create({
      data: { groupId: group.id, userId: user.uid, role: "MEMBER" },
    });

    return NextResponse.json({ group: { id: group.id, name: group.name, role: "MEMBER" } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
