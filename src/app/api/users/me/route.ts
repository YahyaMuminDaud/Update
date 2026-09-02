import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { parseUsername } from "@/lib/validation";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const profile = await prisma.user.findUnique({ where: { id: user.uid } });
    return NextResponse.json({ username: profile?.username ?? null });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const payload = await req.json();
    const username = parseUsername(payload?.username);

    const taken = await prisma.user.findFirst({
      where: { username: { equals: username, mode: "insensitive" }, NOT: { id: user.uid } },
    });
    if (taken) {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }

    const profile = await prisma.user.upsert({
      where: { id: user.uid },
      update: { username },
      create: { id: user.uid, username },
    });

    return NextResponse.json({ username: profile.username });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "That username is already taken" }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
