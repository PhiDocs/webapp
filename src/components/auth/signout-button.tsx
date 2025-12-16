'use client';

import { useRouter } from 'next/navigation';
import { signOut } from '@/server/auth-actions';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useSession } from './session-provider';
import { auth } from '@/firebase/config';

export function SignOutButton() {
  const router = useRouter();
  const { user } = useSession();

  const handleSignOut = async () => {
    await signOut(); // Limpa o cookie do servidor
    await auth.signOut(); // Limpa a sessão do cliente
    router.push('/login'); // Redireciona para o login
    router.refresh();
  };

  return (
    <div className='flex items-center gap-2'>
        <div className='text-right text-sm hidden sm:block'>
            {/* Agora `user.name` vem do Firestore via SessionProvider */}
            <p className='font-semibold'>{user?.name || user?.email}</p>
        </div>
            <Button variant="outline" size="icon" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
        </Button>
    </div>
  );
}
