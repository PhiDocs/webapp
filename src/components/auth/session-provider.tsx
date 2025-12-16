
'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

interface SessionContextType {
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Sempre começa carregando

  useEffect(() => {
    // onAuthStateChanged retorna uma função para cancelar a inscrição
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false); // Define o carregamento como falso assim que a verificação for concluída
    });

    // Limpa a inscrição no desmontar
    return () => unsubscribe();
  }, []);

  // Enquanto o estado de autenticação inicial está sendo determinado,
  // exibe um indicador de carregamento global. O middleware é responsável por
  // garantir que o usuário não deveria estar em uma página diferente.
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Quando o carregamento estiver completo, renderiza os filhos.
  // O middleware já lidou com quaisquer redirecionamentos necessários.
  return (
    <SessionContext.Provider value={{ user, isLoading: false }}>
      {children}
    </SessionContext.Provider>
  );
}
