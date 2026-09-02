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
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string | null>(null);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(getFirebaseAuth(), (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(getFirebaseAuth(), googleProvider);
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
