import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth-server";
import { parseGroupName } from "@/lib/validation";
import { generateInviteCode } from "@/lib/inviteCode";
import { MAX_GROUPS_PER_USER } from "@/lib/groups";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const memberships = await prisma.groupMember.findMany({
      where: { userId: user.uid },
      orderBy: { joinedAt: "asc" },
      include: { group: true },
    });
    const groups = memberships.map((m) => ({
      id: m.group.id,
      name: m.group.name,
      role: m.role,
    }));
    return NextResponse.json({ groups });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser(req);
    const profile = await prisma.user.findUnique({ where: { id: user.uid } });
    if (!profile) {
      return NextResponse.json({ error: "Set a username before creating a group" }, { status: 409 });
    }

    const count = await prisma.groupMember.count({ where: { userId: user.uid } });
    if (count >= MAX_GROUPS_PER_USER) {
      return NextResponse.json(
        { error: `You can only be in ${MAX_GROUPS_PER_USER} groups at once` },
        { status: 409 },
      );
    }

    const payload = await req.json();
    const name = parseGroupName(payload?.name);

    let group;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        group = await prisma.$transaction(async (tx) => {
          const created = await tx.group.create({
            data: { name, inviteCode: generateInviteCode() },
          });
          await tx.groupMember.create({
            data: { groupId: created.id, userId: user.uid, role: "OWNER" },
          });
          return created;
        });
        break;
      } catch (err) {
        if (typeof err === "object" && err !== null && "code" in err && err.code === "P2002") {
          continue; // invite code collision, retry
        }
        throw err;
      }
    }

    if (!group) {
      return NextResponse.json({ error: "Couldn't create group, try again" }, { status: 500 });
    }

    return NextResponse.json({ group: { id: group.id, name: group.name, role: "OWNER" } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = error instanceof Error ? error.message : "Invalid request";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
