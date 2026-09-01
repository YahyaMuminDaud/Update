import "server-only";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function loadServiceAccount() {
  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error(
      "Missing FIREBASE_SERVICE_ACCOUNT_BASE64 env var. See .env.example for how to generate it."
    );
  }
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json) as {
    project_id: string;
    client_email: string;
    private_key: string;
  };
}

function getAdminApp(): App {
  const existing = getApps();
  if (existing.length) return existing[0];

  const serviceAccount = loadServiceAccount();
  return initializeApp({
    credential: cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key,
    }),
  });
}

// Lazy: Next.js imports route modules at build time to collect their config,
// which would otherwise run this before FIREBASE_SERVICE_ACCOUNT_BASE64 is
// available in that phase.
let cachedAuth: ReturnType<typeof getAuth> | undefined;

export function getAdminAuth() {
  if (!cachedAuth) cachedAuth = getAuth(getAdminApp());
  return cachedAuth;
}
