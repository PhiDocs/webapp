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
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/server/employee-actions';
import { getJobRoles } from '@/server/job-role-actions';
import { getSubcontractors } from '@/server/subcontractor-actions';
import { EmployeeForm } from '@/components/admin/employee-form';
import type { Employee, EmployeeFormValues, JobRole, Subcontractor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface EmployeesTableProps {
    companyId: string;
}

export function EmployeesTable({ companyId }: EmployeesTableProps) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
    const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isPending, startTransition] = useTransition();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const { toast } = useToast();

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [employeesResult, jobRolesResult, subcontractorsResult] = await Promise.all([
                getEmployees(companyId),
                getJobRoles(companyId),
                getSubcontractors(companyId)
            ]);

            if (employeesResult.success && employeesResult.data) {
                setEmployees(employeesResult.data);
            } else {
                toast({ variant: 'destructive', title: "Erro ao buscar funcionários", description: employeesResult.error });
            }

            if (jobRolesResult.success && jobRolesResult.data) {
                setJobRoles(jobRolesResult.data);
            } else {
                 toast({ variant: 'destructive', title: "Erro ao buscar cargos", description: jobRolesResult.error });
            }

             if (subcontractorsResult.success && subcontractorsResult.data) {
                setSubcontractors(subcontractorsResult.data);
            } else {
                 toast({ variant: 'destructive', title: "Erro ao buscar terceirizadas", description: subcontractorsResult.error });
            }

        } catch (error) {
            toast({ variant: 'destructive', title: "Erro inesperado", description: "Ocorreu um erro ao buscar os dados." });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (companyId) {
            fetchData();
        }
    }, [companyId]);

    const handleFormSubmit = (values: EmployeeFormValues) => {
        startTransition(async () => {
             const role = jobRoles.find(r => r.id === values.roleId);
             const subcontractor = subcontractors.find(s => s.id === values.subcontractorId);

             const fullData = { 
                ...values, 
                companyId,
                roleName: role?.name || '',
                subcontractorName: values.subcontractorId === 'N/A' ? 'Não aplicável' : subcontractor?.name || ''
            };

            const action = editingEmployee 
                ? updateEmployee(editingEmployee.id, fullData) 
                : createEmployee(fullData);
            
            const result = await action;

            if (result.success) {
                toast({ title: `Funcionário ${editingEmployee ? 'atualizado' : 'criado'} com sucesso!` });
                await fetchData();
                setIsFormOpen(false);
                setEditingEmployee(null);
            } else {
                toast({ variant: 'destructive', title: "Erro ao salvar", description: result.error });
            }
        });
    };

    const handleDelete = (employeeId: string) => {
        startTransition(async () => {
            const result = await deleteEmployee(employeeId, companyId);
            if (result.success) {
                toast({ title: "Funcionário excluído com sucesso!" });
                setEmployees(current => current.filter(emp => emp.id !== employeeId));
            } else {
                toast({ variant: 'destructive', title: "Erro ao excluir", description: result.error });
            }
        });
    }

    const openCreateDialog = () => {
        setEditingEmployee(null);
        setIsFormOpen(true);
    }
    
    const openEditDialog = (employee: Employee) => {
        setEditingEmployee(employee);
        setIsFormOpen(true);
    }

    return (
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between">
                        <div>
                            <CardTitle>Funcionários</CardTitle>
                            <CardDescription>Lista de todos os funcionários cadastrados para esta empresa.</CardDescription>
                        </div>
                        <DialogTrigger asChild>
                            <Button onClick={openCreateDialog}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Novo Funcionário
                            </Button>
                        </DialogTrigger>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nome</TableHead>
                                <TableHead className="hidden md:table-cell">Email</TableHead>
                                <TableHead className="hidden lg:table-cell">Função</TableHead>
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
                            ) : employees.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                                        Nenhum funcionário encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                employees.map((employee) => (
                                    <TableRow key={employee.id}>
                                        <TableCell className="font-medium">
                                            {`${employee.firstName} ${employee.lastName}`}
                                            {employee.subcontractorName && employee.subcontractorName !== 'Não aplicável' && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                    {employee.subcontractorName}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">{employee.email}</TableCell>
                                        <TableCell className="hidden lg:table-cell">{employee.roleName}</TableCell>
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
                                                        <DropdownMenuItem onClick={() => openEditDialog(employee)} className='cursor-pointer'>
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
                                                            Esta ação não pode ser desfeita. Isso irá deletar permanentemente o funcionário.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(employee.id)} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
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
                    <DialogTitle>{editingEmployee ? 'Editar Funcionário' : 'Novo Funcionário'}</DialogTitle>
                </DialogHeader>
                <EmployeeForm 
                    onSubmit={handleFormSubmit}
                    defaultValues={editingEmployee}
                    isPending={isPending}
                    jobRoles={jobRoles}
                    subcontractors={subcontractors}
                />
            </DialogContent>
        </Dialog>
    );
}
