'use client';

import { Header } from "@/components/header";
import { SignOutButton } from "@/components/auth/signout-button";
import { CompaniesTable } from "@/components/admin/companies-table";
import { WorksTable } from "@/components/admin/works-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, HardHat } from "lucide-react";


export default function AdminPage() {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header isAprReady={false} isPtReady={false}>
                <SignOutButton />
            </Header>
            <main className="flex-grow container mx-auto p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-3xl font-bold">Painel do Administrador</h1>
                        <p className="text-muted-foreground mt-2">Gerencie as empresas e obras cadastradas no sistema.</p>
                    </div>
                </div>

                <Tabs defaultValue="companies">
                    <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
                        <TabsTrigger value="companies"><Building2 className="mr-2 h-4 w-4" />Empresas</TabsTrigger>
                        <TabsTrigger value="works"><HardHat className="mr-2 h-4 w-4" />Obras</TabsTrigger>
                    </TabsList>
                    <TabsContent value="companies" className="mt-6">
                        <CompaniesTable />
                    </TabsContent>
                    <TabsContent value="works" className="mt-6">
                        <WorksTable />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
