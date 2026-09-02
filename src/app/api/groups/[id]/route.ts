import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { requireMembership, requireOwner, GroupAccessError } from "@/lib/groups";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const membership = await requireMembership(id, user.uid);
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        role: membership.role,
        inviteCode: membership.role === "OWNER" ? group.inviteCode : null,
      },
    });
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
    const { id } = await params;

    await requireOwner(id, user.uid);
    await prisma.group.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
