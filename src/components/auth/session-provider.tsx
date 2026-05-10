'use client';

import React, { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { createSession } from '@/server/auth-actions';
import { getUserProfile } from '@/server/user-actions';
import { createSupabaseBrowserClient } from '@/supabase/browser';

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  companyId?: string;
}

interface SessionContextType {
  user: UserProfile | null;
  supabaseUser: SupabaseUser | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

function isSameUserProfile(a: UserProfile | null, b: UserProfile | null) {
  if (!a || !b) return a === b;

  return (
    a.uid === b.uid &&
    a.name === b.name &&
    a.email === b.email &&
    a.role === b.role &&
    a.companyId === b.companyId
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

interface SessionProviderProps {
  children: ReactNode;
  initialUser?: UserProfile | null;
}

export function SessionProvider({ children, initialUser = null }: SessionProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(initialUser);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(!initialUser);
  const syncedAccessTokenRef = useRef<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(initialUser?.uid ?? null);
  const isMountedRef = useRef(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    isMountedRef.current = true;

    const syncServerSession = async (session: {
      access_token: string;
      refresh_token: string;
      expires_in?: number;
    }) => {
      if (syncedAccessTokenRef.current === session.access_token) {
        return;
      }

      syncedAccessTokenRef.current = session.access_token;

      await createSession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        expiresIn: session.expires_in,
      });
    };

    const loadSession = async (
      authUser: SupabaseUser | null,
      options?: { showLoader?: boolean; forceProfileReload?: boolean }
    ) => {
      if (options?.showLoader && isMountedRef.current) {
        setIsLoading(true);
      }

      if (!authUser) {
        loadedUserIdRef.current = null;
        syncedAccessTokenRef.current = null;

        if (isMountedRef.current) {
          setSupabaseUser(null);
          setUser(null);
          setIsLoading(false);
        }

        return;
      }

      if (isMountedRef.current) {
        setSupabaseUser((current) => (current?.id === authUser.id ? current : authUser));
      }

      const shouldReloadProfile =
        options?.forceProfileReload === true || loadedUserIdRef.current !== authUser.id;

      if (shouldReloadProfile) {
        const result = await getUserProfile();

        if (!isMountedRef.current) {
          return;
        }

        if (result.success && result.data) {
          loadedUserIdRef.current = authUser.id;
          setUser((current) => (isSameUserProfile(current, result.data ?? null) ? current : result.data ?? null));
        } else {
          console.warn(`Perfil Supabase do usuario ${authUser.id} nao encontrado.`);
          loadedUserIdRef.current = null;
          setUser(null);
        }
      }

      if (isMountedRef.current) {
        setIsLoading(false);
      }
    };

    const initializeSession = async () => {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        await syncServerSession(data.session);
      }

      await loadSession(data.session?.user ?? null, initialUser
        ? {
            showLoader: false,
            forceProfileReload: false,
          }
        : {
            showLoader: true,
            forceProfileReload: true,
          });
    };

    void initializeSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await syncServerSession(session);
      }

      if (event === 'INITIAL_SESSION') {
        return;
      }

      if (event === 'SIGNED_OUT') {
        await loadSession(null);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        if (isMountedRef.current) {
          setSupabaseUser((current) => (current?.id === session?.user?.id ? current : session?.user ?? null));
          setIsLoading(false);
        }
        return;
      }

      await loadSession(session?.user ?? null, {
        forceProfileReload: loadedUserIdRef.current !== session?.user?.id,
      });
    });

    return () => {
      isMountedRef.current = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <SessionContext.Provider value={{ user, supabaseUser, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
