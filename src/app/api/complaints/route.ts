import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { parseComplaintBody } from "@/lib/validation";

export async function GET() {
  const complaints = await prisma.complaint.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ complaints });
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const payload = await req.json();
    const body = parseComplaintBody(payload?.body);

    const complaint = await prisma.complaint.create({
      data: {
        body,
        authorId: user.uid,
        authorName: user.name,
        authorPhoto: user.picture,
      },
    });

    return NextResponse.json({ complaint }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
