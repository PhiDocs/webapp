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
import { getSubcontractors, createSubcontractor, updateSubcontractor, deleteSubcontractor } from '@/server/subcontractor-actions';
import { SubcontractorForm } from '@/components/admin/subcontractor-form';
import type { Subcontractor, SubcontractorFormValues } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SubcontractorsTableProps {
    companyId: string;
}

export function SubcontractorsTable({ companyId }: SubcontractorsTableProps) {
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        const result = await getSubcontractors(companyId);
        
        if (result.success && result.data) {
            setSubcontractors(result.data);
        } else {
            toast({ variant: 'destructive', title: "Erro ao buscar empresas terceirizadas", description: result.error });
        }
        
        setIsLoading(false);
    };

    useEffect(() => {
        if (companyId) {
            fetchData();
        }
    }, [companyId]);

    const handleFormSubmit = (values: SubcontractorFormValues) => {
        startTransition(async () => {
            const action = editingSubcontractor 
                ? updateSubcontractor(editingSubcontractor.id, { ...values, companyId }) 
                : createSubcontractor({ ...values, companyId });
            
            const result = await action;

            if (result.success) {
                toast({ title: `Empresa ${editingSubcontractor ? 'atualizada' : 'criada'} com sucesso!` });
                await fetchData();
                setIsFormOpen(false);
                setEditingSubcontractor(null);
            } else {
                toast({ variant: 'destructive', title: "Erro ao salvar", description: result.error });
            }
        });
    };

    const handleDelete = (subcontractorId: string) => {
        startTransition(async () => {
            const result = await deleteSubcontractor(subcontractorId, companyId);
            if (result.success) {
                toast({ title: "Empresa excluída com sucesso!" });
                setSubcontractors(current => current.filter(s => s.id !== subcontractorId));
            } else {
                toast({ variant: 'destructive', title: "Erro ao excluir", description: result.error });
            }
        });
    }

    const openCreateDialog = () => {
        setEditingSubcontractor(null);
        setIsFormOpen(true);
    }
    
    const openEditDialog = (subcontractor: Subcontractor) => {
        setEditingSubcontractor(subcontractor);
        setIsFormOpen(true);
    }

    return (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Empresas Terceirizadas</CardTitle>
                            <CardDescription>Gerencie as empresas terceirizadas parceiras.</CardDescription>
                        </div>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Nova Empresa
                            </Button>
                        </DialogTrigger>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome da Empresa</TableHead>
                                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                                <TableHead className="hidden lg:table-cell">Contrato</TableHead>
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
                            ) : subcontractors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Nenhuma empresa terceirizada encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                subcontractors.map((sub) => (
                                    <TableRow key={sub.id}>
                                        <TableCell className="font-medium">{sub.name}</TableCell>
                                        <TableCell className="hidden md:table-cell">{sub.cnpj}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{sub.contractNumber}</TableCell>
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
                                                        <DropdownMenuItem onClick={() => openEditDialog(sub)} className='cursor-pointer'>
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            <span>Editar</span>
                                                        </DropdownMenuItem>
                                                        <AlertDialogTrigger asChild>
                                                            <DropdownMenuItem className='text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer' onSelect={(e) => e.preventDefault()}>
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
                                                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente a empresa.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(sub.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
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

            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{editingSubcontractor ? 'Editar Empresa' : 'Nova Empresa'}</DialogTitle>
                </DialogHeader>
                <SubcontractorForm 
                    onSubmit={handleFormSubmit}
                    defaultValues={editingSubcontractor}
                    isPending={isPending}
                />
            </DialogContent>
        </Dialog>
    );
}
