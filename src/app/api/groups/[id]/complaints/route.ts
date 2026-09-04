import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { requireMembership, requireCanPost, GroupAccessError } from "@/lib/groups";
import { parseComplaintBody } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    await requireMembership(id, user.uid);

    const complaints = await prisma.complaint.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ complaints });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    await requireCanPost(id, user.uid);

    const profile = await prisma.user.findUnique({ where: { id: user.uid } });
    if (!profile) {
      return NextResponse.json({ error: "Set a username before posting" }, { status: 409 });
    }

    const payload = await req.json();
    const body = parseComplaintBody(payload?.body);

    const complaint = await prisma.complaint.create({
      data: {
        body,
        authorId: user.uid,
        authorName: profile.username,
        groupId: id,
      },
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
