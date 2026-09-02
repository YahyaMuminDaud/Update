import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { requireMembership, GroupAccessError } from "@/lib/groups";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    await requireMembership(id, user.uid);

    const memberships = await prisma.groupMember.findMany({
      where: { groupId: id },
      orderBy: { joinedAt: "asc" },
    });
    const userIds = memberships.map((m) => m.userId);
    const profiles = await prisma.user.findMany({ where: { id: { in: userIds } } });
    const usernameById = new Map(profiles.map((p) => [p.id, p.username]));

    const members = memberships.map((m) => ({
      userId: m.userId,
      username: usernameById.get(m.userId) ?? "Unknown",
      role: m.role,
    }));

    return NextResponse.json({ members });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
