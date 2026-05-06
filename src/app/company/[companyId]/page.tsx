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

    // Permission validation
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
            <Header>
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

                <Tabs defaultValue="works" className="flex flex-col items-start gap-6 md:flex-row">
                    <TabsList className="h-fit w-full flex flex-col items-stretch justify-start rounded-2xl bg-card p-3 shadow-sm md:w-64 md:self-start md:shrink-0">
                        <TabsTrigger
                            value="works"
                            className="group w-full justify-start gap-3 px-3 py-2.5 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none hover:bg-background hover:text-foreground"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border transition-colors group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground group-data-[state=active]:ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20">
                                <HardHat className="h-4 w-4" />
                            </span>
                            Obras
                        </TabsTrigger>
                        <TabsTrigger
                            value="employees"
                            className="group w-full justify-start gap-3 px-3 py-2.5 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none hover:bg-background hover:text-foreground"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border transition-colors group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground group-data-[state=active]:ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20">
                                <Users className="h-4 w-4" />
                            </span>
                            Funcionários
                        </TabsTrigger>
                        <TabsTrigger
                            value="jobRoles"
                            className="group w-full justify-start gap-3 px-3 py-2.5 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none hover:bg-background hover:text-foreground"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border transition-colors group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground group-data-[state=active]:ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20">
                                <Briefcase className="h-4 w-4" />
                            </span>
                            Cargos
                        </TabsTrigger>
                        <TabsTrigger
                            value="subcontractors"
                            className="group w-full justify-start gap-3 px-3 py-2.5 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none hover:bg-background hover:text-foreground"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border transition-colors group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground group-data-[state=active]:ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20">
                                <Building className="h-4 w-4" />
                            </span>
                            Terceirizadas
                        </TabsTrigger>
                        <TabsTrigger
                            value="settings"
                            className="group w-full justify-start gap-3 px-3 py-2.5 text-sm font-semibold text-muted-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-none hover:bg-background hover:text-foreground"
                        >
                            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-background text-primary ring-1 ring-border transition-colors group-data-[state=active]:bg-primary group-data-[state=active]:text-primary-foreground group-data-[state=active]:ring-primary/20 group-hover:bg-primary group-hover:text-primary-foreground group-hover:ring-primary/20">
                                <Settings className="h-4 w-4" />
                            </span>
                            Configurações
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1">
                        <TabsContent value="works" className="mt-0">
                            <WorksTable companyId={companyId} />
                        </TabsContent>
                        <TabsContent value="employees" className="mt-0">
                            <EmployeesTable companyId={companyId} />
                        </TabsContent>
                        <TabsContent value="jobRoles" className="mt-0">
                            <JobRolesTable companyId={companyId} />
                        </TabsContent>
                        <TabsContent value="subcontractors" className="mt-0">
                            <SubcontractorsTable companyId={companyId} />
                        </TabsContent>
                        <TabsContent value="settings" className="mt-0">
                            {company ? (
                                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                                    <CompanySettings company={company} onCompanyUpdate={fetchCompany} />
                                    <N8nSettings company={company} />
                                </div>
                            ) : (
                                <Card>
                                    <CardContent className="pt-6">
                                        <Skeleton className="h-40 w-full" />
                                    </CardContent>
                                </Card>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </main>
        </div>
    );
}
