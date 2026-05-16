'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/auth/session-provider';
import { Loader2 } from 'lucide-react';

/**
 * This is the root page. It acts as a dispatcher.
 * It redirects users to their appropriate dashboard based on their role.
 * - Admins are sent to their company page.
 * - Regular users are sent to the reports page.
 * - Logged-out users are handled by the proxy.
 */
export default function RootPage() {
    const { user, isLoading } = useSession();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) {
            return; // Wait until session is loaded
        }

        if (user) {
            if (user.role === 'admin' && user.companyId) {
                router.replace(`/company/${user.companyId}`);
            } else if (!user.companyId) {
                router.replace('/awaiting-company');
            } else {
                router.replace('/reports');
            }
        } else {
            // If there's no user and loading is finished, the proxy should have already redirected.
            // But as a fallback, we can redirect to login.
            router.replace('/login');
        }
    }, [user, isLoading, router]);

    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
    );
}
