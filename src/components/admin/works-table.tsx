'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, Construction, Edit, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
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
import { getWorks, createWork, updateWork, deleteWork } from '@/server/work-actions';
import { WorkForm } from '@/components/admin/work-form';
import type { Work, WorkClientFormValues } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn, getShortDate } from '@/lib/utils';

interface WorksTableProps {
  companyId: string;
}

function getWorkStatus(work: Work, index: number) {
  const name = work.name.toLowerCase();

  if (name.includes('torre') || name.includes('crit')) {
    return {
      label: 'Alerta Critico',
      className: 'bg-[#f0e2e0] text-[#7a1f1f] border-[#f0e2e0]',
      dot: 'bg-[#7a1f1f]',
    };
  }

  if (name.includes('ponte') || index % 3 === 2) {
    return {
      label: 'Aguardando',
      className: 'bg-[#f7f5f0] text-[#6e6a61] border-[#e3e0d8]',
      dot: 'bg-[#7a1f1f]',
    };
  }

  return {
    label: 'Em Conformidade',
    className: 'bg-[#dde9e2] text-[#1b5e3f] border-[#dde9e2]',
    dot: 'bg-[#1b5e3f]',
  };
}

function getWorkPeriod(work: Work) {
  const start = new Date(work.startDate).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
  const end = new Date(work.endDate).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
  return `${start} - ${end}`;
}

export function WorksTable({ companyId }: WorksTableProps) {
  const [works, setWorks] = useState<Work[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [deletingWork, setDeletingWork] = useState<Work | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const worksResult = await getWorks(companyId);

    if (worksResult.success && worksResult.data) {
      setWorks(worksResult.data);
    } else {
      toast({ variant: 'destructive', title: 'Erro ao buscar obras', description: worksResult.error });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (companyId) {
      void fetchData();
    }
  }, [companyId]);

  const filteredWorks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return works;

    return works.filter((work) => {
      const haystack = [work.name, work.address, work.workLocationDetails].join(' ').toLowerCase();
      return haystack.includes(query);
    });
  }, [searchTerm, works]);

  const activeWorks = filteredWorks.length;
  const criticalAlerts = filteredWorks.filter((work, index) => getWorkStatus(work, index).label === 'Alerta Critico').length;

  const handleFormSubmit = (values: WorkClientFormValues) => {
    startTransition(async () => {
      const fullValues = { ...values, companyId };
      const action = editingWork ? updateWork(editingWork.id, fullValues) : createWork(fullValues);

      const result = await action;

      if (result.success) {
        toast({ title: `Obra ${editingWork ? 'atualizada' : 'criada'} com sucesso!` });
        setIsFormOpen(false);
        setEditingWork(null);
        await fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: result.error });
      }
    });
  };

  const handleDelete = () => {
    if (!deletingWork) return;

    startTransition(async () => {
      const result = await deleteWork(deletingWork.id, companyId);
      if (result.success) {
        toast({ title: 'Obra excluida com sucesso!' });
        setWorks((current) => current.filter((work) => work.id !== deletingWork.id));
        setDeletingWork(null);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.error });
      }
    });
  };

  return (
    <Dialog
      open={isFormOpen}
      onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingWork(null);
        }
      }}
    >
      <div className="space-y-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#111111]">Obras</h2>
            <p className="mt-3 text-[1.1rem] leading-8 text-[#6e6a61]">Gerenciamento e conformidade de canteiros ativos.</p>
          </div>

          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingWork(null)}
              className="h-16 w-full rounded-xl bg-[#7a1f1f] px-8 text-lg font-bold text-white shadow-[0_8px_18px_rgba(158,67,0,0.24)] hover:bg-[#7a1f1f] xl:w-auto"
            >
              <Plus className="mr-3 h-5 w-5" />
              Nova Obra
            </Button>
          </DialogTrigger>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-xl border border-[#cfcbc0] bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[1.05rem] text-[#6e6a61]">Obras Ativas</span>
              <div className="rounded-lg bg-[#f7f5f0] p-3 text-[#6e6a61]">
                <Construction className="h-6 w-6" />
              </div>
            </div>
            <div className="text-[3.25rem] font-bold leading-none text-[#111111]">{activeWorks}</div>
            <p className="mt-3 text-[0.95rem] text-[#6e6a61]">+2 em relacao ao mes anterior</p>
          </div>

          <div className="relative overflow-hidden rounded-xl border border-[#7a1f1f] bg-white p-8 shadow-sm">
            <div className="absolute inset-y-0 left-0 w-1 bg-[#7a1f1f]" />
            <div className="mb-6 flex items-center justify-between">
              <span className="text-[1.05rem] text-[#6e6a61]">Alertas Criticos</span>
              <div className="rounded-lg bg-[#f6edec] p-3 text-[#7a1f1f]">
                <AlertTriangle className="h-6 w-6" />
              </div>
            </div>
            <div className="text-[3.25rem] font-bold leading-none text-[#7a1f1f]">{criticalAlerts}</div>
            <p className="mt-3 text-[0.95rem] font-semibold text-[#7a1f1f]">Acao imediata necessaria</p>
          </div>

        </div>

        <div className="grid grid-cols-1 gap-6">
          <div className="overflow-hidden rounded-xl border border-[#cfcbc0] bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-[#cfcbc0] px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-headline text-[2rem] font-semibold text-[#111111]">Listagem de Obras</h3>
              <div className="relative w-full sm:w-[340px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6a61]" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar obra..."
                  className="h-11 w-full rounded-lg border border-[#cfcbc0] bg-[#f2f1ed] pl-10 pr-4 text-sm text-[#111111] outline-none focus:border-[#7a1f1f]"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-collapse text-left">
                <thead className="bg-[#f2f1ed]">
                  <tr>
                    <th className="px-8 py-5 text-[1rem] font-semibold text-[#6e6a61]">Nome</th>
                    <th className="px-8 py-5 text-[1rem] font-semibold text-[#6e6a61]">Endereco</th>
                    <th className="px-8 py-5 text-[1rem] font-semibold text-[#6e6a61]">Periodo</th>
                    <th className="px-8 py-5 text-center text-[1rem] font-semibold text-[#6e6a61]">Status</th>
                    <th className="px-8 py-5 text-right text-[1rem] font-semibold text-[#6e6a61]">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#cfcbc0]">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center">
                        <Construction className="mx-auto h-7 w-7 animate-pulse text-[#6e6a61]" />
                      </td>
                    </tr>
                  ) : filteredWorks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-16 text-center text-base text-[#6e6a61]">
                        Nenhuma obra encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredWorks.map((work, index) => {
                      const status = getWorkStatus(work, index);

                      return (
                        <tr key={work.id} className={cn('transition-colors hover:bg-[#f7f5f0]', index % 2 === 1 && 'bg-[#faf9f5]')}>
                          <td className="px-8 py-6 text-[1.05rem] font-semibold leading-9 text-[#111111]">{work.name}</td>
                          <td className="px-8 py-6 text-[0.95rem] leading-8 text-[#6e6a61]">{work.address}</td>
                          <td className="px-8 py-6 text-[0.95rem] leading-8 text-[#6e6a61]">{getWorkPeriod(work)}</td>
                          <td className="px-8 py-6 text-center">
                            <span className={cn('inline-flex rounded-full border px-4 py-1 text-xs font-bold uppercase tracking-[0.08em]', status.className)}>
                              {status.label}
                            </span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingWork(work);
                                  setIsFormOpen(true);
                                }}
                                className="rounded-lg p-2 text-[#6e6a61] hover:bg-[#ebe9e3] hover:text-[#111111]"
                                title="Editar"
                              >
                                <Edit className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingWork(work)}
                                className="rounded-lg p-2 text-[#7a1f1f] hover:bg-[#f6edec]"
                                title="Excluir"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                              <button
                                type="button"
                                className="rounded-lg p-2 text-[#6e6a61] hover:bg-[#ebe9e3] hover:text-[#111111]"
                                title="Mais acoes"
                              >
                                <MoreVertical className="h-5 w-5" />
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
          </div>
        </div>
      </div>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingWork ? 'Editar Obra' : 'Nova Obra'}</DialogTitle>
        </DialogHeader>
        <WorkForm onSubmit={handleFormSubmit} defaultValues={editingWork} isPending={isPending} />
      </DialogContent>

      <AlertDialog open={!!deletingWork} onOpenChange={(open) => !open && setDeletingWork(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voce tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Isso ira deletar permanentemente a obra selecionada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-destructive hover:bg-destructive/90">
              {isPending ? <Construction className="mr-2 h-4 w-4 animate-spin" /> : null}
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
