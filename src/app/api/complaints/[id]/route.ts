import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { parseComplaintBody } from "@/lib/validation";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }
    if (existing.authorId !== user.uid) {
      return NextResponse.json({ error: "You can only edit your own complaints" }, { status: 403 });
    }

    const payload = await req.json();
    const body = parseComplaintBody(payload?.body);

    const complaint = await prisma.complaint.update({
      where: { id },
      data: { body },
    });

    return NextResponse.json({ complaint });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }
    if (existing.authorId !== user.uid) {
      return NextResponse.json({ error: "You can only delete your own complaints" }, { status: 403 });
    }

    await prisma.complaint.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
