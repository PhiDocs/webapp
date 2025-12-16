import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SignOutButton } from "@/components/auth/signout-button";

export default function AdminPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
             <Header
                isAprReady={false}
                isPtReady={false}
             >
                <SignOutButton />
            </Header>
            <main className="flex-grow container mx-auto p-4 md:p-6">
                <h1 className="text-3xl font-bold">Painel do Administrador</h1>
                <p className="text-muted-foreground mt-2">Bem-vindo, admin. Esta é a sua área de gerenciamento.</p>

                <div className="mt-8 p-8 border-4 border-dashed rounded-lg">
                    <p className="text-center text-muted-foreground">O conteúdo do painel será implementado na Fase 2.</p>
                </div>
            </main>
        </div>
    );
}
