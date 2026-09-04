import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { requireOwner, GroupAccessError } from "@/lib/groups";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id, userId } = await params;

    await requireOwner(id, user.uid);

    const payload = await req.json();
    if (payload?.role !== "ANNOUNCER" && payload?.role !== "MEMBER") {
      return NextResponse.json({ error: "role must be ANNOUNCER or MEMBER" }, { status: 400 });
    }

    const target = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: id, userId } },
    });
    if (!target) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (target.role === "OWNER") {
      return NextResponse.json({ error: "Can't change the owner's role" }, { status: 400 });
    }

    const updated = await prisma.groupMember.update({
      where: { groupId_userId: { groupId: id, userId } },
      data: { role: payload.role },
    });

    return NextResponse.json({ role: updated.role });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

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
