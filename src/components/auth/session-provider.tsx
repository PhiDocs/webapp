'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/firebase/config';
import { Loader2 } from 'lucide-react';
import type { AclPermission, ScopedPermission } from '@/lib/acl';

export type CompanyMembership = {
  companyId: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
  joinedAt: string;
  invitedBy?: string;
};

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  role: 'super-admin' | 'admin' | 'user';
  isSuperAdmin?: boolean;
  permissions: AclPermission[];
  scopedPermissions: ScopedPermission[];
  companyId?: string; // legado
  activeCompanyId?: string;
  memberships: CompanyMembership[];
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

function mapFirestoreUserProfile(data: any): Omit<UserProfile, 'uid' | 'email'> {
  const memberships: CompanyMembership[] = Array.isArray(data.memberships)
    ? data.memberships
    : (data.companyId
      ? [{
          companyId: data.companyId,
          role: data.role ?? 'user',
          status: 'active',
          joinedAt: data.createdAt ?? new Date().toISOString(),
        }]
      : []);

  const activeMembership = memberships.find((membership) => membership.status === 'active');
  const activeCompanyId = data.activeCompanyId && memberships.some((membership) => membership.companyId === data.activeCompanyId)
    ? data.activeCompanyId
    : activeMembership?.companyId;

  return {
    name: data.name,
    role: data.role ?? 'user',
    isSuperAdmin: Boolean(data.isSuperAdmin || data.role === 'super-admin'),
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    scopedPermissions: Array.isArray(data.scopedPermissions) ? data.scopedPermissions : [],
    companyId: data.companyId,
    activeCompanyId,
    memberships,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true);
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (fbUser) {
        setFirebaseUser(fbUser);
        const userDocRef = doc(db, 'users', fbUser.uid);
        unsubscribeUserDoc = onSnapshot(
          userDocRef,
          (userDoc) => {
            if (userDoc.exists()) {
              const firestoreProfile = mapFirestoreUserProfile(userDoc.data());
              setUser({
                uid: fbUser.uid,
                email: fbUser.email!,
                ...firestoreProfile,
              });
            } else {
              console.warn(`Firestore profile for user ${fbUser.uid} not found. Session will be incomplete until doc is created.`);
              setUser(null);
            }
            setIsLoading(false);
          },
          (error) => {
            console.error('Error subscribing user profile from Firestore:', error);
            setUser(null);
            setIsLoading(false);
          }
        );
      } else {
        // No Firebase user, clear everything.
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
    };
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
