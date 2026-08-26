import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Admin email that has zero rate limit
export const ADMIN_EMAIL = 'raigoza.david.j@gmail.com';
export const MAX_GUEST_SEARCHES = 1;

export interface QuotaStatus {
  used: number;
  limit: number;
  remaining: number;
  isUnlimited: boolean;
  requiresAuth: boolean;
}

export type AuthModalView = 'login' | 'signup' | 'forgot_password' | 'update_password';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  guestSearchesUsed: number;
  maxGuestSearches: number;
  canSearch: boolean;
  quota: QuotaStatus;
  authModalOpen: boolean;
  authModalView: AuthModalView;
  authModalReason: string | null;
  openAuthModal: (view?: AuthModalView, reason?: string) => void;
  closeAuthModal: () => void;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: Error | null; needsConfirmation?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  recordSearchPerformed: () => void;
  refreshQuota: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const GUEST_SEARCH_KEY = 'common_ground_guest_searches_v1';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestSearchesUsed, setGuestSearchesUsed] = useState<number>(() => {
    try {
      const stored = localStorage.getItem(GUEST_SEARCH_KEY);
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('login');
  const [authModalReason, setAuthModalReason] = useState<string | null>(null);

  const [quota, setQuota] = useState<QuotaStatus>({
    used: 0,
    limit: 10,
    remaining: 10,
    isUnlimited: false,
    requiresAuth: false,
  });

  const isAdmin = user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  const openAuthModal = useCallback((view: AuthModalView = 'login', reason?: string) => {
    setAuthModalView(view);
    setAuthModalReason(reason || null);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthModalReason(null);
  }, []);

  // Fetch current rate limit / quota from server
  const refreshQuota = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }

      const res = await fetch('/api/auth/quota', { headers });
      if (res.ok) {
        const data = await res.json();
        setQuota(data);
      }
    } catch {
      // Ignore quota fetch errors on initial offline/static modes
    }
  }, [session]);

  // Initial Auth & Session listener
  useEffect(() => {
    let mounted = true;

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth events (sign in, sign out, token refresh, password recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);

      if (event === 'PASSWORD_RECOVERY') {
        openAuthModal('update_password', 'Please enter a new password to secure your account.');
      } else if (event === 'SIGNED_IN') {
        closeAuthModal();
      }
    });

    // Check if URL contains recovery hash on load
    if (window.location.hash && window.location.hash.includes('type=recovery')) {
      openAuthModal('update_password', 'Please enter a new password to secure your account.');
    }

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [openAuthModal, closeAuthModal]);

  // Refresh quota when session changes
  useEffect(() => {
    refreshQuota();
  }, [session, refreshQuota]);

  // Google OAuth sign in
  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectUrl = window.location.origin;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Google OAuth failed') };
    }
  }, []);

  // Email / Password sign in
  const signInWithPassword = useCallback(async (email: string, pass: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Sign in failed') };
    }
  }, []);

  // Email / Password sign up
  const signUpWithPassword = useCallback(async (email: string, pass: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      const needsConfirmation = !data.session && !error;
      return { error, needsConfirmation };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Sign up failed') };
    }
  }, []);

  // Password Reset / Recovery Request
  const sendPasswordReset = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/#type=recovery`,
      });
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Password reset failed') };
    }
  }, []);

  // Set New Password
  const updatePassword = useCallback(async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error('Password update failed') };
    }
  }, []);

  // Sign Out
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }, []);

  // Record that a search was performed
  const recordSearchPerformed = useCallback(() => {
    if (!user) {
      setGuestSearchesUsed((prev) => {
        const next = prev + 1;
        try {
          localStorage.setItem(GUEST_SEARCH_KEY, next.toString());
        } catch {
          // ignore local storage error
        }
        return next;
      });
    }
    // Refresh quota status
    setTimeout(refreshQuota, 500);
  }, [user, refreshQuota]);

  // Can the user initiate a search?
  const canSearch = Boolean(
    user || guestSearchesUsed < MAX_GUEST_SEARCHES
  );

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAdmin,
    guestSearchesUsed,
    maxGuestSearches: MAX_GUEST_SEARCHES,
    canSearch,
    quota,
    authModalOpen,
    authModalView,
    authModalReason,
    openAuthModal,
    closeAuthModal,
    signInWithGoogle,
    signInWithPassword,
    signUpWithPassword,
    sendPasswordReset,
    updatePassword,
    signOut,
    recordSearchPerformed,
    refreshQuota,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
