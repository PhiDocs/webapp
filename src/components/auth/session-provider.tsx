'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
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

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    const loadSession = async (authUser: SupabaseUser | null) => {
      setIsLoading(true);

      if (authUser) {
        setSupabaseUser(authUser);
        const result = await getUserProfile();

        if (result.success && result.data) {
          setUser(result.data);
        } else {
          console.warn(`Perfil Supabase do usuário ${authUser.id} não encontrado.`);
          setUser(null);
        }
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        await createSession({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          expiresIn: data.session.expires_in,
        });
      }
      await loadSession(data.session?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await createSession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresIn: session.expires_in,
        });
      }
      await loadSession(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, supabaseUser, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
