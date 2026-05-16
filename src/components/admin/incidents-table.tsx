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
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldAlert,
  Siren,
  Sparkles,
  TimerReset,
  UserRound,
  Wrench,
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Incident,
  IncidentActionFormValues,
  IncidentActionStatus,
  IncidentActionType,
  IncidentConclusionValues,
  IncidentFormValues,
  IncidentProbability,
  IncidentRisk,
  IncidentSeverity,
  IncidentStatus,
  IncidentType,
  IncidentWitnessFormValues,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  archiveIncident,
  concludeIncident,
  createIncident,
  createNonconformityFromIncident,
  getIncidentModuleData,
  updateIncident,
} from '@/server/incident-actions';
import { getCostPreventionModuleData } from '@/server/cost-prevention-actions';
import { filterCostsByRelation, formatCurrency, preventionCosts, sumCosts } from '@/lib/cost-prevention';
import type { CostPrevention } from '@/lib/types';

interface IncidentsTableProps {
  companyId: string;
}

type Bundle = {
  collaborators: Collaborator[];
  incidents: Incident[];
};

type ActiveView = 'list' | 'pendings' | 'preventive';

type IncidentPendingItem = {
  id: string;
  type: string;
  incident: Incident;
  description: string;
  due: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  action: 'responsible' | 'root_cause' | 'preventive' | 'conclude' | 'details';
};

const today = new Date().toISOString().slice(0, 10);
const nowTime = new Date().toTimeString().slice(0, 5);

const typeLabels: Record<IncidentType, string> = {
  incidente_sem_lesao: 'Incidente sem lesao',
  quase_acidente: 'Quase acidente',
  acidente_com_lesao: 'Acidente com lesao',
  acidente_com_afastamento: 'Acidente com afastamento',
  dano_material: 'Dano material',
  condicao_insegura: 'Condicao insegura',
  comportamento_inseguro: 'Comportamento inseguro',
  ocorrencia_ambiental: 'Ocorrencia ambiental',
  emergencia: 'Emergencia',
};

const statusLabels: Record<IncidentStatus, string> = {
  aberto: 'Aberto',
  em_investigacao: 'Em investigacao',
  aguardando_acao: 'Aguardando acao',
  concluido: 'Concluido',
  cancelado: 'Cancelado',
};

const severityLabels: Record<IncidentSeverity, string> = {
  baixa: 'Baixa',
  media: 'Media',
  alta: 'Alta',
  critica: 'Critica',
};

const probabilityLabels: Record<IncidentProbability, string> = {
  baixa: 'Baixa',
  media: 'Media',
  alta: 'Alta',
};

const riskLabels: Record<IncidentRisk, string> = {
  baixo: 'Baixo',
  medio: 'Medio',
  alto: 'Alto',
  critico: 'Critico',
};

const actionTypeLabels: Record<IncidentActionType, string> = {
  medida_imediata: 'Medida imediata',
  acao_corretiva: 'Acao corretiva',
  acao_preventiva: 'Acao preventiva',
  orientacao: 'Orientacao',
  treinamento: 'Treinamento',
  substituicao_de_epi: 'Substituicao de EPI',
  manutencao: 'Manutencao',
  sinalizacao: 'Sinalizacao',
  bloqueio_de_area: 'Bloqueio de area',
  revisao_de_procedimento: 'Revisao de procedimento',
};

const actionStatusLabels: Record<IncidentActionStatus, string> = {
  aberta: 'Aberta',
  em_andamento: 'Em andamento',
  concluida: 'Concluida',
  atrasada: 'Atrasada',
  cancelada: 'Cancelada',
};

const emptyWitness: IncidentWitnessFormValues = { nome: '', contato: '', funcao: '', relato: '' };
const emptyAction: IncidentActionFormValues = { tipo_acao: 'acao_preventiva', descricao: '', responsavel: '', prazo: '', status: 'aberta', data_conclusao: '', evidencia_url: '', observacoes: '' };

const emptyForm: IncidentFormValues = {
  titulo: '',
  tipo_ocorrencia: 'incidente_sem_lesao',
  data_ocorrencia: today,
  hora_ocorrencia: nowTime,
  local: '',
  setor: '',
  colaborador_id: '',
  descricao: '',
  atividade_realizada: '',
  houve_lesao: false,
  tipo_lesao: '',
  parte_corpo_atingida: '',
  houve_afastamento: false,
  dias_afastamento: 0,
  houve_dano_material: false,
  descricao_dano_material: '',
  gravidade: 'baixa',
  probabilidade: 'baixa',
  nivel_risco: 'baixo',
  causa_imediata: '',
  causa_raiz: '',
  medidas_imediatas: '',
  acao_corretiva: '',
  acao_preventiva: '',
  responsavel_investigacao: '',
  prazo_investigacao: '',
  status: 'aberto',
  data_conclusao: '',
  evidencia_url: '',
  foto_url: '',
  observacoes: '',
  resumo_investigacao: '',
  causa_raiz_confirmada: '',
  correcao_realizada: '',
  prevencao_recomendada: '',
  responsavel_conclusao: '',
  evidencia_final_url: '',
  epi_obrigatorio: false,
  epi_entregue: false,
  epi_utilizado: false,
  epi_adequado: false,
  observacao_epi: '',
  treinamento_obrigatorio: false,
  treinamento_realizado: false,
  treinamento_valido: false,
  treinamento_relacionado_id: '',
  observacao_treinamento: '',
  testemunhas: [],
  acoes: [],
};

const emptyConclusion: IncidentConclusionValues = {
  resumo_investigacao: '',
  causa_raiz_confirmada: '',
  correcao_realizada: '',
  prevencao_recomendada: '',
  data_conclusao: today,
  responsavel_conclusao: '',
  evidencia_final_url: '',
  observacoes: '',
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

function uniqueValues<T>(items: T[], getValue: (item: T) => string | undefined | null) {
  return Array.from(new Set(items.map(getValue).map((item) => item?.trim()).filter(Boolean) as string[])).sort();
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

function isOpenStatus(status: IncidentStatus) {
  return !['concluido', 'cancelado'].includes(status);
}

function dueText(value?: string, status?: IncidentStatus) {
  const days = daysUntil(value);
  if (!value || days === null) return 'Sem prazo';
  if (days < 0 && (!status || isOpenStatus(status))) return `Atrasada ha ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoje';
  if (days > 0) return `Vence em ${days} dias`;
  return 'Prazo encerrado';
}

function hasEvidence(item: Incident) {
  return Boolean(item.evidencia_url || item.foto_url || item.evidencia_final_url);
}

function hasPreventiveAction(item: Incident) {
  return Boolean(item.acao_preventiva || (item.acoes || []).some((action) => action.tipo_acao === 'acao_preventiva'));
}

function isInvestigationOverdue(item: Incident) {
  const days = daysUntil(item.prazo_investigacao);
  return isOpenStatus(item.status) && days !== null && days < 0;
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

function statusStyle(status: IncidentStatus | IncidentActionStatus) {
  if (status === 'concluido' || status === 'concluida') return 'bg-[#dff7e5] text-[#18703a]';
  if (status === 'cancelado' || status === 'cancelada') return 'bg-[#eceef1] text-[#584237]';
  if (status === 'aguardando_acao' || status === 'atrasada') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (status === 'em_investigacao' || status === 'em_andamento') return 'bg-[#dfe7f5] text-[#334766]';
  return 'bg-[#fff0d8] text-[#8a4b00]';
}

function severityStyle(severity: IncidentSeverity | IncidentRisk) {
  if (severity === 'critica' || severity === 'critico') return 'bg-[#ffdad6] text-[#93000a]';
  if (severity === 'alta' || severity === 'alto') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media' || severity === 'medio') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

export function IncidentsTable({ companyId }: IncidentsTableProps) {
  const [bundle, setBundle] = useState<Bundle>({ collaborators: [], incidents: [] });
  const [costs, setCosts] = useState<CostPrevention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [severityFilter, setSeverityFilter] = useState('todas');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [localFilter, setLocalFilter] = useState('todos');
  const [collaboratorFilter, setCollaboratorFilter] = useState('todos');
  const [responsibleFilter, setResponsibleFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('todos');
  const [injuryFilter, setInjuryFilter] = useState('todos');
  const [riskFilter, setRiskFilter] = useState('todos');
  const [absenceFilter, setAbsenceFilter] = useState('todos');
  const [damageFilter, setDamageFilter] = useState('todos');
  const [rootCauseFilter, setRootCauseFilter] = useState('todos');
  const [preventiveFilter, setPreventiveFilter] = useState('todos');
  const [overdueFilter, setOverdueFilter] = useState('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('list');
  const [form, setForm] = useState<IncidentFormValues>(emptyForm);
  const [editing, setEditing] = useState<Incident | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Incident | null>(null);
  const [concluding, setConcluding] = useState<Incident | null>(null);
  const [conclusionForm, setConclusionForm] = useState<IncidentConclusionValues>(emptyConclusion);
  const [archiving, setArchiving] = useState<Incident | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [result, costResult] = await Promise.all([
        getIncidentModuleData(companyId),
        getCostPreventionModuleData(companyId),
      ]);
      if (result.success && result.data) setBundle(result.data as Bundle);
      else toast({ variant: 'destructive', title: 'Erro ao buscar incidentes', description: getToastError(result.error) });
      if (costResult.success && costResult.data) setCosts((costResult.data as { costs: CostPrevention[] }).costs || []);
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Nao foi possivel carregar Incidentes.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) void loadData();
  }, [companyId]);

  const sectors = useMemo(() => uniqueValues(bundle.incidents, (item) => item.setor), [bundle.incidents]);
  const locals = useMemo(() => uniqueValues(bundle.incidents, (item) => item.local), [bundle.incidents]);
  const responsibles = useMemo(() => uniqueValues(bundle.incidents, (item) => item.responsavel_investigacao), [bundle.incidents]);

  const pendingItems = useMemo<IncidentPendingItem[]>(() => {
    const output: IncidentPendingItem[] = [];
    bundle.incidents.forEach((item) => {
      if (!isOpenStatus(item.status)) return;
      if (!item.responsavel_investigacao) output.push({ id: `responsible-${item.id}`, type: 'Sem responsavel', incident: item, description: 'Definir responsavel pela investigacao.', due: dueText(item.prazo_investigacao, item.status), severity: item.gravidade === 'critica' ? 'critica' : 'alta', action: 'responsible' });
      if (!item.causa_raiz) output.push({ id: `root-${item.id}`, type: 'Sem causa raiz', incident: item, description: 'Completar analise de causa raiz.', due: dueText(item.prazo_investigacao, item.status), severity: 'alta', action: 'root_cause' });
      if (!hasPreventiveAction(item)) output.push({ id: `preventive-${item.id}`, type: 'Sem acao preventiva', incident: item, description: 'Criar acao preventiva para evitar recorrencia.', due: dueText(item.prazo_investigacao, item.status), severity: 'media', action: 'preventive' });
      if (isInvestigationOverdue(item)) output.push({ id: `overdue-${item.id}`, type: 'Investigacao atrasada', incident: item, description: 'Prazo da investigacao vencido.', due: dueText(item.prazo_investigacao, item.status), severity: 'critica', action: 'conclude' });
      if (item.gravidade === 'critica' || item.nivel_risco === 'critico') output.push({ id: `critical-${item.id}`, type: 'Critico aberto', incident: item, description: 'Incidente critico requer tratativa prioritaria.', due: dueText(item.prazo_investigacao, item.status), severity: 'critica', action: 'details' });
      if (!hasEvidence(item)) output.push({ id: `evidence-${item.id}`, type: 'Sem evidencia', incident: item, description: 'Anexar fotos, documentos ou relatos.', due: dueText(item.prazo_investigacao, item.status), severity: 'media', action: 'details' });
    });
    return output;
  }, [bundle.incidents]);

  const filtered = useMemo(() => {
    const query = normalize(search);
    return bundle.incidents.filter((item) => {
      const collaborator = item.colaborador?.nome_completo || '';
      const witnesses = (item.testemunhas || []).map((witness) => `${witness.nome} ${witness.relato}`).join(' ');
      const text = [item.titulo, item.descricao, collaborator, item.setor, item.local, item.responsavel_investigacao, item.causa_imediata, item.causa_raiz, witnesses].join(' ');
      const occurrence = new Date(item.data_ocorrencia);
      const now = new Date();
      const last30 = new Date();
      last30.setDate(now.getDate() - 30);
      const matchesPeriod = periodFilter === 'todos' || (periodFilter === '30' && occurrence >= last30) || (periodFilter === 'ano' && occurrence.getFullYear() === now.getFullYear());
      return (!query || normalize(text).includes(query))
        && (typeFilter === 'todos' || item.tipo_ocorrencia === typeFilter)
        && (statusFilter === 'todos' || item.status === statusFilter)
        && (severityFilter === 'todas' || item.gravidade === severityFilter)
        && (riskFilter === 'todos' || item.nivel_risco === riskFilter)
        && (sectorFilter === 'todos' || item.setor === sectorFilter)
        && (localFilter === 'todos' || item.local === localFilter)
        && (collaboratorFilter === 'todos' || item.colaborador_id === collaboratorFilter)
        && (responsibleFilter === 'todos' || item.responsavel_investigacao === responsibleFilter)
        && matchesPeriod
        && (injuryFilter === 'todos' || (injuryFilter === 'sim' ? item.houve_lesao : !item.houve_lesao))
        && (absenceFilter === 'todos' || (absenceFilter === 'sim' ? item.houve_afastamento : !item.houve_afastamento))
        && (damageFilter === 'todos' || (damageFilter === 'sim' ? item.houve_dano_material : !item.houve_dano_material))
        && (rootCauseFilter === 'todos' || (rootCauseFilter === 'sim' ? Boolean(item.causa_raiz) : !item.causa_raiz))
        && (preventiveFilter === 'todos' || (preventiveFilter === 'sim' ? hasPreventiveAction(item) : !hasPreventiveAction(item)))
        && (overdueFilter === 'todos' || (overdueFilter === 'sim' ? isInvestigationOverdue(item) : !isInvestigationOverdue(item)));
    });
  }, [absenceFilter, bundle.incidents, collaboratorFilter, damageFilter, injuryFilter, localFilter, overdueFilter, periodFilter, preventiveFilter, responsibleFilter, riskFilter, rootCauseFilter, search, sectorFilter, severityFilter, statusFilter, typeFilter]);

  const stats = useMemo(() => {
    const actionsOpen = bundle.incidents.flatMap((item) => item.acoes || []).filter((action) => ['aberta', 'em_andamento', 'atrasada'].includes(action.status) && action.tipo_acao === 'acao_preventiva').length;
    return [
      { label: 'Total de incidentes', value: bundle.incidents.length, icon: ClipboardList, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => setStatusFilter('todos') },
      { label: 'Incidentes abertos', value: bundle.incidents.filter((item) => item.status === 'aberto').length, icon: Siren, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setStatusFilter('aberto') },
      { label: 'Em investigacao', value: bundle.incidents.filter((item) => item.status === 'em_investigacao').length, icon: TimerReset, className: 'bg-[#dfe7f5] text-[#334766]', onClick: () => setStatusFilter('em_investigacao') },
      { label: 'Concluidos', value: bundle.incidents.filter((item) => item.status === 'concluido').length, icon: CheckCircle2, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setStatusFilter('concluido') },
      { label: 'Quase acidentes', value: bundle.incidents.filter((item) => item.tipo_ocorrencia === 'quase_acidente').length, icon: AlertTriangle, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setTypeFilter('quase_acidente') },
      { label: 'Acidentes com lesao', value: bundle.incidents.filter((item) => item.houve_lesao || item.tipo_ocorrencia === 'acidente_com_lesao').length, icon: ShieldAlert, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setInjuryFilter('sim') },
      { label: 'Acidentes com afastamento', value: bundle.incidents.filter((item) => item.houve_afastamento || item.tipo_ocorrencia === 'acidente_com_afastamento').length, icon: UserRound, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setAbsenceFilter('sim') },
      { label: 'Danos materiais', value: bundle.incidents.filter((item) => item.houve_dano_material || item.tipo_ocorrencia === 'dano_material').length, icon: Wrench, className: 'bg-[#eceef1] text-[#584237]', onClick: () => setDamageFilter('sim') },
      { label: 'Incidentes criticos', value: bundle.incidents.filter((item) => item.gravidade === 'critica' || item.nivel_risco === 'critico').length, icon: Siren, className: 'bg-[#ffdad6] text-[#93000a]', onClick: () => setSeverityFilter('critica') },
      { label: 'Investigacoes atrasadas', value: bundle.incidents.filter(isInvestigationOverdue).length, icon: XCircle, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setOverdueFilter('sim') },
      { label: 'Acoes preventivas abertas', value: actionsOpen, icon: AlertTriangle, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setActiveView('preventive') },
    ];
  }, [bundle.incidents]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, testemunhas: [], acoes: [] });
    setIsFormOpen(true);
  };

  const openEdit = (item: Incident) => {
    setEditing(item);
    setForm(incidentToForm(item));
    setIsFormOpen(true);
  };

  const handleSave = () => {
    startTransition(async () => {
      const payload = { ...form, companyId };
      const result = editing ? await updateIncident(editing.id, payload) : await createIncident(payload);
      if (result.success) {
        toast({ title: editing ? 'Incidente atualizado' : 'Incidente criado', description: 'Registro salvo com sucesso.' });
        setIsFormOpen(false);
        setEditing(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao salvar', description: getToastError(result.error) });
    });
  };

  const handleConclude = () => {
    if (!concluding) return;
    startTransition(async () => {
      const result = await concludeIncident(concluding.id, companyId, conclusionForm);
      if (result.success) {
        toast({ title: 'Investigacao concluida', description: 'Conclusao registrada e status atualizado.' });
        setConcluding(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao concluir', description: getToastError(result.error) });
    });
  };

  const handleArchive = () => {
    if (!archiving) return;
    startTransition(async () => {
      const result = await archiveIncident(archiving.id, companyId);
      if (result.success) {
        toast({ title: 'Incidente arquivado', description: 'Registro cancelado e removido da lista ativa.' });
        setArchiving(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao arquivar', description: getToastError(result.error) });
    });
  };

  const handleCreateNc = (item: Incident) => {
    startTransition(async () => {
      const result = await createNonconformityFromIncident(item.id, companyId);
      if (result.success) toast({ title: 'Nao conformidade criada', description: 'Registro aberto com dados do incidente.' });
      else toast({ variant: 'destructive', title: 'Erro ao criar nao conformidade', description: getToastError(result.error) });
    });
  };

  const prepared = (title: string) => {
    toast({ title, description: 'Estrutura preparada para evolucao sem alterar os registros atuais.' });
  };

  const resetFilters = () => {
    setSearch('');
    setTypeFilter('todos');
    setStatusFilter('todos');
    setSeverityFilter('todas');
    setSectorFilter('todos');
    setLocalFilter('todos');
    setCollaboratorFilter('todos');
    setResponsibleFilter('todos');
    setPeriodFilter('todos');
    setInjuryFilter('todos');
    setRiskFilter('todos');
    setAbsenceFilter('todos');
    setDamageFilter('todos');
    setRootCauseFilter('todos');
    setPreventiveFilter('todos');
    setOverdueFilter('todos');
  };

  const exportReport = () => {
    const success = downloadCsv(`relatorio-incidentes-${Date.now()}.csv`, filtered.map((item) => ({
      titulo: item.titulo,
      tipo: typeLabels[item.tipo_ocorrencia],
      data: formatDate(item.data_ocorrencia),
      local: item.local,
      setor: item.setor,
      colaborador: item.colaborador?.nome_completo || '',
      gravidade: severityLabels[item.gravidade],
      risco: riskLabels[item.nivel_risco],
      status: statusLabels[item.status],
      responsavel_investigacao: item.responsavel_investigacao || '',
      prazo_investigacao: formatDate(item.prazo_investigacao),
      prazo_status: dueText(item.prazo_investigacao, item.status),
      causa_raiz: item.causa_raiz || '',
      acao_preventiva: item.acao_preventiva || '',
    })));
    toast(success ? { title: 'CSV exportado', description: 'Relatorio de incidentes gerado com os filtros atuais.' } : { variant: 'destructive', title: 'Nada para exportar', description: 'Nenhum incidente encontrado para exportacao.' });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl space-y-3">
          <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Incidentes</h2>
          <p className="text-[1.05rem] leading-8 text-[#4f5f7a]">Registre, investigue e acompanhe incidentes, quase acidentes, acidentes e acoes preventivas.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
          <Button onClick={openCreate} className="h-14 rounded-xl bg-[#f46e11] px-7 text-base font-bold text-white shadow-[0_8px_18px_rgba(244,110,17,0.24)] hover:bg-[#e96710]"><Plus className="mr-2 h-5 w-5" />Novo Incidente</Button>
          <Button variant="outline" onClick={() => { openCreate(); setForm((current) => ({ ...current, titulo: 'Registro rapido de incidente', status: 'aberto' })); }} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><TimerReset className="mr-2 h-5 w-5" />Registro Rapido</Button>
          <Button variant="outline" onClick={() => setActiveView('pendings')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><AlertTriangle className="mr-2 h-5 w-5" />Investigacoes Pendentes</Button>
          <Button variant="outline" onClick={() => setActiveView('preventive')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><ShieldAlert className="mr-2 h-5 w-5" />Acoes Preventivas</Button>
          <Button variant="outline" onClick={exportReport} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><Download className="mr-2 h-5 w-5" />Exportar Relatorio</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        {stats.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.35fr_0.9fr_0.9fr_0.8fr_auto_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5f7a]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por titulo, descricao, colaborador, setor, local ou responsavel" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] pl-10" /></div>
          <FilterSelect value={typeFilter} onValueChange={setTypeFilter} options={[['todos', 'Tipos'], ...Object.entries(typeLabels)]} />
          <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={[['todos', 'Status'], ...Object.entries(statusLabels)]} />
          <FilterSelect value={severityFilter} onValueChange={setSeverityFilter} options={[['todas', 'Gravidade'], ...Object.entries(severityLabels)]} />
          <Button variant="outline" onClick={() => setShowAdvancedFilters((value) => !value)} className="h-11 rounded-md"><Filter className="mr-2 h-4 w-4" />Filtros avancados</Button>
          <Button variant="ghost" onClick={resetFilters} className="h-11 rounded-md">Limpar filtros</Button>
        </div>
        {showAdvancedFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect value={riskFilter} onValueChange={setRiskFilter} options={[['todos', 'Todos riscos'], ...Object.entries(riskLabels)]} />
            <FilterSelect value={sectorFilter} onValueChange={setSectorFilter} options={[['todos', 'Setores'], ...sectors.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={localFilter} onValueChange={setLocalFilter} options={[['todos', 'Locais'], ...locals.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={collaboratorFilter} onValueChange={setCollaboratorFilter} options={[['todos', 'Colaboradores'], ...bundle.collaborators.map((item) => [item.id, item.nome_completo] as [string, string])]} />
            <FilterSelect value={responsibleFilter} onValueChange={setResponsibleFilter} options={[['todos', 'Investigadores'], ...responsibles.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={periodFilter} onValueChange={setPeriodFilter} options={[['todos', 'Periodo'], ['30', 'Ultimos 30 dias'], ['ano', 'Ano atual']]} />
            <FilterSelect value={injuryFilter} onValueChange={setInjuryFilter} options={[['todos', 'Lesao'], ['sim', 'Com lesao'], ['nao', 'Sem lesao']]} />
            <FilterSelect value={absenceFilter} onValueChange={setAbsenceFilter} options={[['todos', 'Afastamento'], ['sim', 'Com afastamento'], ['nao', 'Sem afastamento']]} />
            <FilterSelect value={damageFilter} onValueChange={setDamageFilter} options={[['todos', 'Dano material'], ['sim', 'Com dano'], ['nao', 'Sem dano']]} />
            <FilterSelect value={rootCauseFilter} onValueChange={setRootCauseFilter} options={[['todos', 'Causa raiz'], ['sim', 'Com causa raiz'], ['nao', 'Sem causa raiz']]} />
            <FilterSelect value={preventiveFilter} onValueChange={setPreventiveFilter} options={[['todos', 'Acao preventiva'], ['sim', 'Com acao preventiva'], ['nao', 'Sem acao preventiva']]} />
            <FilterSelect value={overdueFilter} onValueChange={setOverdueFilter} options={[['todos', 'Prazo investigacao'], ['sim', 'Atrasada'], ['nao', 'No prazo']] } />
          </div>
        )}
      </div>

      <AlertsPanel items={bundle.incidents} />

      <div className="flex flex-wrap gap-2">
        <Button variant={activeView === 'list' ? 'default' : 'outline'} onClick={() => setActiveView('list')} className={cn('rounded-md', activeView === 'list' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Lista de incidentes</Button>
        <Button variant={activeView === 'pendings' ? 'default' : 'outline'} onClick={() => setActiveView('pendings')} className={cn('rounded-md', activeView === 'pendings' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Investigacoes Pendentes</Button>
        <Button variant={activeView === 'preventive' ? 'default' : 'outline'} onClick={() => setActiveView('preventive')} className={cn('rounded-md', activeView === 'preventive' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Acoes Preventivas</Button>
        <Button variant="outline" onClick={() => prepared('Acoes em lote preparadas')} className="rounded-md">Acoes em lote</Button>
      </div>

      {activeView === 'pendings' ? (
        <IncidentPendingsPanel items={pendingItems} onView={setViewing} onEdit={openEdit} onConclude={(item) => { setConcluding(item); setConclusionForm({ ...emptyConclusion, causa_raiz_confirmada: item.causa_raiz || '', correcao_realizada: item.acao_corretiva || '', prevencao_recomendada: item.acao_preventiva || '', responsavel_conclusao: item.responsavel_investigacao || '' }); }} onPrepared={prepared} />
      ) : activeView === 'preventive' ? (
        <PreventiveActionsPanel incidents={filtered} onView={setViewing} onPrepared={prepared} />
      ) : (
      <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
        <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Lista de incidentes</h3><p className="text-sm text-[#4f5f7a]">{filtered.length} registros encontrados</p></div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1500px] border-collapse text-left">
            <thead><tr className="bg-[#fbfbfc] text-sm uppercase tracking-[0.06em] text-[#4f5f7a]"><th className="px-5 py-4 font-bold">Incidente</th><th className="px-5 py-4 font-bold">Tipo</th><th className="px-5 py-4 font-bold">Data</th><th className="px-5 py-4 font-bold">Local/Setor</th><th className="px-5 py-4 font-bold">Colaborador</th><th className="px-5 py-4 font-bold">Gravidade</th><th className="px-5 py-4 font-bold">Investigacao</th><th className="px-5 py-4 font-bold">Acoes preventivas</th><th className="px-5 py-4 font-bold">Status</th><th className="px-5 py-4 text-right font-bold">Acoes</th></tr></thead>
            <tbody className="divide-y divide-[#e0c0b1]">
              {isLoading ? Array.from({ length: 4 }).map((_, index) => <LoadingRow key={index} />) : filtered.length === 0 ? <tr><td colSpan={10} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhum incidente encontrado.</td></tr> : filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#fafbfd]">
                  <td className="px-5 py-5"><p className="font-bold text-[#191c1e]">{item.titulo}</p><p className="text-xs text-[#4f5f7a]">{item.descricao.slice(0, 90)}</p></td>
                  <td className="px-5 py-5 text-[#3f5a88]">{typeLabels[item.tipo_ocorrencia]}</td>
                  <td className="px-5 py-5 text-[#3f5a88]">{formatDate(item.data_ocorrencia)}</td>
                  <td className="px-5 py-5 text-[#191c1e]"><p>{item.local}</p><p className="text-xs text-[#4f5f7a]">{item.setor}</p></td>
                  <td className="px-5 py-5 text-[#191c1e]">{item.colaborador?.nome_completo || '-'}</td>
                  <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', severityStyle(item.gravidade))}>{severityLabels[item.gravidade]}</Badge></td>
                  <td className="px-5 py-5 text-[#191c1e]"><p>{item.responsavel_investigacao || 'Sem responsavel'}</p><p className="text-xs text-[#4f5f7a]">{item.causa_raiz ? dueText(item.prazo_investigacao, item.status) : 'Sem causa raiz'}</p></td>
                  <td className="px-5 py-5 text-[#191c1e]">{(item.acoes || []).filter((action) => action.tipo_acao === 'acao_preventiva' && ['aberta', 'em_andamento', 'atrasada'].includes(action.status)).length}</td>
                  <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', statusStyle(item.status))}>{statusLabels[item.status]}</Badge></td>
                  <td className="px-5 py-5"><div className="flex justify-end gap-1"><IconButton title="Visualizar" onClick={() => setViewing(item)} icon={Eye} /><IconButton title="Editar" onClick={() => openEdit(item)} icon={Edit} /><IncidentRowMenu item={item} onView={() => setViewing(item)} onEdit={() => openEdit(item)} onConclude={() => { setConcluding(item); setConclusionForm({ ...emptyConclusion, causa_raiz_confirmada: item.causa_raiz || '', correcao_realizada: item.acao_corretiva || '', prevencao_recomendada: item.acao_preventiva || '', responsavel_conclusao: item.responsavel_investigacao || '' }); }} onCreateNc={() => handleCreateNc(item)} onArchive={() => setArchiving(item)} onPrepared={prepared} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {filtered.length === 0 ? <p className="rounded-xl border border-dashed border-[#ccb4a6] p-6 text-center text-sm text-[#4f5f7a]">Nenhum incidente encontrado.</p> : filtered.map((item) => <IncidentMobileCard key={item.id} item={item} onView={() => setViewing(item)} onEdit={() => openEdit(item)} onConclude={() => { setConcluding(item); setConclusionForm({ ...emptyConclusion, causa_raiz_confirmada: item.causa_raiz || '', responsavel_conclusao: item.responsavel_investigacao || '' }); }} />)}
        </div>
      </div>
      )}

      <DashboardPreparation items={bundle.incidents} />
      <ReportsPreparation />

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar incidente' : 'Novo incidente'}</DialogTitle></DialogHeader>
          <IncidentForm form={form} setForm={setForm} collaborators={bundle.collaborators} onSubmit={handleSave} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader><DialogTitle>Visualizacao do incidente</DialogTitle></DialogHeader>
          {viewing && <IncidentDetails item={viewing} costs={filterCostsByRelation(costs, 'incidente_id', viewing.id)} sectorPreventionCosts={preventionCosts(costs.filter((cost) => cost.setor && cost.setor === viewing.setor))} onConclude={() => { setConcluding(viewing); setConclusionForm({ ...emptyConclusion, causa_raiz_confirmada: viewing.causa_raiz || '', responsavel_conclusao: viewing.responsavel_investigacao || '' }); }} onCreateNc={() => handleCreateNc(viewing)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!concluding} onOpenChange={(open) => !open && setConcluding(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Concluir Investigacao</DialogTitle></DialogHeader>
          <ConclusionForm form={conclusionForm} setForm={setConclusionForm} onSubmit={handleConclude} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiving} onOpenChange={(open) => !open && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Arquivar ou cancelar incidente?</AlertDialogTitle><AlertDialogDescription>Esta acao marca o incidente como cancelado e remove da lista ativa, mantendo o historico.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleArchive} disabled={isPending} className="bg-[#ba1a1a] hover:bg-[#93000a]">{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Arquivar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function incidentToForm(item: Incident): IncidentFormValues {
  return {
    ...emptyForm,
    titulo: item.titulo || '',
    tipo_ocorrencia: item.tipo_ocorrencia || 'incidente_sem_lesao',
    data_ocorrencia: item.data_ocorrencia || today,
    hora_ocorrencia: item.hora_ocorrencia || '',
    local: item.local || '',
    setor: item.setor || '',
    colaborador_id: item.colaborador_id || '',
    descricao: item.descricao || '',
    atividade_realizada: item.atividade_realizada || '',
    houve_lesao: Boolean(item.houve_lesao),
    tipo_lesao: item.tipo_lesao || '',
    parte_corpo_atingida: item.parte_corpo_atingida || '',
    houve_afastamento: Boolean(item.houve_afastamento),
    dias_afastamento: item.dias_afastamento || 0,
    houve_dano_material: Boolean(item.houve_dano_material),
    descricao_dano_material: item.descricao_dano_material || '',
    gravidade: item.gravidade || 'baixa',
    probabilidade: item.probabilidade || 'baixa',
    nivel_risco: item.nivel_risco || 'baixo',
    causa_imediata: item.causa_imediata || '',
    causa_raiz: item.causa_raiz || '',
    medidas_imediatas: item.medidas_imediatas || '',
    acao_corretiva: item.acao_corretiva || '',
    acao_preventiva: item.acao_preventiva || '',
    responsavel_investigacao: item.responsavel_investigacao || '',
    prazo_investigacao: item.prazo_investigacao || '',
    status: item.status || 'aberto',
    data_conclusao: item.data_conclusao || '',
    evidencia_url: item.evidencia_url || '',
    foto_url: item.foto_url || '',
    observacoes: item.observacoes || '',
    resumo_investigacao: item.resumo_investigacao || '',
    causa_raiz_confirmada: item.causa_raiz_confirmada || '',
    correcao_realizada: item.correcao_realizada || '',
    prevencao_recomendada: item.prevencao_recomendada || '',
    responsavel_conclusao: item.responsavel_conclusao || '',
    evidencia_final_url: item.evidencia_final_url || '',
    epi_obrigatorio: Boolean(item.epi_obrigatorio),
    epi_entregue: Boolean(item.epi_entregue),
    epi_utilizado: Boolean(item.epi_utilizado),
    epi_adequado: Boolean(item.epi_adequado),
    observacao_epi: item.observacao_epi || '',
    treinamento_obrigatorio: Boolean(item.treinamento_obrigatorio),
    treinamento_realizado: Boolean(item.treinamento_realizado),
    treinamento_valido: Boolean(item.treinamento_valido),
    treinamento_relacionado_id: item.treinamento_relacionado_id || '',
    observacao_treinamento: item.observacao_treinamento || '',
    testemunhas: item.testemunhas?.map((witness) => ({ nome: witness.nome || '', contato: witness.contato || '', funcao: witness.funcao || '', relato: witness.relato || '' })) || [],
    acoes: item.acoes?.map((action) => ({ tipo_acao: action.tipo_acao, descricao: action.descricao || '', responsavel: action.responsavel || '', prazo: action.prazo || '', status: action.status, data_conclusao: action.data_conclusao || '', evidencia_url: action.evidencia_url || '', observacoes: action.observacoes || '' })) || [],
  };
}

function SummaryCard({ label, value, icon: Icon, className, onClick }: { label: string; value: number; icon: ElementType; className: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#e0c0b1] bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-3"><p className="text-sm font-medium text-[#4f5f7a]">{label}</p><span className={cn('rounded-lg p-2.5', className)}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-[1.8rem] font-bold leading-none text-[#191c1e]">{value}</p></button>;
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

function IncidentRowMenu({ item, onView, onEdit, onConclude, onCreateNc, onArchive, onPrepared }: { item: Incident; onView: () => void; onEdit: () => void; onConclude: () => void; onCreateNc: () => void; onArchive: () => void; onPrepared: (title: string) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><button type="button" className="rounded-lg p-2 text-[#4f5f7a] hover:bg-[#eceef1]" title="Mais acoes"><MoreHorizontal className="h-5 w-5" /></button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><TimerReset className="mr-2 h-4 w-4" />Continuar investigacao</DropdownMenuItem>
        <DropdownMenuItem onClick={onConclude}><CheckCircle2 className="mr-2 h-4 w-4" />Concluir investigacao</DropdownMenuItem>
        <DropdownMenuItem onClick={onCreateNc}><ShieldAlert className="mr-2 h-4 w-4" />Criar Nao Conformidade</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared(`Acao preventiva preparada para ${item.titulo}`)}><AlertTriangle className="mr-2 h-4 w-4" />Criar acao preventiva</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared('Relatorio de investigacao preparado')}><FileText className="mr-2 h-4 w-4" />Gerar relatorio</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onArchive} className="text-[#ba1a1a]"><Archive className="mr-2 h-4 w-4" />Arquivar/cancelar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IncidentMobileCard({ item, onView, onEdit, onConclude }: { item: Incident; onView: () => void; onEdit: () => void; onConclude: () => void }) {
  return (
    <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
      <div className="flex items-start justify-between gap-3"><div><p className="font-bold text-[#191c1e]">{item.titulo}</p><p className="text-sm text-[#4f5f7a]">{typeLabels[item.tipo_ocorrencia]} - {item.setor}</p></div><Badge className={cn('rounded-full px-3 py-1', statusStyle(item.status))}>{statusLabels[item.status]}</Badge></div>
      <p className="mt-3 line-clamp-2 text-sm text-[#4f5f7a]">{item.descricao}</p>
      <div className="mt-4 grid gap-2 text-sm"><p><span className="text-[#4f5f7a]">Local:</span> {item.local}</p><p><span className="text-[#4f5f7a]">Colaborador:</span> {item.colaborador?.nome_completo || '-'}</p><p><span className="text-[#4f5f7a]">Investigacao:</span> {item.responsavel_investigacao || 'Sem responsavel'} - {dueText(item.prazo_investigacao, item.status)}</p><p><span className="text-[#4f5f7a]">Causa raiz:</span> {item.causa_raiz ? 'Definida' : 'Pendente'}</p></div>
      <div className="mt-4 grid grid-cols-3 gap-2"><Button variant="outline" onClick={onView}>Ver</Button><Button variant="outline" onClick={onEdit}>Investigar</Button><Button variant="outline" onClick={onConclude}>Concluir</Button></div>
    </div>
  );
}

function pendingSeverityClass(severity: IncidentPendingItem['severity']) {
  if (severity === 'critica') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (severity === 'alta') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function IncidentPendingsPanel({ items, onView, onEdit, onConclude, onPrepared }: { items: IncidentPendingItem[]; onView: (item: Incident) => void; onEdit: (item: Incident) => void; onConclude: (item: Incident) => void; onPrepared: (title: string) => void }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
      <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Investigacoes Pendentes</h3><p className="text-sm text-[#4f5f7a]">{items.length} pendencias encontradas para responsavel, causa raiz, evidencia e acoes preventivas</p></div>
      <div className="divide-y divide-[#e0c0b1]">
        {items.length === 0 ? <p className="p-8 text-center text-sm text-[#4f5f7a]">Nenhuma investigacao pendente encontrada.</p> : items.map((pending) => (
          <div key={pending.id} className="grid gap-3 p-5 lg:grid-cols-[0.8fr_1.2fr_0.8fr_0.7fr_0.7fr_1fr] lg:items-center">
            <p className="font-bold text-[#191c1e]">{pending.type}</p><div><p className="font-semibold">{pending.incident.titulo}</p><p className="text-xs text-[#4f5f7a]">{pending.incident.setor} - {pending.incident.local}</p></div><p className="text-sm text-[#4f5f7a]">{pending.incident.responsavel_investigacao || 'Sem responsavel'}</p><p className="text-sm text-[#4f5f7a]">{pending.due}</p><Badge className={cn('w-fit rounded-full px-3 py-1', pendingSeverityClass(pending.severity))}>{pending.severity}</Badge>
            <div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => pending.action === 'conclude' ? onConclude(pending.incident) : pending.action === 'details' ? onView(pending.incident) : onEdit(pending.incident)}>{pending.action === 'preventive' ? 'Criar acao' : pending.action === 'root_cause' ? 'Definir causa' : pending.action === 'responsible' ? 'Definir responsavel' : pending.action === 'conclude' ? 'Concluir' : 'Ver detalhes'}</Button><Button size="sm" variant="outline" onClick={() => onView(pending.incident)}>Ver</Button><Button size="sm" variant="outline" onClick={() => onPrepared('Ajuste rapido de investigacao preparado')}>Ajustar</Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PreventiveActionsPanel({ incidents, onView, onPrepared }: { incidents: Incident[]; onView: (item: Incident) => void; onPrepared: (title: string) => void }) {
  const actions = incidents.flatMap((incident) => (incident.acoes || []).filter((action) => action.tipo_acao === 'acao_preventiva').map((action, index) => ({ incident, action, id: `${incident.id}-${index}` })));
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
      <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Acoes Preventivas</h3><p className="text-sm text-[#4f5f7a]">Consolidado de acoes preventivas vinculadas aos incidentes filtrados</p></div>
      <div className="divide-y divide-[#e0c0b1]">
        {actions.length === 0 ? <p className="p-8 text-center text-sm text-[#4f5f7a]">Nenhuma acao preventiva encontrada. Crie uma acao a partir da investigacao do incidente.</p> : actions.map(({ incident, action, id }) => (
          <div key={id} className="grid gap-3 p-5 lg:grid-cols-[1.1fr_1.2fr_0.8fr_0.7fr_0.7fr_0.8fr] lg:items-center">
            <div><p className="font-bold text-[#191c1e]">{incident.titulo}</p><p className="text-xs text-[#4f5f7a]">{incident.setor} - {incident.local}</p></div><p className="text-sm text-[#191c1e]">{action.descricao || 'Sem descricao'}</p><p className="text-sm text-[#4f5f7a]">{action.responsavel || 'Sem responsavel'}</p><p className="text-sm text-[#4f5f7a]">{formatDate(action.prazo)}</p><Badge className={cn('w-fit rounded-full px-3 py-1', statusStyle(action.status))}>{actionStatusLabels[action.status]}</Badge><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onView(incident)}>Ver</Button><Button size="sm" variant="outline" onClick={() => onPrepared('Conclusao/anexo de acao preventiva preparado')}>Ajustar</Button></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('space-y-2 text-sm font-semibold text-[#191c1e]', className)}><span>{label}</span>{children}</label>;
}

function BooleanField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex min-h-11 items-center gap-3 rounded-md border border-[#ccb4a6] bg-[#f7f9fc] px-3 text-sm font-semibold text-[#191c1e]"><Checkbox checked={checked} onCheckedChange={(value) => onChange(Boolean(value))} />{label}</label>;
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: ElementType; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white"><div className="flex items-center gap-2 border-b border-[#e0c0b1] bg-[#eef1f5] px-4 py-3"><Icon className="h-5 w-5 text-[#9e4300]" /><h3 className="font-bold text-[#191c1e]">{title}</h3></div><div className="grid gap-4 p-4 md:grid-cols-2">{children}</div></section>;
}

function IncidentForm({ form, setForm, collaborators, onSubmit, isPending }: { form: IncidentFormValues; setForm: (value: IncidentFormValues) => void; collaborators: Collaborator[]; onSubmit: () => void; isPending: boolean }) {
  const update = <K extends keyof IncidentFormValues>(key: K, value: IncidentFormValues[K]) => setForm({ ...form, [key]: value });
  const updateWitness = (index: number, value: IncidentWitnessFormValues) => update('testemunhas', (form.testemunhas || []).map((item, itemIndex) => itemIndex === index ? value : item));
  const updateAction = (index: number, value: IncidentActionFormValues) => update('acoes', (form.acoes || []).map((item, itemIndex) => itemIndex === index ? value : item));

  return <div className="space-y-5">
    <FormSection title="Dados principais" icon={ClipboardList}>
      <Field label="Titulo do incidente"><Input value={form.titulo} onChange={(e) => update('titulo', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Tipo de ocorrencia"><Select value={form.tipo_ocorrencia} onValueChange={(value) => update('tipo_ocorrencia', value as IncidentType)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(typeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Data da ocorrencia"><Input type="date" value={form.data_ocorrencia} onChange={(e) => update('data_ocorrencia', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Hora da ocorrencia"><Input type="time" value={form.hora_ocorrencia || ''} onChange={(e) => update('hora_ocorrencia', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Local"><Input value={form.local} onChange={(e) => update('local', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Setor"><Input value={form.setor} onChange={(e) => update('setor', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Colaborador envolvido"><Select value={form.colaborador_id || 'none'} onValueChange={(value) => update('colaborador_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem colaborador</SelectItem>{collaborators.map((collaborator) => <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.nome_completo}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Atividade realizada"><Input value={form.atividade_realizada || ''} onChange={(e) => update('atividade_realizada', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Descricao detalhada do ocorrido" className="md:col-span-2"><Textarea value={form.descricao} onChange={(e) => update('descricao', e.target.value)} className="min-h-[120px] border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
    </FormSection>

    <FormSection title="Lesao e dano material" icon={ShieldAlert}>
      <BooleanField label="Houve lesao" checked={form.houve_lesao} onChange={(value) => update('houve_lesao', value)} />
      <BooleanField label="Houve afastamento" checked={form.houve_afastamento} onChange={(value) => update('houve_afastamento', value)} />
      <Field label="Tipo de lesao"><Input value={form.tipo_lesao || ''} onChange={(e) => update('tipo_lesao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Parte do corpo atingida"><Input value={form.parte_corpo_atingida || ''} onChange={(e) => update('parte_corpo_atingida', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Dias de afastamento"><Input type="number" min={0} value={form.dias_afastamento || 0} onChange={(e) => update('dias_afastamento', Number(e.target.value))} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <BooleanField label="Houve dano material" checked={form.houve_dano_material} onChange={(value) => update('houve_dano_material', value)} />
      <Field label="Descricao do dano material" className="md:col-span-2"><Textarea value={form.descricao_dano_material || ''} onChange={(e) => update('descricao_dano_material', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
    </FormSection>

    <FormSection title="Classificacao e investigacao" icon={Siren}>
      <Field label="Gravidade"><Select value={form.gravidade} onValueChange={(value) => update('gravidade', value as IncidentSeverity)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(severityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Probabilidade"><Select value={form.probabilidade} onValueChange={(value) => update('probabilidade', value as IncidentProbability)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(probabilityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Nivel de risco"><Select value={form.nivel_risco} onValueChange={(value) => update('nivel_risco', value as IncidentRisk)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(riskLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Status"><Select value={form.status} onValueChange={(value) => update('status', value as IncidentStatus)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Responsavel pela investigacao"><Input value={form.responsavel_investigacao || ''} onChange={(e) => update('responsavel_investigacao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Prazo da investigacao"><Input type="date" value={form.prazo_investigacao || ''} onChange={(e) => update('prazo_investigacao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Causa imediata"><Textarea value={form.causa_imediata || ''} onChange={(e) => update('causa_imediata', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Causa raiz"><Textarea value={form.causa_raiz || ''} onChange={(e) => update('causa_raiz', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Medidas tomadas imediatamente"><Textarea value={form.medidas_imediatas || ''} onChange={(e) => update('medidas_imediatas', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Acao corretiva"><Textarea value={form.acao_corretiva || ''} onChange={(e) => update('acao_corretiva', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Acao preventiva" className="md:col-span-2"><Textarea value={form.acao_preventiva || ''} onChange={(e) => update('acao_preventiva', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
    </FormSection>

    <FormSection title="Verificacao de EPI e treinamentos" icon={UserRound}>
      <BooleanField label="EPI obrigatorio" checked={form.epi_obrigatorio} onChange={(value) => update('epi_obrigatorio', value)} />
      <BooleanField label="EPI entregue" checked={form.epi_entregue} onChange={(value) => update('epi_entregue', value)} />
      <BooleanField label="EPI utilizado no momento" checked={form.epi_utilizado} onChange={(value) => update('epi_utilizado', value)} />
      <BooleanField label="EPI adequado" checked={form.epi_adequado} onChange={(value) => update('epi_adequado', value)} />
      <Field label="Observacao de EPI" className="md:col-span-2"><Textarea value={form.observacao_epi || ''} onChange={(e) => update('observacao_epi', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <BooleanField label="Treinamento obrigatorio" checked={form.treinamento_obrigatorio} onChange={(value) => update('treinamento_obrigatorio', value)} />
      <BooleanField label="Treinamento realizado" checked={form.treinamento_realizado} onChange={(value) => update('treinamento_realizado', value)} />
      <BooleanField label="Treinamento valido" checked={form.treinamento_valido} onChange={(value) => update('treinamento_valido', value)} />
      <Field label="ID treinamento relacionado"><Input value={form.treinamento_relacionado_id || ''} onChange={(e) => update('treinamento_relacionado_id', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Observacao de treinamento" className="md:col-span-2"><Textarea value={form.observacao_treinamento || ''} onChange={(e) => update('observacao_treinamento', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
    </FormSection>

    <FormSection title="Evidencias" icon={FileText}>
      <Field label="Foto URL"><Input value={form.foto_url || ''} onChange={(e) => update('foto_url', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Anexo/Evidencia URL"><Input value={form.evidencia_url || ''} onChange={(e) => update('evidencia_url', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Observacoes" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(e) => update('observacoes', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
    </FormSection>

    <RepeaterSection title="Testemunhas" buttonLabel="Adicionar testemunha" onAdd={() => update('testemunhas', [...(form.testemunhas || []), { ...emptyWitness }])}>
      {(form.testemunhas || []).map((witness, index) => <div key={index} className="grid gap-3 rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 md:grid-cols-2"><Input placeholder="Nome" value={witness.nome || ''} onChange={(e) => updateWitness(index, { ...witness, nome: e.target.value })} /><Input placeholder="Contato" value={witness.contato || ''} onChange={(e) => updateWitness(index, { ...witness, contato: e.target.value })} /><Input placeholder="Funcao" value={witness.funcao || ''} onChange={(e) => updateWitness(index, { ...witness, funcao: e.target.value })} /><Button type="button" variant="outline" onClick={() => update('testemunhas', (form.testemunhas || []).filter((_, itemIndex) => itemIndex !== index))}>Remover</Button><Textarea placeholder="Relato" value={witness.relato || ''} onChange={(e) => updateWitness(index, { ...witness, relato: e.target.value })} className="md:col-span-2" /></div>)}
    </RepeaterSection>

    <RepeaterSection title="Acoes do incidente" buttonLabel="Adicionar acao" onAdd={() => update('acoes', [...(form.acoes || []), { ...emptyAction }])}>
      {(form.acoes || []).map((action, index) => <div key={index} className="grid gap-3 rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 md:grid-cols-2"><Select value={action.tipo_acao} onValueChange={(value) => updateAction(index, { ...action, tipo_acao: value as IncidentActionType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(actionTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Select value={action.status} onValueChange={(value) => updateAction(index, { ...action, status: value as IncidentActionStatus })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(actionStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Input placeholder="Responsavel" value={action.responsavel || ''} onChange={(e) => updateAction(index, { ...action, responsavel: e.target.value })} /><Input type="date" value={action.prazo || ''} onChange={(e) => updateAction(index, { ...action, prazo: e.target.value })} /><Textarea placeholder="Descricao" value={action.descricao || ''} onChange={(e) => updateAction(index, { ...action, descricao: e.target.value })} className="md:col-span-2" /><Input placeholder="Evidencia URL" value={action.evidencia_url || ''} onChange={(e) => updateAction(index, { ...action, evidencia_url: e.target.value })} /><Button type="button" variant="outline" onClick={() => update('acoes', (form.acoes || []).filter((_, itemIndex) => itemIndex !== index))}>Remover</Button></div>)}
    </RepeaterSection>

    <div className="flex flex-wrap justify-between gap-3 border-t border-[#e0c0b1] pt-5">
      <div className="flex flex-wrap gap-2"><Button type="button" disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar analise do incidente com IA</Button><Button type="button" disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Sugerir acoes preventivas com IA</Button></div>
      <Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar incidente</Button>
    </div>
  </div>;
}

function RepeaterSection({ title, buttonLabel, onAdd, children }: { title: string; buttonLabel: string; onAdd: () => void; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold text-[#191c1e]">{title}</h3><Button type="button" variant="outline" onClick={onAdd}><Plus className="mr-2 h-4 w-4" />{buttonLabel}</Button></div><div className="space-y-3">{children}</div></section>;
}

function ConclusionForm({ form, setForm, onSubmit, isPending }: { form: IncidentConclusionValues; setForm: (value: IncidentConclusionValues) => void; onSubmit: () => void; isPending: boolean }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Resumo da investigacao" className="md:col-span-2"><Textarea value={form.resumo_investigacao} onChange={(e) => setForm({ ...form, resumo_investigacao: e.target.value })} /></Field><Field label="Causa raiz confirmada" className="md:col-span-2"><Textarea value={form.causa_raiz_confirmada} onChange={(e) => setForm({ ...form, causa_raiz_confirmada: e.target.value })} /></Field><Field label="Correcao realizada" className="md:col-span-2"><Textarea value={form.correcao_realizada} onChange={(e) => setForm({ ...form, correcao_realizada: e.target.value })} /></Field><Field label="Prevencao recomendada" className="md:col-span-2"><Textarea value={form.prevencao_recomendada} onChange={(e) => setForm({ ...form, prevencao_recomendada: e.target.value })} /></Field><Field label="Data da conclusao"><Input type="date" value={form.data_conclusao} onChange={(e) => setForm({ ...form, data_conclusao: e.target.value })} /></Field><Field label="Responsavel pela conclusao"><Input value={form.responsavel_conclusao} onChange={(e) => setForm({ ...form, responsavel_conclusao: e.target.value })} /></Field><Field label="Evidencia final"><Input value={form.evidencia_final_url || ''} onChange={(e) => setForm({ ...form, evidencia_final_url: e.target.value })} /></Field><Field label="Observacoes finais"><Textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Concluir investigacao</Button></div></div>;
}

function IncidentDetails({ item, costs, sectorPreventionCosts, onConclude, onCreateNc }: { item: Incident; costs: CostPrevention[]; sectorPreventionCosts: CostPrevention[]; onConclude: () => void; onCreateNc: () => void }) {
  const openDays = daysBetween(item.data_ocorrencia, item.data_conclusao);
  const remaining = daysUntil(item.prazo_investigacao);
  const openActions = (item.acoes || []).filter((action) => ['aberta', 'em_andamento'].includes(action.status)).length;
  const lateActions = (item.acoes || []).filter((action) => action.status === 'atrasada').length;
  const directCosts = costs.filter((cost) => ['incidente', 'afastamento', 'manutencao_corretiva', 'multa_autuacao', 'retrabalho'].includes(cost.categoria));
  const indirectCosts = costs.filter((cost) => !directCosts.includes(cost));
  return <div className="space-y-5"><div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="text-2xl font-bold text-[#191c1e]">{item.titulo}</h3><p className="mt-2 text-[#4f5f7a]">{item.descricao}</p></div><div className="flex flex-wrap gap-2"><Badge className={cn('rounded-full px-3 py-1 uppercase', statusStyle(item.status))}>{statusLabels[item.status]}</Badge><Badge className={cn('rounded-full px-3 py-1 uppercase', severityStyle(item.nivel_risco))}>{riskLabels[item.nivel_risco]}</Badge></div></div></div><div className="grid gap-3 sm:grid-cols-5"><Metric label="Dias em aberto" value={String(openDays ?? '-')} /><Metric label="Status da investigacao" value={statusLabels[item.status]} /><Metric label="Prazo restante" value={remaining === null ? '-' : `${remaining} dias`} /><Metric label="Acoes abertas" value={String(openActions)} /><Metric label="Acoes atrasadas" value={String(lateActions)} /></div><div className="grid gap-4 lg:grid-cols-3"><DetailBlock title="Ocorrencia" items={[['Tipo', typeLabels[item.tipo_ocorrencia]], ['Data', formatDate(item.data_ocorrencia)], ['Hora', item.hora_ocorrencia || '-'], ['Local', item.local], ['Setor', item.setor], ['Colaborador', item.colaborador?.nome_completo || '-'], ['Atividade', item.atividade_realizada || '-']]} /><DetailBlock title="Lesao e dano material" items={[['Houve lesao', item.houve_lesao ? 'Sim' : 'Nao'], ['Tipo de lesao', item.tipo_lesao || '-'], ['Parte atingida', item.parte_corpo_atingida || '-'], ['Houve afastamento', item.houve_afastamento ? 'Sim' : 'Nao'], ['Dias afastamento', String(item.dias_afastamento || 0)], ['Dano material', item.houve_dano_material ? 'Sim' : 'Nao'], ['Descricao do dano', item.descricao_dano_material || '-']]} /><DetailBlock title="Investigacao" items={[['Responsavel', item.responsavel_investigacao || '-'], ['Prazo', formatDate(item.prazo_investigacao)], ['Causa imediata', item.causa_imediata || '-'], ['Causa raiz', item.causa_raiz || '-'], ['Medidas imediatas', item.medidas_imediatas || '-'], ['Acao corretiva', item.acao_corretiva || '-'], ['Acao preventiva', item.acao_preventiva || '-']]} /></div><div className="grid gap-4 lg:grid-cols-2"><DetailBlock title="Verificacao de EPI" items={[['EPI obrigatorio', item.epi_obrigatorio ? 'Sim' : 'Nao'], ['EPI entregue', item.epi_entregue ? 'Sim' : 'Nao'], ['EPI utilizado', item.epi_utilizado ? 'Sim' : 'Nao'], ['EPI adequado', item.epi_adequado ? 'Sim' : 'Nao'], ['Observacao', item.observacao_epi || '-']]} /><DetailBlock title="Verificacao de Treinamentos" items={[['Obrigatorio', item.treinamento_obrigatorio ? 'Sim' : 'Nao'], ['Realizado', item.treinamento_realizado ? 'Sim' : 'Nao'], ['Valido', item.treinamento_valido ? 'Sim' : 'Nao'], ['Treinamento relacionado', item.treinamento_relacionado_id || '-'], ['Observacao', item.observacao_treinamento || '-']]} /></div><div className="grid gap-4 lg:grid-cols-2"><DetailBlock title="Custos do Incidente" items={[['Custos registrados', String(costs.length)], ['Valor total do incidente', formatCurrency(sumCosts(costs))], ['Custos diretos', formatCurrency(sumCosts(directCosts))], ['Custos indiretos', formatCurrency(sumCosts(indirectCosts))], ['Acoes preventivas relacionadas', String((item.acoes || []).filter((action) => action.tipo_acao === 'acao_preventiva').length)], ['Comparacao com prevencao do setor', formatCurrency(sumCosts(sectorPreventionCosts))]]} /><ListBlock title="Comparativo e custos vinculados" empty="Nenhum custo vinculado ao incidente." items={costs.map((cost) => `${formatDate(cost.data_custo)} - ${formatCurrency(cost.valor)} - ${cost.descricao}`)} /></div><ListBlock title="Testemunhas" empty="Sem testemunhas registradas." items={(item.testemunhas || []).map((witness) => `${witness.nome || 'Sem nome'} - ${witness.funcao || '-'}: ${witness.relato || '-'}`)} /><ListBlock title="Acoes corretivas e preventivas" empty="Sem acoes registradas." items={(item.acoes || []).map((action) => `${actionTypeLabels[action.tipo_acao]} - ${actionStatusLabels[action.status]} - ${action.responsavel || 'Sem responsavel'} - prazo ${formatDate(action.prazo)}: ${action.descricao || '-'}`)} /><DetailBlock title="Conclusao da investigacao" items={[['Resumo', item.resumo_investigacao || '-'], ['Causa raiz confirmada', item.causa_raiz_confirmada || '-'], ['Correcao realizada', item.correcao_realizada || '-'], ['Prevencao recomendada', item.prevencao_recomendada || '-'], ['Responsavel conclusao', item.responsavel_conclusao || '-'], ['Data conclusao', formatDate(item.data_conclusao)], ['Evidencias', item.evidencia_final_url || item.evidencia_url || item.foto_url || '-'], ['Observacoes', item.observacoes || '-']]} /><ListBlock title="Historico de alteracoes" empty="Sem historico registrado." items={(item.historico || []).map((entry) => `${entry.action} - ${new Date(entry.at).toLocaleString('pt-BR')}: ${entry.description || '-'}`)} /><div className="flex flex-wrap gap-3"><Button onClick={onConclude} className="bg-[#f46e11] text-white hover:bg-[#e96710]"><CheckCircle2 className="mr-2 h-4 w-4" />Concluir Investigacao</Button><Button disabled variant="outline"><FileText className="mr-2 h-4 w-4" />Gerar Relatorio em PDF</Button><Button onClick={onCreateNc} variant="outline"><ShieldAlert className="mr-2 h-4 w-4" />Criar Nao Conformidade</Button><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar analise do incidente com IA</Button><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Sugerir acoes preventivas com IA</Button></div></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-4"><p className="text-xs font-bold uppercase text-[#4f5f7a]">{label}</p><p className="mt-2 text-lg font-bold text-[#191c1e]">{value}</p></div>;
}

function DetailBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><h4 className="mb-4 font-bold text-[#191c1e]">{title}</h4><div className="space-y-3">{items.map(([label, value]) => <div key={label}><p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p><p className="whitespace-pre-wrap text-sm text-[#191c1e]">{value}</p></div>)}</div></section>;
}

function ListBlock({ title, empty, items }: { title: string; empty: string; items: string[] }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><h4 className="mb-4 font-bold text-[#191c1e]">{title}</h4>{items.length ? <div className="space-y-2">{items.map((item) => <p key={item} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm text-[#191c1e]">{item}</p>)}</div> : <p className="text-sm text-[#4f5f7a]">{empty}</p>}</section>;
}

function AlertsPanel({ items }: { items: Incident[] }) {
  const alerts = useMemo(() => {
    const output: string[] = [];
    items.filter((item) => isOpenStatus(item.status) && (item.gravidade === 'critica' || item.nivel_risco === 'critico')).slice(0, 2).forEach((item) => output.push(`Incidente critico aberto: ${item.titulo}.`));
    items.filter((item) => isOpenStatus(item.status) && daysUntil(item.prazo_investigacao) !== null && Number(daysUntil(item.prazo_investigacao)) < 0).slice(0, 2).forEach((item) => output.push(`Investigacao atrasada: ${item.titulo}.`));
    items.filter((item) => isOpenStatus(item.status) && !item.responsavel_investigacao).slice(0, 2).forEach((item) => output.push(`Incidente sem responsavel: ${item.titulo}.`));
    items.filter((item) => isOpenStatus(item.status) && !item.causa_raiz).slice(0, 2).forEach((item) => output.push(`Incidente sem causa raiz definida: ${item.titulo}.`));
    items.filter((item) => isOpenStatus(item.status) && !item.acao_corretiva).slice(0, 2).forEach((item) => output.push(`Incidente sem acao corretiva: ${item.titulo}.`));
    items.filter((item) => isOpenStatus(item.status) && !item.acao_preventiva).slice(0, 2).forEach((item) => output.push(`Incidente sem acao preventiva: ${item.titulo}.`));
    items.flatMap((item) => item.acoes || []).filter((action) => action.tipo_acao === 'acao_preventiva' && action.status === 'atrasada').slice(0, 2).forEach((action) => output.push(`Acao preventiva atrasada: ${action.descricao || action.responsavel || 'sem descricao'}.`));
    items.filter((item) => item.houve_afastamento || item.tipo_ocorrencia === 'acidente_com_afastamento').slice(0, 2).forEach((item) => output.push(`Acidente com afastamento: ${item.titulo}.`));
    items.filter((item) => item.treinamento_obrigatorio && (!item.treinamento_realizado || !item.treinamento_valido)).slice(0, 2).forEach((item) => output.push(`Incidente relacionado a treinamento pendente/vencido: ${item.titulo}.`));
    items.filter((item) => item.epi_obrigatorio && (!item.epi_entregue || !item.epi_utilizado || !item.epi_adequado)).slice(0, 2).forEach((item) => output.push(`Incidente relacionado a EPI pendente/inadequado: ${item.titulo}.`));
    return output.slice(0, 8);
  }, [items]);
  if (!alerts.length) return null;
  return <div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f1] p-4"><div className="mb-3 flex items-center gap-2 font-bold text-[#8a4b00]"><AlertTriangle className="h-5 w-5" />Alertas importantes</div><div className="grid gap-2 md:grid-cols-2">{alerts.map((alert) => <p key={alert} className="rounded-lg bg-white p-3 text-sm text-[#521f00]">{alert}</p>)}</div></div>;
}

function DashboardPreparation({ items }: { items: Incident[] }) {
  const blocks = [
    ['Incidentes por mes', `${new Set(items.map((item) => item.data_ocorrencia?.slice(0, 7))).size} meses com registros`],
    ['Incidentes por setor', `${new Set(items.map((item) => item.setor)).size} setores`],
    ['Incidentes por tipo', `${new Set(items.map((item) => item.tipo_ocorrencia)).size} tipos`],
    ['Por gravidade', `${items.filter((item) => item.gravidade === 'critica').length} criticos`],
    ['Por status', `${new Set(items.map((item) => item.status)).size} status ativos`],
    ['Causas frequentes', 'Preparado para ranking'],
    ['Acoes abertas', `${items.flatMap((item) => item.acoes || []).filter((action) => ['aberta', 'em_andamento'].includes(action.status)).length} acoes`],
    ['Reincidencia por setor', 'Preparado para indicador'],
  ];
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#9e4300]" /><h3 className="text-lg font-bold text-[#191c1e]">Dashboard do modulo</h3></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{blocks.map(([title, value]) => <div key={title} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4"><p className="text-sm font-bold text-[#191c1e]">{title}</p><p className="mt-1 text-sm text-[#4f5f7a]">{value}</p></div>)}</div></div>;
}

function ReportsPreparation() {
  const reports = ['Por periodo', 'Por setor', 'Por colaborador', 'Por tipo de ocorrencia', 'Por gravidade', 'Quase acidentes', 'Acidentes com lesao', 'Acidentes com afastamento', 'Danos materiais', 'Causas mais frequentes', 'Acoes preventivas abertas', 'Reincidencia por setor', 'Historico individual por colaborador'];
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex items-center justify-between gap-4"><div><h3 className="text-lg font-bold text-[#191c1e]">Relatorios do modulo</h3><p className="text-sm text-[#4f5f7a]">Area preparada para relatorios de incidentes e investigacoes.</p></div><Button disabled variant="outline"><FileText className="mr-2 h-4 w-4" />Gerar Relatorio em PDF</Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{reports.map((report) => <div key={report} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm font-semibold text-[#191c1e]">{report}</div>)}</div></div>;
}
