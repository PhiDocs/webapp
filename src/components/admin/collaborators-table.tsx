'use client';

import { useEffect, useMemo, useState, useTransition, type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Brain,
  Briefcase,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  Filter,
  FileDown,
  FileText,
  GraduationCap,
  History,
  IdCard,
  Loader2,
  Mail,
  MoreHorizontal,
  PackageCheck,
  Pencil,
  Phone,
  Search,
  ShieldAlert,
  Siren,
  Sparkles,
  Upload,
  UserCheck,
  UserPlus,
  Users,
  Wallet,
  X,
  type LucideIcon,
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { navigateCompanySection } from '@/lib/client-navigation';
import { formatCurrency } from '@/lib/cost-prevention';
import type {
  Collaborator,
  CollaboratorAiRecommendations,
  CollaboratorFormValues,
  CollaboratorTraining,
  CostPrevention,
  Epi,
  EpiByFunction,
  EpiDelivery,
  Incident,
  Inspection,
  Nonconformity,
  Training,
} from '@/lib/types';
import { collaboratorFormSchema } from '@/lib/types';
import { generateCollaboratorRecommendations } from '@/server/ai-actions';
import {
  archiveCollaborator,
  createCollaborator,
  getCollaborators,
  updateCollaborator,
} from '@/server/collaborator-actions';
import { createCostPrevention, getCostPreventionModuleData } from '@/server/cost-prevention-actions';
import { createEpiDelivery, getEpiModuleData } from '@/server/epi-actions';
import { createIncident, getIncidentModuleData } from '@/server/incident-actions';
import { getInspectionModuleData } from '@/server/inspection-actions';
import { createNonconformity, getNonconformityModuleData } from '@/server/nonconformity-actions';
import { createTrainingRecord, getTrainingModuleData } from '@/server/training-actions';

interface CollaboratorsTableProps {
  companyId: string;
  companyName?: string;
}

const PAGE_SIZE = 10;

const statusOptions = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'afastado', label: 'Afastado' },
  { value: 'desligado', label: 'Desligado' },
] as const;

type SecurityStatus = 'ok' | 'attention' | 'not_fit' | 'critical';
type AsoStatus = 'all' | 'valid' | 'expired' | 'near' | 'missing';
type SafetyFilter = 'todos' | SecurityStatus;
type TrainingFilter = 'todos' | 'ok' | 'vencido' | 'pendente';
type EpiFilter = 'todos' | 'ok' | 'pendente' | 'vencido';
type FormMode = 'quick' | 'complete';

type CollaboratorContext = {
  collaborator: Collaborator;
  epiDeliveries: EpiDelivery[];
  trainings: CollaboratorTraining[];
  incidents: Incident[];
  costs: CostPrevention[];
  inspections: Inspection[];
  nonconformities: Nonconformity[];
  asoStatus: AsoStatus;
  asoLabel: string;
  asoDays: number | null;
  securityStatus: SecurityStatus;
  securityLabel: string;
  pendingSummary: string;
  pendingItems: PendingDetail[];
  costTotal: number;
};

type PendingDetail = {
  type: string;
  description: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  dueDate?: string;
  status: string;
  actionLabel: string;
  section: string;
};

const defaultValues: CollaboratorFormValues = {
  nome_completo: '',
  cpf: '',
  rg: '',
  data_nascimento: '',
  telefone: '',
  email: '',
  endereco: '',
  foto_url: '',
  matricula: '',
  empresa: '',
  setor: '',
  funcao: '',
  data_admissao: '',
  tipo_contrato: '',
  status: 'ativo',
  gestor_responsavel: '',
  local_trabalho: '',
  turno_trabalho: '',
  atividades_realizadas: '',
  riscos_associados: '',
  aso_validade: '',
  observacoes_seguranca: '',
  observacoes_gerais: '',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'CO';
}

function formatDate(value?: string) {
  if (!value) return 'Nao preenchido';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function normalizeText(value?: string | null) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function daysUntil(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function getAsoInfo(collaborator: Collaborator) {
  const days = daysUntil(collaborator.aso_validade);
  if (!collaborator.aso_validade || days === null) {
    return { status: 'missing' as AsoStatus, label: 'Nao informado', days };
  }
  if (days < 0) {
    return { status: 'expired' as AsoStatus, label: 'Vencido', days };
  }
  if (days <= 30) {
    return { status: 'near' as AsoStatus, label: `Vence em ${days} dias`, days };
  }
  return { status: 'valid' as AsoStatus, label: 'Valido', days };
}

function isAsoPending(collaborator: Collaborator) {
  const { status } = getAsoInfo(collaborator);
  return status === 'expired' || status === 'missing';
}

function getStatusStyle(status: Collaborator['status']) {
  if (status === 'ativo') return 'bg-[#dff7e5] text-[#18703a]';
  if (status === 'afastado') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#eceef1] text-[#4f5f7a]';
}

function getSecurityStyle(status: SecurityStatus) {
  if (status === 'critical') return 'bg-[#ffdad6] text-[#93000a]';
  if (status === 'not_fit') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (status === 'attention') return 'bg-[#fff1c2] text-[#7a5b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function getSeverityStyle(severity: PendingDetail['severity']) {
  if (severity === 'critica') return 'bg-[#ffdad6] text-[#93000a]';
  if (severity === 'alta') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media') return 'bg-[#fff1c2] text-[#7a5b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function uniqueValues(collaborators: Collaborator[], key: keyof Collaborator) {
  return Array.from(new Set(collaborators.map((item) => String(item[key] || '').trim()).filter(Boolean))).sort();
}

function collaboratorToFormValues(collaborator: Collaborator): CollaboratorFormValues {
  return {
    nome_completo: collaborator.nome_completo || '',
    cpf: collaborator.cpf || '',
    rg: collaborator.rg || '',
    data_nascimento: collaborator.data_nascimento || '',
    telefone: collaborator.telefone || '',
    email: collaborator.email || '',
    endereco: collaborator.endereco || '',
    foto_url: collaborator.foto_url || '',
    matricula: collaborator.matricula || '',
    empresa: collaborator.empresa || '',
    setor: collaborator.setor || '',
    funcao: collaborator.funcao || '',
    data_admissao: collaborator.data_admissao || '',
    tipo_contrato: collaborator.tipo_contrato || '',
    status: collaborator.status || 'ativo',
    gestor_responsavel: collaborator.gestor_responsavel || '',
    local_trabalho: collaborator.local_trabalho || '',
    turno_trabalho: collaborator.turno_trabalho || '',
    atividades_realizadas: collaborator.atividades_realizadas || '',
    riscos_associados: collaborator.riscos_associados || '',
    aso_validade: collaborator.aso_validade || '',
    observacoes_seguranca: collaborator.observacoes_seguranca || '',
    observacoes_gerais: collaborator.observacoes_gerais || '',
  };
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return false;
  const headers = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replaceAll('"', '""')}"`;
    }
    return text;
  };
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(',')),
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}

function buildCollaboratorContext(
  collaborator: Collaborator,
  source: {
    epiDeliveries: EpiDelivery[];
    trainings: CollaboratorTraining[];
    incidents: Incident[];
    costs: CostPrevention[];
    inspections: Inspection[];
    nonconformities: Nonconformity[];
  },
): CollaboratorContext {
  const epiDeliveries = source.epiDeliveries.filter((item) => item.colaborador_id === collaborator.id);
  const trainings = source.trainings.filter((item) => item.colaborador_id === collaborator.id);
  const incidents = source.incidents.filter((item) => item.colaborador_id === collaborator.id);
  const costs = source.costs.filter((item) => item.colaborador_id === collaborator.id);
  const inspections = source.inspections.filter((item) => item.colaboradores_vinculados?.includes(collaborator.id));
  const nonconformities = source.nonconformities.filter((item) => item.colaborador_id === collaborator.id);
  const aso = getAsoInfo(collaborator);
  const pendingItems: PendingDetail[] = [];

  const ai = collaborator.ai_recommendations;
  const aiEpiPendings = ai?.epi_pendentes || [];
  const aiTrainingExpired = ai?.treinamentos_vencidos || [];
  const pendingEpis = epiDeliveries.filter((item) => item.status === 'pendente');
  const expiredEpis = epiDeliveries.filter((item) => item.status === 'vencido');
  const nearEpis = epiDeliveries.filter((item) => item.status === 'proximo_troca');
  const pendingTrainings = trainings.filter((item) => item.status === 'pendente');
  const expiredTrainings = trainings.filter((item) => item.status === 'vencido');
  const nearTrainings = trainings.filter((item) => item.status === 'proximo_vencimento');
  const openCriticalIncidents = incidents.filter((item) => item.status !== 'concluido' && item.status !== 'cancelado' && (item.gravidade === 'critica' || item.nivel_risco === 'critico'));
  const openCriticalNonconformities = nonconformities.filter((item) => item.status !== 'resolvida' && item.status !== 'cancelada' && (item.gravidade === 'critica' || item.nivel_risco === 'critico'));
  const openNonconformities = nonconformities.filter((item) => ['aberta', 'em_analise', 'em_correcao', 'atrasada'].includes(item.status));
  const preventiveActions = incidents.flatMap((item) => item.acoes || []).filter((item) => item.status !== 'concluida' && item.status !== 'cancelada');

  aiEpiPendings.slice(0, 3).forEach((item) => pendingItems.push({ type: 'EPI pendente', description: item, severity: 'alta', status: 'pendente', actionLabel: 'Entregar EPI', section: 'epiDeliveries' }));
  pendingEpis.forEach((item) => pendingItems.push({ type: 'EPI pendente', description: item.epi?.nome || 'EPI pendente', severity: 'alta', dueDate: item.data_proxima_troca, status: item.status, actionLabel: 'Entregar EPI', section: 'epiDeliveries' }));
  expiredEpis.forEach((item) => pendingItems.push({ type: 'EPI vencido', description: item.epi?.nome || 'EPI vencido', severity: 'alta', dueDate: item.data_validade || item.data_proxima_troca, status: item.status, actionLabel: 'Renovar EPI', section: 'epiDeliveries' }));
  expiredTrainings.forEach((item) => pendingItems.push({ type: 'Treinamento vencido', description: item.treinamento?.nome || 'Treinamento vencido', severity: 'alta', dueDate: item.data_vencimento, status: item.status, actionLabel: 'Renovar treinamento', section: 'trainings' }));
  aiTrainingExpired.slice(0, 3).forEach((item) => pendingItems.push({ type: 'Treinamento vencido', description: item, severity: 'alta', status: 'vencido', actionLabel: 'Renovar treinamento', section: 'trainings' }));
  pendingTrainings.forEach((item) => pendingItems.push({ type: 'Treinamento pendente', description: item.treinamento?.nome || 'Treinamento pendente', severity: 'media', dueDate: item.data_vencimento, status: item.status, actionLabel: 'Registrar treinamento', section: 'trainings' }));

  if (aso.status === 'expired') pendingItems.push({ type: 'ASO vencido', description: 'ASO ocupacional fora da validade.', severity: 'alta', dueDate: collaborator.aso_validade, status: 'vencido', actionLabel: 'Atualizar ASO', section: 'collaborators' });
  if (aso.status === 'near') pendingItems.push({ type: 'ASO proximo do vencimento', description: aso.label, severity: 'media', dueDate: collaborator.aso_validade, status: 'proximo', actionLabel: 'Atualizar ASO', section: 'collaborators' });
  if (aso.status === 'missing') pendingItems.push({ type: 'ASO nao informado', description: 'Informe a validade do ASO.', severity: 'media', status: 'pendente', actionLabel: 'Atualizar ASO', section: 'collaborators' });

  openNonconformities.forEach((item) => pendingItems.push({ type: 'Nao conformidade aberta', description: item.titulo, severity: item.gravidade === 'critica' ? 'critica' : item.gravidade === 'alta' ? 'alta' : 'media', dueDate: item.prazo_correcao, status: item.status, actionLabel: 'Ver detalhes', section: 'nonconformities' }));
  incidents.filter((item) => ['aberto', 'em_investigacao', 'aguardando_acao'].includes(item.status)).forEach((item) => pendingItems.push({ type: 'Incidente em investigacao', description: item.titulo, severity: item.gravidade === 'critica' ? 'critica' : item.gravidade === 'alta' ? 'alta' : 'media', dueDate: item.prazo_investigacao, status: item.status, actionLabel: 'Ver investigacao', section: 'incidents' }));
  preventiveActions.forEach((item) => pendingItems.push({ type: 'Acao preventiva pendente', description: item.descricao || 'Acao preventiva pendente', severity: item.status === 'atrasada' ? 'alta' : 'media', dueDate: item.prazo, status: item.status, actionLabel: 'Resolver', section: 'incidents' }));

  let securityStatus: SecurityStatus = 'ok';
  if (openCriticalIncidents.length > 0 || openCriticalNonconformities.length > 0 || pendingItems.filter((item) => item.severity === 'critica' || item.severity === 'alta').length >= 4) {
    securityStatus = 'critical';
  } else if (expiredTrainings.length > 0 || expiredEpis.length > 0 || pendingEpis.length > 0 || aiEpiPendings.length > 0 || aiTrainingExpired.length > 0 || aso.status === 'expired') {
    securityStatus = 'not_fit';
  } else if (nearEpis.length > 0 || nearTrainings.length > 0 || aso.status === 'near' || pendingItems.length > 0) {
    securityStatus = 'attention';
  }

  const securityLabel = securityStatus === 'critical' ? 'Critico' : securityStatus === 'not_fit' ? 'Nao apto' : securityStatus === 'attention' ? 'Atencao' : 'Tudo ok';
  const pendingSummary = pendingItems.length === 0
    ? 'Sem pendencias'
    : pendingItems.length === 1
      ? pendingItems[0].type
      : `${pendingItems.length} pendencias`;

  return {
    collaborator,
    epiDeliveries,
    trainings,
    incidents,
    costs,
    inspections,
    nonconformities,
    asoStatus: aso.status,
    asoLabel: aso.label,
    asoDays: aso.days,
    securityStatus,
    securityLabel,
    pendingSummary,
    pendingItems,
    costTotal: costs.reduce((total, item) => total + Number(item.valor || 0), 0),
  };
}

function getToastError(error: unknown, fallback = 'Nao foi possivel concluir a acao.') {
  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.details || record.error;
    if (typeof message === 'string' && message.trim()) return message;

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Use fallback when the error object cannot be serialized.
    }
  }

  return fallback;
}

export function CollaboratorsTable({ companyId, companyName }: CollaboratorsTableProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [epis, setEpis] = useState<Epi[]>([]);
  const [epiMappings, setEpiMappings] = useState<EpiByFunction[]>([]);
  const [trainingCatalog, setTrainingCatalog] = useState<Training[]>([]);
  const [epiDeliveries, setEpiDeliveries] = useState<EpiDelivery[]>([]);
  const [trainings, setTrainings] = useState<CollaboratorTraining[]>([]);
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [nonconformities, setNonconformities] = useState<Nonconformity[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [costs, setCosts] = useState<CostPrevention[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<Collaborator | null>(null);
  const [viewingCollaborator, setViewingCollaborator] = useState<Collaborator | null>(null);
  const [archivingCollaborator, setArchivingCollaborator] = useState<Collaborator | null>(null);
  const [generatingRecommendationsId, setGeneratingRecommendationsId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [safetyFilter, setSafetyFilter] = useState<SafetyFilter>('todos');
  const [asoFilter, setAsoFilter] = useState<AsoStatus | 'todos'>('todos');
  const [trainingFilter, setTrainingFilter] = useState<TrainingFilter>('todos');
  const [epiFilter, setEpiFilter] = useState<EpiFilter>('todos');
  const [companyFilter, setCompanyFilter] = useState('todas');
  const [functionFilter, setFunctionFilter] = useState('todas');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [formMode, setFormMode] = useState<FormMode>('quick');
  const [formStep, setFormStep] = useState(0);
  const [page, setPage] = useState(0);
  const { toast } = useToast();

  const form = useForm<CollaboratorFormValues>({
    resolver: zodResolver(collaboratorFormSchema),
    defaultValues,
  });

  const fetchRelatedData = async () => {
    try {
      const [epiResult, trainingResult, inspectionResult, nonconformityResult, incidentResult, costResult] = await Promise.all([
        getEpiModuleData(companyId),
        getTrainingModuleData(companyId),
        getInspectionModuleData(companyId),
        getNonconformityModuleData(companyId),
        getIncidentModuleData(companyId),
        getCostPreventionModuleData(companyId),
      ]);

      if (epiResult.success && epiResult.data) {
        setEpis((epiResult.data as { epis: Epi[] }).epis || []);
        setEpiMappings((epiResult.data as { mappings: EpiByFunction[] }).mappings || []);
        setEpiDeliveries((epiResult.data as { deliveries: EpiDelivery[] }).deliveries || []);
      }
      if (trainingResult.success && trainingResult.data) {
        setTrainingCatalog((trainingResult.data as { trainings: Training[] }).trainings || []);
        setTrainings((trainingResult.data as { records: CollaboratorTraining[] }).records || []);
      }
      if (inspectionResult.success && inspectionResult.data) {
        setInspections((inspectionResult.data as { inspections: Inspection[] }).inspections || []);
      }
      if (nonconformityResult.success && nonconformityResult.data) {
        setNonconformities((nonconformityResult.data as { nonconformities: Nonconformity[] }).nonconformities || []);
      }
      if (incidentResult.success && incidentResult.data) {
        setIncidents((incidentResult.data as { incidents: Incident[] }).incidents || []);
      }
      if (costResult.success && costResult.data) {
        setCosts((costResult.data as { costs: CostPrevention[] }).costs || []);
      }
    } catch {
      toast({ variant: 'destructive', title: 'Dados relacionados', description: 'A lista abriu, mas alguns dados relacionados ainda nao carregaram.' });
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const result = await getCollaborators(companyId);
      if (result.success && result.data) {
        setCollaborators(result.data);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao buscar colaboradores', description: getToastError(result.error) });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Nao foi possivel carregar os colaboradores.' });
    } finally {
      setIsLoading(false);
      void fetchRelatedData();
    }
  };

  useEffect(() => {
    if (companyId) void fetchData();
  }, [companyId]);

  useEffect(() => {
    if (!viewingCollaborator) return;
    const updated = collaborators.find((item) => item.id === viewingCollaborator.id);
    if (updated && updated.updated_at !== viewingCollaborator.updated_at) {
      setViewingCollaborator(updated);
    }
  }, [collaborators, viewingCollaborator]);

  const functions = useMemo(() => uniqueValues(collaborators, 'funcao'), [collaborators]);
  const sectors = useMemo(() => uniqueValues(collaborators, 'setor'), [collaborators]);
  const companies = useMemo(() => uniqueValues(collaborators, 'empresa'), [collaborators]);

  const collaboratorContexts = useMemo(
    () => collaborators.map((collaborator) => buildCollaboratorContext(collaborator, {
      epiDeliveries,
      trainings,
      incidents,
      costs,
      inspections,
      nonconformities,
    })),
    [collaborators, costs, epiDeliveries, incidents, inspections, nonconformities, trainings],
  );

  const filteredCollaborators = useMemo(() => {
    const query = normalizeText(search.trim());
    return collaboratorContexts.filter((context) => {
      const { collaborator } = context;
      const matchesSearch = !query || [
        collaborator.nome_completo,
        collaborator.cpf,
        collaborator.matricula,
        collaborator.funcao,
        collaborator.setor,
        collaborator.email,
      ].filter(Boolean).join(' ').toLowerCase().includes(query);
      const matchesStatus = statusFilter === 'todos' || collaborator.status === statusFilter;
      const matchesSafety = safetyFilter === 'todos' || context.securityStatus === safetyFilter;
      const matchesAso = asoFilter === 'todos' || context.asoStatus === asoFilter;
      const matchesTraining =
        trainingFilter === 'todos' ||
        (trainingFilter === 'ok' && context.trainings.every((item) => !['vencido', 'pendente'].includes(item.status))) ||
        (trainingFilter === 'vencido' && context.trainings.some((item) => item.status === 'vencido')) ||
        (trainingFilter === 'pendente' && context.trainings.some((item) => item.status === 'pendente'));
      const matchesEpi =
        epiFilter === 'todos' ||
        (epiFilter === 'ok' && context.epiDeliveries.every((item) => !['vencido', 'pendente'].includes(item.status))) ||
        (epiFilter === 'vencido' && context.epiDeliveries.some((item) => item.status === 'vencido')) ||
        (epiFilter === 'pendente' && (context.epiDeliveries.some((item) => item.status === 'pendente') || collaborator.ai_recommendations?.epi_pendentes?.length));
      const matchesCompany = companyFilter === 'todas' || collaborator.empresa === companyFilter;
      const matchesFunction = functionFilter === 'todas' || collaborator.funcao === functionFilter;
      const matchesSector = sectorFilter === 'todos' || collaborator.setor === sectorFilter;
      return matchesSearch && matchesStatus && matchesSafety && matchesAso && matchesTraining && matchesEpi && matchesCompany && matchesFunction && matchesSector;
    });
  }, [asoFilter, collaboratorContexts, companyFilter, epiFilter, functionFilter, safetyFilter, search, sectorFilter, statusFilter, trainingFilter]);

  // A pagina e limitada durante o render. Antes um effect corrigia o estado
  // depois, o que custava um render extra a cada filtro digitado.
  const totalPages = Math.max(1, Math.ceil(filteredCollaborators.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);

  const pagedCollaborators = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return filteredCollaborators.slice(start, start + PAGE_SIZE);
  }, [filteredCollaborators, currentPage]);

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('todos');
    setSafetyFilter('todos');
    setAsoFilter('todos');
    setTrainingFilter('todos');
    setEpiFilter('todos');
    setCompanyFilter('todas');
    setFunctionFilter('todas');
    setSectorFilter('todos');
    setPage(0);
  };

  const stats = useMemo(() => {
    const active = collaboratorContexts.filter((item) => item.collaborator.status === 'ativo').length;
    const away = collaboratorContexts.filter((item) => item.collaborator.status === 'afastado').length;
    const inactive = collaboratorContexts.filter((item) => item.collaborator.status === 'desligado').length;
    const pending = collaboratorContexts.filter((item) => item.pendingItems.length > 0).length;
    const notFit = collaboratorContexts.filter((item) => item.securityStatus === 'not_fit' || item.securityStatus === 'critical').length;
    const expiredAso = collaboratorContexts.filter((item) => item.asoStatus === 'expired').length;
    const nearAso = collaboratorContexts.filter((item) => item.asoStatus === 'near').length;
    return [
      { label: 'Total de colaboradores', value: collaborators.length, icon: Users, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => resetFilters() },
      { label: 'Colaboradores ativos', value: active, icon: BadgeCheck, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setStatusFilter('ativo') },
      { label: 'Colaboradores afastados', value: away, icon: CalendarDays, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setStatusFilter('afastado') },
      { label: 'Colaboradores desligados', value: inactive, icon: Archive, className: 'bg-[#eceef1] text-[#4f5f7a]', onClick: () => setStatusFilter('desligado') },
      { label: 'Com pendencias', value: pending, icon: AlertCircle, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setSafetyFilter('attention') },
      { label: 'Nao aptos', value: notFit, icon: ShieldAlert, className: 'bg-[#ffdad6] text-[#93000a]', onClick: () => setSafetyFilter('not_fit') },
      { label: 'ASOs vencidos', value: expiredAso, icon: Clock, className: 'bg-[#ffdad6] text-[#93000a]', onClick: () => setAsoFilter('expired') },
      { label: 'ASOs proximos', value: nearAso, icon: CalendarDays, className: 'bg-[#fff1c2] text-[#7a5b00]', onClick: () => setAsoFilter('near') },
    ];
  }, [collaboratorContexts, collaborators.length]);

  const openCreate = () => {
    setEditingCollaborator(null);
    setFormMode('quick');
    setFormStep(0);
    form.reset({ ...defaultValues, empresa: companyName || '' });
    setIsFormOpen(true);
  };

  const openEdit = (collaborator: Collaborator) => {
    setEditingCollaborator(collaborator);
    setFormMode('complete');
    setFormStep(0);
    form.reset(collaboratorToFormValues(collaborator));
    setIsFormOpen(true);
  };

  const handleSubmit = (values: CollaboratorFormValues) => {
    startTransition(async () => {
      const duplicateCpf = collaborators.find((item) => item.cpf === values.cpf && item.id !== editingCollaborator?.id);
      if (duplicateCpf) {
        toast({ variant: 'destructive', title: 'CPF duplicado', description: 'Este CPF ja esta cadastrado para outro colaborador.' });
        return;
      }
      const duplicateRegistration = values.matricula
        ? collaborators.find((item) => item.matricula === values.matricula && item.id !== editingCollaborator?.id)
        : null;
      if (duplicateRegistration) {
        toast({ variant: 'destructive', title: 'Matricula duplicada', description: 'Esta matricula ja esta cadastrada para outro colaborador.' });
        return;
      }
      const payload = { ...values, companyId };
      const result = editingCollaborator
        ? await updateCollaborator(editingCollaborator.id, payload)
        : await createCollaborator(payload);

      if (result.success) {
        let description = 'Os dados foram salvos com sucesso.';

        if (result.id) {
          const aiResult = await generateCollaboratorRecommendations({ collaboratorId: result.id, companyId });
          if (aiResult.data) {
            description = aiResult.cached
              ? 'Os dados foram salvos e as recomendacoes existentes foram mantidas.'
              : 'Os dados foram salvos e as recomendacoes com IA foram geradas.';
          } else if (aiResult.error) {
            description = `Os dados foram salvos, mas a IA nao gerou as recomendacoes: ${aiResult.error}`;
          }
        }

        toast({ title: editingCollaborator ? 'Colaborador atualizado' : 'Colaborador cadastrado', description });
        setIsFormOpen(false);
        setEditingCollaborator(null);
        await fetchData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar colaborador', description: getToastError(result.error) });
      }
    });
  };

  const exportList = () => {
    const success = downloadCsv(`colaboradores-${Date.now()}.csv`, filteredCollaborators.map((context) => ({
      nome: context.collaborator.nome_completo,
      cpf: context.collaborator.cpf,
      matricula: context.collaborator.matricula || '',
      empresa: context.collaborator.empresa || '',
      setor: context.collaborator.setor,
      funcao: context.collaborator.funcao,
      status: context.collaborator.status,
      situacao_seguranca: context.securityLabel,
      pendencias: context.pendingSummary,
      aso: context.asoLabel,
      email: context.collaborator.email || '',
      telefone: context.collaborator.telefone || '',
    })));
    toast(success
      ? { title: 'Lista exportada', description: 'O CSV de colaboradores foi gerado com os filtros atuais.' }
      : { variant: 'destructive', title: 'Sem dados', description: 'Nao ha colaboradores para exportar.' });
  };

  const showPreparedMessage = (title: string) => {
    toast({ title, description: 'Recurso preparado para a proxima etapa sem alterar os modulos existentes.' });
  };

  const handleGenerateRecommendations = async (collaborator: Collaborator) => {
    setGeneratingRecommendationsId(collaborator.id);

    try {
      const result = await generateCollaboratorRecommendations({ collaboratorId: collaborator.id, companyId });
      if (!result.data) {
        toast({ variant: 'destructive', title: 'Erro ao gerar recomendacoes', description: getToastError(result.error) });
        return;
      }

      const updateRecommendations = (item: Collaborator) => (
        item.id === collaborator.id ? { ...item, ai_recommendations: result.data } : item
      );

      setCollaborators((current) => current.map(updateRecommendations));
      setViewingCollaborator((current) => current ? updateRecommendations(current) : current);
      toast({
        title: result.cached ? 'Recomendacoes ja existentes' : 'Recomendacoes geradas',
        description: result.cached
          ? 'A ficha ja tinha recomendacoes salvas. Mantivemos os dados existentes.'
          : 'As recomendacoes foram salvas na ficha do colaborador.',
      });
    } finally {
      setGeneratingRecommendationsId(null);
    }
  };

  const handleArchive = () => {
    if (!archivingCollaborator) return;
    startTransition(async () => {
      const result = await archiveCollaborator(archivingCollaborator.id, companyId);
      if (result.success) {
        toast({ title: 'Colaborador arquivado', description: 'O colaborador foi desativado da lista principal.' });
        setCollaborators((current) => current.filter((item) => item.id !== archivingCollaborator.id));
        setArchivingCollaborator(null);
      } else {
        toast({ variant: 'destructive', title: 'Erro ao arquivar', description: getToastError(result.error) });
      }
    });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl space-y-3">
          <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Colaboradores</h2>
          <p className="text-[1.05rem] leading-8 text-[#4f5f7a]">
            Gerencie os colaboradores, funcoes, documentos, EPIs, treinamentos e pendencias de seguranca.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate} className="h-12 rounded-md bg-[#f46e11] px-6 text-base font-bold text-white shadow-[0_8px_18px_rgba(244,110,17,0.24)] hover:bg-[#e96710]">
            <UserPlus className="mr-2 h-5 w-5" />
            Novo Colaborador
          </Button>
          <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'dataImports', { tipo_importacao: 'colaboradores' })} className="h-12 rounded-md">
            <Upload className="mr-2 h-4 w-4" />
            Importar Colaboradores
          </Button>
          <Button variant="outline" onClick={exportList} className="h-12 rounded-md">
            <FileDown className="mr-2 h-4 w-4" />
            Exportar Lista
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <button key={card.label} type="button" onClick={card.onClick} className="rounded-xl border border-[#e0c0b1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-[#4f5f7a]">{card.label}</p>
                <span className={cn('rounded-lg p-2.5', card.className)}>
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className="mt-4 text-[2rem] font-bold leading-none text-[#191c1e]">{card.value.toLocaleString('pt-BR')}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5f7a]" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, CPF, matricula, funcao, setor ou e-mail"
              className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] pl-10 lg:w-[440px]"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-11 w-[170px] rounded-md border-[#ccb4a6] bg-[#f7f9fc]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                {statusOptions.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={safetyFilter} onValueChange={(value) => setSafetyFilter(value as SafetyFilter)}>
              <SelectTrigger className="h-11 w-[210px] rounded-md border-[#ccb4a6] bg-[#f7f9fc]">
                <SelectValue placeholder="Situacao de seguranca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as situacoes</SelectItem>
                <SelectItem value="ok">Tudo ok</SelectItem>
                <SelectItem value="attention">Atencao</SelectItem>
                <SelectItem value="not_fit">Nao apto</SelectItem>
                <SelectItem value="critical">Critico</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => setShowAdvancedFilters((current) => !current)} className="h-11 rounded-md">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
            <Button variant="ghost" onClick={resetFilters} className="h-11 rounded-md text-[#4f5f7a]">
              <X className="mr-2 h-4 w-4" />
              Limpar filtros
            </Button>
          </div>
        </div>

        {showAdvancedFilters && (
          <div className="mt-4 grid gap-3 border-t border-[#eceef1] pt-4 md:grid-cols-2 xl:grid-cols-4">
            <Select value={sectorFilter} onValueChange={setSectorFilter}>
              <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Setor" /></SelectTrigger>
              <SelectContent><SelectItem value="todos">Todos os setores</SelectItem>{sectors.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={functionFilter} onValueChange={setFunctionFilter}>
              <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Funcao" /></SelectTrigger>
              <SelectContent><SelectItem value="todas">Todas as funcoes</SelectItem>{functions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Empresa" /></SelectTrigger>
              <SelectContent><SelectItem value="todas">Todas as empresas</SelectItem>{companies.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={asoFilter} onValueChange={(value) => setAsoFilter(value as AsoStatus | 'todos')}>
              <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="ASO" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os ASOs</SelectItem>
                <SelectItem value="valid">ASO valido</SelectItem>
                <SelectItem value="expired">ASO vencido</SelectItem>
                <SelectItem value="near">ASO proximo</SelectItem>
                <SelectItem value="missing">ASO nao informado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={trainingFilter} onValueChange={(value) => setTrainingFilter(value as TrainingFilter)}>
              <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Treinamento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os treinamentos</SelectItem>
                <SelectItem value="ok">Em dia</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
            <Select value={epiFilter} onValueChange={(value) => setEpiFilter(value as EpiFilter)}>
              <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="EPI" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os EPIs</SelectItem>
                <SelectItem value="ok">Em dia</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e0c0b1] bg-[#fff8f1] p-3 text-sm text-[#4f5f7a]">
            <span>{selectedIds.length} selecionado(s)</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => showPreparedMessage('Exportacao em lote preparada')}>Exportar selecionados</Button>
              <Button variant="outline" size="sm" onClick={() => showPreparedMessage('Vinculo de treinamento em lote preparado')}>Vincular treinamento</Button>
              <Button variant="outline" size="sm" onClick={() => showPreparedMessage('Alteracao em lote preparada')}>Alterar status</Button>
            </div>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4">
          <div>
            <h3 className="text-lg font-bold text-[#191c1e]">Lista de colaboradores</h3>
            <p className="text-sm text-[#4f5f7a]">{filteredCollaborators.length} registros encontrados</p>
          </div>
          <Filter className="h-5 w-5 text-[#4f5f7a]" />
        </div>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1180px] border-collapse text-left">
            <thead>
              <tr className="bg-[#fbfbfc] text-sm uppercase tracking-[0.06em] text-[#4f5f7a]">
                <th className="px-5 py-4 font-bold">
                  <input
                    type="checkbox"
                    checked={pagedCollaborators.length > 0 && pagedCollaborators.every((item) => selectedIds.includes(item.collaborator.id))}
                    onChange={(event) => {
                      const ids = pagedCollaborators.map((item) => item.collaborator.id);
                      setSelectedIds((current) => event.target.checked ? Array.from(new Set([...current, ...ids])) : current.filter((id) => !ids.includes(id)));
                    }}
                  />
                </th>
                <th className="px-5 py-4 font-bold">Colaborador</th>
                <th className="px-5 py-4 font-bold">CPF/Matricula</th>
                <th className="px-5 py-4 font-bold">Matricula</th>
                <th className="px-5 py-4 font-bold">Funcao</th>
                <th className="px-5 py-4 font-bold">Setor</th>
                <th className="px-5 py-4 font-bold">Status</th>
                <th className="px-5 py-4 font-bold">Situacao</th>
                <th className="px-5 py-4 font-bold">Pendencias</th>
                <th className="px-5 py-4 font-bold">ASO</th>
                <th className="px-5 py-4 text-right font-bold">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0c0b1]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className="animate-pulse">
                    <td className="px-5 py-5"><div className="h-5 w-56 rounded bg-[#e6e8eb]" /></td>
                    <td className="px-5 py-5"><div className="h-5 w-28 rounded bg-[#e6e8eb]" /></td>
                    <td className="px-5 py-5"><div className="h-5 w-24 rounded bg-[#e6e8eb]" /></td>
                    <td className="px-5 py-5"><div className="h-5 w-32 rounded bg-[#e6e8eb]" /></td>
                    <td className="px-5 py-5"><div className="h-5 w-28 rounded bg-[#e6e8eb]" /></td>
                    <td className="px-5 py-5"><div className="h-7 w-20 rounded-full bg-[#e6e8eb]" /></td>
                    <td className="px-5 py-5"><div className="h-5 w-24 rounded bg-[#e6e8eb]" /></td>
                    <td className="px-5 py-5" />
                  </tr>
                ))
              ) : pagedCollaborators.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhum colaborador encontrado.</td>
                </tr>
              ) : (
                pagedCollaborators.map((context) => {
                  const collaborator = context.collaborator;
                  return (
                  <tr key={collaborator.id} className="group hover:bg-[#fafbfd]">
                    <td className="px-5 py-5">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(collaborator.id)}
                        onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, collaborator.id] : current.filter((id) => id !== collaborator.id))}
                      />
                    </td>
                    <td className="px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#dfe5ef] text-sm font-bold text-[#203555]">
                          {collaborator.foto_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={collaborator.foto_url} alt={collaborator.nome_completo} className="h-full w-full object-cover" />
                          ) : getInitials(collaborator.nome_completo)}
                        </div>
                        <div>
                          <p className="font-bold text-[#191c1e]">{collaborator.nome_completo}</p>
                          <p className="text-xs text-[#4f5f7a]">{collaborator.email || collaborator.telefone || 'Contato nao preenchido'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-5 text-[#3f5a88]">{collaborator.cpf}</td>
                    <td className="px-5 py-5 text-[#3f5a88]">{collaborator.matricula || '-'}</td>
                    <td className="px-5 py-5 text-[#191c1e]">{collaborator.funcao}</td>
                    <td className="px-5 py-5 text-[#191c1e]">{collaborator.setor}</td>
                    <td className="px-5 py-5">
                      <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase', getStatusStyle(collaborator.status))}>
                        {statusOptions.find((item) => item.value === collaborator.status)?.label}
                      </span>
                    </td>
                    <td className="px-5 py-5">
                      <span className={cn('inline-flex rounded-full px-3 py-1 text-xs font-bold', getSecurityStyle(context.securityStatus))}>{context.securityLabel}</span>
                    </td>
                    <td className="px-5 py-5 text-[#3f5a88]">{context.pendingSummary}</td>
                    <td className="px-5 py-5 text-[#3f5a88]">{context.asoLabel}</td>
                    <td className="px-5 py-5">
                      <div className="flex justify-end gap-1">
                        <button type="button" onClick={() => setViewingCollaborator(collaborator)} className="rounded-lg p-2 text-[#4f5f7a] hover:bg-[#eceef1]" title="Visualizar">
                          <Eye className="h-5 w-5" />
                        </button>
                        <button type="button" onClick={() => openEdit(collaborator)} className="rounded-lg p-2 text-[#9e4300] hover:bg-[#fff4e8]" title="Editar">
                          <Pencil className="h-5 w-5" />
                        </button>
                        <RowActions collaborator={collaborator} companyId={companyId} onArchive={() => setArchivingCollaborator(collaborator)} onPrepared={showPreparedMessage} />
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 lg:hidden">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-44 animate-pulse rounded-xl bg-[#eef1f5]" />)
          ) : pagedCollaborators.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ccb4a6] p-6 text-center text-sm text-[#4f5f7a]">Nenhum colaborador encontrado.</p>
          ) : pagedCollaborators.map((context) => {
            const collaborator = context.collaborator;
            return (
              <div key={collaborator.id} className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-[#dfe5ef] text-sm font-bold text-[#203555]">
                    {collaborator.foto_url ? <img src={collaborator.foto_url} alt={collaborator.nome_completo} className="h-full w-full object-cover" /> : getInitials(collaborator.nome_completo)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#191c1e]">{collaborator.nome_completo}</p>
                    <p className="text-sm text-[#4f5f7a]">{collaborator.funcao} - {collaborator.setor}</p>
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-bold', getSecurityStyle(context.securityStatus))}>{context.securityLabel}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-[#4f5f7a]">Status</span><span className="font-medium text-[#191c1e]">{collaborator.status}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#4f5f7a]">Pendencias</span><span className="font-medium text-[#191c1e]">{context.pendingSummary}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#4f5f7a]">ASO</span><span className="font-medium text-[#191c1e]">{context.asoLabel}</span></div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <Button variant="outline" onClick={() => setViewingCollaborator(collaborator)} className="h-10 rounded-md">Ver ficha</Button>
                  <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'epiDeliveries', { colaborador_id: collaborator.id })} className="h-10 rounded-md">EPI</Button>
                  <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'trainings', { colaborador_id: collaborator.id })} className="h-10 rounded-md">Treinos</Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4 sm:flex-row">
          <p className="text-sm text-[#4f5f7a]">
            Pagina {currentPage + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(Math.max(0, currentPage - 1))}>Anterior</Button>
            <Button variant="outline" disabled={currentPage >= totalPages - 1} onClick={() => setPage(Math.min(totalPages - 1, currentPage + 1))}>Proxima</Button>
          </div>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{editingCollaborator ? 'Editar colaborador' : 'Novo colaborador'}</DialogTitle>
          </DialogHeader>
          <CollaboratorForm
            form={form}
            onSubmit={handleSubmit}
            isPending={isPending}
            mode={formMode}
            onModeChange={setFormMode}
            step={formStep}
            onStepChange={setFormStep}
            isEditing={Boolean(editingCollaborator)}
            onSaveAndOpen={(values) => {
              handleSubmit(values);
              setViewingCollaborator({ ...values, id: editingCollaborator?.id || 'novo', companyId, created_at: '', updated_at: '' } as Collaborator);
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingCollaborator} onOpenChange={(open) => !open && setViewingCollaborator(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Ficha do colaborador</DialogTitle>
          </DialogHeader>
          {viewingCollaborator && (
            <CollaboratorDetails
              collaborator={viewingCollaborator}
              companyId={companyId}
              context={buildCollaboratorContext(viewingCollaborator, { epiDeliveries, trainings, incidents, costs, inspections, nonconformities })}
              epis={epis}
              epiMappings={epiMappings}
              incidents={incidents.filter((incident) => incident.colaborador_id === viewingCollaborator.id)}
              costs={costs.filter((cost) => cost.colaborador_id === viewingCollaborator.id)}
              inspections={inspections.filter((inspection) => inspection.colaboradores_vinculados?.includes(viewingCollaborator.id))}
              nonconformities={nonconformities.filter((item) => item.colaborador_id === viewingCollaborator.id)}
              epiDeliveries={epiDeliveries.filter((item) => item.colaborador_id === viewingCollaborator.id)}
              trainingCatalog={trainingCatalog}
              trainings={trainings.filter((item) => item.colaborador_id === viewingCollaborator.id)}
              onRefresh={fetchData}
              onEdit={() => openEdit(viewingCollaborator)}
              onPrepared={showPreparedMessage}
              isGeneratingRecommendations={generatingRecommendationsId === viewingCollaborator.id}
              onGenerateRecommendations={() => void handleGenerateRecommendations(viewingCollaborator)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archivingCollaborator} onOpenChange={(open) => !open && setArchivingCollaborator(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar colaborador?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao remove o colaborador da lista principal e altera o status para desligado. Voce pode manter o historico sem apagar definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} disabled={isPending} className="bg-[#ba1a1a] hover:bg-[#93000a]">
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  collaborator,
  companyId,
  onArchive,
  onPrepared,
}: {
  collaborator: Collaborator;
  companyId: string;
  onArchive: () => void;
  onPrepared: (title: string) => void;
}) {
  const goTo = (section: string) => navigateCompanySection(companyId, section, { colaborador_id: collaborator.id });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-lg p-2 text-[#4f5f7a] hover:bg-[#eceef1]" title="Mais acoes">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => goTo('epiDeliveries')}><PackageCheck className="mr-2 h-4 w-4" />Entregar EPI</DropdownMenuItem>
        <DropdownMenuItem onClick={() => goTo('trainings')}><GraduationCap className="mr-2 h-4 w-4" />Registrar treinamento</DropdownMenuItem>
        <DropdownMenuItem onClick={() => goTo('nonconformities')}><ShieldAlert className="mr-2 h-4 w-4" />Abrir nao conformidade</DropdownMenuItem>
        <DropdownMenuItem onClick={() => goTo('incidents')}><Siren className="mr-2 h-4 w-4" />Registrar incidente</DropdownMenuItem>
        <DropdownMenuItem onClick={() => goTo('costsPrevention')}><Wallet className="mr-2 h-4 w-4" />Registrar custo</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared('Relatorio individual preparado')}><FileText className="mr-2 h-4 w-4" />Gerar relatorio</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onArchive} className="text-[#ba1a1a]"><Archive className="mr-2 h-4 w-4" />Arquivar/Desativar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CollaboratorForm({
  form,
  onSubmit,
  isPending,
  mode,
  onModeChange,
  step,
  onStepChange,
  isEditing,
  onSaveAndOpen,
}: {
  form: ReturnType<typeof useForm<CollaboratorFormValues>>;
  onSubmit: (values: CollaboratorFormValues) => void;
  isPending: boolean;
  mode: FormMode;
  onModeChange: (mode: FormMode) => void;
  step: number;
  onStepChange: (step: number) => void;
  isEditing: boolean;
  onSaveAndOpen: (values: CollaboratorFormValues) => void;
}) {
  const steps = [
    { title: 'Dados basicos', icon: IdCard },
    { title: 'Dados profissionais', icon: Briefcase },
    { title: 'Seguranca', icon: ShieldAlert },
    { title: 'Revisao', icon: CheckCircle2 },
  ];
  const values = form.watch();
  const nextStep = async () => {
    const fields: Array<Array<keyof CollaboratorFormValues>> = [
      ['nome_completo', 'cpf', 'telefone', 'email', 'foto_url'],
      ['matricula', 'empresa', 'setor', 'funcao', 'data_admissao', 'tipo_contrato', 'status', 'gestor_responsavel', 'local_trabalho', 'turno_trabalho'],
      ['aso_validade', 'atividades_realizadas', 'riscos_associados', 'observacoes_seguranca', 'observacoes_gerais'],
    ];
    const valid = await form.trigger(fields[step] || undefined);
    if (valid) onStepChange(Math.min(step + 1, steps.length - 1));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {!isEditing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={() => onModeChange('quick')} className={cn('rounded-xl border p-4 text-left', mode === 'quick' ? 'border-[#f46e11] bg-[#fff4e8]' : 'border-[#e0c0b1] bg-white')}>
              <p className="font-bold text-[#191c1e]">Modo rapido</p>
              <p className="mt-1 text-sm text-[#4f5f7a]">Cadastro com os campos essenciais para comecar agora.</p>
            </button>
            <button type="button" onClick={() => onModeChange('complete')} className={cn('rounded-xl border p-4 text-left', mode === 'complete' ? 'border-[#f46e11] bg-[#fff4e8]' : 'border-[#e0c0b1] bg-white')}>
              <p className="font-bold text-[#191c1e]">Modo completo</p>
              <p className="mt-1 text-sm text-[#4f5f7a]">Formulario em etapas com dados pessoais, profissionais e seguranca.</p>
            </button>
          </div>
        )}

        {mode === 'quick' && !isEditing ? (
          <FieldGroup title="Cadastro rapido" icon={UserPlus}>
            <FormInput form={form} name="nome_completo" label="Nome completo" />
            <FormInput form={form} name="cpf" label="CPF" />
            <FormInput form={form} name="funcao" label="Funcao" />
            <FormInput form={form} name="setor" label="Setor" />
            <StatusField form={form} />
          </FieldGroup>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {steps.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button key={item.title} type="button" onClick={() => onStepChange(index)} className={cn('inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium', step === index ? 'border-[#f46e11] bg-[#fff4e8] text-[#9e4300]' : 'border-[#e0c0b1] text-[#4f5f7a]')}>
                    <Icon className="h-4 w-4" />
                    {item.title}
                  </button>
                );
              })}
            </div>

            {step === 0 && (
              <FieldGroup title="Dados basicos" icon={IdCard}>
                <FormInput form={form} name="nome_completo" label="Nome completo" />
                <FormInput form={form} name="cpf" label="CPF" />
                <FormInput form={form} name="rg" label="RG" />
                <FormInput form={form} name="data_nascimento" label="Data de nascimento" type="date" />
                <FormInput form={form} name="telefone" label="Telefone" />
                <FormInput form={form} name="email" label="E-mail" type="email" />
                <FormInput form={form} name="foto_url" label="Foto/avatar (URL)" />
                <FormTextarea form={form} name="endereco" label="Endereco" className="md:col-span-2" />
              </FieldGroup>
            )}

            {step === 1 && (
              <FieldGroup title="Dados profissionais" icon={Briefcase}>
                <FormInput form={form} name="matricula" label="Matricula interna" />
                <FormInput form={form} name="empresa" label="Empresa" />
                <FormInput form={form} name="setor" label="Setor" />
                <FormInput form={form} name="funcao" label="Funcao" />
                <FormInput form={form} name="data_admissao" label="Data de admissao" type="date" />
                <FormInput form={form} name="tipo_contrato" label="Tipo de contrato" />
                <StatusField form={form} />
                <FormInput form={form} name="gestor_responsavel" label="Gestor responsavel" />
                <FormInput form={form} name="local_trabalho" label="Local de trabalho" />
                <FormInput form={form} name="turno_trabalho" label="Turno" />
              </FieldGroup>
            )}

            {step === 2 && (
              <FieldGroup title="Seguranca" icon={ShieldAlert}>
                <FormInput form={form} name="aso_validade" label="ASO valido ate" type="date" />
                <FormTextarea form={form} name="atividades_realizadas" label="Atividades realizadas" />
                <FormTextarea form={form} name="riscos_associados" label="Riscos associados" />
                <FormTextarea form={form} name="observacoes_seguranca" label="Observacoes de seguranca" />
                <FormTextarea form={form} name="observacoes_gerais" label="Observacoes gerais" />
              </FieldGroup>
            )}

            {step === 3 && (
              <div className="rounded-xl border border-[#e0c0b1] bg-white p-5">
                <h3 className="font-bold text-[#191c1e]">Revisao</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <ReviewItem label="Nome" value={values.nome_completo} />
                  <ReviewItem label="CPF" value={values.cpf} />
                  <ReviewItem label="Funcao" value={values.funcao} />
                  <ReviewItem label="Setor" value={values.setor} />
                  <ReviewItem label="Empresa" value={values.empresa} />
                  <ReviewItem label="Status" value={values.status} />
                  <ReviewItem label="ASO" value={formatDate(values.aso_validade)} />
                  <ReviewItem label="Gestor" value={values.gestor_responsavel} />
                  <ReviewItem label="Contato" value={values.email || values.telefone} />
                </div>
              </div>
            )}
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-[#e0c0b1] pt-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            {mode === 'complete' || isEditing ? (
              <>
                <Button type="button" variant="outline" disabled={step === 0} onClick={() => onStepChange(Math.max(0, step - 1))}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                {step < steps.length - 1 && (
                  <Button type="button" variant="outline" onClick={() => void nextStep()}>
                    Proximo
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" onClick={form.handleSubmit(onSaveAndOpen)} disabled={isPending} className="rounded-md">
              <UserCheck className="mr-2 h-4 w-4" />
              Salvar e abrir ficha
            </Button>
            <Button type="submit" disabled={isPending} className="rounded-md bg-[#f46e11] px-7 font-bold text-white hover:bg-[#e96710]">
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar colaborador
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

function StatusField({ form }: { form: ReturnType<typeof useForm<CollaboratorFormValues>> }) {
  return (
    <FormField
      control={form.control}
      name="status"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Status</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Selecione" /></SelectTrigger>
            </FormControl>
            <SelectContent>{statusOptions.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ReviewItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-lg border border-[#eceef1] bg-[#f7f9fc] p-3">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[#191c1e]">{value || 'Nao preenchido'}</p>
    </div>
  );
}

function FieldGroup({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-[#e0c0b1] bg-white">
      <div className="flex items-center gap-2 border-b border-[#e0c0b1] bg-[#eef1f5] px-4 py-3">
        <Icon className="h-5 w-5 text-[#9e4300]" />
        <h3 className="font-bold text-[#191c1e]">{title}</h3>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-2">
        {children}
      </div>
    </section>
  );
}

function FormInput({
  form,
  name,
  label,
  type = 'text',
}: {
  form: ReturnType<typeof useForm<CollaboratorFormValues>>;
  name: keyof CollaboratorFormValues;
  label: string;
  type?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Input type={type} className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function FormTextarea({
  form,
  name,
  label,
  className,
}: {
  form: ReturnType<typeof useForm<CollaboratorFormValues>>;
  name: keyof CollaboratorFormValues;
  label: string;
  className?: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <Textarea className="min-h-[90px] rounded-md border-[#ccb4a6] bg-[#f7f9fc]" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function formatGeneratedAt(value?: string) {
  if (!value) return '';
  return `Gerado em ${formatDate(value.slice(0, 10))}`;
}

function RecommendationList({ items, emptyText }: { items?: string[]; emptyText: string }) {
  if (!items?.length) {
    return <p className="mt-2 text-xs leading-5 text-[#4f5f7a]">{emptyText}</p>;
  }

  return (
    <ul className="mt-3 space-y-1.5 text-xs leading-5 text-[#334766]">
      {items.slice(0, 5).map((item) => (
        <li key={item} className="flex gap-2">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f46e11]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function IncidentMetric({ label, value, valueLabel }: { label: string; value?: number; valueLabel?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4">
      <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#191c1e]">{valueLabel || value || 0}</p>
    </div>
  );
}

function buildRecommendationCards(recommendations?: CollaboratorAiRecommendations | null) {
  return [
    {
      title: 'EPIs obrigatorios',
      items: recommendations?.epi_obrigatorios,
      emptyText: 'Gere recomendacoes para listar os EPIs obrigatorios.',
    },
    {
      title: 'EPIs entregues',
      items: recommendations?.epi_entregues,
      emptyText: recommendations ? 'Nenhuma entrega registrada ainda.' : 'Modulo de entrega preparado para integracao.',
    },
    {
      title: 'EPIs pendentes',
      items: recommendations?.epi_pendentes,
      emptyText: 'Gere recomendacoes para identificar pendencias iniciais.',
    },
    {
      title: 'Treinamentos obrigatorios',
      items: recommendations?.treinamentos_obrigatorios,
      emptyText: 'Gere recomendacoes para listar treinamentos obrigatorios.',
    },
    {
      title: 'Treinamentos realizados',
      items: recommendations?.treinamentos_realizados,
      emptyText: recommendations ? 'Nenhum treinamento realizado registrado ainda.' : 'Modulo preparado para integracao futura.',
    },
    {
      title: 'Treinamentos vencidos',
      items: recommendations?.treinamentos_vencidos,
      emptyText: 'Gere recomendacoes para mapear treinamentos pendentes.',
    },
    {
      title: 'Nao conformidades vinculadas',
      items: recommendations?.nao_conformidades,
      emptyText: 'Nenhuma nao conformidade vinculada. Acesse o modulo para ver o historico.',
    },
    {
      title: 'Incidentes vinculados',
      items: recommendations?.incidentes,
      emptyText: 'Nenhum incidente vinculado.',
    },
    {
      title: 'Relatorios do colaborador',
      items: recommendations?.relatorios,
      emptyText: 'Nenhum relatorio vinculado.',
    },
    {
      title: 'Riscos associados',
      items: recommendations?.riscos_associados,
      emptyText: 'Gere recomendacoes para listar riscos por funcao e setor.',
    },
    {
      title: 'Medidas preventivas',
      items: recommendations?.medidas_preventivas,
      emptyText: 'Gere recomendacoes para listar medidas preventivas.',
    },
  ];
}

type QuickActionType = 'epi' | 'training' | 'aso' | 'nonconformity' | 'incident' | 'cost' | 'document' | 'report';
type QuickDocument = {
  tipo: string;
  nome: string;
  arquivo_url: string;
  data_emissao: string;
  data_validade: string;
  observacoes: string;
  created_at: string;
};
type QuickEpiStatus = 'pendente' | 'entregue' | 'vencido' | 'proximo_troca';
type QuickEpiSelection = {
  epi: Epi;
  source: 'funcao' | 'ia' | 'manual';
  observacao?: string;
  selected: boolean;
  status: QuickEpiStatus;
  statusLabel: string;
  existingDelivery?: EpiDelivery;
  quantidade: string;
  data_entrega: string;
  data_validade: string;
  data_proxima_troca: string;
  responsavel_entrega: string;
  observacoes: string;
};

function todayInput() {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsInput(date: string, months: number) {
  if (!date || !months) return '';
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return '';
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

function addDaysInput(date: string, days: number) {
  if (!date || !days) return '';
  const base = new Date(`${date}T00:00:00`);
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function riskFromSeverity(severity: string) {
  if (severity === 'critica') return 'critico';
  if (severity === 'alta') return 'alto';
  if (severity === 'media') return 'medio';
  return 'baixo';
}

function getLatestEpiDelivery(epi: Epi, deliveries: EpiDelivery[]) {
  return deliveries
    .filter((delivery) => delivery.epi_id === epi.id)
    .sort((a, b) => (b.data_entrega || b.created_at || '').localeCompare(a.data_entrega || a.created_at || ''))[0];
}

function getEpiDeliveryStatus(delivery?: EpiDelivery): { status: QuickEpiStatus; label: string; selected: boolean } {
  if (!delivery) return { status: 'pendente', label: 'Pendente', selected: true };
  if (delivery.status === 'vencido') return { status: 'vencido', label: 'Vencido', selected: true };
  if (delivery.status === 'proximo_troca') return { status: 'proximo_troca', label: 'Proximo da troca', selected: true };

  const nextDate = delivery.data_proxima_troca || delivery.data_validade;
  const days = daysUntil(nextDate);
  if (typeof days === 'number' && days < 0) return { status: 'vencido', label: 'Vencido', selected: true };
  if (typeof days === 'number' && days <= 30) return { status: 'proximo_troca', label: 'Proximo da troca', selected: true };
  return { status: 'entregue', label: 'Ja entregue', selected: false };
}

function getQuickEpiStatusStyle(status: QuickEpiStatus) {
  if (status === 'entregue') return 'bg-[#dcfce7] text-[#166534]';
  if (status === 'proximo_troca') return 'bg-[#fef9c3] text-[#854d0e]';
  if (status === 'vencido') return 'bg-[#fee2e2] text-[#991b1b]';
  return 'bg-[#fff4e8] text-[#9e4300]';
}

function buildQuickEpiSelections({
  collaborator,
  epis,
  mappings,
  deliveries,
}: {
  collaborator: Collaborator;
  epis: Epi[];
  mappings: EpiByFunction[];
  deliveries: EpiDelivery[];
}): QuickEpiSelection[] {
  const functionKey = normalizeText(collaborator.funcao).trim();
  if (!functionKey) return [];
  const byId = new Map(epis.map((epi) => [epi.id, epi]));
  const byName = new Map(epis.map((epi) => [normalizeText(epi.nome).trim(), epi]));
  const required = new Map<string, { epi: Epi; source: 'funcao' | 'ia'; observacao?: string }>();

  mappings
    .filter((mapping) => {
      const mappingKey = normalizeText(mapping.funcao).trim();
      return mappingKey === functionKey || mappingKey.includes(functionKey) || functionKey.includes(mappingKey);
    })
    .forEach((mapping) => {
      const epi = byId.get(mapping.epi_id);
      if (epi) required.set(epi.id, { epi, source: 'funcao', observacao: mapping.observacao });
    });

  collaborator.ai_recommendations?.epi_obrigatorios?.forEach((name) => {
    const nameKey = normalizeText(name).trim();
    const epi = byName.get(nameKey) || epis.find((item) => {
      const epiKey = normalizeText(item.nome).trim();
      return nameKey.includes(epiKey) || epiKey.includes(nameKey);
    });
    if (epi && !required.has(epi.id)) {
      required.set(epi.id, { epi, source: 'ia', observacao: 'Sugerido pela IA na ficha do colaborador.' });
    }
  });

  return Array.from(required.values()).map(({ epi, source, observacao }) => {
    const existingDelivery = getLatestEpiDelivery(epi, deliveries);
    const status = getEpiDeliveryStatus(existingDelivery);
    return {
      epi,
      source,
      observacao,
      selected: status.selected,
      status: status.status,
      statusLabel: status.label,
      existingDelivery,
      quantidade: '1',
      data_entrega: todayInput(),
      data_validade: '',
      data_proxima_troca: epi.prazo_troca_dias ? addDaysInput(todayInput(), epi.prazo_troca_dias) : '',
      responsavel_entrega: 'Responsavel SST',
      observacoes: observacao || '',
    };
  });
}

function QuickField({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('space-y-1.5 text-sm font-medium text-[#334766]', className)}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function QuickInput({
  label,
  value,
  onChange,
  type = 'text',
  className,
  placeholder,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  className?: string;
  placeholder?: string;
}) {
  return (
    <QuickField label={label} className={className}>
      <Input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-md border-[#ccb4a6] bg-white"
      />
    </QuickField>
  );
}

function QuickTextarea({
  label,
  value,
  onChange,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <QuickField label={label} className={className}>
      <Textarea
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-[92px] rounded-md border-[#ccb4a6] bg-white"
      />
    </QuickField>
  );
}

function QuickSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <QuickField label={label} className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-white">
          <SelectValue placeholder="Selecione" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </QuickField>
  );
}

function CollaboratorQuickActionDialog({
  action,
  collaborator,
  companyId,
  epis,
  epiMappings,
  epiDeliveries,
  trainingCatalog,
  trainings,
  onClose,
  onRefresh,
  onDocumentSaved,
  onEdit,
  onPrepared,
}: {
  action: QuickActionType | null;
  collaborator: Collaborator;
  companyId: string;
  epis: Epi[];
  epiMappings: EpiByFunction[];
  epiDeliveries: EpiDelivery[];
  trainingCatalog: Training[];
  trainings: CollaboratorTraining[];
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onDocumentSaved?: () => void;
  onEdit?: () => void;
  onPrepared: (title: string) => void;
}) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [epiForm, setEpiForm] = useState({
    manual_epi_id: '',
    data_entrega: todayInput(),
    data_validade: '',
    data_proxima_troca: '',
    quantidade: '1',
    responsavel_entrega: 'Responsavel SST',
    observacoes: '',
  });
  const [epiSelections, setEpiSelections] = useState<QuickEpiSelection[]>([]);
  const [duplicateOverride, setDuplicateOverride] = useState(false);
  const [trainingForm, setTrainingForm] = useState({
    treinamento_id: trainingCatalog[0]?.id || '',
    data_realizacao: todayInput(),
    data_vencimento: '',
    instrutor: '',
    empresa_treinamento: '',
    carga_horaria_realizada: '',
    certificado_url: '',
    observacoes: '',
  });
  const [asoForm, setAsoForm] = useState({
    data_aso: todayInput(),
    data_validade: collaborator.aso_validade || '',
    tipo: 'Periodico',
    clinica: '',
    anexo_url: '',
    observacoes: '',
  });
  const [ncForm, setNcForm] = useState({
    titulo: `Nao conformidade vinculada a ${collaborator.nome_completo}`,
    descricao: '',
    gravidade: 'media',
    probabilidade: 'media',
    local: collaborator.local_trabalho || collaborator.setor || 'Nao informado',
    prazo_correcao: '',
    responsavel_correcao: collaborator.gestor_responsavel || '',
    evidencia_url: '',
    acao_corretiva: '',
    observacoes: '',
  });
  const [incidentForm, setIncidentForm] = useState({
    titulo: `Incidente envolvendo ${collaborator.nome_completo}`,
    tipo_ocorrencia: 'incidente_sem_lesao',
    data_ocorrencia: todayInput(),
    hora_ocorrencia: '',
    local: collaborator.local_trabalho || collaborator.setor || 'Nao informado',
    descricao: '',
    gravidade: 'media',
    probabilidade: 'media',
    medidas_imediatas: '',
    evidencia_url: '',
    observacoes: '',
  });
  const [costForm, setCostForm] = useState({
    descricao: `Custo relacionado a ${collaborator.nome_completo}`,
    categoria: 'prevencao',
    tipo_custo: 'custo_pontual',
    valor: '',
    data_custo: todayInput(),
    fornecedor: '',
    comprovante_url: '',
    observacoes: '',
  });
  const [documentForm, setDocumentForm] = useState({
    tipo: 'ASO',
    nome: '',
    arquivo_url: '',
    data_emissao: todayInput(),
    data_validade: '',
    observacoes: '',
  });

  useEffect(() => {
    if (action !== 'epi') return;
    setDuplicateOverride(false);
    setEpiSelections(buildQuickEpiSelections({ collaborator, epis, mappings: epiMappings, deliveries: epiDeliveries }));
    setEpiForm((current) => ({ ...current, manual_epi_id: '' }));
  }, [action, collaborator, epiDeliveries, epiMappings, epis]);

  useEffect(() => {
    if (!trainingForm.treinamento_id && trainingCatalog[0]?.id) {
      setTrainingForm((current) => ({ ...current, treinamento_id: trainingCatalog[0].id }));
    }
  }, [trainingForm.treinamento_id, trainingCatalog]);

  const selectedTraining = trainingCatalog.find((item) => item.id === trainingForm.treinamento_id);
  const selectedManualEpi = epis.find((item) => item.id === epiForm.manual_epi_id);
  const open = Boolean(action);
  const titles: Record<QuickActionType, string> = {
    epi: `Entregar EPI para ${collaborator.nome_completo}`,
    training: `Registrar Treinamento para ${collaborator.nome_completo}`,
    aso: `Atualizar ASO de ${collaborator.nome_completo}`,
    nonconformity: `Nova Nao Conformidade vinculada a ${collaborator.nome_completo}`,
    incident: `Registrar Incidente envolvendo ${collaborator.nome_completo}`,
    cost: `Registrar Custo para ${collaborator.nome_completo}`,
    document: `Adicionar Documento para ${collaborator.nome_completo}`,
    report: `Relatorio individual de ${collaborator.nome_completo}`,
  };

  const finishWithRefresh = async (message: string) => {
    await onRefresh();
    toast({ title: message });
    onClose();
  };

  const runSave = (handler: () => Promise<void>) => {
    startTransition(() => {
      void handler();
    });
  };

  const saveEpi = async () => {
    const selected = epiSelections.filter((item) => item.selected);
    if (!selected.length) {
      toast({ title: 'Selecione pelo menos um EPI antes de salvar.', variant: 'destructive' });
      return;
    }

    const validAlreadyDelivered = selected.filter((item) => item.status === 'entregue');
    if (validAlreadyDelivered.length && !duplicateOverride) {
      setDuplicateOverride(true);
      toast({
        title: 'EPI ja entregue e valido.',
        description: 'Clique em Salvar novamente se deseja registrar uma nova entrega mesmo assim.',
      });
      return;
    }

    for (const item of selected) {
      const result = await createEpiDelivery({
        companyId,
        colaborador_id: collaborator.id,
        epi_id: item.epi.id,
        data_entrega: item.data_entrega,
        data_validade: item.data_validade || undefined,
        data_proxima_troca: item.data_proxima_troca || undefined,
        quantidade: Number(item.quantidade || 1),
        responsavel_entrega: item.responsavel_entrega || 'Responsavel SST',
        status: 'entregue',
        observacoes: item.observacoes || undefined,
      });
      if (!result.success) {
        toast({ title: getToastError(result.error, `Nao foi possivel entregar ${item.epi.nome}.`), variant: 'destructive' });
        return;
      }
    }
    await finishWithRefresh(selected.length > 1 ? 'Entregas de EPI registradas com sucesso.' : 'Entrega de EPI registrada com sucesso.');
  };

  const saveTraining = async () => {
    if (!trainingForm.treinamento_id) {
      toast({ title: 'Selecione um treinamento antes de salvar.', variant: 'destructive' });
      return;
    }
    const expiration = trainingForm.data_vencimento || addMonthsInput(trainingForm.data_realizacao, selectedTraining?.validade_meses || 0);
    const result = await createTrainingRecord({
      companyId,
      colaborador_id: collaborator.id,
      treinamento_id: trainingForm.treinamento_id,
      data_realizacao: trainingForm.data_realizacao,
      data_vencimento: expiration || undefined,
      instrutor: trainingForm.instrutor || undefined,
      empresa_treinamento: trainingForm.empresa_treinamento || undefined,
      carga_horaria_realizada: trainingForm.carga_horaria_realizada ? Number(trainingForm.carga_horaria_realizada) : undefined,
      certificado_url: trainingForm.certificado_url || undefined,
      status: expiration && expiration < todayInput() ? 'vencido' : 'valido',
      observacoes: trainingForm.observacoes || undefined,
    });
    if (!result.success) {
      toast({ title: getToastError(result.error, 'Nao foi possivel registrar o treinamento.'), variant: 'destructive' });
      return;
    }
    await finishWithRefresh('Treinamento registrado com sucesso.');
  };

  const saveAso = async () => {
    if (!asoForm.data_validade) {
      toast({ title: 'Informe a validade do ASO antes de salvar.', variant: 'destructive' });
      return;
    }
    const notes = [
      collaborator.observacoes_seguranca,
      `ASO ${asoForm.tipo} atualizado em ${formatDate(asoForm.data_aso)}. Valido ate ${formatDate(asoForm.data_validade)}.${asoForm.clinica ? ` Clinica: ${asoForm.clinica}.` : ''}${asoForm.anexo_url ? ` Anexo: ${asoForm.anexo_url}.` : ''}${asoForm.observacoes ? ` ${asoForm.observacoes}` : ''}`,
    ].filter(Boolean).join('\n');
    const result = await updateCollaborator(collaborator.id, {
      ...collaboratorToFormValues(collaborator),
      companyId,
      aso_validade: asoForm.data_validade,
      observacoes_seguranca: notes,
    });
    if (!result.success) {
      toast({ title: getToastError(result.error, 'Nao foi possivel atualizar o ASO.'), variant: 'destructive' });
      return;
    }
    await finishWithRefresh('ASO atualizado com sucesso.');
  };

  const saveNonconformity = async () => {
    if (!ncForm.titulo || !ncForm.descricao) {
      toast({ title: 'Informe titulo e descricao da nao conformidade.', variant: 'destructive' });
      return;
    }
    const result = await createNonconformity({
      companyId,
      titulo: ncForm.titulo,
      descricao: ncForm.descricao,
      data_identificacao: todayInput(),
      local: ncForm.local || collaborator.local_trabalho || collaborator.setor || 'Nao informado',
      setor: collaborator.setor || 'Nao informado',
      colaborador_id: collaborator.id,
      origem: 'observacao_manual',
      origem_id: collaborator.id,
      gravidade: ncForm.gravidade as any,
      probabilidade: ncForm.probabilidade as any,
      nivel_risco: riskFromSeverity(ncForm.gravidade) as any,
      evidencia_url: ncForm.evidencia_url || undefined,
      responsavel_correcao: ncForm.responsavel_correcao || undefined,
      prazo_correcao: ncForm.prazo_correcao || undefined,
      acao_corretiva: ncForm.acao_corretiva || undefined,
      status: 'aberta',
      validacao_status: 'pendente',
      observacoes: ncForm.observacoes || undefined,
    });
    if (!result.success) {
      toast({ title: getToastError(result.error, 'Nao foi possivel criar a nao conformidade.'), variant: 'destructive' });
      return;
    }
    await finishWithRefresh('Nao conformidade criada com sucesso.');
  };

  const saveIncident = async () => {
    if (!incidentForm.descricao || !incidentForm.data_ocorrencia) {
      toast({ title: 'Informe data e descricao do incidente.', variant: 'destructive' });
      return;
    }
    const result = await createIncident({
      companyId,
      titulo: incidentForm.titulo,
      tipo_ocorrencia: incidentForm.tipo_ocorrencia as any,
      data_ocorrencia: incidentForm.data_ocorrencia,
      hora_ocorrencia: incidentForm.hora_ocorrencia || undefined,
      local: incidentForm.local || collaborator.local_trabalho || collaborator.setor || 'Nao informado',
      setor: collaborator.setor || 'Nao informado',
      colaborador_id: collaborator.id,
      descricao: incidentForm.descricao,
      houve_lesao: incidentForm.tipo_ocorrencia === 'acidente_com_lesao' || incidentForm.tipo_ocorrencia === 'acidente_com_afastamento',
      houve_afastamento: incidentForm.tipo_ocorrencia === 'acidente_com_afastamento',
      houve_dano_material: incidentForm.tipo_ocorrencia === 'dano_material',
      gravidade: incidentForm.gravidade as any,
      probabilidade: incidentForm.probabilidade as any,
      nivel_risco: riskFromSeverity(incidentForm.gravidade) as any,
      medidas_imediatas: incidentForm.medidas_imediatas || undefined,
      evidencia_url: incidentForm.evidencia_url || undefined,
      status: 'aberto',
      observacoes: incidentForm.observacoes || undefined,
      epi_obrigatorio: false,
      epi_entregue: false,
      epi_utilizado: false,
      epi_adequado: false,
      treinamento_obrigatorio: false,
      treinamento_realizado: false,
      treinamento_valido: false,
      testemunhas: [],
      acoes: [],
    });
    if (!result.success) {
      toast({ title: getToastError(result.error, 'Nao foi possivel registrar o incidente.'), variant: 'destructive' });
      return;
    }
    await finishWithRefresh('Incidente registrado com sucesso.');
  };

  const saveCost = async () => {
    if (!costForm.descricao || !costForm.valor) {
      toast({ title: 'Informe descricao e valor do custo.', variant: 'destructive' });
      return;
    }
    const result = await createCostPrevention({
      companyId,
      descricao: costForm.descricao,
      categoria: costForm.categoria as any,
      tipo_custo: costForm.tipo_custo as any,
      valor: Number(costForm.valor || 0),
      data_custo: costForm.data_custo,
      fornecedor: costForm.fornecedor || undefined,
      setor: collaborator.setor || undefined,
      colaborador_id: collaborator.id,
      origem: 'manual',
      comprovante_url: costForm.comprovante_url || undefined,
      responsavel_registro: 'Responsavel SST',
      observacoes: costForm.observacoes || undefined,
    });
    if (!result.success) {
      toast({ title: getToastError(result.error, 'Nao foi possivel registrar o custo.'), variant: 'destructive' });
      return;
    }
    await finishWithRefresh('Custo registrado com sucesso.');
  };

  const saveDocument = async () => {
    if (!documentForm.nome) {
      toast({ title: 'Informe o nome do documento.', variant: 'destructive' });
      return;
    }
    const key = `phidocs:collaborator-documents:${companyId}:${collaborator.id}`;
    const current = JSON.parse(window.localStorage.getItem(key) || '[]') as QuickDocument[];
    window.localStorage.setItem(key, JSON.stringify([{ ...documentForm, created_at: new Date().toISOString() }, ...current]));
    onDocumentSaved?.();
    toast({ title: 'Documento adicionado com sucesso.' });
    onClose();
  };

  const handleReport = () => {
    onPrepared('Relatorio individual preparado');
    onClose();
  };

  const saveByAction: Record<QuickActionType, () => void> = {
    epi: () => runSave(saveEpi),
    training: () => runSave(saveTraining),
    aso: () => runSave(saveAso),
    nonconformity: () => runSave(saveNonconformity),
    incident: () => runSave(saveIncident),
    cost: () => runSave(saveCost),
    document: () => runSave(saveDocument),
    report: handleReport,
  };

  const updateEpiSelection = (epiId: string, patch: Partial<QuickEpiSelection>) => {
    setDuplicateOverride(false);
    setEpiSelections((items) => items.map((item) => (item.epi.id === epiId ? { ...item, ...patch } : item)));
  };

  const addManualEpi = () => {
    if (!selectedManualEpi) {
      toast({ title: 'Selecione um EPI para adicionar.', variant: 'destructive' });
      return;
    }
    if (epiSelections.some((item) => item.epi.id === selectedManualEpi.id)) {
      updateEpiSelection(selectedManualEpi.id, { selected: true });
      setEpiForm((current) => ({ ...current, manual_epi_id: '' }));
      return;
    }
    const existingDelivery = getLatestEpiDelivery(selectedManualEpi, epiDeliveries);
    const status = getEpiDeliveryStatus(existingDelivery);
    setEpiSelections((items) => [
      ...items,
      {
        epi: selectedManualEpi,
        source: 'manual',
        selected: true,
        status: status.status,
        statusLabel: status.label,
        existingDelivery,
        quantidade: epiForm.quantidade || '1',
        data_entrega: epiForm.data_entrega,
        data_validade: epiForm.data_validade,
        data_proxima_troca: epiForm.data_proxima_troca || (selectedManualEpi.prazo_troca_dias ? addDaysInput(epiForm.data_entrega, selectedManualEpi.prazo_troca_dias) : ''),
        responsavel_entrega: epiForm.responsavel_entrega || 'Responsavel SST',
        observacoes: epiForm.observacoes,
      },
    ]);
    setEpiForm((current) => ({ ...current, manual_epi_id: '' }));
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen && !isPending) onClose(); }}>
      <DialogContent className="max-h-[92vh] overflow-y-auto rounded-2xl border-[#e0c0b1] bg-[#f7f9fc] sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{action ? titles[action] : 'Acao rapida'}</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
          <div className="grid gap-3 text-sm sm:grid-cols-4">
            <div><span className="text-[#4f5f7a]">Colaborador</span><p className="font-bold text-[#191c1e]">{collaborator.nome_completo}</p></div>
            <div><span className="text-[#4f5f7a]">CPF</span><p className="font-bold text-[#191c1e]">{collaborator.cpf || 'Nao informado'}</p></div>
            <div><span className="text-[#4f5f7a]">Funcao</span><p className="font-bold text-[#191c1e]">{collaborator.funcao || 'Nao informada'}</p></div>
            <div><span className="text-[#4f5f7a]">Setor</span><p className="font-bold text-[#191c1e]">{collaborator.setor || 'Nao informado'}</p></div>
          </div>
        </div>

        {action === 'epi' ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <IncidentMetric label="EPIs cadastrados" value={epis.length} />
              <IncidentMetric label="Obrigatorios da funcao" value={epiSelections.filter((item) => item.source !== 'manual').length} />
              <IncidentMetric label="Selecionados" value={epiSelections.filter((item) => item.selected).length} />
            </div>

            {!collaborator.funcao ? (
              <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4 text-sm text-[#9e4300]">
                Este colaborador nao possui funcao cadastrada. Para sugerir EPIs automaticamente, cadastre a funcao do colaborador.
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onClose();
                      onEdit?.();
                    }}
                  >
                    Editar colaborador
                  </Button>
                </div>
              </div>
            ) : epiSelections.filter((item) => item.source !== 'manual').length ? (
              <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h4 className="font-bold text-[#191c1e]">EPIs obrigatorios para esta funcao</h4>
                    <p className="text-sm text-[#4f5f7a]">Estes EPIs foram carregados com base na funcao {collaborator.funcao}.</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEpiSelections((items) => items.map((item) => ({ ...item, selected: item.status !== 'entregue' })))}
                  >
                    Selecionar pendentes
                  </Button>
                </div>
                <div className="mt-4 space-y-3">
                  {epiSelections.map((item) => (
                    <div key={item.epi.id} className={cn('rounded-xl border p-4', item.selected ? 'border-[#f46e11] bg-[#fff8f1]' : 'border-[#eceef1] bg-[#f7f9fc]')}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <label className="flex items-center gap-2 font-semibold text-[#191c1e]">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(event) => updateEpiSelection(item.epi.id, { selected: event.target.checked })}
                            className="h-4 w-4 accent-[#f46e11]"
                          />
                          {item.epi.nome}
                        </label>
                        <div className="flex flex-wrap gap-2 sm:ml-auto">
                          <Badge className={cn('border-0', getQuickEpiStatusStyle(item.status))}>{item.statusLabel}</Badge>
                          <Badge className="border-0 bg-[#eef1f5] text-[#4f5f7a]">{item.source === 'manual' ? 'Manual' : item.source === 'ia' ? 'Sugerido por IA' : 'Funcao'}</Badge>
                        </div>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs text-[#4f5f7a] sm:grid-cols-4">
                        <span>Categoria: <b>{item.epi.categoria || 'Nao informada'}</b></span>
                        <span>CA: <b>{item.epi.ca || 'Nao informado'}</b></span>
                        <span>Validade CA: <b>{formatDate(item.epi.validade_ca)}</b></span>
                        <span>Troca padrao: <b>{item.epi.prazo_troca_dias ? `${item.epi.prazo_troca_dias} dias` : 'Nao definida'}</b></span>
                      </div>
                      {item.existingDelivery ? (
                        <p className="mt-2 text-xs text-[#4f5f7a]">
                          Ultima entrega: {formatDate(item.existingDelivery.data_entrega)} | Proxima troca: {formatDate(item.existingDelivery.data_proxima_troca || item.existingDelivery.data_validade)}
                        </p>
                      ) : null}
                      {item.selected ? (
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <QuickInput label="Quantidade" type="number" value={item.quantidade} onChange={(value) => updateEpiSelection(item.epi.id, { quantidade: value })} />
                          <QuickInput label="Data de entrega" type="date" value={item.data_entrega} onChange={(value) => updateEpiSelection(item.epi.id, { data_entrega: value, data_proxima_troca: item.epi.prazo_troca_dias ? addDaysInput(value, item.epi.prazo_troca_dias) : item.data_proxima_troca })} />
                          <QuickInput label="Proxima troca" type="date" value={item.data_proxima_troca} onChange={(value) => updateEpiSelection(item.epi.id, { data_proxima_troca: value })} />
                          <QuickInput label="Validade" type="date" value={item.data_validade} onChange={(value) => updateEpiSelection(item.epi.id, { data_validade: value })} />
                          <QuickInput label="Responsavel" value={item.responsavel_entrega} onChange={(value) => updateEpiSelection(item.epi.id, { responsavel_entrega: value })} />
                          <QuickInput label="Observacao" value={item.observacoes} onChange={(value) => updateEpiSelection(item.epi.id, { observacoes: value })} />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[#ccb4a6] bg-white p-4">
                <p className="font-bold text-[#191c1e]">Nenhum EPI obrigatorio configurado para a funcao {collaborator.funcao}.</p>
                <p className="mt-1 text-sm text-[#4f5f7a]">Voce ainda pode selecionar EPIs manualmente ou configurar os EPIs desta funcao no modulo de Entregas de EPI.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button asChild type="button" variant="outline" size="sm">
                    <a href={`/company/${companyId}?section=epiDeliveries&funcao=${encodeURIComponent(collaborator.funcao || '')}`}>
                      Configurar EPIs desta funcao
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => toast({ title: 'Sugestao de EPIs com IA em preparacao.', description: 'A estrutura ja esta pronta para usar funcao, setor, riscos e atividades do colaborador.' })}
                  >
                    Sugerir EPIs com IA
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
              <h4 className="font-bold text-[#191c1e]">Adicionar outro EPI</h4>
              <p className="mt-1 text-sm text-[#4f5f7a]">Use esta opcao para entregar um EPI adicional sem alterar a configuracao da funcao.</p>
              <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                <QuickSelect
                  label="Buscar EPI por nome, CA ou categoria"
                  value={epiForm.manual_epi_id}
                  onChange={(value) => setEpiForm((current) => ({ ...current, manual_epi_id: value }))}
                  options={epis.map((item) => ({ value: item.id, label: `${item.nome}${item.ca ? ` - CA ${item.ca}` : ''}${item.categoria ? ` - ${item.categoria}` : ''}` }))}
                />
                <Button type="button" variant="outline" onClick={addManualEpi}>Adicionar a entrega</Button>
              </div>
            </div>
          </div>
        ) : null}

        {action === 'training' ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <IncidentMetric label="Catalogo" value={trainingCatalog.length} />
              <IncidentMetric label="Registrados" value={trainings.length} />
              <IncidentMetric label="Validade padrao" valueLabel={selectedTraining?.validade_meses ? `${selectedTraining.validade_meses} meses` : 'Nao definida'} />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <QuickSelect label="Treinamento" value={trainingForm.treinamento_id} onChange={(value) => setTrainingForm((current) => ({ ...current, treinamento_id: value }))} options={trainingCatalog.map((item) => ({ value: item.id, label: item.nome }))} />
              <QuickInput label="Data de realizacao" type="date" value={trainingForm.data_realizacao} onChange={(value) => setTrainingForm((current) => ({ ...current, data_realizacao: value, data_vencimento: current.data_vencimento || addMonthsInput(value, selectedTraining?.validade_meses || 0) }))} />
              <QuickInput label="Data de vencimento" type="date" value={trainingForm.data_vencimento} onChange={(value) => setTrainingForm((current) => ({ ...current, data_vencimento: value }))} />
              <QuickInput label="Carga horaria realizada" type="number" value={trainingForm.carga_horaria_realizada} onChange={(value) => setTrainingForm((current) => ({ ...current, carga_horaria_realizada: value }))} />
              <QuickInput label="Instrutor" value={trainingForm.instrutor} onChange={(value) => setTrainingForm((current) => ({ ...current, instrutor: value }))} />
              <QuickInput label="Empresa responsavel" value={trainingForm.empresa_treinamento} onChange={(value) => setTrainingForm((current) => ({ ...current, empresa_treinamento: value }))} />
              <QuickInput label="Certificado/anexo URL" value={trainingForm.certificado_url} onChange={(value) => setTrainingForm((current) => ({ ...current, certificado_url: value }))} />
              <QuickTextarea label="Observacoes" value={trainingForm.observacoes} onChange={(value) => setTrainingForm((current) => ({ ...current, observacoes: value }))} />
            </div>
          </div>
        ) : null}

        {action === 'aso' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <QuickInput label="Data do novo ASO" type="date" value={asoForm.data_aso} onChange={(value) => setAsoForm((current) => ({ ...current, data_aso: value }))} />
            <QuickInput label="Validade do ASO" type="date" value={asoForm.data_validade} onChange={(value) => setAsoForm((current) => ({ ...current, data_validade: value }))} />
            <QuickSelect label="Tipo de ASO" value={asoForm.tipo} onChange={(value) => setAsoForm((current) => ({ ...current, tipo: value }))} options={['Admissional', 'Periodico', 'Mudanca de risco', 'Retorno ao trabalho', 'Demissional'].map((item) => ({ value: item, label: item }))} />
            <QuickInput label="Medico/clinica" value={asoForm.clinica} onChange={(value) => setAsoForm((current) => ({ ...current, clinica: value }))} />
            <QuickInput label="Anexo do ASO URL" value={asoForm.anexo_url} onChange={(value) => setAsoForm((current) => ({ ...current, anexo_url: value }))} className="md:col-span-2" />
            <QuickTextarea label="Observacoes" value={asoForm.observacoes} onChange={(value) => setAsoForm((current) => ({ ...current, observacoes: value }))} className="md:col-span-2" />
          </div>
        ) : null}

        {action === 'nonconformity' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <QuickInput label="Titulo" value={ncForm.titulo} onChange={(value) => setNcForm((current) => ({ ...current, titulo: value }))} className="md:col-span-2" />
            <QuickTextarea label="Descricao" value={ncForm.descricao} onChange={(value) => setNcForm((current) => ({ ...current, descricao: value }))} className="md:col-span-2" />
            <QuickSelect label="Gravidade" value={ncForm.gravidade} onChange={(value) => setNcForm((current) => ({ ...current, gravidade: value }))} options={['baixa', 'media', 'alta', 'critica'].map((item) => ({ value: item, label: item }))} />
            <QuickSelect label="Probabilidade" value={ncForm.probabilidade} onChange={(value) => setNcForm((current) => ({ ...current, probabilidade: value }))} options={['baixa', 'media', 'alta'].map((item) => ({ value: item, label: item }))} />
            <QuickInput label="Local" value={ncForm.local} onChange={(value) => setNcForm((current) => ({ ...current, local: value }))} />
            <QuickInput label="Prazo de correcao" type="date" value={ncForm.prazo_correcao} onChange={(value) => setNcForm((current) => ({ ...current, prazo_correcao: value }))} />
            <QuickInput label="Responsavel" value={ncForm.responsavel_correcao} onChange={(value) => setNcForm((current) => ({ ...current, responsavel_correcao: value }))} />
            <QuickInput label="Evidencia/anexo URL" value={ncForm.evidencia_url} onChange={(value) => setNcForm((current) => ({ ...current, evidencia_url: value }))} />
            <QuickTextarea label="Acao corretiva sugerida" value={ncForm.acao_corretiva} onChange={(value) => setNcForm((current) => ({ ...current, acao_corretiva: value }))} />
            <QuickTextarea label="Observacoes" value={ncForm.observacoes} onChange={(value) => setNcForm((current) => ({ ...current, observacoes: value }))} />
          </div>
        ) : null}

        {action === 'incident' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <QuickInput label="Titulo" value={incidentForm.titulo} onChange={(value) => setIncidentForm((current) => ({ ...current, titulo: value }))} className="md:col-span-2" />
            <QuickSelect label="Tipo de incidente" value={incidentForm.tipo_ocorrencia} onChange={(value) => setIncidentForm((current) => ({ ...current, tipo_ocorrencia: value }))} options={[
              ['incidente_sem_lesao', 'Incidente sem lesao'],
              ['quase_acidente', 'Quase acidente'],
              ['acidente_com_lesao', 'Acidente com lesao'],
              ['acidente_com_afastamento', 'Acidente com afastamento'],
              ['dano_material', 'Dano material'],
              ['condicao_insegura', 'Condicao insegura'],
            ].map(([value, label]) => ({ value, label }))} />
            <QuickInput label="Data" type="date" value={incidentForm.data_ocorrencia} onChange={(value) => setIncidentForm((current) => ({ ...current, data_ocorrencia: value }))} />
            <QuickInput label="Hora" type="time" value={incidentForm.hora_ocorrencia} onChange={(value) => setIncidentForm((current) => ({ ...current, hora_ocorrencia: value }))} />
            <QuickInput label="Local" value={incidentForm.local} onChange={(value) => setIncidentForm((current) => ({ ...current, local: value }))} />
            <QuickSelect label="Gravidade" value={incidentForm.gravidade} onChange={(value) => setIncidentForm((current) => ({ ...current, gravidade: value }))} options={['baixa', 'media', 'alta', 'critica'].map((item) => ({ value: item, label: item }))} />
            <QuickSelect label="Probabilidade" value={incidentForm.probabilidade} onChange={(value) => setIncidentForm((current) => ({ ...current, probabilidade: value }))} options={['baixa', 'media', 'alta'].map((item) => ({ value: item, label: item }))} />
            <QuickInput label="Evidencias URL" value={incidentForm.evidencia_url} onChange={(value) => setIncidentForm((current) => ({ ...current, evidencia_url: value }))} />
            <QuickTextarea label="Descricao" value={incidentForm.descricao} onChange={(value) => setIncidentForm((current) => ({ ...current, descricao: value }))} className="md:col-span-2" />
            <QuickTextarea label="Acao imediata" value={incidentForm.medidas_imediatas} onChange={(value) => setIncidentForm((current) => ({ ...current, medidas_imediatas: value }))} />
            <QuickTextarea label="Observacoes" value={incidentForm.observacoes} onChange={(value) => setIncidentForm((current) => ({ ...current, observacoes: value }))} />
          </div>
        ) : null}

        {action === 'cost' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <QuickInput label="Descricao" value={costForm.descricao} onChange={(value) => setCostForm((current) => ({ ...current, descricao: value }))} className="md:col-span-2" />
            <QuickInput label="Valor" type="number" value={costForm.valor} onChange={(value) => setCostForm((current) => ({ ...current, valor: value }))} />
            <QuickInput label="Data" type="date" value={costForm.data_custo} onChange={(value) => setCostForm((current) => ({ ...current, data_custo: value }))} />
            <QuickSelect label="Categoria" value={costForm.categoria} onChange={(value) => setCostForm((current) => ({ ...current, categoria: value }))} options={[
              ['prevencao', 'Prevencao'],
              ['correcao', 'Correcao'],
              ['incidente', 'Incidente'],
              ['treinamento', 'Treinamento'],
              ['EPI', 'EPI'],
              ['exame_ocupacional', 'Exame ocupacional'],
              ['outros', 'Outros'],
            ].map(([value, label]) => ({ value, label }))} />
            <QuickSelect label="Tipo de custo" value={costForm.tipo_custo} onChange={(value) => setCostForm((current) => ({ ...current, tipo_custo: value }))} options={[
              ['custo_pontual', 'Custo pontual'],
              ['investimento_preventivo', 'Investimento preventivo'],
              ['custo_corretivo', 'Custo corretivo'],
              ['custo_operacional', 'Custo operacional'],
            ].map(([value, label]) => ({ value, label }))} />
            <QuickInput label="Fornecedor" value={costForm.fornecedor} onChange={(value) => setCostForm((current) => ({ ...current, fornecedor: value }))} />
            <QuickInput label="Comprovante URL" value={costForm.comprovante_url} onChange={(value) => setCostForm((current) => ({ ...current, comprovante_url: value }))} />
            <QuickTextarea label="Observacoes" value={costForm.observacoes} onChange={(value) => setCostForm((current) => ({ ...current, observacoes: value }))} className="md:col-span-2" />
          </div>
        ) : null}

        {action === 'document' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <QuickSelect label="Tipo de documento" value={documentForm.tipo} onChange={(value) => setDocumentForm((current) => ({ ...current, tipo: value }))} options={['ASO', 'Certificado', 'Documento pessoal', 'Termo de EPI', 'Relatorio', 'Outro'].map((item) => ({ value: item, label: item }))} />
            <QuickInput label="Nome" value={documentForm.nome} onChange={(value) => setDocumentForm((current) => ({ ...current, nome: value }))} />
            <QuickInput label="Arquivo URL" value={documentForm.arquivo_url} onChange={(value) => setDocumentForm((current) => ({ ...current, arquivo_url: value }))} className="md:col-span-2" />
            <QuickInput label="Data de emissao" type="date" value={documentForm.data_emissao} onChange={(value) => setDocumentForm((current) => ({ ...current, data_emissao: value }))} />
            <QuickInput label="Data de validade" type="date" value={documentForm.data_validade} onChange={(value) => setDocumentForm((current) => ({ ...current, data_validade: value }))} />
            <QuickTextarea label="Observacoes" value={documentForm.observacoes} onChange={(value) => setDocumentForm((current) => ({ ...current, observacoes: value }))} className="md:col-span-2" />
          </div>
        ) : null}

        {action === 'report' ? (
          <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
            <p className="text-sm leading-6 text-[#334766]">
              O relatorio individual sera montado com dados cadastrais, EPIs, treinamentos, ASO, nao conformidades, incidentes, custos e documentos vinculados a este colaborador.
            </p>
          </div>
        ) : null}

        <div className="flex flex-col-reverse gap-2 border-t border-[#e0c0b1] pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          <Button
            type="button"
            onClick={() => action && saveByAction[action]()}
            disabled={isPending}
            className="bg-[#f46e11] text-white hover:bg-[#e96710]"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {action === 'report' ? 'Preparar relatorio' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CollaboratorDetails({
  collaborator,
  companyId,
  context,
  epis,
  epiMappings,
  epiDeliveries,
  trainingCatalog,
  trainings,
  inspections,
  nonconformities,
  incidents,
  costs,
  onRefresh,
  onEdit,
  onPrepared,
  isGeneratingRecommendations,
  onGenerateRecommendations,
}: {
  collaborator: Collaborator;
  companyId: string;
  context: CollaboratorContext;
  epis: Epi[];
  epiMappings: EpiByFunction[];
  epiDeliveries: EpiDelivery[];
  trainingCatalog: Training[];
  trainings: CollaboratorTraining[];
  inspections: Inspection[];
  nonconformities: Nonconformity[];
  incidents: Incident[];
  costs: CostPrevention[];
  onRefresh: () => Promise<void>;
  onEdit: () => void;
  onPrepared: (title: string) => void;
  isGeneratingRecommendations: boolean;
  onGenerateRecommendations: () => void;
}) {
  const recommendations = collaborator.ai_recommendations;
  const recommendationCards = buildRecommendationCards(recommendations);
  const [quickAction, setQuickAction] = useState<QuickActionType | null>(null);
  const [quickDocuments, setQuickDocuments] = useState<QuickDocument[]>([]);

  const loadQuickDocuments = () => {
    if (typeof window === 'undefined') return;
    const key = `phidocs:collaborator-documents:${companyId}:${collaborator.id}`;
    setQuickDocuments(JSON.parse(window.localStorage.getItem(key) || '[]') as QuickDocument[]);
  };

  useEffect(() => {
    loadQuickDocuments();
  }, [companyId, collaborator.id]);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-[#dfe5ef] text-xl font-bold text-[#203555]">
            {collaborator.foto_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={collaborator.foto_url} alt={collaborator.nome_completo} className="h-full w-full object-cover" />
            ) : getInitials(collaborator.nome_completo)}
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-[#191c1e]">{collaborator.nome_completo}</h3>
            <p className="text-[#4f5f7a]">{collaborator.funcao} • {collaborator.setor}</p>
          </div>
          <Badge className={cn('rounded-full px-4 py-1 uppercase', getStatusStyle(collaborator.status))}>
            {statusOptions.find((item) => item.value === collaborator.status)?.label}
          </Badge>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={cn('rounded-full px-4 py-1', getSecurityStyle(context.securityStatus))}>{context.securityLabel}</Badge>
          <Badge className="rounded-full bg-[#eef1f5] px-4 py-1 text-[#4f5f7a]">ASO: {context.asoLabel}</Badge>
          <Badge className="rounded-full bg-[#eef1f5] px-4 py-1 text-[#4f5f7a]">{context.pendingSummary}</Badge>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setQuickAction('epi')}><PackageCheck className="mr-2 h-4 w-4" />Entregar EPI</Button>
          <Button variant="outline" onClick={() => setQuickAction('training')}><GraduationCap className="mr-2 h-4 w-4" />Registrar Treinamento</Button>
          <Button variant="outline" onClick={() => setQuickAction('aso')}><BadgeCheck className="mr-2 h-4 w-4" />Atualizar ASO</Button>
          <Button variant="outline" onClick={() => setQuickAction('nonconformity')}><ShieldAlert className="mr-2 h-4 w-4" />Abrir NC</Button>
          <Button variant="outline" onClick={() => setQuickAction('incident')}><Siren className="mr-2 h-4 w-4" />Registrar Incidente</Button>
          <Button variant="outline" onClick={() => setQuickAction('cost')}><Wallet className="mr-2 h-4 w-4" />Registrar Custo</Button>
          <Button variant="outline" onClick={() => setQuickAction('document')}><FileText className="mr-2 h-4 w-4" />Adicionar Documento</Button>
          <Button variant="outline" onClick={() => setQuickAction('report')}><Download className="mr-2 h-4 w-4" />Gerar Relatorio</Button>
          <Button variant="outline" onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar Dados</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="rounded-xl border border-[#e0c0b1] bg-white p-4">
        <TabsList className="h-auto w-full justify-start overflow-x-auto rounded-xl bg-[#eef1f5] p-1">
          <TabsTrigger value="overview">Visao Geral</TabsTrigger>
          <TabsTrigger value="data">Dados</TabsTrigger>
          <TabsTrigger value="epi">EPIs</TabsTrigger>
          <TabsTrigger value="training">Treinamentos</TabsTrigger>
          <TabsTrigger value="inspections">Inspecoes</TabsTrigger>
          <TabsTrigger value="nonconformities">Nao Conformidades</TabsTrigger>
          <TabsTrigger value="incidents">Incidentes</TabsTrigger>
          <TabsTrigger value="costs">Custos</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
          <TabsTrigger value="history">Historico</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <IncidentMetric label="EPIs pendentes" value={context.pendingItems.filter((item) => item.type.includes('EPI')).length} />
            <IncidentMetric label="Treinamentos vencidos" value={context.pendingItems.filter((item) => item.type.includes('Treinamento vencido')).length} />
            <IncidentMetric label="ASO" valueLabel={context.asoLabel} />
            <IncidentMetric label="NC abertas" value={nonconformities.filter((item) => item.status !== 'resolvida' && item.status !== 'cancelada').length} />
            <IncidentMetric label="Incidentes" value={incidents.length} />
            <IncidentMetric label="Custos" valueLabel={formatCurrency(context.costTotal)} />
          </div>
          {context.pendingItems.length === 0 ? (
            <EmptyState text="Sem pendencias consolidadas para este colaborador." />
          ) : (
            <div className="space-y-2">
              {context.pendingItems.slice(0, 8).map((item, index) => <PendingRow key={`${item.type}-${index}`} item={item} onAction={() => setQuickAction(item.section === 'epiDeliveries' ? 'epi' : item.section === 'trainings' ? 'training' : 'aso')} />)}
            </div>
          )}
        </TabsContent>
        <TabsContent value="data"><EmptyState text="Os dados completos aparecem nas secoes organizadas abaixo." /></TabsContent>
        <TabsContent value="epi" className="space-y-3"><Button variant="outline" onClick={() => setQuickAction('epi')}><PackageCheck className="mr-2 h-4 w-4" />Entregar EPI</Button><SimpleList items={epiDeliveries.map((item) => `${item.epi?.nome || 'EPI'} - ${item.status} - ${formatDate(item.data_entrega)}`)} empty="Nenhum EPI entregue ainda. Comece registrando uma entrega para este colaborador." /></TabsContent>
        <TabsContent value="training" className="space-y-3"><Button variant="outline" onClick={() => setQuickAction('training')}><GraduationCap className="mr-2 h-4 w-4" />Registrar Treinamento</Button><SimpleList items={trainings.map((item) => `${item.treinamento?.nome || 'Treinamento'} - ${item.status} - vence ${formatDate(item.data_vencimento)}`)} empty="Nenhum treinamento registrado ainda." /></TabsContent>
        <TabsContent value="inspections"><SimpleList items={inspections.map((item) => `${item.titulo} - ${item.status} - ${item.setor}`)} empty="Nenhuma inspecao relacionada ao colaborador." /></TabsContent>
        <TabsContent value="nonconformities" className="space-y-3"><Button variant="outline" onClick={() => setQuickAction('nonconformity')}><ShieldAlert className="mr-2 h-4 w-4" />Abrir NC</Button><SimpleList items={nonconformities.map((item) => `${item.titulo} - ${item.status} - ${item.gravidade}`)} empty="Nenhuma nao conformidade vinculada." /></TabsContent>
        <TabsContent value="incidents" className="space-y-3"><Button variant="outline" onClick={() => setQuickAction('incident')}><Siren className="mr-2 h-4 w-4" />Registrar Incidente</Button><SimpleList items={incidents.map((item) => `${item.titulo} - ${item.status} - ${item.setor}`)} empty="Nenhum incidente registrado para este colaborador." /></TabsContent>
        <TabsContent value="costs" className="space-y-3"><Button variant="outline" onClick={() => setQuickAction('cost')}><Wallet className="mr-2 h-4 w-4" />Registrar Custo</Button><SimpleList items={costs.map((item) => `${item.descricao} - ${item.categoria} - ${formatCurrency(item.valor)}`)} empty="Nenhum custo relacionado." /></TabsContent>
        <TabsContent value="documents" className="space-y-3">
          <Button variant="outline" onClick={() => setQuickAction('document')}><FileText className="mr-2 h-4 w-4" />Adicionar Documento</Button>
          {quickDocuments.length ? (
            <SimpleList
              items={quickDocuments.map((item) => `${item.tipo} - ${item.nome}${item.data_validade ? ` - vence ${formatDate(item.data_validade)}` : ''}`)}
              empty="Nenhum documento anexado ainda."
            />
          ) : (
            <EmptyState text="Nenhum documento anexado ainda." />
          )}
        </TabsContent>
        <TabsContent value="history" className="space-y-2">
          <TimelineItem icon={UserPlus} title="Cadastro criado" description={formatDate(collaborator.created_at?.slice(0, 10))} />
          <TimelineItem icon={Pencil} title="Dados atualizados" description={formatDate(collaborator.updated_at?.slice(0, 10))} />
          {epiDeliveries.map((item) => <TimelineItem key={item.id} icon={PackageCheck} title="EPI entregue" description={`${item.epi?.nome || 'EPI'} - ${formatDate(item.data_entrega)}`} />)}
          {trainings.map((item) => <TimelineItem key={item.id} icon={GraduationCap} title="Treinamento registrado" description={`${item.treinamento?.nome || 'Treinamento'} - ${item.status}`} />)}
          {nonconformities.map((item) => <TimelineItem key={item.id} icon={ShieldAlert} title="Nao conformidade registrada" description={`${item.titulo} - ${item.status}`} />)}
          {incidents.map((item) => <TimelineItem key={item.id} icon={Siren} title="Incidente registrado" description={`${item.titulo} - ${item.status}`} />)}
          {costs.map((item) => <TimelineItem key={item.id} icon={Wallet} title="Custo registrado" description={`${item.descricao} - ${formatCurrency(item.valor)}`} />)}
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 lg:grid-cols-3">
        <DetailBlock title="Dados pessoais" icon={IdCard} items={[
          ['CPF', collaborator.cpf],
          ['RG', collaborator.rg],
          ['Nascimento', formatDate(collaborator.data_nascimento)],
          ['Telefone', collaborator.telefone],
          ['E-mail', collaborator.email],
          ['Endereco', collaborator.endereco],
        ]} />
        <DetailBlock title="Dados profissionais" icon={Briefcase} items={[
          ['Matricula', collaborator.matricula],
          ['Empresa', collaborator.empresa],
          ['Funcao', collaborator.funcao],
          ['Setor', collaborator.setor],
          ['Admissao', formatDate(collaborator.data_admissao)],
          ['Contrato', collaborator.tipo_contrato],
          ['Gestor', collaborator.gestor_responsavel],
          ['Local', collaborator.local_trabalho],
          ['Turno', collaborator.turno_trabalho],
        ]} />
        <DetailBlock title="Dados de seguranca" icon={ShieldAlert} items={[
          ['ASO valido ate', formatDate(collaborator.aso_validade)],
          ['Pendencias', isAsoPending(collaborator) ? 'ASO pendente ou vencido' : 'Sem pendencias criticas'],
          ['Atividades', collaborator.atividades_realizadas],
          ['Riscos', collaborator.riscos_associados],
          ['Obs. seguranca', collaborator.observacoes_seguranca],
          ['Obs. gerais', collaborator.observacoes_gerais],
        ]} />
      </div>

      <CollaboratorQuickActionDialog
        action={quickAction}
        collaborator={collaborator}
        companyId={companyId}
        epis={epis}
        epiMappings={epiMappings}
        epiDeliveries={epiDeliveries}
        trainingCatalog={trainingCatalog}
        trainings={trainings}
        onClose={() => setQuickAction(null)}
        onRefresh={onRefresh}
        onDocumentSaved={loadQuickDocuments}
        onEdit={onEdit}
        onPrepared={onPrepared}
      />

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#191c1e]">Incidentes</h3>
            <p className="text-sm text-[#4f5f7a]">
              Historico de ocorrencias vinculadas ao colaborador.
            </p>
          </div>
          <a
            href={`/company/${companyId}?section=incidents`}
            className="inline-flex items-center justify-center rounded-md border border-[#415778] px-4 py-2 text-sm font-semibold text-[#415778] transition-colors hover:bg-[#eef1f5]"
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Acessar incidentes
          </a>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IncidentMetric label="Incidentes vinculados" value={incidents.length} />
          <IncidentMetric label="Quase acidentes" value={incidents.filter((item) => item.tipo_ocorrencia === 'quase_acidente').length} />
          <IncidentMetric label="Acidentes com lesao" value={incidents.filter((item) => item.houve_lesao || item.tipo_ocorrencia === 'acidente_com_lesao').length} />
          <IncidentMetric label="Acidentes com afastamento" value={incidents.filter((item) => item.houve_afastamento || item.tipo_ocorrencia === 'acidente_com_afastamento').length} />
        </div>
        <div className="mt-4 space-y-2">
          {incidents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">Nenhum incidente vinculado.</p>
          ) : incidents.slice(0, 6).map((incident) => (
            <div key={incident.id} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm">
              <p className="font-bold text-[#191c1e]">{incident.titulo}</p>
              <p className="text-[#4f5f7a]">{incident.setor} - {incident.local} - {incident.status}</p>
              <p className="mt-1 text-[#334766]">{incident.acao_preventiva || incident.prevencao_recomendada || 'Sem acao preventiva registrada.'}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#191c1e]">Custos Relacionados</h3>
            <p className="text-sm text-[#4f5f7a]">
              EPIs, treinamentos, incidentes e nao conformidades com impacto financeiro no colaborador.
            </p>
          </div>
          <a
            href={`/company/${companyId}?section=costsPrevention`}
            className="inline-flex items-center justify-center rounded-md border border-[#415778] px-4 py-2 text-sm font-semibold text-[#415778] transition-colors hover:bg-[#eef1f5]"
          >
            <ShieldAlert className="mr-2 h-4 w-4" />
            Acessar custos
          </a>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IncidentMetric label="Custos com EPIs" value={costs.filter((item) => item.epi_id).length} />
          <IncidentMetric label="Custos com treinamentos" value={costs.filter((item) => item.treinamento_id).length} />
          <IncidentMetric label="Custos com incidentes" value={costs.filter((item) => item.incidente_id).length} />
          <IncidentMetric label="Total associado" valueLabel={formatCurrency(costs.reduce((total, item) => total + Number(item.valor || 0), 0))} />
        </div>
        <div className="mt-4 space-y-2">
          {costs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">Nenhum custo relacionado.</p>
          ) : costs.slice(0, 6).map((cost) => (
            <div key={cost.id} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm">
              <p className="font-bold text-[#191c1e]">{cost.descricao}</p>
              <p className="text-[#4f5f7a]">{cost.categoria} - {cost.setor || 'Sem setor'} - {formatCurrency(cost.valor)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-bold text-[#191c1e]">EPIs e base para modulos futuros</h3>
            <p className="text-sm text-[#4f5f7a]">
              {recommendations
                ? `Recomendacoes salvas na ficha. ${formatGeneratedAt(recommendations.generated_at)}.`
                : 'Gere a base de EPI, treinamentos, riscos e medidas preventivas com IA.'}
            </p>
            {recommendations?.observacoes ? (
              <p className="mt-3 rounded-lg border border-[#e0c0b1] bg-[#fff8f1] p-3 text-sm leading-6 text-[#521f00]">
                {recommendations.observacoes}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button
              type="button"
              disabled={isGeneratingRecommendations || Boolean(recommendations)}
              onClick={onGenerateRecommendations}
              className="rounded-md bg-[#f46e11] text-white hover:bg-[#e96710] disabled:opacity-60"
            >
              {isGeneratingRecommendations ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
              {recommendations ? 'Recomendacoes salvas' : 'Gerar recomendacoes com IA'}
            </Button>
            <a
              href={`/company/${companyId}?section=epiDeliveries`}
              className="inline-flex items-center justify-center rounded-md border border-[#415778] px-4 py-2 text-sm font-semibold text-[#415778] transition-colors hover:bg-[#eef1f5]"
            >
              <PackageCheck className="mr-2 h-4 w-4" />
              Acessar historico de EPI
            </a>
            <a
              href={`/company/${companyId}?section=trainings`}
              className="inline-flex items-center justify-center rounded-md border border-[#415778] px-4 py-2 text-sm font-semibold text-[#415778] transition-colors hover:bg-[#eef1f5]"
            >
              <GraduationCap className="mr-2 h-4 w-4" />
              Acessar treinamentos
            </a>
            <a
              href={`/company/${companyId}?section=inspections`}
              className="inline-flex items-center justify-center rounded-md border border-[#415778] px-4 py-2 text-sm font-semibold text-[#415778] transition-colors hover:bg-[#eef1f5]"
            >
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Acessar inspecoes
            </a>
            <a
              href={`/company/${companyId}?section=nonconformities`}
              className="inline-flex items-center justify-center rounded-md border border-[#415778] px-4 py-2 text-sm font-semibold text-[#415778] transition-colors hover:bg-[#eef1f5]"
            >
              <ShieldAlert className="mr-2 h-4 w-4" />
              Acessar nao conformidades
            </a>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {recommendationCards.map((card) => (
            <div key={card.title} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4">
              <p className="text-sm font-bold text-[#191c1e]">{card.title}</p>
              <RecommendationList items={card.items} emptyText={card.emptyText} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">
      {text}
    </div>
  );
}

function SimpleList({ items, empty }: { items: string[]; empty: string }) {
  if (!items.length) return <EmptyState text={empty} />;
  return (
    <div className="space-y-2">
      {items.slice(0, 8).map((item, index) => (
        <div key={`${item}-${index}`} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm text-[#191c1e]">
          {item}
        </div>
      ))}
    </div>
  );
}

function PendingRow({ item, onAction }: { item: PendingDetail; onAction: () => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-[#191c1e]">{item.type}</span>
          <Badge className={cn('border-0', getSeverityStyle(item.severity))}>{item.severity}</Badge>
          <Badge className="border-0 bg-[#eef1f5] text-[#4f5f7a]">{item.status}</Badge>
        </div>
        <p className="mt-1 text-sm text-[#4f5f7a]">{item.description}</p>
        {item.dueDate ? <p className="mt-1 text-xs text-[#6b7280]">Prazo: {formatDate(item.dueDate)}</p> : null}
      </div>
      <Button variant="outline" onClick={onAction} className="rounded-md">{item.actionLabel}</Button>
    </div>
  );
}

function TimelineItem({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <div className="flex gap-3 rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#fff4e8] text-[#9e4300]">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="font-bold text-[#191c1e]">{title}</p>
        <p className="text-sm text-[#4f5f7a]">{description}</p>
      </div>
    </div>
  );
}

function DetailBlock({ title, icon: Icon, items }: { title: string; icon: LucideIcon; items: Array<[string, string | undefined | null]> }) {
  return (
    <section className="rounded-xl border border-[#e0c0b1] bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-5 w-5 text-[#9e4300]" />
        <h4 className="font-bold text-[#191c1e]">{title}</h4>
      </div>
      <div className="space-y-3">
        {items.map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p>
            <p className="text-sm text-[#191c1e]">{value || 'Nao preenchido'}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
