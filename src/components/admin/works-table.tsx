'use client';

import React, { useState, useEffect, useTransition } from 'react';
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
import { getWorks, createWork, updateWork, deleteWork } from '@/server/work-actions';
import { WorkForm } from '@/components/admin/work-form';
import type { Work, WorkFormValues, Company } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getShortDate } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getCompanies } from '@/server/company-actions';


export function WorksTable() {
    const [works, setWorks] = useState<Work[]>([]);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingWork, setEditingWork] = useState<Work | null>(null);
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        const [worksResult, companiesResult] = await Promise.all([
            getWorks(),
            getCompanies()
        ]);
        
        if (worksResult.success && worksResult.data) {
            setWorks(worksResult.data);
        } else {
            toast({ variant: 'destructive', title: "Erro ao buscar obras", description: worksResult.error });
        }

        if (companiesResult.success && companiesResult.data) {
            setCompanies(companiesResult.data);
        } else {
            toast({ variant: 'destructive', title: "Erro ao buscar empresas", description: companiesResult.error });
        }
        
        setIsLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleFormSubmit = (values: WorkFormValues) => {
        startTransition(async () => {
            const action = editingWork 
                ? updateWork(editingWork.id, values) 
                : createWork(values);
            
            const result = await action;

            if (result.success) {
                toast({ title: `Obra ${editingWork ? 'atualizada' : 'criada'} com sucesso!` });
                await fetchData();
                setIsFormOpen(false);
                setEditingWork(null);
            } else {
                toast({ variant: 'destructive', title: "Erro ao salvar", description: result.error });
            }
        });
    };

    const handleDelete = (workId: string) => {
        startTransition(async () => {
            const result = await deleteWork(workId);
            if (result.success) {
                toast({ title: "Obra excluída com sucesso!" });
                await fetchData();
            } else {
                toast({ variant: 'destructive', title: "Erro ao excluir", description: result.error });
            }
        });
    }

    const openCreateDialog = () => {
        setEditingWork(null);
        setIsFormOpen(true);
    }
    
    const openEditDialog = (work: Work) => {
        setEditingWork(work);
        setIsFormOpen(true);
    }

    const getCompanyName = (companyId: string) => {
        return companies.find(c => c.id === companyId)?.name || 'N/A';
    }

    return (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Obras</CardTitle>
                            <CardDescription>Lista de todas as obras cadastradas.</CardDescription>
                        </div>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog} disabled={companies.length === 0}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nova Obra
                            </Button>
                        </DialogTrigger>
                    </div>
                     {companies.length === 0 && !isLoading && (
                        <p className="text-sm text-destructive mt-2">
                           Você precisa cadastrar pelo menos uma empresa antes de poder adicionar uma obra.
                        </p>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome da Obra</TableHead>
                                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                                <TableHead className="hidden lg:table-cell">Endereço</TableHead>
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
                            ) : works.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Nenhuma obra encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                works.map((work) => (
                                    <TableRow key={work.id}>
                                        <TableCell className="font-medium">{work.name}</TableCell>
                                        <TableCell className="hidden md:table-cell text-muted-foreground">{getCompanyName(work.companyId)}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{work.address}</TableCell>
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
                                                        <DropdownMenuItem onClick={() => openEditDialog(work)}>
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
                                                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente a obra.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(work.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
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
                    <DialogTitle>{editingWork ? 'Editar Obra' : 'Nova Obra'}</DialogTitle>
                </DialogHeader>
                <WorkForm 
                    onSubmit={handleFormSubmit}
                    defaultValues={editingWork}
                    isPending={isPending}
                    companies={companies}
                />
            </DialogContent>
        </Dialog>
    );
}
