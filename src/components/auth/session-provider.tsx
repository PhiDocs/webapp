'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

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

/**
 * Busca o perfil de usuário do Firestore diretamente no cliente.
 * As regras de segurança garantem que um usuário só pode ler seu próprio documento.
 */
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
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Se houver um usuário Firebase, busque o perfil completo do Firestore
        const firestoreProfile = await getFirestoreUserProfile(fbUser.uid);
        
        if (firestoreProfile) {
          setUser({
            uid: fbUser.uid,
            email: fbUser.email!,
            name: firestoreProfile.name,
            role: firestoreProfile.role,
            companyId: firestoreProfile.companyId,
          });
        } else {
            // Isso pode acontecer se o documento do Firestore ainda não foi criado.
            // Para evitar um estado inconsistente, deslogamos.
            console.warn(`Firestore profile for user ${fbUser.uid} not found. Signing out.`);
            await auth.signOut();
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

  // Mostra um loader global apenas na primeira carga
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
