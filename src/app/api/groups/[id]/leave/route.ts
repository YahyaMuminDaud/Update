import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { requireMembership, GroupAccessError } from "@/lib/groups";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const membership = await requireMembership(id, user.uid);
    if (membership.role === "OWNER") {
      return NextResponse.json(
        { error: "Owners can't leave — delete the group instead" },
        { status: 400 },
      );
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: id, userId: user.uid } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
