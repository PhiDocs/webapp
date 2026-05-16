'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, LogOut } from 'lucide-react';
import { useSession } from '@/components/auth/session-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/icons/logo';
import { signOut } from '@/server/auth-actions';
import { createSupabaseBrowserClient } from '@/supabase/browser';

export default function AwaitingCompanyPage() {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (user.companyId) {
      if (user.role === 'admin') {
        router.replace(`/company/${user.companyId}`);
      } else {
        router.replace('/reports');
      }
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    await signOut();
    await createSupabaseBrowserClient().auth.signOut();
    router.replace('/login');
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || user.companyId) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="mb-12">
        <Logo className="h-auto w-[220px]" />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Aguardando vínculo de empresa</CardTitle>
          <CardDescription>
            Sua conta foi criada com sucesso, mas ainda não está vinculada a uma empresa.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>Entre em contato com um administrador para vincular seu usuário.</p>
          <p className="font-medium text-foreground">Conta: {user.email}</p>
          <Button className="w-full" variant="outline" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saindo...
              </>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
