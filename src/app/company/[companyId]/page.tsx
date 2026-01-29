'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Header } from "@/components/header";
import { UserNav } from "@/components/auth/user-nav";
import { WorksTable } from "@/components/admin/works-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HardHat, Users, Briefcase, Building, Settings } from "lucide-react";
import { useSession } from "@/components/auth/session-provider";
import { getCompanyById } from "@/server/company-actions";
import type { Company } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { EmployeesTable } from '@/components/admin/employees-table';
import { JobRolesTable } from '@/components/admin/job-roles-table';
import { SubcontractorsTable } from '@/components/admin/subcontractors-table';
import { CompanySettings } from '@/components/admin/company-settings';
import { Card, CardContent } from '@/components/ui/card';
import { N8nSettings } from '@/components/admin/n8n-settings';

export default function CompanyPage() {
    const params = useParams();
    const companyId = params.companyId as string;

    const { user, isLoading: isSessionLoading } = useSession();
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCompany = async () => {
        if (companyId) {
            setLoading(true);
            const result = await getCompanyById(companyId);
            if (result.success && result.data) {
                setCompany(result.data);
            } else {
                console.error("Failed to fetch company data:", result.error);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        if (companyId) {
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
                    <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
                        <TabsTrigger value="works"><HardHat className="mr-2 h-4 w-4" />Obras</TabsTrigger>
                        <TabsTrigger value="employees"><Users className="mr-2 h-4 w-4" />Funcionários</TabsTrigger>
                        <TabsTrigger value="jobRoles"><Briefcase className="mr-2 h-4 w-4" />Cargos</TabsTrigger>
                        <TabsTrigger value="subcontractors"><Building className="mr-2 h-4 w-4" />Terceirizadas</TabsTrigger>
                        <TabsTrigger value="settings"><Settings className="mr-2 h-4 w-4" />Configurações</TabsTrigger>
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
                    <TabsContent value="settings" className="mt-6">
                        {company ? (
                            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
                                <CompanySettings company={company} onCompanyUpdate={fetchCompany} />
                                <N8nSettings company={company} />
                            </div>
                        ) : (
                           <Card><CardContent className='pt-6'><Skeleton className="h-40 w-full" /></CardContent></Card>
                        )}
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}
