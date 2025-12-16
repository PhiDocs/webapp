'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { Header } from "@/components/header";
import { SignOutButton } from "@/components/auth/signout-button";
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PlusCircle, Edit, Trash2, Loader2, MoreHorizontal } from 'lucide-react';
import { getCompanies, createCompany, updateCompany, deleteCompany } from '@/server/company-actions';
import { CompanyForm } from '@/components/admin/company-form';
import type { Company } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getShortDate } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';


export default function AdminPage() {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const { toast } = useToast();

    const fetchCompanies = async () => {
        setIsLoading(true);
        const result = await getCompanies();
        if (result.success && result.data) {
            setCompanies(result.data);
        } else {
            toast({ variant: 'destructive', title: "Erro ao buscar empresas", description: result.error });
        }
        setIsLoading(false);
    };

    useEffect(() => {
        fetchCompanies();
    }, []);

    const handleFormSubmit = (values: { name: string }) => {
        startTransition(async () => {
            const action = editingCompany 
                ? updateCompany(editingCompany.id, values) 
                : createCompany(values);
            
            const result = await action;

            if (result.success) {
                toast({ title: `Empresa ${editingCompany ? 'atualizada' : 'criada'} com sucesso!` });
                await fetchCompanies();
                setIsFormOpen(false);
                setEditingCompany(null);
            } else {
                toast({ variant: 'destructive', title: "Erro ao salvar", description: result.error });
            }
        });
    };

    const handleDelete = (companyId: string) => {
        startTransition(async () => {
            const result = await deleteCompany(companyId);
            if (result.success) {
                toast({ title: "Empresa excluída com sucesso!" });
                await fetchCompanies();
            } else {
                toast({ variant: 'destructive', title: "Erro ao excluir", description: result.error });
            }
        });
    }

    const openCreateDialog = () => {
        setEditingCompany(null);
        setIsFormOpen(true);
    }
    
    const openEditDialog = (company: Company) => {
        setEditingCompany(company);
        setIsFormOpen(true);
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header isAprReady={false} isPtReady={false}>
                <SignOutButton />
            </Header>
            <main className="flex-grow container mx-auto p-4 md:p-6">
                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold">Painel do Administrador</h1>
                            <p className="text-muted-foreground mt-2">Gerencie as empresas cadastradas no sistema.</p>
                        </div>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nova Empresa
                            </Button>
                        </DialogTrigger>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Empresas</CardTitle>
                            <CardDescription>Lista de todas as empresas cadastradas.</CardDescription>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome da Empresa</TableHead>
                                        <TableHead className="hidden md:table-cell">Data de Criação</TableHead>
                                        <TableHead className="hidden lg:table-cell">ID</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24">
                                                <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                                            </TableCell>
                                        </TableRow>
                                    ) : companies.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                                Nenhuma empresa encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        companies.map((company) => (
                                            <TableRow key={company.id}>
                                                <TableCell className="font-medium">{company.name}</TableCell>
                                                <TableCell className="hidden md:table-cell">{getShortDate(company.createdAt)}</TableCell>
                                                <TableCell className="hidden lg:table-cell text-muted-foreground">{company.id}</TableCell>
                                                <TableCell className="text-right">
                                                    <AlertDialog>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Abrir menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem onClick={() => openEditDialog(company)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    <span>Editar</span>
                                                                </DropdownMenuItem>
                                                                <AlertDialogTrigger asChild>
                                                                    <DropdownMenuItem className='text-destructive focus:text-destructive focus:bg-destructive/10' onSelect={(e) => e.preventDefault()}>
                                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                                        <span>Deletar</span>
                                                                    </DropdownMenuItem>
                                                                </AlertDialogTrigger>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>

                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Esta ação não pode ser desfeita. Isso irá deletar permanentemente a empresa e todos os seus dados associados.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(company.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
                                                                     {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                                                    Deletar
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>

                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>{editingCompany ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
                        </DialogHeader>
                        <CompanyForm 
                            onSubmit={handleFormSubmit}
                            defaultValues={editingCompany}
                            isPending={isPending}
                        />
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
