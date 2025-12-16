'use client';

// Esta página agora serve como um placeholder ou pode ser usada
// futuramente para um painel de super-admin. O middleware redireciona
// os admins de empresa para a página da sua companhia.
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
