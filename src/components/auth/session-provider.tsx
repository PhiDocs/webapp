'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

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

async function getFirestoreUserProfile(uid: string): Promise<Omit<UserProfile, 'uid' | 'email'> | null> {
  try {
    const userDocRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        name: data.name,
        role: data.role,
        companyId: data.companyId,
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile from Firestore:", error);
    return null;
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (fbUser) {
        setFirebaseUser(fbUser);
        const firestoreProfile = await getFirestoreUserProfile(fbUser.uid);
        
        if (firestoreProfile) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email!,
            ...firestoreProfile,
          });
        } else {
          console.warn(`Firestore profile for user ${fbUser.uid} not found. This might happen during first login before document creation. If this persists, there is an issue.`);
          // Tentaremos novamente em um segundo, pode ser um atraso de replicação
          setTimeout(async () => {
              const secondAttemptProfile = await getFirestoreUserProfile(fbUser.uid);
              if(secondAttemptProfile) {
                 setUser({
                    uid: fbUser.uid,
                    email: fbUser.email!,
                    ...secondAttemptProfile,
                });
              } else {
                 // Se ainda não encontrar, o usuário está em um estado inconsistente.
                 console.error(`CRITICAL: Firestore profile for user ${fbUser.uid} not found after second attempt. Signing out.`);
                 await auth.signOut();
                 setUser(null);
              }
              setIsLoading(false);
          }, 1500);
          return; // Sai da execução principal para aguardar o timeout
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Exibe a tela de carregamento global enquanto isLoading for true.
  // Isso impede que qualquer parte da área logada seja renderizada sem dados de usuário.
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
