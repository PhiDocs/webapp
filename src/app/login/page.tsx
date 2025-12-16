'use client';

import { Logo } from '@/components/icons/logo';
import { LoginForm } from "@/components/auth/login-form";
import { ptBr } from '@/lib/data/strings';

export default function LoginPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="absolute top-8 flex items-center gap-3">
                <Logo className="h-8 w-8 text-primary" />
                <h1 className="text-xl font-bold text-foreground font-headline">
                    {ptBr.header.title}
                </h1>
            </div>
            <LoginForm />
        </div>
    );
}
