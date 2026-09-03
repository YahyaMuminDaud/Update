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
  signInWithCredential,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getFirebaseAuth } from "@/lib/firebase-client";
import { preloadGoogleIdentity, requestGoogleAccessToken } from "@/lib/google-identity";
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
    // Load the Google Identity Services script now so it's ready by the
    // time the user clicks "Sign in with Google" — requestAccessToken()
    // needs to run synchronously within that click for Safari to allow
    // the popup it opens.
    preloadGoogleIdentity();
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      const accessToken = await requestGoogleAccessToken();
      const credential = GoogleAuthProvider.credential(null, accessToken);
      await signInWithCredential(getFirebaseAuth(), credential);
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
