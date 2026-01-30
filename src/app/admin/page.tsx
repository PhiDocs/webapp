'use client';

// This page now serves as a placeholder and can be used
// later for a super-admin panel. The proxy redirects
// company admins to their company page.
export default function AdminPage() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
            <div className="text-center">
                <h1 className="text-3xl font-bold">Painel de Administração Global</h1>
                <p className="mt-2 text-muted-foreground">
                    Esta área será reservada para a administração geral do sistema.
                </p>
            </div>
        </div>
    );
}
