"use client";

import { useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { GoogleIcon, LogoutIcon, SpinnerIcon } from "@/components/icons";

export function SignInButton() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <div className="h-10 w-10 rounded-full bg-border animate-pulse" aria-hidden="true" />;
  }

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <Avatar name={user.displayName ?? "You"} photoUrl={user.photoURL} size={32} />
          <span className="text-sm font-medium text-foreground">{user.displayName}</span>
        </div>
        <button
          type="button"
          onClick={async () => {
            setBusy(true);
            try {
              await signOut();
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? <SpinnerIcon className="h-4 w-4" /> : <LogoutIcon className="h-4 w-4" />}
          <span className="sm:hidden">Sign out</span>
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={async () => {
        setBusy(true);
        try {
          await signInWithGoogle();
        } finally {
          setBusy(false);
        }
      }}
      disabled={busy}
      className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {busy ? (
        <SpinnerIcon className="h-4 w-4" />
      ) : (
        <GoogleIcon className="h-4 w-4" />
      )}
      Sign in with Google
    </button>
  );
}
