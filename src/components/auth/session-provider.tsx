'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/firebase/config';
import { Loader2 } from 'lucide-react';

// Define the public and protected routes
const PUBLIC_ROUTES = ['/login', '/signup'];
const PROTECTED_ROUTE_PREFIX = '/'; // All other routes are protected

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

function AuthHandler({ children }: { children: ReactNode }) {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return; // Wait until the session is loaded

    const isPublicRoute = PUBLIC_ROUTES.includes(pathname);
    const isProtectedRoute = pathname.startsWith(PROTECTED_ROUTE_PREFIX) && !isPublicRoute;

    // If user is not authenticated and tries to access a protected route
    if (!user && isProtectedRoute) {
      router.replace('/login');
    }

    // If user is authenticated and tries to access a public route
    if (user && isPublicRoute) {
      router.replace('/');
    }
  }, [user, isLoading, pathname, router]);

  // Show a loading spinner while authentication state is being determined
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent rendering of protected pages before redirection
  if (!user && !PUBLIC_ROUTES.includes(pathname)) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      );
  }

  return <>{children}</>;
}


export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SessionContext.Provider value={{ user, isLoading }}>
      <AuthHandler>{children}</AuthHandler>
    </SessionContext.Provider>
  );
}
