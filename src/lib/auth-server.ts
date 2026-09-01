import "server-only";
import { NextRequest } from "next/server";
import { getAdminAuth } from "@/lib/firebase-admin";

export type AuthedUser = {
  uid: string;
  name: string;
  picture: string | null;
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requireUser(req: NextRequest): Promise<AuthedUser> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new AuthError("Missing bearer token");
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return {
      uid: decoded.uid,
      name: decoded.name ?? decoded.email ?? "Anonymous",
      picture: decoded.picture ?? null,
    };
  } catch {
    throw new AuthError("Invalid or expired token");
  }
}
