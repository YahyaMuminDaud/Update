"use client";

// Google Identity Services (GIS) — a real popup straight to
// accounts.google.com, bypassing Firebase's own popup/redirect sign-in.
// Firebase's flow bounces through <project>.firebaseapp.com with zero user
// interaction on that hop, and Safari's anti-bounce-tracking protection
// wipes the storage that bounce depends on — breaking sign-in on iPhone
// deterministically, regardless of cookies/private-browsing/cache state.
// See AuthProvider.tsx for how this is wired into signInWithGoogle.

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
            error_callback?: (error: { type?: string; message?: string }) => void;
          }): { requestAccessToken: () => void };
        };
      };
    };
  }
}

const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptLoaded = false;
let scriptLoading: Promise<void> | null = null;

function ensureScriptLoading(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptLoading) return scriptLoading;
  scriptLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load Google sign-in. Check your connection and try again."));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

// Call early (e.g. on app mount) so the script is already loaded by the
// time the user clicks "Sign in with Google" — requestAccessToken() must
// run synchronously within the click handler's call stack, or Safari's
// popup blocker can reject it.
export function preloadGoogleIdentity() {
  ensureScriptLoading().catch(() => {
    // Swallowed: requestGoogleAccessToken retries the load and surfaces
    // the error there if it's still failing.
  });
}

let pendingResolve: ((token: string) => void) | null = null;
let pendingReject: ((err: Error) => void) | null = null;
let tokenClient: ReturnType<NonNullable<Window["google"]>["accounts"]["oauth2"]["initTokenClient"]> | null = null;

function getTokenClient() {
  if (tokenClient) return tokenClient;
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error("NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured");
  tokenClient = window.google!.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: "openid email profile",
    callback: (response) => {
      if (response.error || !response.access_token) {
        pendingReject?.(new Error(response.error ?? "Google sign-in failed"));
      } else {
        pendingResolve?.(response.access_token);
      }
      pendingResolve = null;
      pendingReject = null;
    },
    error_callback: (error) => {
      pendingReject?.(new Error(error.message ?? error.type ?? "Google sign-in was cancelled or blocked"));
      pendingResolve = null;
      pendingReject = null;
    },
  });
  return tokenClient;
}

export async function requestGoogleAccessToken(): Promise<string> {
  if (!scriptLoaded) await ensureScriptLoading();
  const client = getTokenClient();
  return new Promise<string>((resolve, reject) => {
    pendingResolve = resolve;
    pendingReject = reject;
    client.requestAccessToken();
  });
}
