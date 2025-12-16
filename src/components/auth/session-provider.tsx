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
      // Inicia o carregamento apenas uma vez no início da verificação.
      // Não redefina para true em cada mudança de estado.
      if (isLoading) setIsLoading(true);

      if (fbUser) {
        setFirebaseUser(fbUser);
        const firestoreProfile = await getFirestoreUserProfile(fbUser.uid);
        
        if (firestoreProfile) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email!,
            ...firestoreProfile,
          });
          setIsLoading(false);
        } else {
          // Se o perfil não for encontrado, pode ser um atraso na replicação do Firestore.
          // Tenta novamente após um curto período.
          console.warn(`Firestore profile for user ${fbUser.uid} not found. Retrying...`);
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
                 // Desloga para evitar ficar preso.
                 console.error(`CRITICAL: Firestore profile for user ${fbUser.uid} not found after retry. Signing out.`);
                 await auth.signOut(); // Isso irá disparar o onAuthStateChanged novamente para o estado 'null'
                 setUser(null);
              }
              setIsLoading(false); // Garante que o loading termine aqui também.
          }, 1500);
        }
      } else {
        // Se não houver usuário no Firebase Auth, limpa tudo e finaliza o carregamento.
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => unsubscribe();
    // O array de dependências vazio garante que este useEffect execute apenas uma vez.
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