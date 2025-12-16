
'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { Loader2 } from 'lucide-react';
import { getUserProfile } from '@/server/user-actions';

// Estendendo o tipo para incluir os dados que virão do Firestore
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  companyId?: string;
}

interface SessionContextType {
  user: UserProfile | null;
  firebaseUser: FirebaseUser | null;
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Se houver um usuário Firebase, busque o perfil completo do Firestore
        try {
          const profileResult = await getUserProfile();
          if (profileResult.success && profileResult.data) {
            setUser(profileResult.data);
          } else {
            // Se não encontrar o perfil, desloga para evitar estado inconsistente
            console.error('Failed to fetch user profile, signing out.');
            await auth.signOut();
            setUser(null);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setUser(null);
        }
      } else {
        // Se não houver usuário Firebase, limpa nosso estado de perfil
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ user, firebaseUser, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
