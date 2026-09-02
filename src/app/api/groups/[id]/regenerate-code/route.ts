import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { requireOwner, GroupAccessError } from "@/lib/groups";
import { generateInviteCode } from "@/lib/inviteCode";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireUser(req);
    const { id } = await params;

    await requireOwner(id, user.uid);

    let inviteCode = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        inviteCode = generateInviteCode();
        await prisma.group.update({ where: { id }, data: { inviteCode } });
        break;
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
          continue;
        }
        throw err;
      }
    }

    return NextResponse.json({ inviteCode });
  } catch (error) {
    if (error instanceof AuthError || error instanceof GroupAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
