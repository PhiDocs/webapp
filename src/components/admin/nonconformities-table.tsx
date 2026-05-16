'use client';

import { useEffect, useMemo, useState, useTransition, type ElementType } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Flag,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TimerReset,
  UserRound,
  XCircle,
} from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type {
  Collaborator,
  CostPrevention,
  Nonconformity,
  NonconformityConclusionValues,
  NonconformityFormValues,
  NonconformityOrigin,
  NonconformityProbability,
  NonconformityReopenValues,
  NonconformityRisk,
  NonconformitySeverity,
  NonconformityStatus,
  NonconformityValidationStatus,
} from '@/lib/types';
import { filterCostsByRelation, formatCurrency, preventionCosts, sumCosts } from '@/lib/cost-prevention';
import { cn } from '@/lib/utils';
import {
  archiveNonconformity,
  concludeNonconformity,
  createNonconformity,
  getNonconformityModuleData,
  reopenNonconformity,
  updateNonconformity,
} from '@/server/nonconformity-actions';
import { getCostPreventionModuleData } from '@/server/cost-prevention-actions';

interface NonconformitiesTableProps {
  companyId: string;
}

type Bundle = {
  collaborators: Collaborator[];
  nonconformities: Nonconformity[];
};

type ActiveView = 'list' | 'kanban' | 'pendings';

type NonconformityPendingItem = {
  id: string;
  type: string;
  item: Nonconformity;
  description: string;
  due: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  action: 'responsible' | 'deadline' | 'corrective' | 'evidence' | 'validate' | 'details';
};

const today = new Date().toISOString().slice(0, 10);
const nowTime = new Date().toTimeString().slice(0, 5);

const emptyForm: NonconformityFormValues = {
  titulo: '',
  descricao: '',
  data_identificacao: today,
  hora_identificacao: nowTime,
  local: '',
  setor: '',
  colaborador_id: '',
  origem: 'observacao_manual',
  origem_id: '',
  inspecao_id: '',
  item_inspecao_id: '',
  gravidade: 'baixa',
  probabilidade: 'baixa',
  nivel_risco: 'baixo',
  risco_associado: '',
  evidencia_url: '',
  foto_url: '',
  responsavel_correcao: '',
  prazo_correcao: '',
  acao_corretiva: '',
  acao_preventiva: '',
  causa_provavel: '',
  causa_raiz: '',
  status: 'aberta',
  data_conclusao: '',
  validado_por: '',
  observacoes: '',
  correcao_realizada: '',
  evidencia_correcao_url: '',
  data_validacao: '',
  validacao_status: 'pendente',
  motivo_reabertura: '',
};

const emptyConclusion: NonconformityConclusionValues = {
  correcao_realizada: '',
  data_conclusao: today,
  evidencia_correcao_url: '',
  validado_por: '',
  observacoes: '',
  data_validacao: '',
  validacao_status: 'pendente',
};

const emptyReopen: NonconformityReopenValues = {
  motivo_reabertura: '',
  acao_corretiva: '',
  prazo_correcao: today,
  responsavel_correcao: '',
};

const statusLabels: Record<NonconformityStatus, string> = {
  aberta: 'Aberta',
  em_analise: 'Em analise',
  em_correcao: 'Em correcao',
  resolvida: 'Resolvida',
  atrasada: 'Atrasada',
  cancelada: 'Cancelada',
};

const severityLabels: Record<NonconformitySeverity, string> = {
  baixa: 'Baixa',
  media: 'Media',
  alta: 'Alta',
  critica: 'Critica',
};

const probabilityLabels: Record<NonconformityProbability, string> = {
  baixa: 'Baixa',
  media: 'Media',
  alta: 'Alta',
};

const riskLabels: Record<NonconformityRisk, string> = {
  baixo: 'Baixo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Critico',
};

const originLabels: Record<NonconformityOrigin, string> = {
  inspecao: 'Inspecao',
  auditoria: 'Auditoria',
  incidente: 'Incidente',
  observacao_manual: 'Observacao manual',
  denuncia_interna: 'Denuncia interna',
  analise_de_risco: 'Analise de risco',
  treinamento: 'Treinamento',
  entrega_de_epi: 'Entrega de EPI',
};

const validationLabels: Record<NonconformityValidationStatus, string> = {
  pendente: 'Pendente',
  validada: 'Validada',
  reprovada: 'Reprovada',
};

function normalize(value?: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function daysBetween(start?: string, end?: string) {
  if (!start) return null;
  const a = new Date(start);
  const b = end ? new Date(end) : new Date();
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.ceil((b.getTime() - a.getTime()) / 86400000);
}

function daysUntil(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - current.getTime()) / 86400000);
}

function dueText(value?: string, status?: NonconformityStatus) {
  const days = daysUntil(value);
  if (!value || days === null) return 'Sem prazo definido';
  if (days < 0 && (!status || isBlockingStatus(status))) return `Atrasada ha ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoje';
  if (days > 0) return `Vence em ${days} dias`;
  return 'Prazo encerrado';
}

function hasEvidence(item: Nonconformity) {
  return Boolean(item.evidencia_url || item.foto_url || item.evidencia_correcao_url);
}

function isDueSoon(item: Nonconformity) {
  const days = daysUntil(item.prazo_correcao);
  return days !== null && days >= 0 && days <= 7 && isBlockingStatus(item.status);
}

function isOverdueNc(item: Nonconformity) {
  const days = daysUntil(item.prazo_correcao);
  return isBlockingStatus(item.status) && ((days !== null && days < 0) || item.status === 'atrasada');
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return false;
  const headers = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const content = [headers.join(';'), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(';'))].join('\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
  return true;
}

function getToastError(error: unknown, fallback = 'Nao foi possivel concluir a acao.') {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.details || record.error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

function uniqueValues<T>(items: T[], getValue: (item: T) => string | undefined | null) {
  return Array.from(new Set(items.map(getValue).map((item) => item?.trim()).filter(Boolean) as string[])).sort();
}

function statusStyle(status: NonconformityStatus) {
  if (status === 'resolvida') return 'bg-[#dff7e5] text-[#18703a]';
  if (status === 'atrasada') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (status === 'em_correcao') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (status === 'em_analise') return 'bg-[#dfe7f5] text-[#334766]';
  if (status === 'cancelada') return 'bg-[#eceef1] text-[#584237]';
  return 'bg-[#fff0d8] text-[#8a4b00]';
}

function severityStyle(severity: NonconformitySeverity | NonconformityRisk) {
  if (severity === 'critica' || severity === 'critico') return 'bg-[#ffdad6] text-[#93000a]';
  if (severity === 'alta' || severity === 'alto') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media' || severity === 'medio') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function isBlockingStatus(status: NonconformityStatus) {
  return !['resolvida', 'cancelada'].includes(status);
}

export function NonconformitiesTable({ companyId }: NonconformitiesTableProps) {
  const [bundle, setBundle] = useState<Bundle>({ collaborators: [], nonconformities: [] });
  const [costs, setCosts] = useState<CostPrevention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [severityFilter, setSeverityFilter] = useState('todas');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [localFilter, setLocalFilter] = useState('todos');
  const [originFilter, setOriginFilter] = useState('todas');
  const [responsibleFilter, setResponsibleFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('todos');
  const [deadlineFilter, setDeadlineFilter] = useState('todos');
  const [riskFilter, setRiskFilter] = useState('todos');
  const [validationFilter, setValidationFilter] = useState('todos');
  const [evidenceFilter, setEvidenceFilter] = useState('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [form, setForm] = useState<NonconformityFormValues>(emptyForm);
  const [editing, setEditing] = useState<Nonconformity | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Nonconformity | null>(null);
  const [concluding, setConcluding] = useState<Nonconformity | null>(null);
  const [conclusionForm, setConclusionForm] = useState<NonconformityConclusionValues>(emptyConclusion);
  const [reopening, setReopening] = useState<Nonconformity | null>(null);
  const [reopenForm, setReopenForm] = useState<NonconformityReopenValues>(emptyReopen);
  const [archiving, setArchiving] = useState<Nonconformity | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [result, costResult] = await Promise.all([
        getNonconformityModuleData(companyId),
        getCostPreventionModuleData(companyId),
      ]);
      if (result.success && result.data) setBundle(result.data as Bundle);
      else toast({ variant: 'destructive', title: 'Erro ao buscar nao conformidades', description: getToastError(result.error) });
      if (costResult.success && costResult.data) setCosts((costResult.data as { costs: CostPrevention[] }).costs || []);
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Nao foi possivel carregar Nao Conformidades.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) void loadData();
  }, [companyId]);

  const sectors = useMemo(() => uniqueValues(bundle.nonconformities, (item) => item.setor), [bundle.nonconformities]);
  const locals = useMemo(() => uniqueValues(bundle.nonconformities, (item) => item.local), [bundle.nonconformities]);
  const responsibles = useMemo(() => uniqueValues(bundle.nonconformities, (item) => item.responsavel_correcao), [bundle.nonconformities]);

  const pendingItems = useMemo<NonconformityPendingItem[]>(() => {
    const output: NonconformityPendingItem[] = [];
    bundle.nonconformities.forEach((item) => {
      if (!isBlockingStatus(item.status) && item.validacao_status !== 'reprovada') return;
      if (!item.responsavel_correcao && isBlockingStatus(item.status)) output.push({ id: `responsible-${item.id}`, type: 'Sem responsavel', item, description: 'Definir responsavel pela correcao.', due: dueText(item.prazo_correcao, item.status), severity: item.gravidade === 'critica' ? 'critica' : 'alta', action: 'responsible' });
      if (!item.prazo_correcao && isBlockingStatus(item.status)) output.push({ id: `deadline-${item.id}`, type: 'Sem prazo', item, description: 'Definir prazo para correcao.', due: 'Sem prazo definido', severity: 'alta', action: 'deadline' });
      if (isOverdueNc(item)) output.push({ id: `overdue-${item.id}`, type: 'Atrasada', item, description: 'Prazo de correcao vencido.', due: dueText(item.prazo_correcao, item.status), severity: 'critica', action: 'details' });
      if (item.gravidade === 'critica' && isBlockingStatus(item.status)) output.push({ id: `critical-${item.id}`, type: 'Critica aberta', item, description: 'NC critica exige prioridade de tratativa.', due: dueText(item.prazo_correcao, item.status), severity: 'critica', action: 'details' });
      if (!item.acao_corretiva && isBlockingStatus(item.status)) output.push({ id: `corrective-${item.id}`, type: 'Sem acao corretiva', item, description: 'Adicionar acao corretiva proposta.', due: dueText(item.prazo_correcao, item.status), severity: 'media', action: 'corrective' });
      if (!hasEvidence(item)) output.push({ id: `evidence-${item.id}`, type: 'Sem evidencia', item, description: 'Anexar evidencia inicial ou de correcao.', due: dueText(item.prazo_correcao, item.status), severity: 'media', action: 'evidence' });
      if (item.status === 'resolvida' && item.validacao_status === 'pendente') output.push({ id: `validation-${item.id}`, type: 'Validacao pendente', item, description: 'Correção concluida aguardando validacao.', due: formatDate(item.data_conclusao), severity: 'media', action: 'validate' });
      if (item.validacao_status === 'reprovada') output.push({ id: `rejected-${item.id}`, type: 'Correcao reprovada', item, description: 'Reabrir ou ajustar a tratativa.', due: dueText(item.prazo_correcao, item.status), severity: 'alta', action: 'details' });
    });
    return output;
  }, [bundle.nonconformities]);

  const filtered = useMemo(() => {
    const query = normalize(search);
    return bundle.nonconformities.filter((item) => {
      const collaborator = item.colaborador?.nome_completo || '';
      const matchesSearch = !query || normalize([item.titulo, item.descricao, collaborator, item.setor, item.local, item.responsavel_correcao, item.origem].join(' ')).includes(query);
      const matchesStatus = statusFilter === 'todos' || item.status === statusFilter;
      const matchesSeverity = severityFilter === 'todas' || item.gravidade === severityFilter;
      const matchesRisk = riskFilter === 'todos' || item.nivel_risco === riskFilter;
      const matchesSector = sectorFilter === 'todos' || item.setor === sectorFilter;
      const matchesLocal = localFilter === 'todos' || item.local === localFilter;
      const matchesOrigin = originFilter === 'todas' || item.origem === originFilter;
      const matchesResponsible = responsibleFilter === 'todos' || item.responsavel_correcao === responsibleFilter;
      const matchesValidation = validationFilter === 'todos' || item.validacao_status === validationFilter;
      const matchesEvidence = evidenceFilter === 'todos' || (evidenceFilter === 'sim' && hasEvidence(item)) || (evidenceFilter === 'nao' && !hasEvidence(item));
      const days = daysUntil(item.prazo_correcao);
      const matchesPeriod = periodFilter === 'todos' || (periodFilter === 'com_colaborador' && Boolean(item.colaborador_id)) || (periodFilter === 'sem_colaborador' && !item.colaborador_id);
      const matchesDeadline = deadlineFilter === 'todos'
        || (deadlineFilter === 'atrasadas' && isOverdueNc(item))
        || (deadlineFilter === '7' && days !== null && days >= 0 && days <= 7)
        || (deadlineFilter === 'sem_prazo' && !item.prazo_correcao);
      return matchesSearch && matchesStatus && matchesSeverity && matchesRisk && matchesSector && matchesLocal && matchesOrigin && matchesResponsible && matchesValidation && matchesEvidence && matchesPeriod && matchesDeadline;
    });
  }, [bundle.nonconformities, deadlineFilter, evidenceFilter, localFilter, originFilter, periodFilter, responsibleFilter, riskFilter, search, sectorFilter, severityFilter, statusFilter, validationFilter]);

  const stats = useMemo(() => [
    { label: 'Total de nao conformidades', value: bundle.nonconformities.length, icon: ClipboardList, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => setStatusFilter('todos') },
    { label: 'Abertas', value: bundle.nonconformities.filter((item) => item.status === 'aberta').length, icon: Flag, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setStatusFilter('aberta') },
    { label: 'Em analise', value: bundle.nonconformities.filter((item) => item.status === 'em_analise').length, icon: TimerReset, className: 'bg-[#dfe7f5] text-[#334766]', onClick: () => setStatusFilter('em_analise') },
    { label: 'Em correcao', value: bundle.nonconformities.filter((item) => item.status === 'em_correcao').length, icon: RefreshCw, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setStatusFilter('em_correcao') },
    { label: 'Resolvidas', value: bundle.nonconformities.filter((item) => item.status === 'resolvida').length, icon: CheckCircle2, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setStatusFilter('resolvida') },
    { label: 'Atrasadas', value: bundle.nonconformities.filter(isOverdueNc).length, icon: AlertTriangle, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setDeadlineFilter('atrasadas') },
    { label: 'Criticas', value: bundle.nonconformities.filter((item) => item.gravidade === 'critica' || item.nivel_risco === 'critico').length, icon: ShieldAlert, className: 'bg-[#ffdad6] text-[#93000a]', onClick: () => setSeverityFilter('critica') },
    { label: 'Sem responsavel', value: bundle.nonconformities.filter((item) => isBlockingStatus(item.status) && !item.responsavel_correcao).length, icon: UserRound, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setResponsibleFilter('todos') },
    { label: 'Vencendo em breve', value: bundle.nonconformities.filter(isDueSoon).length, icon: TimerReset, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setDeadlineFilter('7') },
  ], [bundle.nonconformities]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (item: Nonconformity) => {
    setEditing(item);
    setForm(nonconformityToForm(item));
    setIsFormOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = { ...form, companyId };
      const result = editing ? await updateNonconformity(editing.id, payload) : await createNonconformity(payload);
      if (result.success) {
        toast({ title: editing ? 'Nao conformidade atualizada' : 'Nao conformidade criada', description: 'Registro salvo com sucesso.' });
        setIsFormOpen(false);
        setEditing(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao salvar', description: getToastError(result.error) });
    });
  };

  const handleConclude = () => {
    if (!concluding) return;
    startTransition(async () => {
      const result = await concludeNonconformity(concluding.id, companyId, conclusionForm);
      if (result.success) {
        toast({ title: 'Nao conformidade concluida', description: 'Correcao registrada e status atualizado.' });
        setConcluding(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao concluir', description: getToastError(result.error) });
    });
  };

  const handleReopen = () => {
    if (!reopening) return;
    startTransition(async () => {
      const result = await reopenNonconformity(reopening.id, companyId, reopenForm);
      if (result.success) {
        toast({ title: 'Nao conformidade reaberta', description: 'Novo prazo e acao corretiva foram registrados.' });
        setReopening(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao reabrir', description: getToastError(result.error) });
    });
  };

  const handleArchive = () => {
    if (!archiving) return;
    startTransition(async () => {
      const result = await archiveNonconformity(archiving.id, companyId);
      if (result.success) {
        toast({ title: 'Nao conformidade arquivada', description: 'Registro cancelado e removido da lista ativa.' });
        setArchiving(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao arquivar', description: getToastError(result.error) });
    });
  };

  const prepared = (title: string) => {
    toast({ title, description: 'Estrutura preparada para evolucao sem alterar os registros atuais.' });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('todos');
    setSeverityFilter('todas');
    setSectorFilter('todos');
    setLocalFilter('todos');
    setOriginFilter('todas');
    setResponsibleFilter('todos');
    setPeriodFilter('todos');
    setDeadlineFilter('todos');
    setRiskFilter('todos');
    setValidationFilter('todos');
    setEvidenceFilter('todos');
  };

  const exportReport = () => {
    const success = downloadCsv(`relatorio-nao-conformidades-${Date.now()}.csv`, filtered.map((item) => ({
      titulo: item.titulo,
      descricao: item.descricao,
      origem: originLabels[item.origem],
      setor: item.setor,
      local: item.local,
      colaborador: item.colaborador?.nome_completo || '',
      gravidade: severityLabels[item.gravidade],
      risco: riskLabels[item.nivel_risco],
      responsavel: item.responsavel_correcao || '',
      prazo: formatDate(item.prazo_correcao),
      prazo_status: dueText(item.prazo_correcao, item.status),
      status: statusLabels[item.status],
      validacao: validationLabels[item.validacao_status || 'pendente'],
      evidencia: hasEvidence(item) ? 'Sim' : 'Nao',
    })));
    toast(success ? { title: 'CSV exportado', description: 'Relatorio de nao conformidades gerado com os filtros atuais.' } : { variant: 'destructive', title: 'Nada para exportar', description: 'Nenhum registro encontrado para exportacao.' });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl space-y-3">
          <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Nao Conformidades</h2>
          <p className="text-[1.05rem] leading-8 text-[#4f5f7a]">Registre, acompanhe e corrija desvios de seguranca, procedimentos e boas praticas.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
          <Button onClick={openCreate} className="h-14 rounded-xl bg-[#f46e11] px-7 text-base font-bold text-white shadow-[0_8px_18px_rgba(244,110,17,0.24)] hover:bg-[#e96710]"><Plus className="mr-2 h-5 w-5" />Nova Nao Conformidade</Button>
          <Button variant="outline" onClick={() => setActiveView('kanban')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><BarChart3 className="mr-2 h-5 w-5" />Kanban</Button>
          <Button variant="outline" onClick={() => setActiveView('pendings')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><AlertTriangle className="mr-2 h-5 w-5" />Pendencias</Button>
          <Button variant="outline" onClick={exportReport} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><Download className="mr-2 h-5 w-5" />Exportar Relatorio</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-9">
        {stats.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5f7a]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por titulo, descricao, colaborador, setor, local ou responsavel" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] pl-10" /></div>
          <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={[['todos', 'Todos status'], ...Object.entries(statusLabels)]} />
          <FilterSelect value={severityFilter} onValueChange={setSeverityFilter} options={[['todas', 'Gravidades'], ...Object.entries(severityLabels)]} />
          <Button variant="outline" onClick={() => setShowAdvancedFilters((value) => !value)} className="h-11 rounded-md"><Filter className="mr-2 h-4 w-4" />Filtros avancados</Button>
          <Button variant="ghost" onClick={resetFilters} className="h-11 rounded-md">Limpar filtros</Button>
        </div>
        {showAdvancedFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect value={riskFilter} onValueChange={setRiskFilter} options={[['todos', 'Todos riscos'], ...Object.entries(riskLabels)]} />
            <FilterSelect value={sectorFilter} onValueChange={setSectorFilter} options={[['todos', 'Todos setores'], ...sectors.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={localFilter} onValueChange={setLocalFilter} options={[['todos', 'Todos locais'], ...locals.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={originFilter} onValueChange={setOriginFilter} options={[['todas', 'Origens'], ...Object.entries(originLabels)]} />
            <FilterSelect value={responsibleFilter} onValueChange={setResponsibleFilter} options={[['todos', 'Responsaveis'], ...responsibles.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={periodFilter} onValueChange={setPeriodFilter} options={[['todos', 'Todo periodo'], ['com_colaborador', 'Com colaborador'], ['sem_colaborador', 'Sem colaborador']]} />
            <FilterSelect value={deadlineFilter} onValueChange={setDeadlineFilter} options={[['todos', 'Todos prazos'], ['atrasadas', 'Atrasadas'], ['7', 'Vence em 7 dias'], ['sem_prazo', 'Sem prazo']]} />
            <FilterSelect value={validationFilter} onValueChange={setValidationFilter} options={[['todos', 'Todas validacoes'], ...Object.entries(validationLabels)]} />
            <FilterSelect value={evidenceFilter} onValueChange={setEvidenceFilter} options={[['todos', 'Evidencias: todas'], ['sim', 'Com evidencia'], ['nao', 'Sem evidencia']]} />
          </div>
        )}
      </div>

      <AlertsPanel items={bundle.nonconformities} />

      <div className="flex flex-wrap gap-2">
        <Button variant={activeView === 'list' ? 'default' : 'outline'} onClick={() => setActiveView('list')} className={cn('rounded-md', activeView === 'list' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Lista</Button>
        <Button variant={activeView === 'kanban' ? 'default' : 'outline'} onClick={() => setActiveView('kanban')} className={cn('rounded-md', activeView === 'kanban' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Kanban</Button>
        <Button variant={activeView === 'pendings' ? 'default' : 'outline'} onClick={() => setActiveView('pendings')} className={cn('rounded-md', activeView === 'pendings' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Pendencias</Button>
        <Button variant="outline" onClick={() => prepared('Acoes em lote preparadas')} className="rounded-md">Acoes em lote</Button>
      </div>

      {activeView === 'kanban' ? (
        <NonconformityKanban items={filtered} onView={setViewing} onEdit={openEdit} onConclude={(item) => { setConcluding(item); setConclusionForm({ ...emptyConclusion, validado_por: item.validado_por || '' }); }} onPrepared={prepared} />
      ) : activeView === 'pendings' ? (
        <NonconformityPendingsPanel items={pendingItems} onView={setViewing} onEdit={openEdit} onPrepared={prepared} />
      ) : (
      <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
        <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Lista de nao conformidades</h3><p className="text-sm text-[#4f5f7a]">{filtered.length} registros encontrados</p></div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1380px] border-collapse text-left">
            <thead><tr className="bg-[#fbfbfc] text-sm uppercase tracking-[0.06em] text-[#4f5f7a]"><th className="px-5 py-4 font-bold">Nao Conformidade</th><th className="px-5 py-4 font-bold">Origem</th><th className="px-5 py-4 font-bold">Setor/Local</th><th className="px-5 py-4 font-bold">Gravidade</th><th className="px-5 py-4 font-bold">Responsavel</th><th className="px-5 py-4 font-bold">Prazo</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 font-bold">Validacao</th><th className="px-5 py-4 text-right font-bold">Acoes</th></tr></thead>
            <tbody className="divide-y divide-[#e0c0b1]">
              {isLoading ? Array.from({ length: 4 }).map((_, index) => <LoadingRow key={index} />) : filtered.length === 0 ? <tr><td colSpan={10} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhuma nao conformidade encontrada.</td></tr> : filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#fafbfd]">
                  <td className="px-5 py-5"><p className="font-bold text-[#191c1e]">{item.titulo}</p><p className="max-w-sm truncate text-xs text-[#4f5f7a]">{item.descricao}</p></td>
                  <td className="px-5 py-5 text-[#3f5a88]">{originLabels[item.origem]}</td>
                  <td className="px-5 py-5 text-[#191c1e]"><p>{item.setor}</p><p className="text-xs text-[#4f5f7a]">{item.local}</p></td>
                  <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', severityStyle(item.gravidade))}>{severityLabels[item.gravidade]}</Badge></td>
                  <td className="px-5 py-5 text-[#191c1e]">{item.responsavel_correcao || '-'}</td>
                  <td className="px-5 py-5 text-[#3f5a88]"><p>{formatDate(item.prazo_correcao)}</p><p className="text-xs text-[#4f5f7a]">{dueText(item.prazo_correcao, item.status)}</p></td>
                  <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', statusStyle(item.status))}>{statusLabels[item.status]}</Badge></td>
                  <td className="px-5 py-5"><Badge className="rounded-full bg-[#eef1f5] px-3 py-1 text-[#4f5f7a]">{validationLabels[item.validacao_status || 'pendente']}</Badge></td>
                  <td className="px-5 py-5"><div className="flex justify-end gap-1"><IconButton title="Visualizar" onClick={() => setViewing(item)} icon={Eye} /><IconButton title="Editar" onClick={() => openEdit(item)} icon={Edit} /><NonconformityRowMenu item={item} onView={() => setViewing(item)} onEdit={() => openEdit(item)} onConclude={() => { setConcluding(item); setConclusionForm({ ...emptyConclusion, validado_por: item.validado_por || '' }); }} onReopen={() => { setReopening(item); setReopenForm({ ...emptyReopen, responsavel_correcao: item.responsavel_correcao || '', acao_corretiva: item.acao_corretiva || '' }); }} onArchive={() => setArchiving(item)} onPrepared={prepared} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {filtered.length === 0 ? <p className="rounded-xl border border-dashed border-[#ccb4a6] p-6 text-center text-sm text-[#4f5f7a]">Nenhuma nao conformidade encontrada.</p> : filtered.map((item) => <NonconformityMobileCard key={item.id} item={item} onView={() => setViewing(item)} onEdit={() => openEdit(item)} onConclude={() => { setConcluding(item); setConclusionForm({ ...emptyConclusion, validado_por: item.validado_por || '' }); }} />)}
        </div>
      </div>
      )}

      <DashboardPreparation items={bundle.nonconformities} />
      <ReportsPreparation />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>{editing ? 'Editar Nao Conformidade' : 'Nova Nao Conformidade'}</DialogTitle></DialogHeader><NonconformityForm form={form} setForm={setForm} collaborators={bundle.collaborators} onSubmit={handleSave} isPending={isPending} /></DialogContent></Dialog>
      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>Detalhes da Nao Conformidade</DialogTitle></DialogHeader>{viewing && <NonconformityDetails item={viewing} costs={filterCostsByRelation(costs, 'nao_conformidade_id', viewing.id)} onReopen={() => { setReopening(viewing); setReopenForm({ ...emptyReopen, responsavel_correcao: viewing.responsavel_correcao || '', acao_corretiva: viewing.acao_corretiva || '' }); }} />}</DialogContent></Dialog>
      <Dialog open={!!concluding} onOpenChange={(open) => !open && setConcluding(null)}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Concluir Nao Conformidade</DialogTitle></DialogHeader><ConclusionForm form={conclusionForm} setForm={setConclusionForm} onSubmit={handleConclude} isPending={isPending} /></DialogContent></Dialog>
      <Dialog open={!!reopening} onOpenChange={(open) => !open && setReopening(null)}><DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Reabrir Nao Conformidade</DialogTitle></DialogHeader><ReopenForm form={reopenForm} setForm={setReopenForm} onSubmit={handleReopen} isPending={isPending} /></DialogContent></Dialog>
      <AlertDialog open={!!archiving} onOpenChange={(open) => !open && setArchiving(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Arquivar nao conformidade?</AlertDialogTitle><AlertDialogDescription>O registro sera cancelado e removido da lista ativa, mantendo o historico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleArchive} className="bg-[#ba1a1a] hover:bg-[#93000a]">Arquivar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function nonconformityToForm(item: Nonconformity): NonconformityFormValues {
  return {
    titulo: item.titulo,
    descricao: item.descricao,
    data_identificacao: item.data_identificacao,
    hora_identificacao: item.hora_identificacao || '',
    local: item.local,
    setor: item.setor,
    colaborador_id: item.colaborador_id || '',
    origem: item.origem,
    origem_id: item.origem_id || '',
    inspecao_id: item.inspecao_id || '',
    item_inspecao_id: item.item_inspecao_id || '',
    gravidade: item.gravidade,
    probabilidade: item.probabilidade,
    nivel_risco: item.nivel_risco,
    risco_associado: item.risco_associado || '',
    evidencia_url: item.evidencia_url || '',
    foto_url: item.foto_url || '',
    responsavel_correcao: item.responsavel_correcao || '',
    prazo_correcao: item.prazo_correcao || '',
    acao_corretiva: item.acao_corretiva || '',
    acao_preventiva: item.acao_preventiva || '',
    causa_provavel: item.causa_provavel || '',
    causa_raiz: item.causa_raiz || '',
    status: item.status,
    data_conclusao: item.data_conclusao || '',
    validado_por: item.validado_por || '',
    observacoes: item.observacoes || '',
    correcao_realizada: item.correcao_realizada || '',
    evidencia_correcao_url: item.evidencia_correcao_url || '',
    data_validacao: item.data_validacao || '',
    validacao_status: item.validacao_status || 'pendente',
    motivo_reabertura: item.motivo_reabertura || '',
  };
}

function SummaryCard({ label, value, icon: Icon, className, onClick }: { label: string; value: number; icon: ElementType; className: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#e0c0b1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><p className="text-sm font-medium text-[#4f5f7a]">{label}</p><span className={cn('rounded-lg p-2.5', className)}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-[2rem] font-bold leading-none text-[#191c1e]">{value}</p></button>;
}

function FilterSelect({ value, onValueChange, options }: { value: string; onValueChange: (value: string) => void; options: Array<[string, string]> }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent></Select>;
}

function LoadingRow() {
  return <tr className="animate-pulse">{Array.from({ length: 10 }).map((_, index) => <td key={index} className="px-5 py-5"><div className="h-5 w-28 rounded bg-[#e6e8eb]" /></td>)}</tr>;
}

function IconButton({ title, onClick, icon: Icon, danger }: { title: string; onClick: () => void; icon: ElementType; danger?: boolean }) {
  return <button type="button" title={title} onClick={onClick} className={cn('rounded-lg p-2 hover:bg-[#eceef1]', danger ? 'text-[#ba1a1a]' : 'text-[#4f5f7a]')}><Icon className="h-5 w-5" /></button>;
}

function NonconformityRowMenu({
  item,
  onView,
  onEdit,
  onConclude,
  onReopen,
  onArchive,
  onPrepared,
}: {
  item: Nonconformity;
  onView: () => void;
  onEdit: () => void;
  onConclude: () => void;
  onReopen: () => void;
  onArchive: () => void;
  onPrepared: (title: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className="rounded-lg p-2 text-[#4f5f7a] hover:bg-[#eceef1]" title="Mais acoes"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared(`Mover status de ${item.titulo}`)}><RefreshCw className="mr-2 h-4 w-4" />Mover status</DropdownMenuItem>
        <DropdownMenuItem onClick={onConclude}><CheckCircle2 className="mr-2 h-4 w-4" />Concluir</DropdownMenuItem>
        <DropdownMenuItem onClick={onReopen}><TimerReset className="mr-2 h-4 w-4" />Reabrir</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared('Anexo de evidencia preparado')}><FileText className="mr-2 h-4 w-4" />Anexar evidencia</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared('Relatorio individual preparado')}><FileText className="mr-2 h-4 w-4" />Gerar relatorio</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onArchive} className="text-[#ba1a1a]"><Archive className="mr-2 h-4 w-4" />Arquivar/cancelar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function NonconformityMobileCard({ item, onView, onEdit, onConclude }: { item: Nonconformity; onView: () => void; onEdit: () => void; onConclude: () => void }) {
  return (
    <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-bold text-[#191c1e]">{item.titulo}</p><p className="text-sm text-[#4f5f7a]">{originLabels[item.origem]} - {item.setor}</p></div>
        <Badge className={cn('rounded-full px-3 py-1', statusStyle(item.status))}>{statusLabels[item.status]}</Badge>
      </div>
      <p className="mt-3 line-clamp-2 text-sm text-[#4f5f7a]">{item.descricao}</p>
      <div className="mt-4 grid gap-2 text-sm">
        <p><span className="text-[#4f5f7a]">Local:</span> {item.local}</p>
        <p><span className="text-[#4f5f7a]">Responsavel:</span> {item.responsavel_correcao || '-'}</p>
        <p><span className="text-[#4f5f7a]">Prazo:</span> {dueText(item.prazo_correcao, item.status)}</p>
        <p><span className="text-[#4f5f7a]">Validacao:</span> {validationLabels[item.validacao_status || 'pendente']}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2"><Button variant="outline" onClick={onView}>Ver</Button><Button variant="outline" onClick={onEdit}>Editar</Button><Button variant="outline" onClick={onConclude}>Concluir</Button></div>
    </div>
  );
}

function NonconformityKanban({ items, onView, onEdit, onConclude, onPrepared }: { items: Nonconformity[]; onView: (item: Nonconformity) => void; onEdit: (item: Nonconformity) => void; onConclude: (item: Nonconformity) => void; onPrepared: (title: string) => void }) {
  const columns: NonconformityStatus[] = ['aberta', 'em_analise', 'em_correcao', 'resolvida', 'atrasada'];
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {columns.map((status) => {
        const columnItems = items.filter((item) => item.status === status);
        return (
          <div key={status} className="rounded-xl border border-[#e0c0b1] bg-white">
            <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-4 py-3"><p className="font-bold text-[#191c1e]">{statusLabels[status]}</p><p className="text-xs text-[#4f5f7a]">{columnItems.length} registros</p></div>
            <div className="space-y-3 p-3">
              {columnItems.length === 0 ? <p className="rounded-lg border border-dashed border-[#ccb4a6] p-4 text-sm text-[#4f5f7a]">Sem itens nesta coluna.</p> : columnItems.map((item) => (
                <div key={item.id} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3">
                  <div className="flex items-start justify-between gap-2"><p className="font-bold text-[#191c1e]">{item.titulo}</p><Badge className={cn('rounded-full px-2 py-1 text-xs', severityStyle(item.gravidade))}>{severityLabels[item.gravidade]}</Badge></div>
                  <p className="mt-2 text-xs text-[#4f5f7a]">{item.setor} - {item.local}</p>
                  <p className="mt-2 text-xs text-[#4f5f7a]">Resp.: {item.responsavel_correcao || '-'}</p>
                  <p className="mt-2 text-xs text-[#4f5f7a]">Prazo: {dueText(item.prazo_correcao, item.status)}</p>
                  <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => onView(item)}>Ver</Button><Button size="sm" variant="outline" onClick={() => onEdit(item)}>Editar</Button>{status !== 'resolvida' ? <Button size="sm" onClick={() => onConclude(item)}>Concluir</Button> : <Button size="sm" variant="outline" onClick={() => onPrepared('Validacao de correcao preparada')}>Validar</Button>}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function pendingSeverityClass(severity: NonconformityPendingItem['severity']) {
  if (severity === 'critica') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (severity === 'alta') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function NonconformityPendingsPanel({ items, onView, onEdit, onPrepared }: { items: NonconformityPendingItem[]; onView: (item: Nonconformity) => void; onEdit: (item: Nonconformity) => void; onPrepared: (title: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
      <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Pendencias de Nao Conformidades</h3><p className="text-sm text-[#4f5f7a]">{items.length} pendencias encontradas para tratar responsaveis, prazos, evidencias e validacoes</p></div>
      <div className="divide-y divide-[#e0c0b1]">
        {items.length === 0 ? <p className="p-8 text-center text-sm text-[#4f5f7a]">Nenhuma pendencia de nao conformidade encontrada.</p> : items.map((pending) => (
          <div key={pending.id} className="grid gap-3 p-5 lg:grid-cols-[0.8fr_1.2fr_0.8fr_0.7fr_0.7fr_1fr] lg:items-center">
            <p className="font-bold text-[#191c1e]">{pending.type}</p>
            <div><p className="font-semibold">{pending.item.titulo}</p><p className="text-xs text-[#4f5f7a]">{pending.item.setor} - {pending.item.local}</p></div>
            <p className="text-sm text-[#4f5f7a]">{pending.item.responsavel_correcao || 'Sem responsavel'}</p>
            <p className="text-sm text-[#4f5f7a]">{pending.due}</p>
            <Badge className={cn('w-fit rounded-full px-3 py-1', pendingSeverityClass(pending.severity))}>{pending.severity}</Badge>
            <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => pending.action === 'details' ? onView(pending.item) : onEdit(pending.item)}>{pending.action === 'validate' ? 'Validar' : pending.action === 'evidence' ? 'Anexar evidencia' : pending.action === 'corrective' ? 'Adicionar acao' : pending.action === 'deadline' ? 'Definir prazo' : pending.action === 'responsible' ? 'Definir responsavel' : 'Ver detalhes'}</Button><Button size="sm" variant="outline" onClick={() => onView(pending.item)}>Ver</Button><Button size="sm" variant="outline" onClick={() => onPrepared('Acao rapida preparada')}>Ajustar</Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('space-y-2 text-sm font-semibold text-[#191c1e]', className)}><span>{label}</span>{children}</label>;
}

function NonconformityForm({ form, setForm, collaborators, onSubmit, isPending }: { form: NonconformityFormValues; setForm: (value: NonconformityFormValues) => void; collaborators: Collaborator[]; onSubmit: () => void; isPending: boolean }) {
  const update = <K extends keyof NonconformityFormValues>(key: K, value: NonconformityFormValues[K]) => setForm({ ...form, [key]: value });
  return <div className="space-y-5"><div className="grid gap-2 sm:grid-cols-6">{['1. Problema', '2. Local', '3. Risco', '4. Tratativa', '5. Evidencias', '6. Revisao'].map((step) => <div key={step} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] px-3 py-2 text-center text-xs font-bold text-[#4f5f7a]">{step}</div>)}</div><FormSection title="Descreva o problema encontrado" icon={ClipboardList}><Field label="Descricao simples do problema" className="md:col-span-2"><Textarea value={form.descricao} onChange={(e) => update('descricao', e.target.value)} className="min-h-[110px] border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Titulo"><Input value={form.titulo} onChange={(e) => update('titulo', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Origem"><Select value={form.origem} onValueChange={(value) => update('origem', value as NonconformityOrigin)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(originLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Data de identificacao"><Input type="date" value={form.data_identificacao} onChange={(e) => update('data_identificacao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Hora"><Input type="time" value={form.hora_identificacao || ''} onChange={(e) => update('hora_identificacao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></FormSection><FormSection title="Onde aconteceu" icon={UserRound}><Field label="Local"><Input value={form.local} onChange={(e) => update('local', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Setor"><Input value={form.setor} onChange={(e) => update('setor', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Colaborador envolvido"><Select value={form.colaborador_id || 'none'} onValueChange={(value) => update('colaborador_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem colaborador</SelectItem>{collaborators.map((collaborator) => <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.nome_completo}</SelectItem>)}</SelectContent></Select></Field><Field label="Risco associado"><Input value={form.risco_associado || ''} onChange={(e) => update('risco_associado', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></FormSection><FormSection title="Classificacao" icon={ShieldAlert}><Field label="Gravidade"><Select value={form.gravidade} onValueChange={(value) => update('gravidade', value as NonconformitySeverity)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(severityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Probabilidade"><Select value={form.probabilidade} onValueChange={(value) => update('probabilidade', value as NonconformityProbability)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(probabilityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Nivel de risco"><Select value={form.nivel_risco} onValueChange={(value) => update('nivel_risco', value as NonconformityRisk)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(riskLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => update('status', value as NonconformityStatus)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Causa provavel"><Textarea value={form.causa_provavel || ''} onChange={(e) => update('causa_provavel', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Causa raiz"><Textarea value={form.causa_raiz || ''} onChange={(e) => update('causa_raiz', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></FormSection><FormSection title="Tratativa" icon={CheckCircle2}><Field label="Responsavel pela correcao"><Input value={form.responsavel_correcao || ''} onChange={(e) => update('responsavel_correcao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Prazo"><Input type="date" value={form.prazo_correcao || ''} onChange={(e) => update('prazo_correcao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Acao corretiva" className="md:col-span-2"><Textarea value={form.acao_corretiva || ''} onChange={(e) => update('acao_corretiva', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Acao preventiva" className="md:col-span-2"><Textarea value={form.acao_preventiva || ''} onChange={(e) => update('acao_preventiva', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></FormSection><FormSection title="Evidencias" icon={FileText}><Field label="Foto inicial URL"><Input value={form.foto_url || ''} onChange={(e) => update('foto_url', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Anexo/Evidencia URL"><Input value={form.evidencia_url || ''} onChange={(e) => update('evidencia_url', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Observacoes" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(e) => update('observacoes', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></FormSection><div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4"><div className="grid gap-3 md:grid-cols-4"><Metric label="Titulo" value={form.titulo || 'Nao informado'} /><Metric label="Setor/local" value={`${form.setor || '-'} / ${form.local || '-'}`} /><Metric label="Gravidade" value={severityLabels[form.gravidade]} /><Metric label="Prazo" value={formatDate(form.prazo_correcao)} /></div></div><div className="flex flex-wrap justify-between gap-3 border-t border-[#e0c0b1] pt-5"><div className="flex flex-wrap gap-2"><Button type="button" disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Melhorar descricao com IA</Button><Button type="button" disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Sugerir plano com IA</Button></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={onSubmit} disabled={isPending}>Salvar e abrir detalhes</Button><Button variant="outline" onClick={onSubmit} disabled={isPending}>Salvar e criar outra</Button><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></div></div></div>;
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: ElementType; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white"><div className="flex items-center gap-2 border-b border-[#e0c0b1] bg-[#eef1f5] px-4 py-3"><Icon className="h-5 w-5 text-[#9e4300]" /><h3 className="font-bold text-[#191c1e]">{title}</h3></div><div className="grid gap-4 p-4 md:grid-cols-2">{children}</div></section>;
}

function ConclusionForm({ form, setForm, onSubmit, isPending }: { form: NonconformityConclusionValues; setForm: (value: NonconformityConclusionValues) => void; onSubmit: () => void; isPending: boolean }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Descricao da correcao realizada" className="md:col-span-2"><Textarea value={form.correcao_realizada} onChange={(e) => setForm({ ...form, correcao_realizada: e.target.value })} /></Field><Field label="Data da conclusao"><Input type="date" value={form.data_conclusao} onChange={(e) => setForm({ ...form, data_conclusao: e.target.value })} /></Field><Field label="Responsavel pela validacao"><Input value={form.validado_por || ''} onChange={(e) => setForm({ ...form, validado_por: e.target.value })} /></Field><Field label="Evidencia da correcao"><Input value={form.evidencia_correcao_url || ''} onChange={(e) => setForm({ ...form, evidencia_correcao_url: e.target.value })} /></Field><Field label="Status validacao"><Select value={form.validacao_status} onValueChange={(value) => setForm({ ...form, validacao_status: value as NonconformityValidationStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(validationLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Observacoes finais" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Concluir</Button></div></div>;
}

function ReopenForm({ form, setForm, onSubmit, isPending }: { form: NonconformityReopenValues; setForm: (value: NonconformityReopenValues) => void; onSubmit: () => void; isPending: boolean }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Motivo da reabertura" className="md:col-span-2"><Textarea value={form.motivo_reabertura} onChange={(e) => setForm({ ...form, motivo_reabertura: e.target.value })} /></Field><Field label="Nova acao corretiva" className="md:col-span-2"><Textarea value={form.acao_corretiva} onChange={(e) => setForm({ ...form, acao_corretiva: e.target.value })} /></Field><Field label="Novo prazo"><Input type="date" value={form.prazo_correcao} onChange={(e) => setForm({ ...form, prazo_correcao: e.target.value })} /></Field><Field label="Responsavel"><Input value={form.responsavel_correcao} onChange={(e) => setForm({ ...form, responsavel_correcao: e.target.value })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Reabrir</Button></div></div>;
}

function NonconformityDetails({ item, costs, onReopen }: { item: Nonconformity; costs: CostPrevention[]; onReopen: () => void }) {
  const openDays = daysBetween(item.data_identificacao, item.data_conclusao);
  const remaining = daysUntil(item.prazo_correcao);
  const deadlineStatus = !item.prazo_correcao ? 'Sem prazo' : remaining !== null && remaining < 0 && isBlockingStatus(item.status) ? 'Atrasado' : 'Dentro do prazo';
  return <div className="space-y-5"><div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="text-2xl font-bold text-[#191c1e]">{item.titulo}</h3><p className="mt-2 text-[#4f5f7a]">{item.descricao}</p></div><div className="flex flex-wrap gap-2"><Badge className={cn('rounded-full px-3 py-1 uppercase', statusStyle(item.status))}>{statusLabels[item.status]}</Badge><Badge className={cn('rounded-full px-3 py-1 uppercase', severityStyle(item.nivel_risco))}>{riskLabels[item.nivel_risco]}</Badge></div></div></div><div className="grid gap-3 sm:grid-cols-4"><Metric label="Dias em aberto" value={String(openDays ?? '-')} /><Metric label="Prazo restante" value={remaining === null ? '-' : `${remaining} dias`} /><Metric label="Status do prazo" value={deadlineStatus} /><Metric label="Prioridade" value={item.gravidade === 'critica' || item.nivel_risco === 'critico' ? 'Critica' : severityLabels[item.gravidade]} /></div><div className="grid gap-4 lg:grid-cols-3"><DetailBlock title="Identificacao" items={[['Data', formatDate(item.data_identificacao)], ['Hora', item.hora_identificacao || '-'], ['Local', item.local], ['Setor', item.setor], ['Origem', originLabels[item.origem]], ['Colaborador', item.colaborador?.nome_completo || '-']]} /><DetailBlock title="Tratativa" items={[['Responsavel', item.responsavel_correcao || '-'], ['Prazo', formatDate(item.prazo_correcao)], ['Acao corretiva', item.acao_corretiva || '-'], ['Acao preventiva', item.acao_preventiva || '-'], ['Causa provavel', item.causa_provavel || '-'], ['Causa raiz', item.causa_raiz || '-']]} /><DetailBlock title="Conclusao e validacao" items={[['Correcao realizada', item.correcao_realizada || '-'], ['Data conclusao', formatDate(item.data_conclusao)], ['Validado por', item.validado_por || '-'], ['Validacao', validationLabels[item.validacao_status || 'pendente']], ['Evidencia', item.evidencia_correcao_url || item.evidencia_url || '-'], ['Observacoes', item.observacoes || '-']]} /></div><div className="grid gap-4 lg:grid-cols-2"><DetailBlock title="Custos da Correcao" items={[['Custos registrados', String(costs.length)], ['Valor total da correcao', formatCurrency(sumCosts(costs))], ['Responsavel', item.responsavel_correcao || '-'], ['Prazo', formatDate(item.prazo_correcao)], ['Comprovantes', String(costs.filter((cost) => cost.comprovante_url).length)], ['Comparacao com custo preventivo', formatCurrency(sumCosts(preventionCosts(costs)))]]} /><ListBlock title="Custos vinculados" empty="Nenhum custo vinculado a esta nao conformidade." items={costs.map((cost) => `${formatDate(cost.data_custo)} - ${formatCurrency(cost.valor)} - ${cost.descricao}`)} /></div><div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><h4 className="mb-3 font-bold text-[#191c1e]">Historico de alteracoes</h4>{!item.historico?.length ? <p className="text-sm text-[#4f5f7a]">Sem historico registrado.</p> : <div className="space-y-2">{item.historico.map((entry) => <div key={`${entry.at}-${entry.action}`} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm"><p className="font-bold text-[#191c1e]">{entry.action} - {new Date(entry.at).toLocaleString('pt-BR')}</p><p className="text-[#4f5f7a]">{entry.description || '-'}</p></div>)}</div>}</div><div className="flex flex-wrap gap-3"><Button disabled className="bg-[#f46e11] text-white disabled:opacity-70"><FileText className="mr-2 h-4 w-4" />Gerar relatorio</Button><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Melhorar descricao com IA</Button><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar plano de acao com IA</Button><Button onClick={onReopen} variant="outline"><RefreshCw className="mr-2 h-4 w-4" />Reabrir</Button></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-4"><p className="text-xs font-bold uppercase text-[#4f5f7a]">{label}</p><p className="mt-2 text-xl font-bold text-[#191c1e]">{value}</p></div>;
}

function DetailBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><h4 className="mb-4 font-bold text-[#191c1e]">{title}</h4><div className="space-y-3">{items.map(([label, value]) => <div key={label}><p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p><p className="text-sm text-[#191c1e]">{value}</p></div>)}</div></section>;
}

function ListBlock({ title, empty, items }: { title: string; empty: string; items: string[] }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><h4 className="mb-4 font-bold text-[#191c1e]">{title}</h4>{items.length ? <div className="space-y-2">{items.map((item) => <p key={item} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm text-[#191c1e]">{item}</p>)}</div> : <p className="text-sm text-[#4f5f7a]">{empty}</p>}</section>;
}

function AlertsPanel({ items }: { items: Nonconformity[] }) {
  const alerts = useMemo(() => {
    const output: string[] = [];
    items.filter((item) => isBlockingStatus(item.status) && item.gravidade === 'critica').slice(0, 2).forEach((item) => output.push(`Nao conformidade critica aberta: ${item.titulo}.`));
    items.filter((item) => item.status === 'atrasada').slice(0, 2).forEach((item) => output.push(`Nao conformidade vencida: ${item.titulo}.`));
    items.filter((item) => !item.responsavel_correcao && isBlockingStatus(item.status)).slice(0, 2).forEach((item) => output.push(`Sem responsavel pela correcao: ${item.titulo}.`));
    items.filter((item) => !item.acao_corretiva && isBlockingStatus(item.status)).slice(0, 2).forEach((item) => output.push(`Sem acao corretiva: ${item.titulo}.`));
    items.filter((item) => !item.prazo_correcao && isBlockingStatus(item.status)).slice(0, 2).forEach((item) => output.push(`Sem prazo definido: ${item.titulo}.`));
    items.filter((item) => item.status === 'resolvida' && item.validacao_status === 'pendente').slice(0, 2).forEach((item) => output.push(`Correcao pendente de validacao: ${item.titulo}.`));
    return output.slice(0, 6);
  }, [items]);
  if (alerts.length === 0) return null;
  return <div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f1] p-4"><div className="mb-3 flex items-center gap-2 font-bold text-[#8a4b00]"><AlertTriangle className="h-5 w-5" />Alertas importantes</div><div className="grid gap-2 md:grid-cols-2">{alerts.map((alert) => <p key={alert} className="rounded-lg bg-white p-3 text-sm text-[#521f00]">{alert}</p>)}</div></div>;
}

function DashboardPreparation({ items }: { items: Nonconformity[] }) {
  const blocks = [
    ['Por status', `${new Set(items.map((item) => item.status)).size} status ativos`],
    ['Por gravidade', `${items.filter((item) => item.gravidade === 'critica').length} criticas`],
    ['Por origem', `${new Set(items.map((item) => item.origem)).size} origens`],
    ['Tempo medio', 'Preparado para calculo'],
  ];
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#9e4300]" /><h3 className="text-lg font-bold text-[#191c1e]">Dashboard do modulo</h3></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{blocks.map(([title, value]) => <div key={title} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4"><p className="text-sm font-bold text-[#191c1e]">{title}</p><p className="mt-1 text-sm text-[#4f5f7a]">{value}</p></div>)}</div></div>;
}

function ReportsPreparation() {
  const reports = ['Por periodo', 'Abertas', 'Atrasadas', 'Resolvidas', 'Por setor', 'Por gravidade', 'Por origem', 'Por responsavel', 'Tempo medio de resolucao', 'Ranking de causas', 'Historico por colaborador'];
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex items-center justify-between gap-4"><div><h3 className="text-lg font-bold text-[#191c1e]">Relatorios do modulo</h3><p className="text-sm text-[#4f5f7a]">Area preparada para relatorios de nao conformidades.</p></div><Button disabled variant="outline"><FileText className="mr-2 h-4 w-4" />Gerar relatorio</Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{reports.map((report) => <div key={report} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm font-semibold text-[#191c1e]">{report}</div>)}</div></div>;
}
