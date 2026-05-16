'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  AlertTriangle,
  Archive,
  Award,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit,
  Eye,
  FileBadge,
  FileText,
  Filter,
  GraduationCap,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Upload,
  UserCheck,
  Users,
  UserX,
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
  CollaboratorTraining,
  CollaboratorTrainingFormValues,
  RequiredTrainingItem,
  Training,
  TrainingFormValues,
  TrainingRecordStatus,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { navigateCompanySection } from '@/lib/client-navigation';
import {
  archiveTrainingRecord,
  createTraining,
  createTrainingRecord,
  getTrainingModuleData,
  updateTrainingRecord,
} from '@/server/training-actions';

interface TrainingsTableProps {
  companyId: string;
}

type Bundle = {
  collaborators: Collaborator[];
  trainings: Training[];
  mappings: unknown[];
  records: CollaboratorTraining[];
};

type TrainingPendingItem = {
  id: string;
  collaborator: Collaborator;
  training?: Training;
  trainingName: string;
  norm: string;
  reason: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  due: string;
  action: 'register' | 'renew' | 'certificate' | 'configure';
};

type ActiveView = 'history' | 'matrix' | 'pendings';

const today = new Date().toISOString().slice(0, 10);

const emptyTraining: TrainingFormValues = {
  nome: '',
  norma: '',
  descricao: '',
  carga_horaria: 8,
  validade_meses: 12,
  obrigatorio: true,
  ativo: true,
  observacoes: '',
};

const emptyRecord: CollaboratorTrainingFormValues = {
  colaborador_id: '',
  treinamento_id: '',
  data_realizacao: today,
  data_vencimento: '',
  instrutor: '',
  empresa_treinamento: '',
  carga_horaria_realizada: 0,
  certificado_url: '',
  lista_presenca_url: '',
  status: 'valido',
  observacoes: '',
};

const statusLabels: Record<TrainingRecordStatus, string> = {
  valido: 'Valido',
  pendente: 'Pendente',
  vencido: 'Vencido',
  proximo_vencimento: 'Proximo do vencimento',
  dispensado: 'Dispensado',
  cancelado: 'Cancelado',
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

function daysUntil(value?: string) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const current = new Date();
  current.setHours(0, 0, 0, 0);
  return Math.ceil((date.getTime() - current.getTime()) / 86400000);
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

function statusStyle(status: TrainingRecordStatus) {
  if (status === 'valido') return 'bg-[#dff7e5] text-[#18703a]';
  if (status === 'pendente') return 'bg-[#fff0d8] text-[#8a4b00]';
  if (status === 'vencido') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (status === 'proximo_vencimento') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (status === 'dispensado') return 'bg-[#dfe7f5] text-[#334766]';
  return 'bg-[#eceef1] text-[#584237]';
}

function uniqueValues<T>(items: T[], getValue: (item: T) => string | undefined | null) {
  return Array.from(new Set(items.map(getValue).map((item) => item?.trim()).filter(Boolean) as string[])).sort();
}

function certificateStatus(record: CollaboratorTraining) {
  return record.certificado_url ? 'Anexado' : 'Pendente';
}

function expirationText(value?: string) {
  const days = daysUntil(value);
  if (!value || days === null) return 'Sem vencimento';
  if (days < 0) return `Vencido ha ${Math.abs(days)} dias`;
  if (days === 0) return 'Vence hoje';
  return `Vence em ${days} dias`;
}

function isCurrentMonth(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  const current = new Date();
  return date.getFullYear() === current.getFullYear() && date.getMonth() === current.getMonth();
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

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CO';
}

function calculateExpiration(dataRealizacao: string, training?: Training | null) {
  const months = Number(training?.validade_meses || 0);
  if (!dataRealizacao || months <= 0) return '';
  const date = new Date(dataRealizacao);
  date.setMonth(date.getMonth() + months);
  return date.toISOString().slice(0, 10);
}

function getRequiredTrainings(collaborator: Collaborator | null, trainings: Training[]): RequiredTrainingItem[] {
  if (!collaborator) return [];
  const functionKey = normalize(collaborator.funcao);
  const byName = new Map(trainings.map((training) => [normalize(training.nome), training]));
  const names = new Set<string>();

  if (functionKey.includes('eletricista')) {
    ['NR10 - Seguranca em Instalacoes e Servicos em Eletricidade', 'NR10 SEP', 'NR35 - Trabalho em Altura', 'Integracao de Seguranca', 'Uso correto de EPIs'].forEach((name) => names.add(name));
  } else if (functionKey.includes('empilhadeira')) {
    ['NR11 - Movimentacao de Materiais', 'Operacao de empilhadeira', 'Direcao defensiva', 'Integracao de Seguranca', 'Uso correto de EPIs'].forEach((name) => names.add(name));
  } else if (functionKey.includes('pedreiro')) {
    ['NR18 - Industria da Construcao', 'NR35 - Trabalho em Altura', 'Integracao de Seguranca', 'Uso correto de EPIs'].forEach((name) => names.add(name));
  } else if (functionKey.includes('soldador')) {
    ['Trabalho a quente', 'Uso correto de EPIs', 'Combate a incendio', 'Integracao de Seguranca', 'NR35 - Trabalho em Altura'].forEach((name) => names.add(name));
  } else if (functionKey.includes('operador')) {
    ['NR11 - Movimentacao de Materiais', 'NR12 - Maquinas e Equipamentos', 'Integracao de Seguranca', 'Uso correto de EPIs'].forEach((name) => names.add(name));
  }

  collaborator.ai_recommendations?.treinamentos_obrigatorios.forEach((name) => names.add(name));

  return Array.from(names).flatMap((name) => {
    const training = byName.get(normalize(name)) || trainings.find((item) => normalize(name).includes(normalize(item.nome)) || normalize(item.nome).includes(normalize(name)));
    return training ? [{ treinamento: training, obrigatorio: true, observacao: 'Obrigatorio pela funcao ou recomendacao salva.', source: 'funcao' as const }] : [];
  });
}

function aptitude(collaborator: Collaborator, trainings: Training[], records: CollaboratorTraining[]) {
  const required = getRequiredTrainings(collaborator, trainings).filter((item) => item.obrigatorio);
  if (required.length === 0) return 'atencao';
  const collaboratorRecords = records.filter((record) => record.colaborador_id === collaborator.id);
  const hasBlocking = required.some((item) => {
    const record = collaboratorRecords.find((current) => current.treinamento_id === item.treinamento.id);
    return !record || ['pendente', 'vencido', 'cancelado'].includes(record.status);
  });
  if (hasBlocking) return 'nao_apto';
  if (collaboratorRecords.some((record) => record.status === 'proximo_vencimento')) return 'atencao';
  return 'apto';
}

export function TrainingsTable({ companyId }: TrainingsTableProps) {
  const [bundle, setBundle] = useState<Bundle>({ collaborators: [], trainings: [], mappings: [], records: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [normFilter, setNormFilter] = useState('todas');
  const [functionFilter, setFunctionFilter] = useState('todas');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('todos');
  const [expirationFilter, setExpirationFilter] = useState('todos');
  const [certificateFilter, setCertificateFilter] = useState('todos');
  const [aptitudeFilter, setAptitudeFilter] = useState('todos');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('history');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isTrainingOpen, setIsTrainingOpen] = useState(false);
  const [isRecordOpen, setIsRecordOpen] = useState(false);
  const [trainingForm, setTrainingForm] = useState<TrainingFormValues>(emptyTraining);
  const [recordForm, setRecordForm] = useState<CollaboratorTrainingFormValues>(emptyRecord);
  const [editingRecord, setEditingRecord] = useState<CollaboratorTraining | null>(null);
  const [viewingCollaborator, setViewingCollaborator] = useState<Collaborator | null>(null);
  const [viewingRecord, setViewingRecord] = useState<CollaboratorTraining | null>(null);
  const [cancelingRecord, setCancelingRecord] = useState<CollaboratorTraining | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getTrainingModuleData(companyId);
      if (result.success && result.data) setBundle(result.data as Bundle);
      else toast({ variant: 'destructive', title: 'Erro ao buscar treinamentos', description: getToastError(result.error) });
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Nao foi possivel carregar Treinamentos.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) void loadData();
  }, [companyId]);

  const selectedCollaborator = useMemo(() => bundle.collaborators.find((item) => item.id === recordForm.colaborador_id) || null, [bundle.collaborators, recordForm.colaborador_id]);
  const requiredForSelected = useMemo(() => getRequiredTrainings(selectedCollaborator, bundle.trainings), [bundle.trainings, selectedCollaborator]);
  const functions = useMemo(() => uniqueValues(bundle.collaborators, (item) => item.funcao), [bundle.collaborators]);
  const sectors = useMemo(() => uniqueValues(bundle.collaborators, (item) => item.setor), [bundle.collaborators]);
  const norms = useMemo(() => uniqueValues(bundle.trainings, (item) => item.norma), [bundle.trainings]);

  const pendingItems = useMemo<TrainingPendingItem[]>(() => {
    const items: TrainingPendingItem[] = [];

    bundle.collaborators.forEach((collaborator) => {
      const required = getRequiredTrainings(collaborator, bundle.trainings);
      const collaboratorRecords = bundle.records.filter((record) => record.colaborador_id === collaborator.id);

      if (required.length === 0) {
        items.push({
          id: `function-${collaborator.id}`,
          collaborator,
          trainingName: 'Treinamentos da funcao',
          norm: '-',
          reason: 'Funcao sem treinamentos configurados',
          severity: 'media',
          due: 'Configurar matriz',
          action: 'configure',
        });
      }

      required.forEach((item) => {
        const record = collaboratorRecords.find((current) => current.treinamento_id === item.treinamento.id);
        if (!record) {
          items.push({
            id: `missing-${collaborator.id}-${item.treinamento.id}`,
            collaborator,
            training: item.treinamento,
            trainingName: item.treinamento.nome,
            norm: item.treinamento.norma || '-',
            reason: 'Treinamento obrigatorio nao realizado',
            severity: 'alta',
            due: 'Pendente',
            action: 'register',
          });
          return;
        }

        if (record.status === 'vencido') {
          items.push({
            id: `expired-${record.id}`,
            collaborator,
            training: item.treinamento,
            trainingName: item.treinamento.nome,
            norm: item.treinamento.norma || '-',
            reason: 'Treinamento vencido',
            severity: 'critica',
            due: expirationText(record.data_vencimento),
            action: 'renew',
          });
        }

        if (record.status === 'proximo_vencimento') {
          items.push({
            id: `near-${record.id}`,
            collaborator,
            training: item.treinamento,
            trainingName: item.treinamento.nome,
            norm: item.treinamento.norma || '-',
            reason: 'Treinamento proximo do vencimento',
            severity: 'media',
            due: expirationText(record.data_vencimento),
            action: 'renew',
          });
        }
      });
    });

    bundle.records.filter((record) => !record.certificado_url && record.status !== 'cancelado').forEach((record) => {
      if (!record.colaborador) return;
      items.push({
        id: `certificate-${record.id}`,
        collaborator: record.colaborador,
        training: record.treinamento || undefined,
        trainingName: record.treinamento?.nome || 'Treinamento',
        norm: record.treinamento?.norma || '-',
        reason: 'Certificado nao anexado',
        severity: record.status === 'vencido' ? 'alta' : 'baixa',
        due: 'Anexar certificado',
        action: 'certificate',
      });
    });

    return items;
  }, [bundle.collaborators, bundle.records, bundle.trainings]);

  const filteredRecords = useMemo(() => {
    const query = normalize(search);
    return bundle.records.filter((record) => {
      const collaborator = record.colaborador;
      const training = record.treinamento;
      const matchesSearch = !query || normalize([training?.nome, training?.norma, collaborator?.nome_completo, collaborator?.cpf, collaborator?.matricula, collaborator?.funcao, collaborator?.setor, record.instrutor].filter(Boolean).join(' ')).includes(query);
      const matchesStatus = statusFilter === 'todos' || record.status === statusFilter;
      const matchesNorm = normFilter === 'todas' || training?.norma === normFilter;
      const matchesFunction = functionFilter === 'todas' || collaborator?.funcao === functionFilter;
      const matchesSector = sectorFilter === 'todos' || collaborator?.setor === sectorFilter;
      const matchesCertificate = certificateFilter === 'todos' || (certificateFilter === 'anexado' && Boolean(record.certificado_url)) || (certificateFilter === 'pendente' && !record.certificado_url);
      const collaboratorAptitude = collaborator ? aptitude(collaborator, bundle.trainings, bundle.records) : 'atencao';
      const matchesAptitude = aptitudeFilter === 'todos' || collaboratorAptitude === aptitudeFilter;
      const days = daysUntil(record.data_vencimento);
      const matchesExpiration = expirationFilter === 'todos'
        || (expirationFilter === 'vencidos' && days !== null && days < 0)
        || (expirationFilter === '30' && days !== null && days >= 0 && days <= 30)
        || (expirationFilter === '90' && days !== null && days >= 0 && days <= 90);
      const matchesPeriod = periodFilter === 'todos' || (periodFilter === 'com_certificado' && Boolean(record.certificado_url)) || (periodFilter === 'sem_certificado' && !record.certificado_url);
      return matchesSearch && matchesStatus && matchesNorm && matchesFunction && matchesSector && matchesExpiration && matchesPeriod && matchesCertificate && matchesAptitude;
    });
  }, [aptitudeFilter, bundle.records, bundle.trainings, certificateFilter, expirationFilter, functionFilter, normFilter, periodFilter, search, sectorFilter, statusFilter]);

  const stats = useMemo(() => {
    const requiredPending = bundle.collaborators.reduce((total, collaborator) => {
      const required = getRequiredTrainings(collaborator, bundle.trainings);
      const validIds = new Set(bundle.records.filter((record) => record.colaborador_id === collaborator.id && ['valido', 'proximo_vencimento', 'dispensado'].includes(record.status)).map((record) => record.treinamento_id));
      return total + required.filter((item) => !validIds.has(item.treinamento.id)).length;
    }, 0);
    return [
      { label: 'Treinamentos cadastrados', value: bundle.trainings.length, icon: GraduationCap, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => setStatusFilter('todos') },
      { label: 'Treinamentos realizados', value: bundle.records.filter((item) => item.status === 'valido').length, icon: CheckCircle2, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setStatusFilter('valido') },
      { label: 'Treinamentos pendentes', value: requiredPending, icon: AlertTriangle, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setActiveView('pendings') },
      { label: 'Treinamentos vencidos', value: bundle.records.filter((item) => item.status === 'vencido').length, icon: CalendarClock, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setStatusFilter('vencido') },
      { label: 'Proximos do vencimento', value: bundle.records.filter((item) => item.status === 'proximo_vencimento').length, icon: RefreshCw, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setStatusFilter('proximo_vencimento') },
      { label: 'Colaboradores aptos', value: bundle.collaborators.filter((item) => aptitude(item, bundle.trainings, bundle.records) === 'apto').length, icon: UserCheck, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setAptitudeFilter('apto') },
      { label: 'Colaboradores nao aptos', value: bundle.collaborators.filter((item) => aptitude(item, bundle.trainings, bundle.records) === 'nao_apto').length, icon: UserX, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setAptitudeFilter('nao_apto') },
      { label: 'Certificados pendentes', value: bundle.records.filter((item) => !item.certificado_url && item.status !== 'cancelado').length, icon: FileBadge, className: 'bg-[#dfe7f5] text-[#334766]', onClick: () => setCertificateFilter('pendente') },
    ];
  }, [bundle.collaborators, bundle.records, bundle.trainings]);

  const openNewRecord = (collaborator?: Collaborator, training?: Training) => {
    setEditingRecord(null);
    setRecordForm({
      ...emptyRecord,
      colaborador_id: collaborator?.id || '',
      treinamento_id: training?.id || '',
      data_vencimento: calculateExpiration(today, training),
      carga_horaria_realizada: training?.carga_horaria || 0,
    });
    setIsRecordOpen(true);
  };

  const openEditRecord = (record: CollaboratorTraining) => {
    setEditingRecord(record);
    setRecordForm({
      colaborador_id: record.colaborador_id,
      treinamento_id: record.treinamento_id,
      data_realizacao: record.data_realizacao,
      data_vencimento: record.data_vencimento || '',
      instrutor: record.instrutor || '',
      empresa_treinamento: record.empresa_treinamento || '',
      carga_horaria_realizada: record.carga_horaria_realizada || 0,
      certificado_url: record.certificado_url || '',
      lista_presenca_url: record.lista_presenca_url || '',
      status: record.status,
      observacoes: record.observacoes || '',
    });
    setIsRecordOpen(true);
  };

  const updateRecordForm = <K extends keyof CollaboratorTrainingFormValues>(key: K, value: CollaboratorTrainingFormValues[K]) => {
    setRecordForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'treinamento_id' || key === 'data_realizacao') {
        const training = bundle.trainings.find((item) => item.id === (key === 'treinamento_id' ? value : next.treinamento_id));
        next.data_vencimento = calculateExpiration(key === 'data_realizacao' ? String(value) : next.data_realizacao, training);
        next.carga_horaria_realizada = training?.carga_horaria || next.carga_horaria_realizada;
      }
      return next;
    });
  };

  const handleSaveTraining = () => {
    startTransition(async () => {
      const result = await createTraining({ ...trainingForm, companyId });
      if (result.success) {
        toast({ title: 'Treinamento cadastrado', description: 'Treinamento base adicionado com sucesso.' });
        setIsTrainingOpen(false);
        setTrainingForm(emptyTraining);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao cadastrar treinamento', description: getToastError(result.error) });
    });
  };

  const handleSaveRecord = () => {
    startTransition(async () => {
      const payload = { ...recordForm, companyId };
      const result = editingRecord ? await updateTrainingRecord(editingRecord.id, payload) : await createTrainingRecord(payload);
      if (result.success) {
        toast({ title: editingRecord ? 'Treinamento atualizado' : 'Treinamento registrado', description: 'Historico do colaborador salvo com sucesso.' });
        setIsRecordOpen(false);
        setEditingRecord(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao salvar treinamento', description: getToastError(result.error) });
    });
  };

  const handleCancelRecord = () => {
    if (!cancelingRecord) return;
    startTransition(async () => {
      const result = await archiveTrainingRecord(cancelingRecord.id, companyId);
      if (result.success) {
        toast({ title: 'Registro cancelado', description: 'O registro foi arquivado.' });
        setCancelingRecord(null);
        await loadData();
      } else toast({ variant: 'destructive', title: 'Erro ao cancelar registro', description: getToastError(result.error) });
    });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('todos');
    setNormFilter('todas');
    setFunctionFilter('todas');
    setSectorFilter('todos');
    setPeriodFilter('todos');
    setExpirationFilter('todos');
    setCertificateFilter('todos');
    setAptitudeFilter('todos');
  };

  const exportReport = () => {
    const selected = selectedIds.length > 0 ? filteredRecords.filter((record) => selectedIds.includes(record.id)) : filteredRecords;
    const success = downloadCsv(`relatorio-treinamentos-${Date.now()}.csv`, selected.map((record) => ({
      treinamento: record.treinamento?.nome || '',
      norma: record.treinamento?.norma || '',
      colaborador: record.colaborador?.nome_completo || '',
      cpf: record.colaborador?.cpf || '',
      matricula: record.colaborador?.matricula || '',
      funcao: record.colaborador?.funcao || '',
      setor: record.colaborador?.setor || '',
      realizacao: formatDate(record.data_realizacao),
      vencimento: formatDate(record.data_vencimento),
      status: statusLabels[record.status],
      certificado: certificateStatus(record),
      instrutor: record.instrutor || '',
    })));
    toast(success ? { title: 'CSV exportado', description: 'Relatorio de treinamentos gerado com os filtros atuais.' } : { variant: 'destructive', title: 'Nada para exportar', description: 'Nenhum registro encontrado para exportacao.' });
  };

  const prepared = (title: string) => {
    toast({ title, description: 'Estrutura preparada para evolucao sem alterar os registros atuais.' });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl space-y-3">
          <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Treinamentos</h2>
          <p className="text-[1.05rem] leading-8 text-[#4f5f7a]">Controle treinamentos obrigatorios, vencimentos, certificados e aptidao dos colaboradores.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap xl:justify-end">
          <Button onClick={() => openNewRecord()} className="h-14 rounded-xl bg-[#f46e11] px-7 text-base font-bold text-white shadow-[0_8px_18px_rgba(244,110,17,0.24)] hover:bg-[#e96710]"><BookOpenCheck className="mr-2 h-5 w-5" />Registrar Treinamento</Button>
          <Button variant="outline" onClick={() => setIsTrainingOpen(true)} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><Plus className="mr-2 h-5 w-5" />Novo Treinamento</Button>
          <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'dataImports', { tipo_importacao: 'treinamentos' })} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><Upload className="mr-2 h-5 w-5" />Importar Treinamentos</Button>
          <Button variant="outline" onClick={() => prepared('Criacao de turma preparada')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><Users className="mr-2 h-5 w-5" />Criar Turma</Button>
          <Button variant="outline" onClick={() => setActiveView('matrix')} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><ClipboardCheck className="mr-2 h-5 w-5" />Matriz</Button>
          <Button variant="outline" onClick={exportReport} className="h-14 rounded-xl border-[#415778] px-6 font-bold text-[#415778]"><Download className="mr-2 h-5 w-5" />Exportar Relatorio</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-8">
        {stats.map((card) => {
          const Icon = card.icon;
          return <button type="button" onClick={card.onClick} key={card.label} className="rounded-xl border border-[#e0c0b1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><p className="text-sm font-medium text-[#4f5f7a]">{card.label}</p><span className={cn('rounded-lg p-2.5', card.className)}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-[2rem] font-bold leading-none text-[#191c1e]">{card.value}</p></button>;
        })}
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr_auto_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5f7a]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por treinamento, norma, colaborador, CPF, matricula, funcao, setor ou instrutor" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] pl-10" /></div>
          <FilterSelect value={statusFilter} onValueChange={setStatusFilter} options={[['todos', 'Todos os status'], ...Object.entries(statusLabels)]} />
          <FilterSelect value={normFilter} onValueChange={setNormFilter} options={[['todas', 'Todas as normas'], ...norms.map((item) => [item, item] as [string, string])]} />
          <Button variant="outline" onClick={() => setShowAdvancedFilters((value) => !value)} className="h-11 rounded-md"><Filter className="mr-2 h-4 w-4" />Filtros avancados</Button>
          <Button variant="ghost" onClick={resetFilters} className="h-11 rounded-md">Limpar filtros</Button>
        </div>
        {showAdvancedFilters && (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <FilterSelect value={functionFilter} onValueChange={setFunctionFilter} options={[['todas', 'Todas as funcoes'], ...functions.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={sectorFilter} onValueChange={setSectorFilter} options={[['todos', 'Todos os setores'], ...sectors.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={expirationFilter} onValueChange={setExpirationFilter} options={[['todos', 'Todos vencimentos'], ['vencidos', 'Vencidos'], ['30', 'Vence em 30 dias'], ['90', 'Vence em 90 dias']]} />
            <FilterSelect value={certificateFilter} onValueChange={setCertificateFilter} options={[['todos', 'Todos certificados'], ['anexado', 'Certificado anexado'], ['pendente', 'Certificado pendente']]} />
            <FilterSelect value={aptitudeFilter} onValueChange={setAptitudeFilter} options={[['todos', 'Todas aptidoes'], ['apto', 'Apto'], ['atencao', 'Atencao'], ['nao_apto', 'Nao apto']]} />
          </div>
        )}
        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#d6deea] bg-[#f7f9fc] p-3">
            <span className="text-sm font-semibold text-[#334766]">{selectedIds.length} registros selecionados</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => prepared('Renovacao em lote preparada')}>Renovar em lote</Button>
              <Button variant="outline" size="sm" onClick={() => prepared('Lista de presenca em lote preparada')}>Anexar lista</Button>
              <Button variant="outline" size="sm" onClick={() => prepared('Dispensa com justificativa preparada')}>Dispensar</Button>
              <Button variant="outline" size="sm" onClick={exportReport}>Exportar selecionados</Button>
            </div>
          </div>
        )}
      </div>

      <AlertsPanel collaborators={bundle.collaborators} trainings={bundle.trainings} records={bundle.records} />

      <div className="flex flex-wrap gap-2">
        <Button variant={activeView === 'history' ? 'default' : 'outline'} onClick={() => setActiveView('history')} className={cn('rounded-md', activeView === 'history' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Historico de treinamentos</Button>
        <Button variant={activeView === 'matrix' ? 'default' : 'outline'} onClick={() => setActiveView('matrix')} className={cn('rounded-md', activeView === 'matrix' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Matriz de Treinamentos</Button>
        <Button variant={activeView === 'pendings' ? 'default' : 'outline'} onClick={() => setActiveView('pendings')} className={cn('rounded-md', activeView === 'pendings' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Pendencias de Treinamentos</Button>
        <Button variant="outline" onClick={() => prepared('Registro em lote preparado')} className="rounded-md">Registro em Lote</Button>
        <Button variant="outline" onClick={() => prepared('Turmas de treinamento preparadas')} className="rounded-md">Turmas</Button>
      </div>

      {activeView === 'pendings' ? (
        <TrainingPendingsPanel items={pendingItems} onRegister={(item) => openNewRecord(item.collaborator, item.training)} onViewCollaborator={setViewingCollaborator} onPrepared={prepared} />
      ) : activeView === 'matrix' ? (
        <TrainingMatrix collaborators={bundle.collaborators} trainings={bundle.trainings} records={bundle.records} onRegister={openNewRecord} onViewCollaborator={setViewingCollaborator} onExport={exportReport} />
      ) : (
      <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
        <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Historico de treinamentos</h3><p className="text-sm text-[#4f5f7a]">{filteredRecords.length} registros encontrados</p></div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1320px] border-collapse text-left">
            <thead><tr className="bg-[#fbfbfc] text-sm uppercase tracking-[0.06em] text-[#4f5f7a]"><th className="px-5 py-4"><input type="checkbox" checked={filteredRecords.length > 0 && selectedIds.length === filteredRecords.length} onChange={(event) => setSelectedIds(event.target.checked ? filteredRecords.map((record) => record.id) : [])} /></th><th className="px-5 py-4">Treinamento</th><th className="px-5 py-4">Colaborador</th><th className="px-5 py-4">Funcao/Setor</th><th className="px-5 py-4">Realizacao</th><th className="px-5 py-4">Vencimento</th><th className="px-5 py-4">Certificado</th><th className="px-5 py-4">Status</th><th className="px-5 py-4 text-right">Acoes</th></tr></thead>
            <tbody className="divide-y divide-[#e0c0b1]">
              {isLoading ? <tr><td colSpan={9} className="px-5 py-14 text-center text-[#4f5f7a]">Carregando treinamentos...</td></tr> : filteredRecords.length === 0 ? <tr><td colSpan={9} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhum treinamento registrado.</td></tr> : filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-[#fafbfd]">
                  <td className="px-5 py-5"><input type="checkbox" checked={selectedIds.includes(record.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, record.id] : current.filter((id) => id !== record.id))} /></td>
                  <td className="px-5 py-5"><p className="font-bold text-[#191c1e]">{record.treinamento?.nome || 'Treinamento nao encontrado'}</p><p className="text-xs text-[#3f5a88]">{record.treinamento?.norma || '-'}</p></td>
                  <td className="px-5 py-5"><p className="font-semibold">{record.colaborador?.nome_completo || '-'}</p><p className="text-xs text-[#4f5f7a]">{record.colaborador?.cpf || record.colaborador?.matricula || '-'}</p></td>
                  <td className="px-5 py-5"><p>{record.colaborador?.funcao || '-'}</p><p className="text-xs text-[#4f5f7a]">{record.colaborador?.setor || '-'}</p></td>
                  <td className="px-5 py-5">{formatDate(record.data_realizacao)}</td>
                  <td className="px-5 py-5"><p>{formatDate(record.data_vencimento)}</p><p className="text-xs text-[#4f5f7a]">{expirationText(record.data_vencimento)}</p></td>
                  <td className="px-5 py-5"><Badge className="rounded-full bg-[#eef1f5] px-3 py-1 text-[#4f5f7a]">{certificateStatus(record)}</Badge></td>
                  <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', statusStyle(record.status))}>{statusLabels[record.status]}</Badge></td>
                  <td className="px-5 py-5"><div className="flex justify-end gap-1"><IconButton title="Visualizar" onClick={() => setViewingRecord(record)} icon={Eye} /><IconButton title="Editar" onClick={() => openEditRecord(record)} icon={Edit} /><TrainingRowMenu record={record} onView={() => setViewingRecord(record)} onEdit={() => openEditRecord(record)} onRenew={() => openNewRecord(record.colaborador || undefined, record.treinamento || undefined)} onCancel={() => setCancelingRecord(record)} onPrepared={prepared} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {filteredRecords.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ccb4a6] p-6 text-center text-sm text-[#4f5f7a]">Nenhum treinamento registrado.</p>
          ) : filteredRecords.map((record) => (
            <div key={record.id} className="rounded-xl border border-[#e0c0b1] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div><p className="font-bold text-[#191c1e]">{record.treinamento?.nome || 'Treinamento'}</p><p className="text-sm text-[#4f5f7a]">{record.treinamento?.norma || '-'} - {record.colaborador?.nome_completo || '-'}</p></div>
                <Badge className={cn('rounded-full px-3 py-1', statusStyle(record.status))}>{statusLabels[record.status]}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-[#4f5f7a]">Funcao/setor:</span> {record.colaborador?.funcao || '-'} / {record.colaborador?.setor || '-'}</p>
                <p><span className="text-[#4f5f7a]">Realizacao:</span> {formatDate(record.data_realizacao)}</p>
                <p><span className="text-[#4f5f7a]">Vencimento:</span> {expirationText(record.data_vencimento)}</p>
                <p><span className="text-[#4f5f7a]">Certificado:</span> {certificateStatus(record)}</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => setViewingRecord(record)}>Ver</Button>
                <Button variant="outline" onClick={() => openEditRecord(record)}>Editar</Button>
                <Button variant="outline" onClick={() => openNewRecord(record.colaborador || undefined, record.treinamento || undefined)}>Renovar</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      <ReportsPreparation />

      <Dialog open={isTrainingOpen} onOpenChange={setIsTrainingOpen}>
        <DialogContent className="sm:max-w-3xl"><DialogHeader><DialogTitle>Novo Treinamento</DialogTitle></DialogHeader><TrainingForm form={trainingForm} setForm={setTrainingForm} onSubmit={handleSaveTraining} isPending={isPending} /></DialogContent>
      </Dialog>

      <Dialog open={isRecordOpen} onOpenChange={setIsRecordOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{editingRecord ? 'Editar treinamento realizado' : 'Registrar treinamento realizado'}</DialogTitle></DialogHeader><RecordForm form={recordForm} setForm={updateRecordForm} collaborators={bundle.collaborators} trainings={bundle.trainings} selectedCollaborator={selectedCollaborator} requiredTrainings={requiredForSelected} onSubmit={handleSaveRecord} isPending={isPending} /></DialogContent>
      </Dialog>

      <Dialog open={!!viewingCollaborator} onOpenChange={(open) => !open && setViewingCollaborator(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>Ficha de treinamentos do colaborador</DialogTitle></DialogHeader>{viewingCollaborator && <CollaboratorTrainingCard collaborator={viewingCollaborator} trainings={bundle.trainings} records={bundle.records} onNewRecord={openNewRecord} />}</DialogContent>
      </Dialog>

      <Dialog open={!!viewingRecord} onOpenChange={(open) => !open && setViewingRecord(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Detalhes do treinamento</DialogTitle></DialogHeader>{viewingRecord && <RecordDetails record={viewingRecord} />}</DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelingRecord} onOpenChange={(open) => !open && setCancelingRecord(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Cancelar registro?</AlertDialogTitle><AlertDialogDescription>Este treinamento sera arquivado do historico ativo. O registro nao sera apagado definitivamente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={handleCancelRecord} className="bg-[#ba1a1a] hover:bg-[#93000a]">Cancelar registro</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({ value, onValueChange, options }: { value: string; onValueChange: (value: string) => void; options: Array<[string, string]> }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent></Select>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('space-y-2 text-sm font-semibold text-[#191c1e]', className)}><span>{label}</span>{children}</label>;
}

function IconButton({ title, onClick, icon: Icon, danger }: { title: string; onClick: () => void; icon: typeof Eye; danger?: boolean }) {
  return <button type="button" title={title} onClick={onClick} className={cn('rounded-lg p-2 hover:bg-[#eceef1]', danger ? 'text-[#ba1a1a]' : 'text-[#4f5f7a]')}><Icon className="h-5 w-5" /></button>;
}

function TrainingRowMenu({
  record,
  onView,
  onEdit,
  onRenew,
  onCancel,
  onPrepared,
}: {
  record: CollaboratorTraining;
  onView: () => void;
  onEdit: () => void;
  onRenew: () => void;
  onCancel: () => void;
  onPrepared: (title: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="rounded-lg p-2 text-[#4f5f7a] hover:bg-[#eceef1]" title="Mais acoes">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={onRenew}><RefreshCw className="mr-2 h-4 w-4" />Renovar treinamento</DropdownMenuItem>
        <DropdownMenuItem onClick={onView}><Paperclip className="mr-2 h-4 w-4" />{record.certificado_url ? 'Ver certificado' : 'Anexar certificado'}</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared('Relatorio individual de treinamento preparado')}><FileText className="mr-2 h-4 w-4" />Gerar relatorio</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCancel} className="text-[#ba1a1a]"><Archive className="mr-2 h-4 w-4" />Arquivar/cancelar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function severityClass(severity: TrainingPendingItem['severity']) {
  if (severity === 'critica') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (severity === 'alta') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function TrainingPendingsPanel({
  items,
  onRegister,
  onViewCollaborator,
  onPrepared,
}: {
  items: TrainingPendingItem[];
  onRegister: (item: TrainingPendingItem) => void;
  onViewCollaborator: (collaborator: Collaborator) => void;
  onPrepared: (title: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
      <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4">
        <h3 className="text-lg font-bold text-[#191c1e]">Pendencias de Treinamentos</h3>
        <p className="text-sm text-[#4f5f7a]">{items.length} pendencias encontradas para priorizar vencimentos, certificados e aptidao</p>
      </div>
      <div className="divide-y divide-[#e0c0b1]">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#4f5f7a]">Nenhuma pendencia de treinamento encontrada.</div>
        ) : items.map((item) => (
          <div key={item.id} className="grid gap-3 p-5 lg:grid-cols-[1.1fr_0.9fr_0.45fr_0.9fr_0.7fr_1.2fr] lg:items-center">
            <div><p className="font-bold text-[#191c1e]">{item.collaborator.nome_completo}</p><p className="text-xs text-[#4f5f7a]">{item.collaborator.funcao} - {item.collaborator.setor}</p></div>
            <div><p className="font-medium text-[#191c1e]">{item.trainingName}</p><p className="text-xs text-[#4f5f7a]">{item.norm}</p></div>
            <Badge className={cn('w-fit rounded-full px-3 py-1', severityClass(item.severity))}>{item.severity}</Badge>
            <p className="text-sm text-[#4f5f7a]">{item.reason}</p>
            <p className="text-sm text-[#4f5f7a]">{item.due}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => item.action === 'configure' ? onPrepared('Configuracao de treinamentos por funcao preparada') : onRegister(item)}>
                {item.action === 'renew' ? 'Renovar' : item.action === 'certificate' ? 'Anexar certificado' : item.action === 'configure' ? 'Configurar' : 'Registrar'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onViewCollaborator(item.collaborator)}>Ver colaborador</Button>
              <Button size="sm" variant="outline" onClick={() => onPrepared('Justificativa ou dispensa preparada')}>Justificar</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrainingMatrix({
  collaborators,
  trainings,
  records,
  onRegister,
  onViewCollaborator,
  onExport,
}: {
  collaborators: Collaborator[];
  trainings: Training[];
  records: CollaboratorTraining[];
  onRegister: (collaborator?: Collaborator, training?: Training) => void;
  onViewCollaborator: (collaborator: Collaborator) => void;
  onExport: () => void;
}) {
  const matrixTrainings = trainings.slice(0, 8);
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div><h3 className="text-lg font-bold text-[#191c1e]">Matriz de Treinamentos</h3><p className="text-sm text-[#4f5f7a]">Leitura rapida de obrigatorios, vencidos, pendentes e aptidao por colaborador.</p></div>
        <Button variant="outline" onClick={onExport}><Download className="mr-2 h-4 w-4" />Exportar matriz</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="bg-[#fbfbfc] text-xs uppercase tracking-[0.06em] text-[#4f5f7a]">
              <th className="px-4 py-4">Colaborador</th>
              <th className="px-4 py-4">Funcao</th>
              {matrixTrainings.map((training) => <th key={training.id} className="px-4 py-4">{training.norma || training.nome}</th>)}
              <th className="px-4 py-4">Status geral</th>
              <th className="px-4 py-4 text-right">Acoes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e0c0b1]">
            {collaborators.length === 0 ? (
              <tr><td colSpan={matrixTrainings.length + 4} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhum colaborador encontrado para montar a matriz.</td></tr>
            ) : collaborators.map((collaborator) => {
              const status = aptitude(collaborator, trainings, records);
              return (
                <tr key={collaborator.id} className="hover:bg-[#fafbfd]">
                  <td className="px-4 py-4"><p className="font-bold text-[#191c1e]">{collaborator.nome_completo}</p><p className="text-xs text-[#4f5f7a]">{collaborator.cpf || collaborator.matricula}</p></td>
                  <td className="px-4 py-4"><p>{collaborator.funcao}</p><p className="text-xs text-[#4f5f7a]">{collaborator.setor}</p></td>
                  {matrixTrainings.map((training) => {
                    const record = records.find((item) => item.colaborador_id === collaborator.id && item.treinamento_id === training.id);
                    const statusValue = record?.status || 'pendente';
                    return <td key={training.id} className="px-4 py-4"><Badge className={cn('rounded-full px-3 py-1', statusStyle(statusValue as TrainingRecordStatus))}>{record ? statusLabels[statusValue as TrainingRecordStatus] : 'Pendente'}</Badge></td>;
                  })}
                  <td className="px-4 py-4"><Badge className={cn('rounded-full px-3 py-1 uppercase', status === 'apto' ? 'bg-[#dff7e5] text-[#18703a]' : status === 'atencao' ? 'bg-[#ffe5d6] text-[#9e4300]' : 'bg-[#ffdad6] text-[#ba1a1a]')}>{status === 'apto' ? 'Apto' : status === 'atencao' ? 'Atencao' : 'Nao apto'}</Badge></td>
                  <td className="px-4 py-4"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => onViewCollaborator(collaborator)}>Ver</Button><Button size="sm" onClick={() => onRegister(collaborator)}>Registrar</Button></div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrainingForm({ form, setForm, onSubmit, isPending }: { form: TrainingFormValues; setForm: (value: TrainingFormValues) => void; onSubmit: () => void; isPending: boolean }) {
  return <div className="grid gap-4 md:grid-cols-2"><Field label="Nome do treinamento"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field><Field label="Norma relacionada"><Input value={form.norma || ''} onChange={(e) => setForm({ ...form, norma: e.target.value })} /></Field><Field label="Carga horaria"><Input type="number" value={form.carga_horaria || 0} onChange={(e) => setForm({ ...form, carga_horaria: Number(e.target.value) })} /></Field><Field label="Validade em meses"><Input type="number" value={form.validade_meses || 0} onChange={(e) => setForm({ ...form, validade_meses: Number(e.target.value) })} /></Field><Field label="Descricao" className="md:col-span-2"><Textarea value={form.descricao || ''} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></Field><Field label="Observacoes" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></Field><div className="md:col-span-2 flex justify-end"><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar treinamento</Button></div></div>;
}

function RecordForm({ form, setForm, collaborators, trainings, selectedCollaborator, requiredTrainings, onSubmit, isPending }: {
  form: CollaboratorTrainingFormValues;
  setForm: <K extends keyof CollaboratorTrainingFormValues>(key: K, value: CollaboratorTrainingFormValues[K]) => void;
  collaborators: Collaborator[];
  trainings: Training[];
  selectedCollaborator: Collaborator | null;
  requiredTrainings: RequiredTrainingItem[];
  onSubmit: () => void;
  isPending: boolean;
}) {
  return <div className="space-y-5"><div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4"><Field label="Buscar/selecionar colaborador"><Select value={form.colaborador_id} onValueChange={(value) => setForm('colaborador_id', value)}><SelectTrigger className="h-11 border-[#ccb4a6] bg-white"><SelectValue placeholder="Selecione colaborador" /></SelectTrigger><SelectContent>{collaborators.map((collaborator) => <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.nome_completo} - {collaborator.cpf}</SelectItem>)}</SelectContent></Select></Field>{selectedCollaborator && <div className="mt-4 grid gap-3 rounded-lg border border-[#e0c0b1] bg-white p-4 md:grid-cols-5"><Info label="Nome" value={selectedCollaborator.nome_completo} /><Info label="CPF" value={selectedCollaborator.cpf} /><Info label="Matricula" value={selectedCollaborator.matricula || '-'} /><Info label="Funcao" value={selectedCollaborator.funcao} /><Info label="Setor" value={selectedCollaborator.setor} /></div>}</div>{selectedCollaborator && <div className="rounded-xl border border-[#e0c0b1] bg-white p-4"><div className="mb-3 flex items-center gap-2"><GraduationCap className="h-5 w-5 text-[#9e4300]" /><h3 className="font-bold text-[#191c1e]">Treinamentos obrigatorios pela funcao</h3></div>{requiredTrainings.length === 0 ? <p className="rounded-lg border border-[#ffe5d6] bg-[#fff8f1] p-3 text-sm text-[#8a4b00]">Funcao sem treinamentos vinculados. Cadastre ou use recomendacoes com IA futuramente.</p> : <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{requiredTrainings.map((item) => <button key={item.treinamento.id} type="button" onClick={() => setForm('treinamento_id', item.treinamento.id)} className={cn('rounded-lg border p-3 text-left text-sm transition-colors', form.treinamento_id === item.treinamento.id ? 'border-[#f46e11] bg-[#fff4e8]' : 'border-[#e0c0b1] bg-[#f7f9fc] hover:bg-[#fff8f1]')}><span className="font-bold text-[#191c1e]">{item.treinamento.nome}</span><span className="mt-1 block text-xs text-[#4f5f7a]">{item.treinamento.norma || 'Sem norma'} • {item.treinamento.carga_horaria || 0}h</span></button>)}</div>}</div>}<div className="grid gap-4 md:grid-cols-2"><Field label="Treinamento"><Select value={form.treinamento_id} onValueChange={(value) => setForm('treinamento_id', value)}><SelectTrigger className="h-11 border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Selecione treinamento" /></SelectTrigger><SelectContent>{trainings.map((training) => <SelectItem key={training.id} value={training.id}>{training.nome}</SelectItem>)}</SelectContent></Select></Field><Field label="Status"><Select value={form.status} onValueChange={(value) => setForm('status', value as TrainingRecordStatus)}><SelectTrigger className="h-11 border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Data de realizacao"><Input type="date" value={form.data_realizacao} onChange={(e) => setForm('data_realizacao', e.target.value)} /></Field><Field label="Data de vencimento"><Input type="date" value={form.data_vencimento || ''} onChange={(e) => setForm('data_vencimento', e.target.value)} /></Field><Field label="Instrutor"><Input value={form.instrutor || ''} onChange={(e) => setForm('instrutor', e.target.value)} /></Field><Field label="Empresa responsavel"><Input value={form.empresa_treinamento || ''} onChange={(e) => setForm('empresa_treinamento', e.target.value)} /></Field><Field label="Carga horaria realizada"><Input type="number" value={form.carga_horaria_realizada || 0} onChange={(e) => setForm('carga_horaria_realizada', Number(e.target.value))} /></Field><Field label="Certificado URL"><Input value={form.certificado_url || ''} onChange={(e) => setForm('certificado_url', e.target.value)} /></Field><Field label="Lista de presenca URL"><Input value={form.lista_presenca_url || ''} onChange={(e) => setForm('lista_presenca_url', e.target.value)} /></Field><Field label="Observacoes" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(e) => setForm('observacoes', e.target.value)} /></Field></div><div className="flex justify-end"><Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar treinamento</Button></div></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p><p className="text-sm font-semibold text-[#191c1e]">{value}</p></div>;
}

function AlertsPanel({ collaborators, trainings, records }: { collaborators: Collaborator[]; trainings: Training[]; records: CollaboratorTraining[] }) {
  const alerts = useMemo(() => {
    const items: string[] = [];
    records.filter((record) => record.status === 'vencido').slice(0, 2).forEach((record) => items.push(`Treinamento vencido: ${record.treinamento?.nome || 'Treinamento'} de ${record.colaborador?.nome_completo || 'colaborador'}.`));
    records.filter((record) => record.status === 'proximo_vencimento').slice(0, 2).forEach((record) => items.push(`Treinamento proximo do vencimento: ${record.treinamento?.nome || 'Treinamento'} de ${record.colaborador?.nome_completo || 'colaborador'}.`));
    records.filter((record) => !record.certificado_url && record.status === 'valido').slice(0, 2).forEach((record) => items.push(`Certificado nao anexado: ${record.treinamento?.nome || 'Treinamento'} de ${record.colaborador?.nome_completo || 'colaborador'}.`));
    records.filter((record) => !record.data_vencimento && record.status === 'valido').slice(0, 2).forEach((record) => items.push(`Treinamento sem vencimento: ${record.treinamento?.nome || 'Treinamento'}.`));
    collaborators.filter((collaborator) => getRequiredTrainings(collaborator, trainings).length === 0).slice(0, 2).forEach((collaborator) => items.push(`Funcao sem treinamentos vinculados: ${collaborator.funcao} (${collaborator.nome_completo}).`));
    return items.slice(0, 5);
  }, [collaborators, records, trainings]);
  if (alerts.length === 0) return null;
  return <div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f1] p-4"><div className="mb-3 flex items-center gap-2 font-bold text-[#8a4b00]"><AlertTriangle className="h-5 w-5" />Alertas importantes</div><div className="grid gap-2 md:grid-cols-2">{alerts.map((alert) => <p key={alert} className="rounded-lg bg-white p-3 text-sm text-[#521f00]">{alert}</p>)}</div></div>;
}

function CollaboratorTrainingCard({ collaborator, trainings, records, onNewRecord }: { collaborator: Collaborator; trainings: Training[]; records: CollaboratorTraining[]; onNewRecord: (collaborator: Collaborator, training?: Training) => void }) {
  const required = getRequiredTrainings(collaborator, trainings);
  const collaboratorRecords = records.filter((record) => record.colaborador_id === collaborator.id);
  const validIds = new Set(collaboratorRecords.filter((record) => ['valido', 'proximo_vencimento', 'dispensado'].includes(record.status)).map((record) => record.treinamento_id));
  const status = aptitude(collaborator, trainings, records);
  return <div className="space-y-5"><div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-5"><div className="flex items-center gap-4"><div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dfe5ef] text-xl font-bold text-[#203555]">{getInitials(collaborator.nome_completo)}</div><div className="flex-1"><h3 className="text-2xl font-bold text-[#191c1e]">{collaborator.nome_completo}</h3><p className="text-[#4f5f7a]">{collaborator.funcao} • {collaborator.setor}</p></div><Badge className={cn('rounded-full px-4 py-1 uppercase', status === 'apto' ? 'bg-[#dff7e5] text-[#18703a]' : status === 'atencao' ? 'bg-[#ffe5d6] text-[#9e4300]' : 'bg-[#ffdad6] text-[#ba1a1a]')}>{status === 'apto' ? 'Apto' : status === 'atencao' ? 'Atencao' : 'Nao apto'}</Badge></div></div><div className="grid gap-4 sm:grid-cols-5"><Summary label="Obrigatorios" value={required.length} /><Summary label="Realizados" value={collaboratorRecords.filter((item) => item.status === 'valido').length} /><Summary label="Pendentes" value={required.filter((item) => !validIds.has(item.treinamento.id)).length} /><Summary label="Vencidos" value={collaboratorRecords.filter((item) => item.status === 'vencido').length} /><Summary label="Prox. vencimento" value={collaboratorRecords.filter((item) => item.status === 'proximo_vencimento').length} /></div><div className="rounded-xl border border-[#e0c0b1] bg-white"><div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4 font-bold">Treinamentos obrigatorios</div><div className="divide-y divide-[#e0c0b1]">{required.length === 0 ? <p className="p-5 text-sm text-[#4f5f7a]">Nenhum treinamento obrigatorio identificado.</p> : required.map((item) => { const last = collaboratorRecords.find((record) => record.treinamento_id === item.treinamento.id); const recordStatus = last?.status || 'pendente'; return <div key={item.treinamento.id} className="grid gap-3 p-5 lg:grid-cols-[1.2fr_0.5fr_0.7fr_0.7fr_0.7fr_1fr] lg:items-center"><div><p className="font-bold text-[#191c1e]">{item.treinamento.nome}</p><p className="text-xs text-[#4f5f7a]">Obrigatorio: {item.obrigatorio ? 'sim' : 'nao'}</p></div><p className="text-sm text-[#4f5f7a]">{item.treinamento.norma || '-'}</p><Badge className={cn('w-fit rounded-full px-3 py-1 uppercase', statusStyle(recordStatus as TrainingRecordStatus))}>{statusLabels[recordStatus as TrainingRecordStatus]}</Badge><p className="text-sm text-[#4f5f7a]">Realizado: {formatDate(last?.data_realizacao)}</p><p className="text-sm text-[#4f5f7a]">Vence: {formatDate(last?.data_vencimento)}</p><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => onNewRecord(collaborator, item.treinamento)}>Registrar</Button><Button size="sm" variant="outline" onClick={() => onNewRecord(collaborator, item.treinamento)}><Paperclip className="mr-1 h-4 w-4" />Certificado</Button><Button size="sm" variant="outline" onClick={() => onNewRecord(collaborator, item.treinamento)}><RefreshCw className="mr-1 h-4 w-4" />Renovar</Button></div></div>; })}</div></div></div>;
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-4"><p className="text-xs font-bold uppercase text-[#4f5f7a]">{label}</p><p className="mt-2 text-2xl font-bold text-[#191c1e]">{value}</p></div>;
}

function RecordDetails({ record }: { record: CollaboratorTraining }) {
  return <div className="space-y-5"><div className="rounded-xl border border-[#e0c0b1] bg-white p-6"><div className="mb-5 flex items-center gap-2 text-xl font-bold text-[#191c1e]"><FileBadge className="h-5 w-5 text-[#9e4300]" />Certificado e registro de treinamento</div><div className="grid gap-3 md:grid-cols-2"><Info label="Treinamento" value={record.treinamento?.nome || '-'} /><Info label="Norma" value={record.treinamento?.norma || '-'} /><Info label="Colaborador" value={record.colaborador?.nome_completo || '-'} /><Info label="Funcao" value={record.colaborador?.funcao || '-'} /><Info label="Realizacao" value={formatDate(record.data_realizacao)} /><Info label="Vencimento" value={formatDate(record.data_vencimento)} /><Info label="Instrutor" value={record.instrutor || '-'} /><Info label="Empresa" value={record.empresa_treinamento || '-'} /><Info label="Certificado" value={record.certificado_url || 'Nao anexado'} /><Info label="Lista de presenca" value={record.lista_presenca_url || 'Nao anexada'} /></div></div><Button disabled className="bg-[#f46e11] text-white disabled:opacity-70"><FileText className="mr-2 h-4 w-4" />Gerar relatorio</Button></div>;
}

function ReportsPreparation() {
  const reports = ['Realizados por periodo', 'Treinamentos vencidos', 'Proximos do vencimento', 'Treinamentos pendentes', 'Por colaborador', 'Por funcao', 'Por setor', 'Colaboradores aptos', 'Colaboradores nao aptos', 'Historico individual'];
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex items-center justify-between gap-4"><div><h3 className="text-lg font-bold text-[#191c1e]">Relatorios do modulo</h3><p className="text-sm text-[#4f5f7a]">Area preparada para relatórios operacionais de treinamentos.</p></div><Button disabled variant="outline"><Award className="mr-2 h-4 w-4" />Gerar treinamentos recomendados com IA</Button></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{reports.map((report) => <div key={report} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm font-semibold text-[#191c1e]">{report}</div>)}</div></div>;
}
