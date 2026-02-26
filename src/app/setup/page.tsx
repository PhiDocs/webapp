'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/auth/session-provider';
import { UserNav } from '@/components/auth/user-nav';
import { Logo } from '@/components/icons/logo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createCompanyAndJoin } from '@/server/company-actions';
import { ptBr } from '@/lib/data/strings';

export default function SetupPage() {
  const { user, isLoading } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [companyName, setCompanyName] = useState('');

  const canCreateCompany = user?.permissions?.includes('company.create') ?? false;
  const hasCompany = Boolean(user?.activeCompanyId ?? user?.companyId);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
      return;
    }

    if (hasCompany) {
      router.replace('/');
      return;
    }

    if (!canCreateCompany) {
      router.replace('/');
      return;
    }
  }, [user, isLoading, hasCompany, canCreateCompany, router]);

  const handleCreateCompany = () => {
    const trimmedName = companyName.trim();
    if (!trimmedName) return;

    startTransition(async () => {
      const result = await createCompanyAndJoin({
        name: trimmedName,
        logo: '',
        n8nProductionUrl: '',
        n8nTestUrl: '',
      });

      if (!result.success) {
        toast({
          variant: 'destructive',
          title: 'Falha ao criar empresa',
          description: result.error,
        });
        return;
      }

      toast({
        title: 'Empresa criada',
        description: 'Sua empresa foi criada com sucesso. Redirecionando...',
      });

      router.replace(`/company/${result.companyId}`);
    });
  };

  if (isLoading || !user || hasCompany || !canCreateCompany) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-20 w-full border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-8 w-8 text-primary" />
            <h1 className="text-xl font-bold text-foreground font-headline">
              {ptBr.header.title}
            </h1>
          </div>
          <UserNav />
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 md:p-6">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-7 w-7 text-primary" />
            </div>
            <CardTitle className="text-2xl">Crie sua empresa</CardTitle>
            <CardDescription>
              Você ainda não está associado a nenhuma empresa. Crie uma para começar a usar a plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="company-name">Nome da empresa</Label>
              <Input
                id="company-name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex.: Minha Empresa Ltda."
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && companyName.trim()) {
                    handleCreateCompany();
                  }
                }}
              />
            </div>
            <Button
              onClick={handleCreateCompany}
              disabled={isPending || !companyName.trim()}
              className="w-full"
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Building2 className="mr-2 h-4 w-4" />}
              Criar empresa
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
