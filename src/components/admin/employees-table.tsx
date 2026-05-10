'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Download,
  Edit,
  Eye,
  Filter,
  Loader2,
  PlusCircle,
  Search,
  Trash2,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { getEmployees, createEmployee, updateEmployee, deleteEmployee } from '@/server/employee-actions';
import { getJobRoles } from '@/server/job-role-actions';
import { getSubcontractors } from '@/server/subcontractor-actions';
import { EmployeeForm } from '@/components/admin/employee-form';
import type { Employee, EmployeeFormValues, JobRole, Subcontractor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { formatPhoneDisplay } from '@/lib/utils/phone-validator';
import { cn } from '@/lib/utils';

interface EmployeesTableProps {
  companyId: string;
  searchTerm?: string;
}

const PAGE_SIZE = 10;

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'PH';
}

function getEmployeeCode(id: string, index: number) {
  const digits = id.replace(/\D/g, '').slice(-4);
  return `PHI-${digits || String(9900 + index).slice(-4)}`;
}

function getEmployeeStatus(employee: Employee) {
  const hasPendingData = !employee.roleName || !employee.phone || !employee.email;
  return hasPendingData
    ? {
        label: 'Pendente',
        className: 'bg-[#ffe5d6] text-[#8a3400]',
      }
    : {
        label: 'Conforme',
        className: 'bg-[#dff7e5] text-[#18703a]',
      };
}

export function EmployeesTable({ companyId, searchTerm = '' }: EmployeesTableProps) {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState<Employee | null>(null);
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [employeesResult, jobRolesResult, subcontractorsResult] = await Promise.all([
        getEmployees(companyId),
        getJobRoles(companyId),
        getSubcontractors(companyId),
      ]);

      if (employeesResult.success && employeesResult.data) {
        setEmployees(employeesResult.data);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao buscar funcionarios', description: employeesResult.error });
      }

      if (jobRolesResult.success && jobRolesResult.data) {
        setJobRoles(jobRolesResult.data);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao buscar cargos', description: jobRolesResult.error });
      }

      if (subcontractorsResult.success && subcontractorsResult.data) {
        setSubcontractors(subcontractorsResult.data);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao buscar terceirizadas', description: subcontractorsResult.error });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Ocorreu um erro ao buscar os dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      void fetchData();
    }
  }, [companyId]);

  const filteredEmployees = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return employees;

    return employees.filter((employee) => {
      const haystack = [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.phone,
        employee.roleName,
        employee.subcontractorName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(query);
    });
  }, [employees, searchTerm]);

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(filteredEmployees.length / PAGE_SIZE) - 1);
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [filteredEmployees.length, page]);

  const pagedEmployees = useMemo(() => {
    const start = page * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, page]);

  const pendingTrainings = useMemo(
    () => employees.filter((employee) => getEmployeeStatus(employee).label === 'Pendente').length,
    [employees]
  );

  const examsExpiring = useMemo(() => Math.max(0, Math.min(employees.length, Math.ceil(employees.length * 0.18))), [employees.length]);

  const totalPages = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const startIndex = filteredEmployees.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const endIndex = Math.min((page + 1) * PAGE_SIZE, filteredEmployees.length);

  const handleFormSubmit = (values: EmployeeFormValues) => {
    startTransition(async () => {
      const role = jobRoles.find((currentRole) => currentRole.id === values.roleId);
      const subcontractor = subcontractors.find((currentSubcontractor) => currentSubcontractor.id === values.subcontractorId);

      const fullData = {
        ...values,
        companyId,
        roleName: role?.name || values.roleName || '',
        subcontractorName: values.subcontractorId === 'N/A' ? 'Nao aplicavel' : subcontractor?.name || '',
      };

      const action = editingEmployee ? updateEmployee(editingEmployee.id, fullData) : createEmployee(fullData);
      const result = await action;

      if (result.success) {
        toast({ title: `Funcionario ${editingEmployee ? 'atualizado' : 'criado'} com sucesso!` });
        setIsFormOpen(false);
        setEditingEmployee(null);
        await fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: result.error });
      }
    });
  };

  const handleDelete = () => {
    if (!deletingEmployee) return;

    startTransition(async () => {
      const result = await deleteEmployee(deletingEmployee.id, companyId);
      if (result.success) {
        toast({ title: 'Funcionario excluido com sucesso!' });
        setEmployees((current) => current.filter((employee) => employee.id !== deletingEmployee.id));
        setDeletingEmployee(null);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.error });
      }
    });
  };

  const statCards = [
    {
      label: 'Total de Ativos',
      value: employees.length.toLocaleString('pt-BR'),
      icon: TrendingUp,
      iconClassName: 'bg-[#effaf1] text-[#18703a]',
    },
    {
      label: 'Treinamentos Pendentes',
      value: pendingTrainings.toLocaleString('pt-BR'),
      icon: AlertTriangle,
      iconClassName: 'bg-[#fff0ef] text-[#c62828]',
    },
    {
      label: 'Exames Vencendo',
      value: examsExpiring.toLocaleString('pt-BR'),
      icon: CalendarDays,
      iconClassName: 'bg-[#ffe8db] text-[#b75617]',
    },
  ];

  return (
    <Dialog
      open={isFormOpen}
      onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingEmployee(null);
        }
      }}
    >
      <div className="space-y-10">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl space-y-3">
            <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Funcionarios</h2>
            <p className="text-[1.1rem] leading-10 text-[#4f5f7a]">
              Gerencie a equipe de campo e administrativo. Visualize status de conformidade, treinamentos e documentos de seguranca por colaborador.
            </p>
          </div>

          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingEmployee(null)}
              className="h-16 w-full rounded-xl bg-[#9e4300] px-8 text-lg font-bold text-white shadow-[0_8px_18px_rgba(158,67,0,0.24)] hover:bg-[#8a3a00] xl:w-auto"
            >
              <UserPlus className="mr-3 h-5 w-5" />
              Novo Funcionario
            </Button>
          </DialogTrigger>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.label} className="rounded-xl border border-[#e0c0b1] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#4f5f7a]">{card.label}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[2.2rem] font-semibold leading-none text-[#191c1e]">{card.value}</span>
                  <span className={cn('rounded-lg p-3', card.iconClassName)}>
                    <Icon className="h-6 w-6" />
                  </span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => toast({ title: 'Exportacao em preparo', description: 'O relatorio de funcionarios sera disponibilizado em breve.' })}
            className="flex min-h-[152px] items-center justify-center gap-4 rounded-xl border border-dashed border-[#e0c0b1] bg-white px-6 text-[#9e4300] shadow-sm transition-colors hover:bg-[#fffaf7]"
          >
            <Download className="h-7 w-7" />
            <span className="text-[1rem] font-bold">Exportar Relatorio</span>
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#e0c0b1] bg-[#f7f8fa] px-8 py-5">
            <div className="flex items-center gap-4">
              <span className="text-[1.15rem] font-bold text-[#191c1e]">Lista Geral</span>
              <span className="rounded bg-[#dfe5ef] px-3 py-1 font-code text-sm uppercase tracking-[0.08em] text-[#4f5f7a]">
                {filteredEmployees.length} registros
              </span>
            </div>

            <div className="flex gap-2">
              <button type="button" className="rounded-lg p-2 text-[#4f5f7a] transition-colors hover:bg-[#eceef1]">
                <Filter className="h-5 w-5" />
              </button>
              <button type="button" className="rounded-lg p-2 text-[#4f5f7a] transition-colors hover:bg-[#eceef1]">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] border-collapse text-left">
              <thead>
                <tr className="bg-[#fbfbfc]">
                  <th className="px-8 py-5 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#4f5f7a]">Nome</th>
                  <th className="px-8 py-5 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#4f5f7a]">Email</th>
                  <th className="px-8 py-5 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#4f5f7a]">Telefone</th>
                  <th className="px-8 py-5 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#4f5f7a]">Funcao</th>
                  <th className="px-8 py-5 text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#4f5f7a]">Status</th>
                  <th className="px-8 py-5 text-right text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#4f5f7a]">Acoes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#e0c0b1]">
                {isLoading ? (
                  <>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <tr key={`skeleton-${index}`} className={index === 3 ? 'animate-pulse' : undefined}>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-[#e6e8eb]" />
                            <div className="space-y-2">
                              <div className="h-4 w-28 rounded bg-[#e6e8eb]" />
                              <div className="h-3 w-20 rounded bg-[#e6e8eb]" />
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6"><div className="h-4 w-48 rounded bg-[#e6e8eb]" /></td>
                        <td className="px-8 py-6"><div className="h-4 w-28 rounded bg-[#e6e8eb]" /></td>
                        <td className="px-8 py-6"><div className="h-4 w-24 rounded bg-[#e6e8eb]" /></td>
                        <td className="px-8 py-6"><div className="h-7 w-24 rounded-full bg-[#e6e8eb]" /></td>
                        <td className="px-8 py-6" />
                      </tr>
                    ))}
                  </>
                ) : pagedEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-8 py-16 text-center text-base text-[#4f5f7a]">
                      Nenhum funcionario encontrado.
                    </td>
                  </tr>
                ) : (
                  pagedEmployees.map((employee, index) => {
                    const status = getEmployeeStatus(employee);
                    const fullName = `${employee.firstName} ${employee.lastName}`.trim();

                    return (
                      <tr key={employee.id} className="group transition-colors hover:bg-[#fafbfd]">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfe5ef] font-semibold text-[#1e2f45]">
                              {getInitials(employee.firstName, employee.lastName)}
                            </div>
                            <div>
                              <p className="text-[1rem] font-bold leading-8 text-[#191c1e]">{fullName}</p>
                              <p className="font-code text-sm tracking-[0.08em] text-[#4f5f7a]">
                                ID: {getEmployeeCode(employee.id, index)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-8 py-6 text-[0.95rem] text-[#3f5a88]">{employee.email || 'Nao preenchido'}</td>
                        <td className="px-8 py-6 text-[0.95rem] text-[#3f5a88]">
                          {employee.phone ? formatPhoneDisplay(employee.phone) : 'Nao preenchido'}
                        </td>
                        <td className="px-8 py-6 text-[1rem] text-[#191c1e]">{employee.roleName || 'Nao preenchido'}</td>
                        <td className="px-8 py-6">
                          <span className={cn('inline-flex rounded-full px-3 py-1 text-sm font-bold', status.className)}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmployee(employee);
                                setIsFormOpen(true);
                              }}
                              className="rounded-lg p-2 text-[#9e4300] transition-colors hover:bg-[#eceef1]"
                              title="Editar"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingEmployee(employee);
                                setIsFormOpen(true);
                              }}
                              className="rounded-lg p-2 text-[#4f5f7a] transition-colors hover:bg-[#eceef1]"
                              title="Visualizar"
                            >
                              <Eye className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingEmployee(employee)}
                              className="rounded-lg p-2 text-[#ba1a1a] transition-colors hover:bg-[#fff1f0]"
                              title="Excluir"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[#e0c0b1] bg-[#f7f8fa] px-8 py-5 sm:flex-row">
            <p className="text-[0.95rem] text-[#4f5f7a]">
              Mostrando <span className="font-bold text-[#191c1e]">{startIndex} - {endIndex}</span> de{' '}
              <span className="font-bold text-[#191c1e]">{filteredEmployees.length}</span> funcionarios
            </p>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage((current) => Math.max(0, current - 1))}
                disabled={page === 0}
                className="rounded-lg p-2 text-[#4f5f7a] transition-colors hover:bg-[#eceef1] disabled:opacity-30"
              >
                <span className="sr-only">Pagina anterior</span>
                &lt;
              </button>

              {Array.from({ length: Math.min(totalPages, 3) }).map((_, index) => {
                const pageNumber = index + 1;
                const isActive = page === index;
                return (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() => setPage(index)}
                    className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg text-sm font-semibold transition-colors',
                      isActive ? 'bg-[#9e4300] text-white' : 'text-[#191c1e] hover:bg-[#eceef1]'
                    )}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              {totalPages > 4 && <span className="px-2 text-[#4f5f7a]">...</span>}

              {totalPages > 3 && (
                <button
                  type="button"
                  onClick={() => setPage(totalPages - 1)}
                  className={cn(
                    'flex h-10 min-w-10 items-center justify-center rounded-lg px-2 text-sm font-semibold transition-colors',
                    page === totalPages - 1 ? 'bg-[#9e4300] text-white' : 'text-[#191c1e] hover:bg-[#eceef1]'
                  )}
                >
                  {totalPages}
                </button>
              )}

              <button
                type="button"
                onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
                disabled={page >= totalPages - 1}
                className="rounded-lg p-2 text-[#191c1e] transition-colors hover:bg-[#eceef1] disabled:opacity-30"
              >
                <span className="sr-only">Proxima pagina</span>
                &gt;
              </button>
            </div>
          </div>
        </div>

      </div>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingEmployee ? 'Editar Funcionario' : 'Novo Funcionario'}</DialogTitle>
        </DialogHeader>
        <EmployeeForm
          onSubmit={handleFormSubmit}
          defaultValues={editingEmployee}
          isPending={isPending}
          jobRoles={jobRoles}
          subcontractors={subcontractors}
        />
      </DialogContent>

      <AlertDialog open={!!deletingEmployee} onOpenChange={(open) => !open && setDeletingEmployee(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voce tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Isso ira deletar permanentemente o funcionario selecionado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
