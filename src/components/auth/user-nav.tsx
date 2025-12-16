'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from '@/server/auth-actions';
import { Button } from '@/components/ui/button';
import { LogOut, LayoutDashboard } from 'lucide-react';
import { useSession } from './session-provider';
import { auth } from '@/firebase/config';
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
  const router = useRouter();
  const { user } = useSession();

  const handleSignOut = async () => {
    await signOut(); // Limpa o cookie do servidor
    await auth.signOut(); // Limpa a sessão do cliente
    router.push('/login'); // Redireciona para o login
    // window.location.href = '/login'; // Força recarregamento para o middleware
  };

  if (!user) {
    return (
      <Button variant="outline" size="sm" onClick={() => router.push('/login')}>
        Entrar
      </Button>
    )
  }

  return (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-9 w-9">
                    <AvatarImage src={undefined} alt="Avatar" />
                    <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                    </p>
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user.role === 'admin' && user.companyId && (
                <DropdownMenuItem asChild>
                    <Link href={`/company/${user.companyId}`}>
                        <LayoutDashboard className="mr-2 h-4 w-4" />
                        <span>Painel do Admin</span>
                    </Link>
                </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
  );
}
