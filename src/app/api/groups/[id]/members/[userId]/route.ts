import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { requireOwner, GroupAccessError } from "@/lib/groups";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id, userId } = await params;

    await requireOwner(id, user.uid);

    if (userId === user.uid) {
      return NextResponse.json(
        { error: "Owners can't remove themselves — delete the group instead" },
        { status: 400 },
      );
    }

    await prisma.groupMember.delete({
      where: { groupId_userId: { groupId: id, userId } },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
