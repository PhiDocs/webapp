'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

// Defina as rotas públicas e a rota raiz
const PUBLIC_ROUTES = ['/login', '/signup'];
const ROOT_ROUTE = '/';

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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Começa como true
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false); // Só se torna false após a primeira verificação
    });

    // Limpa a inscrição ao desmontar
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Não faz nada enquanto o estado de autenticação está sendo carregado
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    
    // Se o usuário não está logado e tenta acessar uma rota protegida, redireciona para o login
    if (!user && !isPublicRoute) {
      router.replace('/login');
    }
    
    // Se o usuário está logado e tenta acessar uma rota pública (login/signup), redireciona para a home
    if (user && isPublicRoute) {
      router.replace(ROOT_ROUTE);
    }

  }, [user, isLoading, pathname, router]);


  // Enquanto carrega, ou se um redirecionamento for iminente, mostre uma tela de carregamento.
  // Isso previne o "flash" do conteúdo antigo e o loop de redirecionamento.
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  if (isLoading || (!user && !isPublicRoute) || (user && isPublicRoute)) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  // Se chegamos aqui, é seguro renderizar a página solicitada
  return (
    <SessionContext.Provider value={{ user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
