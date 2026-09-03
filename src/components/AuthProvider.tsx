"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth, googleProvider } from "@/lib/firebase-client";
import { UsernameModal } from "@/components/UsernameModal";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  username: string | null;
  usernameChecked: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
  applyUsername: (username: string) => void;
  editUsername: () => void;
  authError: string | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// Popup-based sign-in relies on storage shared between the opener window
// and the Firebase authDomain popup/iframe. iOS Safari's cross-site
// tracking prevention partitions that storage away from the app's own
// origin, which surfaces as "missing initial state" errors on iPhone.
// Redirect-based sign-in only needs single-window storage, so it's the
// reliable path on mobile; desktop keeps the popup for a nicer UX.
function isMobileBrowser() {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    // Surfaces errors from a completed redirect sign-in (e.g. account
    // conflicts); onAuthStateChanged above already picks up success.
    // document.referrer survives even when the storage Firebase relies on
    // to correlate the redirect gets wiped (e.g. Safari's anti-bounce-
    // tracking storage purge, or in-memory-only persistence): if we clearly
    // just came back from Google but got no user and no thrown error, that
    // silent-failure mode is exactly what's happening.
    const cameFromGoogle = /google\.com|firebaseapp\.com/.test(document.referrer);
    getRedirectResult(getFirebaseAuth())
      .then((result) => {
        if (cameFromGoogle && !result) {
          setAuthError(
            "Redirected back from Google with no sign-in result. Safari likely blocked the storage this flow needs (Private Browsing, or Settings > Safari > Block All Cookies)."
          );
        }
      })
      .catch((err) => {
        setAuthError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      });

    // Safari restores the page from its back-forward cache when Google
    // redirects back to the same URL, instead of doing a real reload — so
    // none of the above ever re-runs and the completed sign-in is never
    // noticed. Force a real reload when that happens.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload();
    };
    window.addEventListener("pageshow", onPageShow);

    return () => {
      unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      if (isMobileBrowser()) {
        await signInWithRedirect(getFirebaseAuth(), googleProvider);
        return;
      }
      await signInWithPopup(getFirebaseAuth(), googleProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
      throw err;
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(getFirebaseAuth());
  }, []);

  const getToken = useCallback(async () => {
    const current = getFirebaseAuth().currentUser;
    if (!current) return null;
    return current.getIdToken();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setUsernameChecked(false);
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch("/api/users/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setUsername(data.username ?? null);
        }
      } finally {
        if (!cancelled) setUsernameChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, getToken]);

  const effectiveUsername = user ? username : null;
  const effectiveUsernameChecked = user ? usernameChecked : false;

  const applyUsername = useCallback((next: string) => {
    setUsername(next);
    setUsernameChecked(true);
    setEditorOpen(false);
  }, []);

  const editUsername = useCallback(() => setEditorOpen(true), []);

  const required = !!user && effectiveUsernameChecked && !effectiveUsername;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        username: effectiveUsername,
        usernameChecked: effectiveUsernameChecked,
        signInWithGoogle,
        signOut,
        getToken,
        applyUsername,
        editUsername,
        authError,
      }}
    >
      {children}
      {(required || editorOpen) && (
        <UsernameModal
          required={required}
          currentUsername={effectiveUsername}
          getToken={getToken}
          onSaved={applyUsername}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
