'use client';

import React, { useEffect, useState } from 'react';
import { Header } from "@/components/header";
import { UserNav } from "@/components/auth/user-nav";
import { WorksTable } from "@/components/admin/works-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HardHat, Users, Briefcase, Building } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { getCompanyById } from "@/server/company-actions";
import type { Company } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeesTable } from '@/components/admin/employees-table';
import { JobRolesTable } from '@/components/admin/job-roles-table';
import { SubcontractorsTable } from '@/components/admin/subcontractors-table';

interface CompanyPageProps {
    params: { companyId: string };
}

export default function CompanyPage({ params }: CompanyPageProps) {
    const companyId = params.companyId;

    const { user, isLoading: isSessionLoading } = useSession();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (companyId) {
            const fetchCompany = async () => {
                setLoading(true);
                const result = await getCompanyById(companyId);
                if (result.success && result.data) {
                    setCompany(result.data);
                } else {
                    console.error("Failed to fetch company data:", result.error);
                }
                setLoading(false);
            };
            fetchCompany();
        }
    }, [companyId]);

    // Validação de permissão
    if (!isSessionLoading && user && (user.role !== 'admin' || user.companyId !== companyId)) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
                <h1 className="text-xl font-bold text-destructive">Acesso Negado</h1>
                <p className="mt-2 text-muted-foreground">Você não tem permissão para ver esta página.</p>
            </div>
        );
    }
    
    const pageIsLoading = isSessionLoading || loading;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header isAprReady={false} isPtReady={false}>
                <UserNav />
            </Header>
            <main className="flex-grow container mx-auto p-4 md:p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        {pageIsLoading ? (
                             <>
                                <Skeleton className="h-9 w-64 mb-3" />
                                <Skeleton className="h-5 w-80" />
                            </>
                        ) : (
                            <>
                                <h1 className="text-3xl font-bold">{company?.name}</h1>
                                <p className="text-muted-foreground mt-2">Gerencie as obras, funcionários, cargos e terceirizadas da sua empresa.</p>
                            </>
                        )}
                    </div>
                </div>

                <Tabs defaultValue="works">
                    <TabsList className="grid w-full grid-cols-2 md:w-auto md:grid-cols-4">
                        <TabsTrigger value="works"><HardHat className="mr-2 h-4 w-4" />Obras</TabsTrigger>
                        <TabsTrigger value="employees"><Users className="mr-2 h-4 w-4" />Funcionários</TabsTrigger>
                        <TabsTrigger value="jobRoles"><Briefcase className="mr-2 h-4 w-4" />Cargos</TabsTrigger>
                        <TabsTrigger value="subcontractors"><Building className="mr-2 h-4 w-4" />Terceirizadas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="works" className="mt-6">
                        <WorksTable companyId={companyId} />
                    </TabsContent>
                    <TabsContent value="employees" className="mt-6">
                        <EmployeesTable companyId={companyId} />
                    </TabsContent>
                    <TabsContent value="jobRoles" className="mt-6">
                        <JobRolesTable companyId={companyId} />
                    </TabsContent>
                    <TabsContent value="subcontractors" className="mt-6">
                        <SubcontractorsTable companyId={companyId} />
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
