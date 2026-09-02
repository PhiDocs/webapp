'use client';

import React, { useEffect, useMemo, useState, useTransition } from 'react';
import { AlertTriangle, Edit, Loader2, PlusCircle, ShieldCheck, Trash2, UserCog2, Waypoints } from 'lucide-react';
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
import { getJobRoles, createJobRole, updateJobRole, deleteJobRole } from '@/server/job-role-actions';
import { JobRoleForm } from '@/components/admin/job-role-form';
import type { JobRole, JobRoleFormValues } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface JobRolesTableProps {
  companyId: string;
}

const PAGE_SIZE = 4;

const insightCards = [
  {
    icon: ShieldCheck,
    title: 'Conformidade Total',
    description: 'Todos os cargos possuem as certificacoes minimas exigidas pelo Ministerio do Trabalho.',
  },
  {
    icon: UserCog2,
    title: 'Historico de Alteracoes',
    description: 'Acompanhe quem modificou as responsabilidades de cada cargo nos ultimos 90 dias.',
  },
  {
    icon: Waypoints,
    title: 'Sincronizacao ERP',
    description: 'Os dados de cargos estao integrados com o sistema de folha de pagamento corporativo.',
  },
];

function getRoleSubtitle(role: JobRole) {
  const name = role.name.toLowerCase();

  if (name.includes('eletric')) return 'Nivel Senior';
  if (name.includes('seguranca')) return 'Coordenacao de Campo';
  if (name.includes('guindaste')) return 'Logistica Pesada';
  if (name.includes('mestre')) return 'Gestao Civil';

  return 'Funcao Operacional';
}

function getResponsibilityItems(responsibilities: string) {
  return responsibilities
    .split(/\r?\n|;/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getCertificateTone(certificate: string) {
  const value = certificate.toLowerCase();

  if (value.includes('risco') || value.includes('venc')) {
    return 'bg-[#f7f5f0] text-[#7a1f1f]';
  }

  return 'bg-[#dde9e2] text-[#1b5e3f]';
}

export function JobRolesTable({ companyId }: JobRolesTableProps) {
  const [jobRoles, setJobRoles] = useState<JobRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingJobRole, setEditingJobRole] = useState<JobRole | null>(null);
  const [deletingJobRole, setDeletingJobRole] = useState<JobRole | null>(null);
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    const result = await getJobRoles(companyId);

    if (result.success && result.data) {
      setJobRoles(result.data);
    } else {
      toast({ variant: 'destructive', title: 'Erro ao buscar cargos', description: result.error });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    if (companyId) {
      void fetchData();
    }
  }, [companyId]);

  // A pagina e limitada durante o render. Antes um effect corrigia o estado
  // depois, o que custava um render extra a cada filtro digitado.
  const totalPages = Math.max(1, Math.ceil(jobRoles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  const pagedRoles = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return jobRoles.slice(start, start + PAGE_SIZE);
  }, [jobRoles, currentPage]);

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
        toast({ variant: 'destructive', title: 'Erro ao salvar', description: result.error });
      }
    });
  };

  const handleDelete = () => {
    if (!deletingJobRole) return;

    startTransition(async () => {
      const result = await deleteJobRole(deletingJobRole.id, companyId);
      if (result.success) {
        toast({ title: 'Cargo excluido com sucesso!' });
        setJobRoles((current) => current.filter((role) => role.id !== deletingJobRole.id));
        setDeletingJobRole(null);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao excluir', description: result.error });
      }
    });
  };

  const showingCount = isLoading ? 0 : pagedRoles.length;

  return (
    <Dialog
      open={isFormOpen}
      onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingJobRole(null);
        }
      }}
    >
      <div className="space-y-10">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-4xl">
            <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#111111]">Cargos</h2>
            <p className="mt-3 text-[1.1rem] leading-10 text-[#6e6a61]">
              Gerencie as funcoes operacionais, responsabilidades de seguranca e certificados obrigatorios para conformidade tecnica em campo.
            </p>
          </div>

          <DialogTrigger asChild>
            <Button
              onClick={() => setEditingJobRole(null)}
              className="h-16 w-full rounded-xl bg-[#7a1f1f] px-8 text-lg font-bold text-white shadow-[0_8px_18px_rgba(158,67,0,0.24)] hover:bg-[#7a1f1f] xl:w-auto"
            >
              <PlusCircle className="mr-3 h-5 w-5" />
              Novo Cargo
            </Button>
          </DialogTrigger>
        </div>

        <div className="flex items-start gap-4 rounded-xl border-l-4 border-[#7a1f1f] bg-[#f7f5f0] px-6 py-6">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-[#7a1f1f]" />
          <div>
            <h3 className="text-[1.1rem] font-bold text-[#8a5a00]">Sugestao da IA PhiDocs</h3>
            <p className="mt-1 text-base leading-8 text-[#111111]">
              Identificamos que 3 cargos requerem atualizacao de certificados NR-10 devido as novas normas regulamentadoras publicadas este mes.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-[#cfcbc0] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="border-b border-[#cfcbc0] bg-[#f2f1ed]">
                <tr>
                  <th className="px-8 py-5 font-code text-[0.95rem] uppercase tracking-[0.14em] text-[#6e6a61]">Nome do Cargo</th>
                  <th className="px-8 py-5 font-code text-[0.95rem] uppercase tracking-[0.14em] text-[#6e6a61]">Responsabilidades</th>
                  <th className="px-8 py-5 font-code text-[0.95rem] uppercase tracking-[0.14em] text-[#6e6a61]">Certificados</th>
                  <th className="px-8 py-5 text-right font-code text-[0.95rem] uppercase tracking-[0.14em] text-[#6e6a61]">Acoes</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-[#cfcbc0]">
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center">
                      <Loader2 className="mx-auto h-7 w-7 animate-spin text-[#6e6a61]" />
                    </td>
                  </tr>
                ) : pagedRoles.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-16 text-center text-base text-[#6e6a61]">
                      Nenhum cargo encontrado.
                    </td>
                  </tr>
                ) : (
                  pagedRoles.map((role) => {
                    const responsibilities = getResponsibilityItems(role.responsibilities);
                    const certificates = role.requiredCertificates?.filter(Boolean) ?? [];

                    return (
                      <tr key={role.id} className="transition-colors hover:bg-[#faf9f5]">
                        <td className="px-8 py-6 align-top">
                          <div className="text-[1rem] font-bold leading-9 text-[#111111]">{role.name}</div>
                          <div className="mt-1 text-[0.95rem] text-[#6e6a61]">{getRoleSubtitle(role)}</div>
                        </td>

                        <td className="px-8 py-6 align-top">
                          {responsibilities.length > 0 ? (
                            <ul className="space-y-2 pl-5 text-[0.95rem] leading-8 text-[#6e6a61]">
                              {responsibilities.map((item, index) => (
                                <li key={`${role.id}-responsibility-${index}`} className="list-disc">
                                  {item}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-[0.95rem] italic text-[#6e6a61]">Nao preenchido</span>
                          )}
                        </td>

                        <td className="px-8 py-6 align-top">
                          <div className="flex flex-wrap gap-2">
                            {certificates.length > 0 ? (
                              certificates.map((certificate, index) => (
                                <span
                                  key={`${role.id}-certificate-${index}`}
                                  className={cn(
                                    'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.02em]',
                                    getCertificateTone(certificate)
                                  )}
                                >
                                  {certificate}
                                </span>
                              ))
                            ) : (
                              <span className="text-[0.95rem] italic text-[#6e6a61]">Nao preenchido</span>
                            )}
                          </div>
                        </td>

                        <td className="px-8 py-6 align-top">
                          <div className="flex justify-end gap-3">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingJobRole(role);
                                setIsFormOpen(true);
                              }}
                              className="rounded-lg p-2 text-[#6e6a61] transition-colors hover:bg-[#ebe9e3] hover:text-[#111111]"
                              title="Editar"
                            >
                              <Edit className="h-5 w-5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingJobRole(role)}
                              className="rounded-lg p-2 text-[#7a1f1f] transition-colors hover:bg-[#f6edec]"
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

          <div className="flex flex-col gap-4 border-t border-[#cfcbc0] bg-[#f2f1ed] px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-[0.95rem] text-[#6e6a61]">
              Mostrando {showingCount} de {jobRoles.length} cargos registrados
            </span>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
                className="h-12 rounded-lg border-[#cfcbc0] bg-white px-5 text-base text-[#6e6a61] hover:bg-[#f7f5f0]"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}
                disabled={currentPage >= totalPages - 1}
                className="h-12 rounded-lg border-[#cfcbc0] bg-white px-5 text-base font-semibold text-[#111111] hover:bg-[#f7f5f0]"
              >
                Proximo
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {insightCards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="rounded-xl border border-[#cfcbc0] bg-white p-6">
                <Icon className="h-9 w-9 text-[#7a1f1f]" />
                <h3 className="mt-5 text-[1.05rem] font-bold text-[#111111]">{card.title}</h3>
                <p className="mt-4 text-[0.95rem] leading-8 text-[#6e6a61]">{card.description}</p>
              </div>
            );
          })}
        </div>

        <footer className="border-t border-[#cfcbc0] pt-8 text-center">
          <p className="text-sm tracking-[0.05em] text-[#6e6a61]">PhiDocs v2.4.0 — AI Powered Safety Compliance Monitoring</p>
        </footer>
      </div>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingJobRole ? 'Editar Cargo' : 'Novo Cargo'}</DialogTitle>
        </DialogHeader>
        <JobRoleForm onSubmit={handleFormSubmit} defaultValues={editingJobRole} isPending={isPending} />
      </DialogContent>

      <AlertDialog open={!!deletingJobRole} onOpenChange={(open) => !open && setDeletingJobRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Voce tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Isso ira deletar permanentemente o cargo selecionado.
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
