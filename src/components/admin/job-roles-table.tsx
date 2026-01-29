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
import { getJobRoles, createJobRole, updateJobRole, deleteJobRole } from '@/server/job-role-actions';
import { JobRoleForm } from '@/components/admin/job-role-form';
import type { JobRole, JobRoleFormValues } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface JobRolesTableProps {
    companyId: string;
}

export function JobRolesTable({ companyId }: JobRolesTableProps) {
    const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingJobRole, setEditingJobRole] = useState<JobRole | null>(null);
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        const result = await getJobRoles(companyId);
        
        if (result.success && result.data) {
            setJobRoles(result.data);
        } else {
            toast({ variant: 'destructive', title: "Erro ao buscar cargos", description: result.error });
        }
        
        setIsLoading(false);
    };

    useEffect(() => {
        if (companyId) {
            fetchData();
        }
    }, [companyId]);

    const handleFormSubmit = (values: JobRoleFormValues) => {
        startTransition(async () => {
            const action = editingJobRole 
                ? updateJobRole(editingJobRole.id, { ...values, companyId }) 
                : createJobRole({ ...values, companyId });
            
            const result = await action;

            if (result.success) {
                toast({ title: `Cargo ${editingJobRole ? 'atualizado' : 'criado'} com sucesso!` });
                setIsFormOpen(false);
                setEditingJobRole(null);
                await fetchData();
            } else {
                toast({ variant: 'destructive', title: "Erro ao salvar", description: result.error });
            }
        });
    };

    const handleDelete = (jobRoleId: string) => {
        startTransition(async () => {
            const result = await deleteJobRole(jobRoleId, companyId);
            if (result.success) {
                toast({ title: "Cargo excluído com sucesso!" });
                setJobRoles(current => current.filter(role => role.id !== jobRoleId));
            } else {
                toast({ variant: 'destructive', title: "Erro ao excluir", description: result.error });
            }
        });
    }

    const openCreateDialog = () => {
        setEditingJobRole(null);
        setIsFormOpen(true);
    }
    
    const openEditDialog = (jobRole: JobRole) => {
        setEditingJobRole(jobRole);
        setIsFormOpen(true);
    }

    return (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Cargos</CardTitle>
                            <CardDescription>Gerencie os cargos e funções da sua empresa.</CardDescription>
                        </div>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Novo Cargo
                            </Button>
                        </DialogTrigger>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome do Cargo</TableHead>
                                <TableHead className="hidden md:table-cell">Responsabilidades</TableHead>
                                <TableHead className="hidden lg:table-cell">Certificados</TableHead>
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
                            ) : jobRoles.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Nenhum cargo encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                jobRoles.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">{role.name}</TableCell>
                                        <TableCell className="hidden md:table-cell max-w-sm truncate">{role.responsibilities}</TableCell>
                                        <TableCell className="hidden lg:table-cell">
                                            <div className="flex flex-wrap gap-1">
                                                {role.requiredCertificates?.filter(c => c).map((cert, i) => (
                                                    <Badge key={i} variant="secondary">{cert}</Badge>
                                                ))}
                                            </div>
                                        </TableCell>
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
                                                        <DropdownMenuItem onClick={() => openEditDialog(role)} className='cursor-pointer'>
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
                                                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente o cargo.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(role.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
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
                    <DialogTitle>{editingJobRole ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
                </DialogHeader>
                <JobRoleForm 
                    onSubmit={handleFormSubmit}
                    defaultValues={editingJobRole}
                    isPending={isPending}
                />
            </DialogContent>
        </Dialog>
    );
}
