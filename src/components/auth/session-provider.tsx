'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

// Define the public and protected routes
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
  const [isLoading, setIsLoading] = useState(true); // Start as true
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Don't do anything while loading
    if (isLoading) return;

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    
    // If user is not logged in and trying to access a protected route, redirect to login
    if (!user && !isPublicRoute) {
      router.replace('/login');
    }
    
    // If user is logged in and trying to access a public route, redirect to home
    if (user && isPublicRoute) {
      router.replace(ROOT_ROUTE);
    }

  }, [user, isLoading, pathname, router]);


  // While loading, or if we need to redirect, show a loading screen.
  // This prevents a flash of the old page content.
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
  if (isLoading || (!user && !isPublicRoute) || (user && isPublicRoute)) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
  }

  // If we are here, it's safe to render the children
  return (
    <SessionContext.Provider value={{ user, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
}
