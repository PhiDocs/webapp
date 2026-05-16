'use client';

import { useEffect, useMemo, useState, useTransition, type ElementType } from 'react';
import {
  AlertTriangle,
  Archive,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  Flag,
  Gauge,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
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
  ChecklistTemplate,
  ChecklistTemplateItem,
  Collaborator,
  CostPrevention,
  Inspection,
  InspectionFormValues,
  InspectionItem,
  InspectionItemAnswer,
  InspectionItemFormValues,
  InspectionItemStatus,
  InspectionRisk,
  InspectionStatus,
} from '@/lib/types';
import { filterCostsByRelation, formatCurrency, preventionCosts, sumCosts } from '@/lib/cost-prevention';
import { cn } from '@/lib/utils';
import {
  archiveInspection,
  createInspection,
  getInspectionModuleData,
  saveInspectionItems,
  updateInspection,
} from '@/server/inspection-actions';
import { createNonconformity } from '@/server/nonconformity-actions';
import { getCostPreventionModuleData } from '@/server/cost-prevention-actions';

interface InspectionsTableProps {
  companyId: string;
}

type Bundle = {
  collaborators: Collaborator[];
  inspections: Inspection[];
  templates: ChecklistTemplate[];
  templateItems: ChecklistTemplateItem[];
};

type ActiveView = 'list' | 'pendings' | 'templates';

type InspectionPendingItem = {
  id: string;
  type: string;
  inspection: Inspection;
  item?: InspectionItem;
  description: string;
  due: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  action: 'continue' | 'responsible' | 'deadline' | 'nc' | 'details';
};

const today = new Date().toISOString().slice(0, 10);
const nowTime = new Date().toTimeString().slice(0, 5);

const emptyInspection: InspectionFormValues = {
  titulo: '',
  tipo: 'Inspecao de area',
  descricao: '',
  data_inspecao: today,
  hora_inspecao: nowTime,
  local: '',
  setor: '',
  responsavel_inspecao: '',
  status: 'aberta',
  grau_risco: 'baixo',
  observacoes_gerais: '',
  plano_acao_geral: '',
  prazo_correcao: '',
  responsavel_correcao: '',
  checklist_modelo_id: '',
  colaboradores_vinculados: [],
};

const statusLabels: Record<InspectionStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluida',
  atrasada: 'Atrasada',
  cancelada: 'Cancelada',
};

const riskLabels: Record<InspectionRisk, string> = {
  baixo: 'Baixo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Critico',
};

const answerLabels: Record<InspectionItemAnswer, string> = {
  conforme: 'Conforme',
  nao_conforme: 'Nao conforme',
  nao_se_aplica: 'Nao se aplica',
  nao_verificado: 'Nao verificado',
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

function statusStyle(status: InspectionStatus) {
  if (status === 'concluida') return 'bg-[#dff7e5] text-[#18703a]';
  if (status === 'em_andamento') return 'bg-[#dfe7f5] text-[#334766]';
  if (status === 'atrasada') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (status === 'cancelada') return 'bg-[#eceef1] text-[#584237]';
  return 'bg-[#fff0d8] text-[#8a4b00]';
}

function riskStyle(risk: InspectionRisk) {
  if (risk === 'critico') return 'bg-[#ffdad6] text-[#93000a]';
  if (risk === 'alto') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (risk === 'medio') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function answerToStatus(answer: InspectionItemAnswer): InspectionItemStatus {
  if (answer === 'conforme') return 'conforme';
  if (answer === 'nao_conforme') return 'nao_conforme';
  if (answer === 'nao_se_aplica') return 'nao_se_aplica';
  return 'pendente';
}

function isOverdue(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  return date < current;
}

function daysUntil(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - current.getTime()) / 86400000);
}

function getProgress(inspection: Inspection) {
  const items = inspection.itens || [];
  const answered = items.filter((item) => item.resposta && item.resposta !== 'nao_verificado').length;
  const total = items.length;
  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  return { answered, total, percent };
}

function hasNonconformity(inspection: Inspection) {
  return (inspection.itens || []).some((item) => item.status === 'nao_conforme');
}

function hasActionPlan(inspection: Inspection) {
  return Boolean(inspection.plano_acao_geral || inspection.acoes?.length || (inspection.itens || []).some((item) => item.acao_recomendada));
}

function dueText(value?: string) {
  const days = daysUntil(value);
  if (!value || days === null) return 'Sem prazo';
  if (days < 0) return `Atrasado ha ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoje';
  return `Vence em ${days} dias`;
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

export function InspectionsTable({ companyId }: InspectionsTableProps) {
  const [bundle, setBundle] = useState<Bundle>({ collaborators: [], inspections: [], templates: [], templateItems: [] });
  const [costs, setCosts] = useState<CostPrevention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [localFilter, setLocalFilter] = useState('todos');
  const [responsibleFilter, setResponsibleFilter] = useState('todos');
  const [riskFilter, setRiskFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('todos');
  const [nonconformityFilter, setNonconformityFilter] = useState('todos');
  const [actionPlanFilter, setActionPlanFilter] = useState('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState<InspectionFormValues>(emptyInspection);
  const [editingInspection, setEditingInspection] = useState<Inspection | null>(null);
  const [viewingInspection, setViewingInspection] = useState<Inspection | null>(null);
  const [checklistInspection, setChecklistInspection] = useState<Inspection | null>(null);
  const [checklistItems, setChecklistItems] = useState<InspectionItemFormValues[]>([]);
  const [archivingInspection, setArchivingInspection] = useState<Inspection | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [result, costResult] = await Promise.all([
        getInspectionModuleData(companyId),
        getCostPreventionModuleData(companyId),
      ]);
      if (result.success && result.data) {
        setBundle(result.data as Bundle);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao buscar inspecoes', description: getToastError(result.error) });
      }
      if (costResult.success && costResult.data) {
        setCosts((costResult.data as { costs: CostPrevention[] }).costs || []);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Nao foi possivel carregar Inspecoes.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) void loadData();
  }, [companyId]);

  useEffect(() => {
    const template = bundle.templates.find((item) => item.tipo_inspecao === inspectionForm.tipo) || bundle.templates[0];
    if (!inspectionForm.checklist_modelo_id && template) {
      setInspectionForm((current) => ({ ...current, checklist_modelo_id: template.id }));
    }
  }, [bundle.templates, inspectionForm.checklist_modelo_id, inspectionForm.tipo]);

  const types = useMemo(() => uniqueValues(bundle.templates, (item) => item.tipo_inspecao), [bundle.templates]);
  const sectors = useMemo(() => uniqueValues(bundle.inspections, (item) => item.setor), [bundle.inspections]);
  const locals = useMemo(() => uniqueValues(bundle.inspections, (item) => item.local), [bundle.inspections]);
  const responsibles = useMemo(() => uniqueValues(bundle.inspections, (item) => item.responsavel_inspecao), [bundle.inspections]);

  const pendingItems = useMemo<InspectionPendingItem[]>(() => {
    const items: InspectionPendingItem[] = [];
    bundle.inspections.forEach((inspection) => {
      if (inspection.status === 'aberta' && getProgress(inspection).answered === 0) {
        items.push({ id: `draft-${inspection.id}`, type: 'Inspecao em rascunho', inspection, description: 'Checklist ainda nao iniciado ou sem respostas.', due: dueText(inspection.prazo_correcao), severity: 'media', action: 'continue' });
      }
      if (inspection.status === 'atrasada' || isOverdue(inspection.prazo_correcao)) {
        items.push({ id: `overdue-${inspection.id}`, type: 'Inspecao atrasada', inspection, description: 'Prazo geral de correcao vencido.', due: dueText(inspection.prazo_correcao), severity: 'alta', action: 'continue' });
      }
      if (inspection.grau_risco === 'critico') {
        items.push({ id: `critical-${inspection.id}`, type: 'Risco critico', inspection, description: 'Inspecao classificada com risco critico.', due: dueText(inspection.prazo_correcao), severity: 'critica', action: 'details' });
      }
      (inspection.itens || []).filter((item) => item.status === 'nao_conforme').forEach((item, index) => {
        if (!item.responsavel_correcao) {
          items.push({ id: `responsible-${inspection.id}-${index}`, type: 'Item sem responsavel', inspection, item, description: item.pergunta, due: dueText(item.prazo_correcao || inspection.prazo_correcao), severity: item.grau_risco === 'critico' ? 'critica' : 'alta', action: 'responsible' });
        }
        if (!item.prazo_correcao) {
          items.push({ id: `deadline-${inspection.id}-${index}`, type: 'Item sem prazo', inspection, item, description: item.pergunta, due: 'Definir prazo', severity: 'alta', action: 'deadline' });
        }
        if (item.grau_risco === 'critico' && !item.acao_recomendada) {
          items.push({ id: `action-${inspection.id}-${index}`, type: 'Item critico sem acao', inspection, item, description: item.pergunta, due: 'Definir acao', severity: 'critica', action: 'nc' });
        }
      });
    });
    return items;
  }, [bundle.inspections]);

  const filteredInspections = useMemo(() => {
    const query = normalize(search);
    return bundle.inspections.filter((inspection) => {
      const matchesSearch = !query || normalize([inspection.titulo, inspection.local, inspection.setor, inspection.responsavel_inspecao, inspection.tipo, inspection.observacoes_gerais].join(' ')).includes(query);
      const matchesStatus = statusFilter === 'todos' || inspection.status === statusFilter;
      const matchesType = typeFilter === 'todos' || inspection.tipo === typeFilter;
      const matchesSector = sectorFilter === 'todos' || inspection.setor === sectorFilter;
      const matchesLocal = localFilter === 'todos' || inspection.local === localFilter;
      const matchesResponsible = responsibleFilter === 'todos' || inspection.responsavel_inspecao === responsibleFilter;
      const matchesRisk = riskFilter === 'todos' || inspection.grau_risco === riskFilter;
      const matchesPeriod = periodFilter === 'todos' || (periodFilter === 'com_prazo' && Boolean(inspection.prazo_correcao)) || (periodFilter === 'atrasadas' && isOverdue(inspection.prazo_correcao));
      const matchesNonconformity = nonconformityFilter === 'todos' || (nonconformityFilter === 'sim' && hasNonconformity(inspection)) || (nonconformityFilter === 'nao' && !hasNonconformity(inspection));
      const matchesActionPlan = actionPlanFilter === 'todos' || (actionPlanFilter === 'sim' && hasActionPlan(inspection)) || (actionPlanFilter === 'nao' && !hasActionPlan(inspection));
      return matchesSearch && matchesStatus && matchesType && matchesSector && matchesLocal && matchesResponsible && matchesRisk && matchesPeriod && matchesNonconformity && matchesActionPlan;
    });
  }, [actionPlanFilter, bundle.inspections, localFilter, nonconformityFilter, periodFilter, responsibleFilter, riskFilter, search, sectorFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const allItems = bundle.inspections.flatMap((inspection) => inspection.itens || []);
    return [
      { label: 'Total de inspecoes', value: bundle.inspections.length, icon: ClipboardCheck, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => setStatusFilter('todos') },
      { label: 'Inspecoes abertas', value: bundle.inspections.filter((item) => item.status === 'aberta').length, icon: Flag, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setStatusFilter('aberta') },
      { label: 'Em andamento', value: bundle.inspections.filter((item) => item.status === 'em_andamento').length, icon: TimerReset, className: 'bg-[#dfe7f5] text-[#334766]', onClick: () => setStatusFilter('em_andamento') },
      { label: 'Concluidas', value: bundle.inspections.filter((item) => item.status === 'concluida').length, icon: CheckCircle2, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setStatusFilter('concluida') },
      { label: 'Atrasadas', value: bundle.inspections.filter((item) => item.status === 'atrasada').length, icon: CalendarClock, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setStatusFilter('atrasada') },
      { label: 'Itens nao conformes', value: allItems.filter((item) => item.status === 'nao_conforme').length, icon: XCircle, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setNonconformityFilter('sim') },
      { label: 'Planos de acao abertos', value: bundle.inspections.filter(hasActionPlan).length, icon: Gauge, className: 'bg-[#dfe7f5] text-[#334766]', onClick: () => setActionPlanFilter('sim') },
      { label: 'Riscos altos/criticos', value: bundle.inspections.filter((item) => ['alto', 'critico'].includes(item.grau_risco)).length, icon: ShieldAlert, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setRiskFilter('alto') },
    ];
  }, [bundle.inspections]);

  const openCreate = () => {
    const defaultTemplate = bundle.templates[0];
    setEditingInspection(null);
    setInspectionForm({ ...emptyInspection, tipo: defaultTemplate?.tipo_inspecao || emptyInspection.tipo, checklist_modelo_id: defaultTemplate?.id || '' });
    setIsFormOpen(true);
  };

  const openEdit = (inspection: Inspection) => {
    setEditingInspection(inspection);
    setInspectionForm({
      titulo: inspection.titulo,
      tipo: inspection.tipo,
      descricao: inspection.descricao || '',
      data_inspecao: inspection.data_inspecao,
      hora_inspecao: inspection.hora_inspecao || '',
      local: inspection.local,
      setor: inspection.setor,
      responsavel_inspecao: inspection.responsavel_inspecao,
      status: inspection.status,
      grau_risco: inspection.grau_risco,
      observacoes_gerais: inspection.observacoes_gerais || '',
      plano_acao_geral: inspection.plano_acao_geral || '',
      prazo_correcao: inspection.prazo_correcao || '',
      responsavel_correcao: inspection.responsavel_correcao || '',
      checklist_modelo_id: inspection.checklist_modelo_id || '',
      colaboradores_vinculados: inspection.colaboradores_vinculados || [],
    });
    setIsFormOpen(true);
  };

  const openChecklist = (inspection: Inspection) => {
    setChecklistInspection(inspection);
    setChecklistItems((inspection.itens || []).map((item) => ({
      pergunta: item.pergunta,
      categoria: item.categoria || '',
      resposta: item.resposta,
      status: item.status,
      observacao: item.observacao || '',
      grau_risco: item.grau_risco,
      acao_recomendada: item.acao_recomendada || '',
      responsavel_correcao: item.responsavel_correcao || '',
      prazo_correcao: item.prazo_correcao || '',
      foto_url: item.foto_url || '',
      anexo_url: item.anexo_url || '',
    })));
  };

  const updateInspectionForm = <K extends keyof InspectionFormValues>(key: K, value: InspectionFormValues[K]) => {
    setInspectionForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'tipo') {
        const template = bundle.templates.find((item) => item.tipo_inspecao === value);
        next.checklist_modelo_id = template?.id || '';
      }
      return next;
    });
  };

  const handleSaveInspection = () => {
    startTransition(async () => {
      const payload = { ...inspectionForm, companyId };
      const result = editingInspection ? await updateInspection(editingInspection.id, payload) : await createInspection(payload);
      if (result.success) {
        toast({ title: editingInspection ? 'Inspecao atualizada' : 'Inspecao criada', description: editingInspection ? 'Dados principais salvos.' : 'Checklist criado para continuidade em campo.' });
        setIsFormOpen(false);
        setEditingInspection(null);
        await loadData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar inspecao', description: getToastError(result.error) });
      }
    });
  };

  const handleSaveChecklist = () => {
    if (!checklistInspection) return;
    startTransition(async () => {
      const result = await saveInspectionItems(checklistInspection.id, { companyId, items: checklistItems });
      if (result.success) {
        toast({ title: 'Checklist salvo', description: 'Itens, evidencias e plano de acao foram atualizados.' });
        setChecklistInspection(null);
        await loadData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar checklist', description: getToastError(result.error) });
      }
    });
  };

  const handleArchive = () => {
    if (!archivingInspection) return;
    startTransition(async () => {
      const result = await archiveInspection(archivingInspection.id, companyId);
      if (result.success) {
        toast({ title: 'Inspecao arquivada', description: 'A inspecao foi cancelada e removida da lista ativa.' });
        setArchivingInspection(null);
        await loadData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao arquivar inspecao', description: getToastError(result.error) });
      }
    });
  };

  const handleCreateNonconformityFromInspection = (inspection: Inspection, item: InspectionItem) => {
    startTransition(async () => {
      const result = await createNonconformity(buildNonconformityFromInspection(companyId, inspection, item));
      if (result.success) {
        toast({ title: 'Nao conformidade criada', description: 'O registro foi criado a partir do item da inspecao.' });
      } else {
        toast({ variant: 'destructive', title: 'Erro ao criar nao conformidade', description: getToastError(result.error) });
      }
    });
  };

  const prepared = (title: string) => {
    toast({ title, description: 'Estrutura preparada para evolucao sem alterar os registros atuais.' });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('todos');
    setTypeFilter('todos');
    setSectorFilter('todos');
    setLocalFilter('todos');
    setResponsibleFilter('todos');
    setRiskFilter('todos');
    setPeriodFilter('todos');
    setNonconformityFilter('todos');
    setActionPlanFilter('todos');
  };

  const exportReport = () => {
    const success = downloadCsv(`relatorio-inspecoes-${Date.now()}.csv`, filteredInspections.map((inspection) => {
      const progress = getProgress(inspection);
      return {
        titulo: inspection.titulo,
        tipo: inspection.tipo,
        local: inspection.local,
        setor: inspection.setor,
        responsavel: inspection.responsavel_inspecao,
        data: formatDate(inspection.data_inspecao),
        status: statusLabels[inspection.status],
        risco: riskLabels[inspection.grau_risco],
        progresso: `${progress.answered}/${progress.total}`,
        itens_nao_conformes: (inspection.itens || []).filter((item) => item.status === 'nao_conforme').length,
        prazo: formatDate(inspection.prazo_correcao),
      };
    }));
    toast(success ? { title: 'CSV exportado', description: 'Relatorio de inspecoes gerado com os filtros atuais.' } : { variant: 'destructive', title: 'Nada para exportar', description: 'Nenhuma inspecao encontrada para exportacao.' });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl space-y-3">
          <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Inspecoes</h2>
          <p className="text-[1.05rem] leading-8 text-[#4f5f7a]">Realize inspecoes em campo, registre evidencias, planos de acao e nao conformidades.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
          <Button onClick={openCreate} className="h-14 rounded-xl bg-[#f46e11] px-7 text-base font-bold text-white shadow-[0_8px_18px_rgba(244,110,17,0.24)] hover:bg-[#e96710]"><Plus className="mr-2 h-5 w-5" />Nova Inspecao</Button>
          <Button variant="outline" onClick={() => { openCreate(); setInspectionForm((current) => ({ ...current, titulo: 'Inspecao rapida', status: 'em_andamento' })); }} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><TimerReset className="mr-2 h-5 w-5" />Inspecao Rapida</Button>
          <Button variant="outline" onClick={() => setActiveView('templates')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><ClipboardCheck className="mr-2 h-5 w-5" />Modelos</Button>
          <Button variant="outline" onClick={() => setActiveView('pendings')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><AlertTriangle className="mr-2 h-5 w-5" />Pendencias</Button>
          <Button variant="outline" onClick={exportReport} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><Download className="mr-2 h-5 w-5" />Exportar Relatorio</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {stats.map((card) => {
          const Icon = card.icon;
          return <SummaryCard key={card.label} label={card.label} value={card.value} icon={Icon} className={card.className} onClick={card.onClick} />;
        })}
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.9fr_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5f7a]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por titulo, local, setor, responsavel, tipo ou observacao" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] pl-10" />
          </div>
          <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={[['todos', 'Todos status'], ...Object.entries(statusLabels)]} />
          <FilterSelect value={typeFilter} onValueChange={setTypeFilter} options={[['todos', 'Todos tipos'], ...types.map((item) => [item, item] as [string, string])]} />
          <Button variant="outline" onClick={() => setShowAdvancedFilters((value) => !value)} className="h-11 rounded-md"><Filter className="mr-2 h-4 w-4" />Filtros avancados</Button>
          <Button variant="ghost" onClick={resetFilters} className="h-11 rounded-md">Limpar filtros</Button>
        </div>
        {showAdvancedFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <FilterSelect value={sectorFilter} onValueChange={setSectorFilter} options={[['todos', 'Todos setores'], ...sectors.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={localFilter} onValueChange={setLocalFilter} options={[['todos', 'Todos locais'], ...locals.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={responsibleFilter} onValueChange={setResponsibleFilter} options={[['todos', 'Responsaveis'], ...responsibles.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={riskFilter} onValueChange={setRiskFilter} options={[['todos', 'Todos riscos'], ...Object.entries(riskLabels)]} />
            <FilterSelect value={periodFilter} onValueChange={setPeriodFilter} options={[['todos', 'Todo periodo'], ['com_prazo', 'Com prazo'], ['atrasadas', 'Atrasadas']]} />
            <FilterSelect value={nonconformityFilter} onValueChange={setNonconformityFilter} options={[['todos', 'Com NC: todos'], ['sim', 'Com nao conformidade'], ['nao', 'Sem nao conformidade']]} />
            <FilterSelect value={actionPlanFilter} onValueChange={setActionPlanFilter} options={[['todos', 'Plano: todos'], ['sim', 'Com plano de acao'], ['nao', 'Sem plano de acao']]} />
          </div>
        )}
      </div>

      <AlertsPanel inspections={bundle.inspections} />

      <div className="flex flex-wrap gap-2">
        <Button variant={activeView === 'list' ? 'default' : 'outline'} onClick={() => setActiveView('list')} className={cn('rounded-md', activeView === 'list' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Lista de inspecoes</Button>
        <Button variant={activeView === 'pendings' ? 'default' : 'outline'} onClick={() => setActiveView('pendings')} className={cn('rounded-md', activeView === 'pendings' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Pendencias de Inspecao</Button>
        <Button variant={activeView === 'templates' ? 'default' : 'outline'} onClick={() => setActiveView('templates')} className={cn('rounded-md', activeView === 'templates' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Modelos de Checklist</Button>
      </div>

      {activeView === 'pendings' ? (
        <InspectionPendingsPanel items={pendingItems} onContinue={openChecklist} onDetails={setViewingInspection} onPrepared={prepared} />
      ) : activeView === 'templates' ? (
        <ChecklistTemplatesPanel templates={bundle.templates} templateItems={bundle.templateItems} onPrepared={prepared} />
      ) : (
      <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[#191c1e]">Lista de inspecoes</h3>
            <p className="text-sm text-[#4f5f7a]">{filteredInspections.length} registros encontrados</p>
          </div>
          <Filter className="h-5 w-5 text-[#4f5f7a]" />
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1380px] border-collapse text-left">
            <thead>
              <tr className="bg-[#fbfbfc] text-sm uppercase tracking-[0.06em] text-[#4f5f7a]">
                <th className="px-5 py-4 font-bold">Inspecao</th>
                <th className="px-5 py-4 font-bold">Tipo</th>
                <th className="px-5 py-4 font-bold">Local/Setor</th>
                <th className="px-5 py-4 font-bold">Responsavel</th>
                <th className="px-5 py-4 font-bold">Progresso</th>
                <th className="px-5 py-4 font-bold">Itens NC</th>
                <th className="px-5 py-4 font-bold">Risco</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold">Prazo</th>
                <th className="px-5 py-4 text-right font-bold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0c0b1]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => <LoadingRow key={index} />)
              ) : filteredInspections.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhuma inspecao encontrada.</td></tr>
              ) : (
                filteredInspections.map((inspection) => (
                  <tr key={inspection.id} className="group hover:bg-[#fafbfd]">
                    <td className="px-5 py-5"><p className="font-bold text-[#191c1e]">{inspection.titulo}</p><p className="text-xs text-[#4f5f7a]">{formatDate(inspection.data_inspecao)} - {inspection.itens?.length || 0} itens</p></td>
                    <td className="px-5 py-5 text-[#3f5a88]">{inspection.tipo}</td>
                    <td className="px-5 py-5 text-[#191c1e]"><p>{inspection.local}</p><p className="text-xs text-[#4f5f7a]">{inspection.setor}</p></td>
                    <td className="px-5 py-5 text-[#191c1e]">{inspection.responsavel_inspecao}</td>
                    <td className="px-5 py-5"><ProgressCell inspection={inspection} /></td>
                    <td className="px-5 py-5 font-bold text-[#ba1a1a]">{(inspection.itens || []).filter((item) => item.status === 'nao_conforme').length}</td>
                    <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', riskStyle(inspection.grau_risco))}>{riskLabels[inspection.grau_risco]}</Badge></td>
                    <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', statusStyle(inspection.status))}>{statusLabels[inspection.status]}</Badge></td>
                    <td className="px-5 py-5 text-[#3f5a88]">{formatDate(inspection.prazo_correcao)}</td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-1">
                        <IconButton title="Visualizar" onClick={() => setViewingInspection(inspection)} icon={Eye} />
                        <IconButton title="Editar" onClick={() => openEdit(inspection)} icon={Edit} />
                        <IconButton title="Continuar checklist" onClick={() => openChecklist(inspection)} icon={ClipboardCheck} />
                        <InspectionRowMenu inspection={inspection} onView={() => setViewingInspection(inspection)} onEdit={() => openEdit(inspection)} onChecklist={() => openChecklist(inspection)} onArchive={() => setArchivingInspection(inspection)} onPrepared={prepared} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {filteredInspections.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ccb4a6] p-6 text-center text-sm text-[#4f5f7a]">Nenhuma inspecao encontrada.</p>
          ) : filteredInspections.map((inspection) => (
            <InspectionMobileCard key={inspection.id} inspection={inspection} onView={() => setViewingInspection(inspection)} onChecklist={() => openChecklist(inspection)} onEdit={() => openEdit(inspection)} />
          ))}
        </div>
      </div>
      )}

      <ReportsPreparation />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>{editingInspection ? 'Editar inspecao' : 'Nova Inspecao'}</DialogTitle></DialogHeader>
          <InspectionForm form={inspectionForm} setForm={updateInspectionForm} templates={bundle.templates} collaborators={bundle.collaborators} onSubmit={handleSaveInspection} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!checklistInspection} onOpenChange={(open) => !open && setChecklistInspection(null)}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader><DialogTitle>Checklist da inspecao</DialogTitle></DialogHeader>
          {checklistInspection && <ChecklistEditor inspection={checklistInspection} items={checklistItems} setItems={setChecklistItems} onSubmit={handleSaveChecklist} isPending={isPending} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingInspection} onOpenChange={(open) => !open && setViewingInspection(null)}>
        <DialogContent className="max-h-[94vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader><DialogTitle>Detalhes da inspecao</DialogTitle></DialogHeader>
          {viewingInspection && <InspectionDetails inspection={viewingInspection} collaborators={bundle.collaborators} costs={filterCostsByRelation(costs, 'inspecao_id', viewingInspection.id)} onCreateNonconformity={handleCreateNonconformityFromInspection} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archivingInspection} onOpenChange={(open) => !open && setArchivingInspection(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar inspecao?</AlertDialogTitle>
            <AlertDialogDescription>Esta acao cancela a inspecao e remove da lista ativa sem apagar o historico definitivamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-[#ba1a1a] hover:bg-[#93000a]">Arquivar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, className, onClick }: { label: string; value: number; icon: ElementType; className: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#e0c0b1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><p className="text-sm font-medium text-[#4f5f7a]">{label}</p><span className={cn('rounded-lg p-2.5', className)}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-[2rem] font-bold leading-none text-[#191c1e]">{value}</p></button>;
}

function ProgressCell({ inspection }: { inspection: Inspection }) {
  const progress = getProgress(inspection);
  return (
    <div className="min-w-36">
      <div className="mb-1 flex items-center justify-between text-xs text-[#4f5f7a]"><span>{progress.percent}%</span><span>{progress.answered}/{progress.total} itens</span></div>
      <div className="h-2 rounded-full bg-[#eceef1]"><div className="h-2 rounded-full bg-[#f46e11]" style={{ width: `${progress.percent}%` }} /></div>
    </div>
  );
}

function InspectionRowMenu({
  inspection,
  onView,
  onEdit,
  onChecklist,
  onArchive,
  onPrepared,
}: {
  inspection: Inspection;
  onView: () => void;
  onEdit: () => void;
  onChecklist: () => void;
  onArchive: () => void;
  onPrepared: (title: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className="rounded-lg p-2 text-[#4f5f7a] hover:bg-[#eceef1]" title="Mais acoes"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem onClick={onChecklist}><ClipboardCheck className="mr-2 h-4 w-4" />Continuar inspecao</DropdownMenuItem>
        <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared('Relatorio da inspecao preparado')}><FileText className="mr-2 h-4 w-4" />Gerar relatorio</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared(`Criacao de NC preparada para ${inspection.titulo}`)}><ShieldAlert className="mr-2 h-4 w-4" />Criar nao conformidade</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onArchive} className="text-[#ba1a1a]"><Archive className="mr-2 h-4 w-4" />Arquivar/cancelar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InspectionMobileCard({ inspection, onView, onChecklist, onEdit }: { inspection: Inspection; onView: () => void; onChecklist: () => void; onEdit: () => void }) {
  const nonconforming = (inspection.itens || []).filter((item) => item.status === 'nao_conforme').length;
  return (
    <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div><p className="font-bold text-[#191c1e]">{inspection.titulo}</p><p className="text-sm text-[#4f5f7a]">{inspection.tipo} - {inspection.local}</p></div>
        <Badge className={cn('rounded-full px-3 py-1', statusStyle(inspection.status))}>{statusLabels[inspection.status]}</Badge>
      </div>
      <div className="mt-4"><ProgressCell inspection={inspection} /></div>
      <div className="mt-4 grid gap-2 text-sm">
        <p><span className="text-[#4f5f7a]">Setor:</span> {inspection.setor}</p>
        <p><span className="text-[#4f5f7a]">Responsavel:</span> {inspection.responsavel_inspecao}</p>
        <p><span className="text-[#4f5f7a]">Nao conformes:</span> {nonconforming}</p>
        <p><span className="text-[#4f5f7a]">Prazo:</span> {dueText(inspection.prazo_correcao)}</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="outline" onClick={onChecklist}>Checklist</Button>
        <Button variant="outline" onClick={onView}>Ver</Button>
        <Button variant="outline" onClick={onEdit}>Editar</Button>
      </div>
    </div>
  );
}

function severityClass(severity: InspectionPendingItem['severity']) {
  if (severity === 'critica') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (severity === 'alta') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function InspectionPendingsPanel({ items, onContinue, onDetails, onPrepared }: { items: InspectionPendingItem[]; onContinue: (inspection: Inspection) => void; onDetails: (inspection: Inspection) => void; onPrepared: (title: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
      <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Pendencias de Inspecao</h3><p className="text-sm text-[#4f5f7a]">{items.length} pendencias encontradas em rascunhos, atrasos, itens nao conformes e riscos criticos</p></div>
      <div className="divide-y divide-[#e0c0b1]">
        {items.length === 0 ? <p className="p-8 text-center text-sm text-[#4f5f7a]">Nenhuma pendencia de inspecao encontrada.</p> : items.map((item) => (
          <div key={item.id} className="grid gap-3 p-5 lg:grid-cols-[0.8fr_1fr_0.9fr_0.8fr_0.6fr_1fr] lg:items-center">
            <p className="font-bold text-[#191c1e]">{item.type}</p>
            <div><p className="font-semibold">{item.inspection.titulo}</p><p className="text-xs text-[#4f5f7a]">{item.inspection.local} - {item.inspection.setor}</p></div>
            <p className="text-sm text-[#4f5f7a]">{item.description}</p>
            <p className="text-sm text-[#4f5f7a]">{item.due}</p>
            <Badge className={cn('w-fit rounded-full px-3 py-1', severityClass(item.severity))}>{item.severity}</Badge>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => item.action === 'details' ? onDetails(item.inspection) : onContinue(item.inspection)}>{item.action === 'nc' ? 'Criar NC' : item.action === 'deadline' ? 'Definir prazo' : item.action === 'responsible' ? 'Definir responsavel' : 'Continuar'}</Button>
              <Button size="sm" variant="outline" onClick={() => onDetails(item.inspection)}>Ver detalhes</Button>
              <Button size="sm" variant="outline" onClick={() => onPrepared('Acao em lote de pendencia preparada')}>Ajustar</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChecklistTemplatesPanel({ templates, templateItems, onPrepared }: { templates: ChecklistTemplate[]; templateItems: ChecklistTemplateItem[]; onPrepared: (title: string) => void }) {
  const library = ['Inspecao de area', 'Inspecao de EPIs', 'Inspecao de maquinas', 'Inspecao de ferramentas', 'Inspecao eletrica', 'Inspecao de trabalho em altura', 'Inspecao de ordem e limpeza', 'Inspecao de extintores', 'Inspecao de sinalizacao', 'Inspecao de produtos quimicos', 'Inspecao de ergonomia', 'Inspecao de veiculos', 'Inspecao de canteiro de obras'];
  return (
    <div className="grid gap-5 lg:grid-cols-[1.4fr_0.9fr]">
      <div className="rounded-xl border border-[#e0c0b1] bg-white p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-bold text-[#191c1e]">Modelos de Checklist</h3><p className="text-sm text-[#4f5f7a]">Crie, edite, duplique e organize perguntas por categoria.</p></div><Button variant="outline" onClick={() => onPrepared('Criacao de modelo de checklist preparada')}><Plus className="mr-2 h-4 w-4" />Novo modelo</Button></div>
        <div className="grid gap-3 md:grid-cols-2">{templates.map((template) => <div key={template.id} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-4"><p className="font-bold text-[#191c1e]">{template.nome}</p><p className="text-sm text-[#4f5f7a]">{template.tipo_inspecao}</p><p className="mt-2 text-xs text-[#4f5f7a]">{templateItems.filter((item) => item.checklist_modelo_id === template.id).length} perguntas configuradas</p><div className="mt-3 flex gap-2"><Button size="sm" variant="outline" onClick={() => onPrepared('Edicao de modelo preparada')}>Editar</Button><Button size="sm" variant="outline" onClick={() => onPrepared('Duplicacao de modelo preparada')}>Duplicar</Button></div></div>)}</div>
      </div>
      <div className="rounded-xl border border-[#e0c0b1] bg-white p-5">
        <h3 className="text-lg font-bold text-[#191c1e]">Biblioteca pronta</h3>
        <p className="mb-4 text-sm text-[#4f5f7a]">Modelos padrao disponiveis para copiar e adaptar por empresa.</p>
        <div className="space-y-2">{library.map((item) => <button key={item} type="button" onClick={() => onPrepared(`Modelo ${item} preparado para importacao`)} className="w-full rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-3 text-left text-sm font-semibold text-[#191c1e] hover:bg-[#fff8f1]">{item}</button>)}</div>
      </div>
    </div>
  );
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

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('space-y-2 text-sm font-semibold text-[#191c1e]', className)}><span>{label}</span>{children}</label>;
}

function InspectionForm({ form, setForm, templates, collaborators, onSubmit, isPending }: {
  form: InspectionFormValues;
  setForm: <K extends keyof InspectionFormValues>(key: K, value: InspectionFormValues[K]) => void;
  templates: ChecklistTemplate[];
  collaborators: Collaborator[];
  onSubmit: () => void;
  isPending: boolean;
}) {
  const selectedTemplate = templates.find((item) => item.id === form.checklist_modelo_id);
  return <div className="space-y-5"><div className="grid gap-2 sm:grid-cols-4">{['1. Dados principais', '2. Checklist', '3. Configuracoes', '4. Iniciar'].map((step) => <div key={step} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] px-3 py-2 text-center text-xs font-bold text-[#4f5f7a]">{step}</div>)}</div><section className="rounded-xl border border-[#e0c0b1] bg-white"><div className="flex items-center gap-2 border-b border-[#e0c0b1] bg-[#eef1f5] px-4 py-3"><ClipboardCheck className="h-5 w-5 text-[#9e4300]" /><h3 className="font-bold text-[#191c1e]">Dados principais</h3></div><div className="grid gap-4 p-4 md:grid-cols-2"><Field label="Titulo da inspecao"><Input value={form.titulo} onChange={(e) => setForm('titulo', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Tipo de inspecao"><Select value={form.tipo} onValueChange={(value) => setForm('tipo', value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Array.from(new Set(templates.map((item) => item.tipo_inspecao))).map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}</SelectContent></Select></Field><Field label="Descricao" className="md:col-span-2"><Textarea value={form.descricao || ''} onChange={(e) => setForm('descricao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Data"><Input type="date" value={form.data_inspecao} onChange={(e) => setForm('data_inspecao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Hora"><Input type="time" value={form.hora_inspecao || ''} onChange={(e) => setForm('hora_inspecao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Local"><Input value={form.local} onChange={(e) => setForm('local', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Setor"><Input value={form.setor} onChange={(e) => setForm('setor', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Responsavel pela inspecao"><Input value={form.responsavel_inspecao} onChange={(e) => setForm('responsavel_inspecao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Grau de risco inicial"><Select value={form.grau_risco} onValueChange={(value) => setForm('grau_risco', value as InspectionRisk)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(riskLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field></div></section><section className="rounded-xl border border-[#e0c0b1] bg-white"><div className="flex items-center gap-2 border-b border-[#e0c0b1] bg-[#eef1f5] px-4 py-3"><Gauge className="h-5 w-5 text-[#9e4300]" /><h3 className="font-bold text-[#191c1e]">Configuracao e plano inicial</h3></div><div className="grid gap-4 p-4 md:grid-cols-2"><Field label="Checklist utilizado"><Select value={form.checklist_modelo_id || selectedTemplate?.id || ''} onValueChange={(value) => setForm('checklist_modelo_id', value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.nome}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => setForm('status', value as InspectionStatus)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Prazo para correcao"><Input type="date" value={form.prazo_correcao || ''} onChange={(e) => setForm('prazo_correcao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Responsavel pela correcao"><Input value={form.responsavel_correcao || ''} onChange={(e) => setForm('responsavel_correcao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Observacoes gerais" className="md:col-span-2"><Textarea value={form.observacoes_gerais || ''} onChange={(e) => setForm('observacoes_gerais', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Plano de acao geral" className="md:col-span-2"><Textarea value={form.plano_acao_geral || ''} onChange={(e) => setForm('plano_acao_geral', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></div></section><section className="rounded-xl border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4"><div className="mb-3 flex items-center gap-2 font-bold text-[#191c1e]"><UserRound className="h-5 w-5 text-[#9e4300]" />Colaboradores vinculados</div><div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{collaborators.slice(0, 9).map((collaborator) => { const selected = form.colaboradores_vinculados?.includes(collaborator.id); return <button key={collaborator.id} type="button" onClick={() => { const current = form.colaboradores_vinculados || []; setForm('colaboradores_vinculados', selected ? current.filter((id) => id !== collaborator.id) : [...current, collaborator.id]); }} className={cn('rounded-lg border p-3 text-left text-sm', selected ? 'border-[#f46e11] bg-[#fff4e8]' : 'border-[#e0c0b1] bg-white hover:bg-[#fff8f1]')}><span className="font-bold text-[#191c1e]">{collaborator.nome_completo}</span><span className="block text-xs text-[#4f5f7a]">{collaborator.funcao} - {collaborator.setor}</span></button>; })}</div></section><div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4"><div className="grid gap-3 md:grid-cols-4"><Info label="Tipo" value={form.tipo} /><Info label="Local" value={form.local || 'Nao informado'} /><Info label="Setor" value={form.setor || 'Nao informado'} /><Info label="Checklist" value={selectedTemplate?.nome || 'Sem modelo'} /></div></div><div className="flex flex-wrap justify-end gap-2"><Button variant="outline" onClick={onSubmit} disabled={isPending}>Salvar como rascunho</Button><Button variant="outline" onClick={onSubmit} disabled={isPending}>Iniciar checklist</Button><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar e voltar</Button></div></div>;
}

function ChecklistEditor({ inspection, items, setItems, onSubmit, isPending }: { inspection: Inspection; items: InspectionItemFormValues[]; setItems: (items: InspectionItemFormValues[]) => void; onSubmit: () => void; isPending: boolean }) {
  const summary = getItemSummary(items);
  const setItem = (index: number, patch: Partial<InspectionItemFormValues>) => setItems(items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  return <div className="space-y-5"><InspectionHeader inspection={inspection} /><div className="grid gap-3 sm:grid-cols-5"><Summary label="Itens" value={items.length} /><Summary label="Conformes" value={summary.conformes} /><Summary label="Nao conformes" value={summary.naoConformes} /><Summary label="Nao aplicaveis" value={summary.naoAplicaveis} /><Summary label="Nao verificados" value={summary.naoVerificados} /></div><div className="space-y-4">{items.length === 0 ? <div className="rounded-xl border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-8 text-center text-[#4f5f7a]">Nenhum item de checklist encontrado para esta inspecao.</div> : items.map((item, index) => <div key={`${item.pergunta}-${index}`} className="rounded-xl border border-[#e0c0b1] bg-white p-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{item.categoria || 'Geral'}</p><h4 className="mt-1 text-lg font-bold text-[#191c1e]">{index + 1}. {item.pergunta}</h4></div><Badge className={cn('w-fit rounded-full px-3 py-1 uppercase', riskStyle(item.grau_risco))}>{riskLabels[item.grau_risco]}</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-4">{(['conforme', 'nao_conforme', 'nao_se_aplica', 'nao_verificado'] as InspectionItemAnswer[]).map((answer) => <button key={answer} type="button" onClick={() => setItem(index, { resposta: answer, status: answerToStatus(answer) })} className={cn('rounded-lg border px-3 py-3 text-sm font-bold transition-colors', item.resposta === answer ? answer === 'nao_conforme' ? 'border-[#ba1a1a] bg-[#ffdad6] text-[#93000a]' : 'border-[#f46e11] bg-[#fff4e8] text-[#521f00]' : 'border-[#e0c0b1] bg-[#f7f9fc] text-[#4f5f7a] hover:bg-[#fff8f1]')}>{answerLabels[answer]}</button>)}</div><div className="mt-4 grid gap-4 md:grid-cols-2"><Field label="Observacao"><Textarea value={item.observacao || ''} onChange={(e) => setItem(index, { observacao: e.target.value })} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Grau de risco do item"><Select value={item.grau_risco} onValueChange={(value) => setItem(index, { grau_risco: value as InspectionRisk })}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(riskLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Acao recomendada"><Textarea value={item.acao_recomendada || ''} onChange={(e) => setItem(index, { acao_recomendada: e.target.value })} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Responsavel"><Input value={item.responsavel_correcao || ''} onChange={(e) => setItem(index, { responsavel_correcao: e.target.value })} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Prazo"><Input type="date" value={item.prazo_correcao || ''} onChange={(e) => setItem(index, { prazo_correcao: e.target.value })} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></div><Field label="Foto URL"><Input value={item.foto_url || ''} onChange={(e) => setItem(index, { foto_url: e.target.value })} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field><Field label="Anexo URL"><Input value={item.anexo_url || ''} onChange={(e) => setItem(index, { anexo_url: e.target.value })} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field></div>{item.resposta === 'nao_conforme' && <div className="mt-4 flex flex-wrap gap-2 rounded-lg border border-[#ffe5d6] bg-[#fff8f1] p-3 text-sm text-[#8a4b00]"><AlertTriangle className="h-5 w-5" />Item nao conforme. <Button size="sm" disabled variant="outline">Criar Nao Conformidade</Button></div>}</div>)}</div><div className="flex justify-end"><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar checklist</Button></div></div>;
}

function getItemSummary(items: Array<InspectionItem | InspectionItemFormValues>) {
  return {
    conformes: items.filter((item) => item.status === 'conforme').length,
    naoConformes: items.filter((item) => item.status === 'nao_conforme').length,
    naoAplicaveis: items.filter((item) => item.status === 'nao_se_aplica').length,
    naoVerificados: items.filter((item) => item.resposta === 'nao_verificado' || item.status === 'pendente').length,
  };
}

function buildNonconformityFromInspection(companyId: string, inspection: Inspection, item: InspectionItem) {
  const severity = item.grau_risco === 'critico' ? 'critica' : item.grau_risco === 'alto' ? 'alta' : item.grau_risco === 'medio' ? 'media' : 'baixa';
  const probability = item.grau_risco === 'critico' || item.grau_risco === 'alto' ? 'alta' : 'media';
  return {
    companyId,
    titulo: item.pergunta,
    descricao: item.observacao || `Foi identificado item nao conforme durante a inspecao: ${item.pergunta}`,
    data_identificacao: inspection.data_inspecao || today,
    hora_identificacao: inspection.hora_inspecao || '',
    local: inspection.local,
    setor: inspection.setor,
    colaborador_id: '',
    origem: 'inspecao' as const,
    origem_id: inspection.id,
    inspecao_id: inspection.id,
    item_inspecao_id: item.id,
    gravidade: severity as 'baixa' | 'media' | 'alta' | 'critica',
    probabilidade: probability as 'baixa' | 'media' | 'alta',
    nivel_risco: item.grau_risco,
    risco_associado: item.categoria || '',
    evidencia_url: item.anexo_url || '',
    foto_url: item.foto_url || '',
    responsavel_correcao: item.responsavel_correcao || inspection.responsavel_correcao || '',
    prazo_correcao: item.prazo_correcao || inspection.prazo_correcao || '',
    acao_corretiva: item.acao_recomendada || '',
    acao_preventiva: '',
    causa_provavel: '',
    causa_raiz: '',
    status: 'aberta' as const,
    data_conclusao: '',
    validado_por: '',
    observacoes: '',
    correcao_realizada: '',
    evidencia_correcao_url: '',
    data_validacao: '',
    validacao_status: 'pendente' as const,
    motivo_reabertura: '',
  };
}

function InspectionHeader({ inspection }: { inspection: Inspection }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-5"><div className="grid gap-4 md:grid-cols-5"><Info label="Titulo" value={inspection.titulo} /><Info label="Tipo" value={inspection.tipo} /><Info label="Local" value={inspection.local} /><Info label="Setor" value={inspection.setor} /><Info label="Responsavel" value={inspection.responsavel_inspecao} /></div></div>;
}

function InspectionDetails({ inspection, collaborators, costs, onCreateNonconformity }: { inspection: Inspection; collaborators: Collaborator[]; costs: CostPrevention[]; onCreateNonconformity: (inspection: Inspection, item: InspectionItem) => void }) {
  const items = inspection.itens || [];
  const summary = getItemSummary(items);
  const linkedCollaborators = collaborators.filter((collaborator) => inspection.colaboradores_vinculados?.includes(collaborator.id));
  return <div className="space-y-5"><InspectionHeader inspection={inspection} /><div className="grid gap-3 sm:grid-cols-6"><Summary label="Total" value={items.length} /><Summary label="Conformes" value={summary.conformes} /><Summary label="Nao conformes" value={summary.naoConformes} /><Summary label="N/A" value={summary.naoAplicaveis} /><Summary label="Pendentes" value={summary.naoVerificados} /><Summary label="Colaboradores" value={linkedCollaborators.length} /></div><div className="grid gap-4 lg:grid-cols-3"><DetailBlock title="Dados principais" items={[['Data', formatDate(inspection.data_inspecao)], ['Hora', inspection.hora_inspecao || '-'], ['Status', statusLabels[inspection.status]], ['Grau de risco', riskLabels[inspection.grau_risco]], ['Prazo', formatDate(inspection.prazo_correcao)], ['Responsavel correcao', inspection.responsavel_correcao || '-']]} /><DetailBlock title="Plano de acao" items={[['Plano geral', inspection.plano_acao_geral || 'Nao preenchido'], ['Observacoes', inspection.observacoes_gerais || 'Nao preenchido']]} /><DetailBlock title="Custos Relacionados" items={[['Custos registrados', String(costs.length)], ['Valor total', formatCurrency(sumCosts(costs))], ['Custos preventivos', formatCurrency(sumCosts(preventionCosts(costs)))], ['Custos corretivos', formatCurrency(sumCosts(costs.filter((cost) => !preventionCosts(costs).includes(cost))))], ['Comprovantes', String(costs.filter((cost) => cost.comprovante_url).length)], ['Relatorio', 'Gerar Relatorio em PDF preparado']]} /></div><div className="rounded-xl border border-[#e0c0b1] bg-white"><div className="border-b border-[#e0c0b1] bg-[#eef1f5] px-5 py-4 font-bold text-[#191c1e]">Checklist completo</div><div className="divide-y divide-[#e0c0b1]">{items.length === 0 ? <p className="p-5 text-sm text-[#4f5f7a]">Inspecao sem checklist preenchido.</p> : items.map((item, index) => <div key={item.id || `${item.pergunta}-${index}`} className="p-5"><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase text-[#4f5f7a]">{item.categoria || 'Geral'}</p><p className="mt-1 font-bold text-[#191c1e]">{index + 1}. {item.pergunta}</p><p className="mt-2 text-sm text-[#4f5f7a]">{item.observacao || 'Sem observacao.'}</p></div><div className="flex flex-wrap gap-2"><Badge className={cn('rounded-full px-3 py-1 uppercase', riskStyle(item.grau_risco))}>{riskLabels[item.grau_risco]}</Badge><Badge className="rounded-full bg-[#eef1f5] px-3 py-1 uppercase text-[#4f5f7a]">{answerLabels[item.resposta]}</Badge></div></div>{item.acao_recomendada ? <p className="mt-3 rounded-lg border border-[#ffe5d6] bg-[#fff8f1] p-3 text-sm text-[#521f00]">Acao: {item.acao_recomendada}</p> : null}{item.foto_url || item.anexo_url ? <div className="mt-3 flex gap-2 text-sm text-[#4f5f7a]"><Camera className="h-4 w-4" />Evidencias/anexos informados.</div> : null}{item.status === 'nao_conforme' ? <Button type="button" size="sm" variant="outline" onClick={() => onCreateNonconformity(inspection, item)} className="mt-3 border-[#ba1a1a] text-[#ba1a1a] hover:bg-[#fff1f0]">Criar Nao Conformidade</Button> : null}</div>)}</div></div><ListBlock title="Custos vinculados" empty="Nenhum custo vinculado a esta inspecao." items={costs.map((cost) => `${formatDate(cost.data_custo)} - ${formatCurrency(cost.valor)} - ${cost.descricao}`)} /><div className="flex flex-wrap gap-3"><Button disabled className="bg-[#f46e11] text-white disabled:opacity-70"><FileText className="mr-2 h-4 w-4" />Gerar Relatorio em PDF</Button><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar analise da inspecao com IA</Button></div></div>;
}

function DetailBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><h4 className="mb-4 font-bold text-[#191c1e]">{title}</h4><div className="space-y-3">{items.map(([label, value]) => <Info key={label} label={label} value={value} />)}</div></section>;
}

function ListBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><h4 className="mb-4 font-bold text-[#191c1e]">{title}</h4>{items.length ? <div className="space-y-2">{items.map((item) => <p key={item} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm text-[#191c1e]">{item}</p>)}</div> : <p className="text-sm text-[#4f5f7a]">{empty}</p>}</section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p><p className="text-sm font-semibold text-[#191c1e]">{value || '-'}</p></div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-4"><p className="text-xs font-bold uppercase text-[#4f5f7a]">{label}</p><p className="mt-2 text-2xl font-bold text-[#191c1e]">{value}</p></div>;
}

function AlertsPanel({ inspections }: { inspections: Inspection[] }) {
  const alerts = useMemo(() => {
    const items: string[] = [];
    inspections.filter((inspection) => inspection.status === 'atrasada').slice(0, 2).forEach((inspection) => items.push(`Inspecao atrasada: ${inspection.titulo}.`));
    inspections.filter((inspection) => inspection.grau_risco === 'critico').slice(0, 2).forEach((inspection) => items.push(`Inspecao com risco critico: ${inspection.titulo}.`));
    inspections.flatMap((inspection) => (inspection.itens || []).map((item) => ({ inspection, item }))).filter(({ item }) => item.status === 'nao_conforme' && !item.responsavel_correcao).slice(0, 2).forEach(({ inspection }) => items.push(`Item nao conforme sem responsavel em ${inspection.titulo}.`));
    inspections.flatMap((inspection) => (inspection.itens || []).map((item) => ({ inspection, item }))).filter(({ item }) => item.status === 'nao_conforme' && !item.prazo_correcao).slice(0, 2).forEach(({ inspection }) => items.push(`Item nao conforme sem prazo em ${inspection.titulo}.`));
    inspections.filter((inspection) => (inspection.itens || []).length === 0).slice(0, 2).forEach((inspection) => items.push(`Inspecao sem checklist preenchido: ${inspection.titulo}.`));
    return items.slice(0, 6);
  }, [inspections]);
  if (alerts.length === 0) return null;
  return <div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f1] p-4"><div className="mb-3 flex items-center gap-2 font-bold text-[#8a4b00]"><AlertTriangle className="h-5 w-5" />Alertas importantes</div><div className="grid gap-2 md:grid-cols-2">{alerts.map((alert) => <p key={alert} className="rounded-lg bg-white p-3 text-sm text-[#521f00]">{alert}</p>)}</div></div>;
}

function ReportsPreparation() {
  const reports = ['Por periodo', 'Por setor', 'Por responsavel', 'Inspecoes abertas', 'Inspecoes atrasadas', 'Itens nao conformes', 'Riscos criticos', 'Planos de acao', 'Historico por local', 'Historico por colaborador'];
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="text-lg font-bold text-[#191c1e]">Relatorios do modulo</h3><p className="text-sm text-[#4f5f7a]">Area preparada para relatorios operacionais de inspecoes.</p></div><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar analise da inspecao com IA</Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{reports.map((report) => <div key={report} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm font-semibold text-[#191c1e]">{report}</div>)}</div></div>;
}
