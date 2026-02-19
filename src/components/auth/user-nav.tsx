'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/server/auth-actions';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown, LayoutDashboard, LogOut } from 'lucide-react';
import { useSession } from './session-provider';
import { auth } from '@/firebase/config';
import { getMyCompanies } from '@/server/company-actions';
import { setActiveCompany } from '@/server/user-actions';
import { useToast } from '@/hooks/use-toast';
import { ptBr } from '@/lib/data/strings';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar"

function getInitials(name?: string | null): string {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

export function UserNav() {
  const { user } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    await auth.signOut();
    router.push('/login');
  };
  
  const activeMemberships = useMemo(
    () => (user?.memberships ?? []).filter((membership) => membership.status === 'active'),
    [user?.memberships]
  );
  const activeCompanyId = user?.activeCompanyId ?? user?.companyId;
  const activeMembership = activeMemberships.find((membership) => membership.companyId === activeCompanyId);
  const isSuperAdmin = Boolean(user?.isSuperAdmin || user?.role === 'super-admin');
  const canAccessAdminPanel = activeMembership?.role === 'admin';
  const activeCompanyName = activeCompanyId
    ? (companyNames[activeCompanyId] ?? (isLoadingCompanies ? ptBr.actions.loading : activeCompanyId))
    : 'Sem empresa ativa';

  useEffect(() => {
    let isMounted = true;
    const loadCompanies = async () => {
      setIsLoadingCompanies(true);
      try {
        const result = await getMyCompanies();
        if (!result.success || !result.data) return;
        const entries = result.data.map((company) => [company.id, company.name] as const);
        if (!isMounted) return;
        setCompanyNames(Object.fromEntries(entries));
      } finally {
        if (isMounted) {
          setIsLoadingCompanies(false);
        }
      }
    };

    if (user && activeMemberships.length > 0) {
      loadCompanies();
    } else {
      setIsLoadingCompanies(false);
    }

    return () => {
      isMounted = false;
    };
  }, [activeMemberships]);

  if (!user) {
    return null;
  }

  const handleCompanySwitch = async (companyId: string) => {
    const result = await setActiveCompany(companyId);
    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Erro ao trocar empresa',
        description: result.error || 'Falha ao atualizar contexto da empresa.',
      });
      return;
    }

    const targetMembership = activeMemberships.find((membership) => membership.companyId === companyId);
    if (targetMembership?.role === 'admin') {
      router.push(`/company/${companyId}`);
    } else {
      router.push('/reports');
    }
    toast({
      title: 'Empresa alterada',
      description: `Contexto ativo: ${companyNames[companyId] ?? companyId}`,
    });
    router.refresh();
  };

  const handleAdminPanelClick = () => {
    if (canAccessAdminPanel && activeCompanyId) {
      router.push(`/company/${activeCompanyId}`);
    }
  };

  const handleSuperAdminPanelClick = () => {
    if (isSuperAdmin) {
      router.push('/admin');
    }
  };

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-full px-2 py-1.5 h-auto">
                <div className="hidden md:flex max-w-[220px] flex-col items-end leading-tight">
                    <span className="text-xs text-muted-foreground">Empresa atual</span>
                    <span className="text-sm font-medium truncate">{activeCompanyName}</span>
                </div>
                <Avatar className="h-9 w-9">
                    <AvatarImage src={undefined} alt="Avatar" />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                </Avatar>
                <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-72" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                    </p>
                </div>
            </DropdownMenuLabel>
            {activeMemberships.length > 1 && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Trocar empresa</DropdownMenuLabel>
                    {activeMemberships.map((membership) => (
                        <DropdownMenuItem
                            key={membership.companyId}
                            onSelect={() => {
                              void handleCompanySwitch(membership.companyId);
                            }}
                            className="cursor-pointer flex items-center justify-between"
                        >
                            <div className="min-w-0">
                                <div className="truncate">
                                  {companyNames[membership.companyId] ?? (isLoadingCompanies ? ptBr.actions.loading : membership.companyId)}
                                </div>
                                <div className="text-xs text-muted-foreground">{membership.role}</div>
                            </div>
                            {activeCompanyId === membership.companyId && (
                                <Check className="h-4 w-4" />
                            )}
                        </DropdownMenuItem>
                    ))}
                </>
            )}
            {isSuperAdmin && (
                <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSuperAdminPanelClick} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Painel Super Admin</span>
                </DropdownMenuItem>
                </>
            )}
            {canAccessAdminPanel && activeCompanyId && (
                <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleAdminPanelClick} className="cursor-pointer">
                    <LayoutDashboard className="mr-2 h-4 w-4" />
                    <span>Painel do Admin</span>
                </DropdownMenuItem>
                </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}


