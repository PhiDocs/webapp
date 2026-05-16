'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  AlertTriangle,
  Archive,
  BadgeCheck,
  Box,
  CalendarClock,
  ClipboardSignature,
  Download,
  Edit,
  Eye,
  FileText,
  Filter,
  HardHat,
  Loader2,
  MoreHorizontal,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Undo2,
  Upload,
  UserRound,
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
import type { Collaborator, Epi, EpiDelivery, EpiDeliveryFormValues, EpiDeliveryStatus, EpiFormValues, EpiRequiredItem } from '@/lib/types';
import { cn } from '@/lib/utils';
import { navigateCompanySection } from '@/lib/client-navigation';
import {
  archiveEpiDelivery,
  createEpi,
  createEpiDelivery,
  getEpiModuleData,
  updateEpiDelivery,
} from '@/server/epi-actions';

interface EpiDeliveriesTableProps {
  companyId: string;
  companyName?: string;
}

type Bundle = {
  collaborators: Collaborator[];
  epis: Epi[];
  mappings: unknown[];
  deliveries: EpiDelivery[];
};

type EpiPendingItem = {
  id: string;
  collaborator: Collaborator;
  epi?: Epi;
  epiName: string;
  reason: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  urgency: string;
  action: 'deliver' | 'renew' | 'term' | 'configure';
};

const today = new Date().toISOString().slice(0, 10);

const emptyDelivery: EpiDeliveryFormValues = {
  colaborador_id: '',
  epi_id: '',
  data_entrega: today,
  data_validade: '',
  data_proxima_troca: '',
  quantidade: 1,
  responsavel_entrega: '',
  status: 'entregue',
  assinatura_url: '',
  comprovante_url: '',
  observacoes: '',
};

const emptyEpi: EpiFormValues = {
  nome: '',
  descricao: '',
  categoria: '',
  ca: '',
  validade_ca: '',
  valor_unitario: 0,
  fornecedor: '',
  data_compra: '',
  prazo_troca_dias: 180,
  ativo: true,
};

const statusLabels: Record<EpiDeliveryStatus, string> = {
  entregue: 'Entregue',
  pendente: 'Pendente',
  vencido: 'Vencido',
  proximo_troca: 'Proximo da troca',
  substituido: 'Substituido',
  devolvido: 'Devolvido',
  cancelado: 'Cancelado',
};

function getToastError(error: unknown, fallback = 'Nao foi possivel concluir a acao.') {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.details || record.error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
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

function statusStyle(status: EpiDeliveryStatus) {
  if (status === 'entregue') return 'bg-[#dff7e5] text-[#18703a]';
  if (status === 'pendente') return 'bg-[#fff0d8] text-[#8a4b00]';
  if (status === 'vencido') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (status === 'proximo_troca') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (status === 'devolvido') return 'bg-[#dfe7f5] text-[#334766]';
  if (status === 'substituido') return 'bg-[#eef1f5] text-[#4f5f7a]';
  return 'bg-[#eceef1] text-[#584237]';
}

function normalize(value?: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function uniqueValues<T>(items: T[], getValue: (item: T) => string | undefined | null) {
  return Array.from(new Set(items.map(getValue).map((item) => item?.trim()).filter(Boolean) as string[])).sort();
}

function isCurrentMonth(value?: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

function isCaExpired(epi?: Epi | null) {
  const days = daysUntil(epi?.validade_ca);
  return days !== null && days < 0;
}

function isTermGenerated(delivery: EpiDelivery) {
  return Boolean(delivery.comprovante_url || delivery.assinatura_url);
}

function termStatus(delivery: EpiDelivery) {
  if (delivery.assinatura_url) return 'Assinado';
  if (delivery.comprovante_url) return 'Gerado';
  return 'Nao gerado';
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return false;
  const headers = Object.keys(rows[0]);
  const escapeValue = (value: unknown) => {
    const text = String(value ?? '');
    if (text.includes(',') || text.includes('"') || text.includes('\n')) return `"${text.replaceAll('"', '""')}"`;
    return text;
  };
  const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => escapeValue(row[header])).join(','))].join('\n');
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

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'CO';
}

function calculateNextChange(dataEntrega: string, epi?: Epi | null) {
  const prazo = Number(epi?.prazo_troca_dias || 0);
  if (!dataEntrega || prazo <= 0) return '';
  const date = new Date(dataEntrega);
  date.setDate(date.getDate() + prazo);
  return date.toISOString().slice(0, 10);
}

function getRequiredEpis(collaborator: Collaborator | null, epis: Epi[]): EpiRequiredItem[] {
  if (!collaborator) return [];
  const functionKey = normalize(collaborator.funcao);
  const byName = new Map(epis.map((epi) => [normalize(epi.nome), epi]));
  const names = new Set<string>();

  if (functionKey.includes('eletricista')) {
    ['Capacete com jugular', 'Luva isolante', 'Botina de seguranca', 'Oculos de protecao', 'Vestimenta antichama', 'Protetor facial', 'Cinto de seguranca'].forEach((name) => names.add(name));
  } else if (functionKey.includes('pedreiro')) {
    ['Capacete de seguranca', 'Botina de seguranca', 'Luva de protecao', 'Oculos de protecao', 'Protetor auricular', 'Mascara respiratoria'].forEach((name) => names.add(name));
  } else if (functionKey.includes('operador')) {
    ['Botina de seguranca', 'Oculos de protecao', 'Protetor auricular', 'Luva de protecao', 'Capacete de seguranca'].forEach((name) => names.add(name));
  }

  collaborator.ai_recommendations?.epi_obrigatorios.forEach((name) => names.add(name));

  return Array.from(names).flatMap((name) => {
    const epi = byName.get(normalize(name)) || epis.find((item) => normalize(name).includes(normalize(item.nome)) || normalize(item.nome).includes(normalize(name)));
    return epi ? [{ epi, obrigatorio: true, observacao: 'Obrigatorio pela funcao ou recomendacao salva.', source: 'funcao' as const }] : [];
  });
}

export function EpiDeliveriesTable({ companyId, companyName }: EpiDeliveriesTableProps) {
  const [bundle, setBundle] = useState<Bundle>({ collaborators: [], epis: [], mappings: [], deliveries: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [functionFilter, setFunctionFilter] = useState('todas');
  const [epiFilter, setEpiFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('todos');
  const [caFilter, setCaFilter] = useState('todos');
  const [termFilter, setTermFilter] = useState('todos');
  const [activeView, setActiveView] = useState<'history' | 'pendings'>('history');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
  const [isEpiOpen, setIsEpiOpen] = useState(false);
  const [viewingCollaborator, setViewingCollaborator] = useState<Collaborator | null>(null);
  const [viewingDelivery, setViewingDelivery] = useState<EpiDelivery | null>(null);
  const [editingDelivery, setEditingDelivery] = useState<EpiDelivery | null>(null);
  const [cancelingDelivery, setCancelingDelivery] = useState<EpiDelivery | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<EpiDeliveryFormValues>(emptyDelivery);
  const [epiForm, setEpiForm] = useState<EpiFormValues>(emptyEpi);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getEpiModuleData(companyId);
      if (result.success && result.data) setBundle(result.data as Bundle);
      else toast({ variant: 'destructive', title: 'Erro ao buscar EPIs', description: getToastError(result.error) });
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Nao foi possivel carregar Entregas de EPI.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) void loadData();
  }, [companyId]);

  const selectedCollaborator = useMemo(
    () => bundle.collaborators.find((item) => item.id === deliveryForm.colaborador_id) || null,
    [bundle.collaborators, deliveryForm.colaborador_id]
  );

  const requiredForSelected = useMemo(
    () => getRequiredEpis(selectedCollaborator, bundle.epis),
    [bundle.epis, selectedCollaborator]
  );

  const sectors = useMemo(() => uniqueValues(bundle.collaborators, (item) => item.setor), [bundle.collaborators]);
  const functions = useMemo(() => uniqueValues(bundle.collaborators, (item) => item.funcao), [bundle.collaborators]);

  const pendingItems = useMemo<EpiPendingItem[]>(() => {
    const items: EpiPendingItem[] = [];

    bundle.collaborators.forEach((collaborator) => {
      const required = getRequiredEpis(collaborator, bundle.epis);
      if (required.length === 0) {
        items.push({
          id: `no-config-${collaborator.id}`,
          collaborator,
          epiName: 'Funcao sem EPIs configurados',
          reason: 'Funcao sem EPIs configurados',
          severity: 'media',
          urgency: 'Configurar EPIs da funcao',
          action: 'configure',
        });
        return;
      }

      const collaboratorDeliveries = bundle.deliveries.filter((delivery) => delivery.colaborador_id === collaborator.id);
      required.forEach((requiredItem) => {
        const last = collaboratorDeliveries.find((delivery) => delivery.epi_id === requiredItem.epi.id);
        if (!last) {
          items.push({
            id: `missing-${collaborator.id}-${requiredItem.epi.id}`,
            collaborator,
            epi: requiredItem.epi,
            epiName: requiredItem.epi.nome,
            reason: 'EPI obrigatorio nao entregue',
            severity: 'alta',
            urgency: 'Entrega pendente',
            action: 'deliver',
          });
          return;
        }

        if (last.status === 'vencido') {
          items.push({
            id: `expired-${last.id}`,
            collaborator,
            epi: requiredItem.epi,
            epiName: requiredItem.epi.nome,
            reason: 'EPI vencido',
            severity: 'alta',
            urgency: formatDate(last.data_proxima_troca || last.data_validade),
            action: 'renew',
          });
        }
        if (last.status === 'proximo_troca') {
          items.push({
            id: `near-${last.id}`,
            collaborator,
            epi: requiredItem.epi,
            epiName: requiredItem.epi.nome,
            reason: 'EPI proximo da troca',
            severity: 'media',
            urgency: formatDate(last.data_proxima_troca || last.data_validade),
            action: 'renew',
          });
        }
        if (!isTermGenerated(last)) {
          items.push({
            id: `term-${last.id}`,
            collaborator,
            epi: requiredItem.epi,
            epiName: requiredItem.epi.nome,
            reason: 'Termo nao gerado',
            severity: 'baixa',
            urgency: 'Gerar termo',
            action: 'term',
          });
        }
      });
    });

    bundle.epis.filter(isCaExpired).forEach((epi) => {
      bundle.deliveries.filter((delivery) => delivery.epi_id === epi.id).slice(0, 5).forEach((delivery) => {
        if (!delivery.colaborador) return;
        items.push({
          id: `ca-${delivery.id}`,
          collaborator: delivery.colaborador,
          epi,
          epiName: epi.nome,
          reason: 'CA vencido',
          severity: 'critica',
          urgency: formatDate(epi.validade_ca),
          action: 'renew',
        });
      });
    });

    return items;
  }, [bundle.collaborators, bundle.deliveries, bundle.epis]);

  const filteredDeliveries = useMemo(() => {
    const query = normalize(search);
    return bundle.deliveries.filter((delivery) => {
      const collaborator = delivery.colaborador;
      const epi = delivery.epi;
      const matchesSearch = !query || normalize([
        collaborator?.nome_completo,
        collaborator?.cpf,
        collaborator?.matricula,
        collaborator?.funcao,
        collaborator?.setor,
        epi?.nome,
        epi?.ca,
      ].filter(Boolean).join(' ')).includes(query);
      const matchesStatus = statusFilter === 'todos' || delivery.status === statusFilter;
      const matchesSector = sectorFilter === 'todos' || collaborator?.setor === sectorFilter;
      const matchesFunction = functionFilter === 'todas' || collaborator?.funcao === functionFilter;
      const matchesEpi = epiFilter === 'todos' || delivery.epi_id === epiFilter;
      const days = daysUntil(delivery.data_proxima_troca || delivery.data_validade);
      const matchesPeriod = periodFilter === 'todos'
        || (periodFilter === 'vencidos' && days !== null && days < 0)
        || (periodFilter === '30' && days !== null && days >= 0 && days <= 30)
        || (periodFilter === '90' && days !== null && days >= 0 && days <= 90);
      const matchesCa = caFilter === 'todos'
        || (caFilter === 'vencido' && isCaExpired(epi))
        || (caFilter === 'valido' && epi?.validade_ca && !isCaExpired(epi))
        || (caFilter === 'sem_ca' && !epi?.ca);
      const matchesTerm = termFilter === 'todos'
        || (termFilter === 'sim' && isTermGenerated(delivery))
        || (termFilter === 'nao' && !isTermGenerated(delivery));
      return matchesSearch && matchesStatus && matchesSector && matchesFunction && matchesEpi && matchesPeriod && matchesCa && matchesTerm;
    });
  }, [bundle.deliveries, caFilter, epiFilter, functionFilter, periodFilter, search, sectorFilter, statusFilter, termFilter]);

  const stats = useMemo(() => {
    const delivered = bundle.deliveries.filter((item) => item.status === 'entregue').length;
    const pending = bundle.collaborators.reduce((total, collaborator) => {
      const required = getRequiredEpis(collaborator, bundle.epis);
      const deliveredIds = new Set(bundle.deliveries.filter((delivery) => delivery.colaborador_id === collaborator.id && ['entregue', 'proximo_troca'].includes(delivery.status)).map((delivery) => delivery.epi_id));
      return total + required.filter((item) => !deliveredIds.has(item.epi.id)).length;
    }, 0);
    const expired = bundle.deliveries.filter((item) => item.status === 'vencido').length;
    const near = bundle.deliveries.filter((item) => item.status === 'proximo_troca').length;
    const expiredCas = bundle.epis.filter(isCaExpired).length;
    const terms = bundle.deliveries.filter(isTermGenerated).length;
    const monthDeliveries = bundle.deliveries.filter((item) => isCurrentMonth(item.data_entrega)).length;
    const collaboratorsPending = bundle.collaborators.filter((collaborator) => {
      const required = getRequiredEpis(collaborator, bundle.epis);
      const deliveredIds = new Set(bundle.deliveries.filter((delivery) => delivery.colaborador_id === collaborator.id && ['entregue', 'proximo_troca'].includes(delivery.status)).map((delivery) => delivery.epi_id));
      return required.some((item) => !deliveredIds.has(item.epi.id));
    }).length;
    return [
      { label: 'Total de EPIs entregues', value: delivered, icon: PackageCheck, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setStatusFilter('entregue') },
      { label: 'EPIs pendentes', value: pending, icon: AlertTriangle, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => setActiveView('pendings') },
      { label: 'EPIs vencidos', value: expired, icon: CalendarClock, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setStatusFilter('vencido') },
      { label: 'Proximos da troca', value: near, icon: RefreshCw, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => setStatusFilter('proximo_troca') },
      { label: 'Colaboradores com EPI pendente', value: collaboratorsPending, icon: UserRound, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => setActiveView('pendings') },
      { label: 'CAs vencidos', value: expiredCas, icon: ShieldCheck, className: 'bg-[#ffdad6] text-[#ba1a1a]', onClick: () => setCaFilter('vencido') },
      { label: 'Termos gerados', value: terms, icon: ClipboardSignature, className: 'bg-[#dfe7f5] text-[#334766]', onClick: () => setTermFilter('sim') },
      { label: 'Entregas no mes', value: monthDeliveries, icon: CalendarClock, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => setPeriodFilter('todos') },
    ];
  }, [bundle.collaborators, bundle.deliveries, bundle.epis]);

  const openNewDelivery = (collaborator?: Collaborator, epi?: Epi) => {
    setEditingDelivery(null);
    setDeliveryForm({
      ...emptyDelivery,
      colaborador_id: collaborator?.id || '',
      epi_id: epi?.id || '',
      data_proxima_troca: calculateNextChange(today, epi),
    });
    setIsDeliveryOpen(true);
  };

  const openEditDelivery = (delivery: EpiDelivery) => {
    setEditingDelivery(delivery);
    setDeliveryForm({
      colaborador_id: delivery.colaborador_id,
      epi_id: delivery.epi_id,
      data_entrega: delivery.data_entrega,
      data_validade: delivery.data_validade || '',
      data_proxima_troca: delivery.data_proxima_troca || '',
      quantidade: delivery.quantidade,
      responsavel_entrega: delivery.responsavel_entrega,
      status: delivery.status,
      assinatura_url: delivery.assinatura_url || '',
      comprovante_url: delivery.comprovante_url || '',
      observacoes: delivery.observacoes || '',
    });
    setIsDeliveryOpen(true);
  };

  const updateDeliveryForm = <K extends keyof EpiDeliveryFormValues>(key: K, value: EpiDeliveryFormValues[K]) => {
    setDeliveryForm((current) => {
      const next = { ...current, [key]: value };
      if (key === 'epi_id' || key === 'data_entrega') {
        const epi = bundle.epis.find((item) => item.id === (key === 'epi_id' ? value : next.epi_id));
        next.data_proxima_troca = calculateNextChange(key === 'data_entrega' ? String(value) : next.data_entrega, epi);
        if (epi?.validade_ca) next.data_validade = epi.validade_ca;
      }
      return next;
    });
  };

  const handleSaveDelivery = () => {
    startTransition(async () => {
      const payload = { ...deliveryForm, companyId };
      const result = editingDelivery
        ? await updateEpiDelivery(editingDelivery.id, payload)
        : await createEpiDelivery(payload);
      if (result.success) {
        toast({ title: editingDelivery ? 'Entrega atualizada' : 'Entrega registrada', description: 'Historico de EPI salvo com sucesso.' });
        setIsDeliveryOpen(false);
        setEditingDelivery(null);
        await loadData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar entrega', description: getToastError(result.error) });
      }
    });
  };

  const handleSaveEpi = () => {
    startTransition(async () => {
      const result = await createEpi({ ...epiForm, companyId });
      if (result.success) {
        toast({ title: 'EPI cadastrado', description: 'O EPI foi adicionado a base.' });
        setIsEpiOpen(false);
        setEpiForm(emptyEpi);
        await loadData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao cadastrar EPI', description: getToastError(result.error) });
      }
    });
  };

  const handleCancelDelivery = () => {
    if (!cancelingDelivery) return;
    startTransition(async () => {
      const result = await archiveEpiDelivery(cancelingDelivery.id, companyId);
      if (result.success) {
        toast({ title: 'Entrega cancelada', description: 'A entrega foi arquivada do historico ativo.' });
        setCancelingDelivery(null);
        await loadData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao cancelar entrega', description: getToastError(result.error) });
      }
    });
  };

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('todos');
    setSectorFilter('todos');
    setFunctionFilter('todas');
    setEpiFilter('todos');
    setPeriodFilter('todos');
    setCaFilter('todos');
    setTermFilter('todos');
  };

  const exportReport = () => {
    const success = downloadCsv(`relatorio-entregas-epi-${Date.now()}.csv`, filteredDeliveries.map((delivery) => ({
      colaborador: delivery.colaborador?.nome_completo || '',
      cpf: delivery.colaborador?.cpf || '',
      matricula: delivery.colaborador?.matricula || '',
      funcao: delivery.colaborador?.funcao || '',
      setor: delivery.colaborador?.setor || '',
      epi: delivery.epi?.nome || '',
      categoria: delivery.epi?.categoria || '',
      ca: delivery.epi?.ca || '',
      validade_ca: delivery.epi?.validade_ca || '',
      data_entrega: delivery.data_entrega,
      proxima_troca: delivery.data_proxima_troca || '',
      quantidade: delivery.quantidade,
      responsavel: delivery.responsavel_entrega,
      status: delivery.status,
      termo: termStatus(delivery),
    })));
    toast(success
      ? { title: 'Relatorio exportado', description: 'O CSV foi gerado com os filtros atuais.' }
      : { variant: 'destructive', title: 'Sem dados', description: 'Nao ha entregas para exportar.' });
  };

  const prepared = (title: string) => {
    toast({ title, description: 'Recurso preparado para evolucao sem alterar o fluxo atual.' });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl space-y-3">
          <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Entregas de EPI</h2>
          <p className="text-[1.05rem] leading-8 text-[#4f5f7a]">
            Controle a entrega, validade, troca e historico de EPIs dos colaboradores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => openNewDelivery()} className="h-12 rounded-md bg-[#f46e11] px-6 text-base font-bold text-white shadow-[0_8px_18px_rgba(244,110,17,0.24)] hover:bg-[#e96710]">
            <PackageCheck className="mr-2 h-5 w-5" />
            Nova Entrega de EPI
          </Button>
          <Button variant="outline" onClick={() => setActiveView('pendings')} className="h-12 rounded-md border-[#415778] px-5 font-bold text-[#415778]">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Pendencias de EPI
          </Button>
          <Button variant="outline" onClick={() => setIsEpiOpen(true)} className="h-12 rounded-md border-[#415778] px-5 font-bold text-[#415778]">
            <Plus className="mr-2 h-5 w-5" />
            Cadastrar EPI
          </Button>
          <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'dataImports', { tipo_importacao: 'epis' })} className="h-12 rounded-md border-[#415778] px-5 font-bold text-[#415778]">
            <Upload className="mr-2 h-4 w-4" />
            Importar EPIs
          </Button>
          <Button variant="outline" onClick={exportReport} className="h-12 rounded-md border-[#415778] px-5 font-bold text-[#415778]">
            <Download className="mr-2 h-4 w-4" />
            Exportar Relatorio
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
                <span className={cn('rounded-lg p-2.5', card.className)}><Icon className="h-5 w-5" /></span>
              </div>
              <p className="mt-4 text-[2rem] font-bold leading-none text-[#191c1e]">{card.value}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5f7a]" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por colaborador, CPF, matricula, funcao, setor, EPI ou CA" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] pl-10 xl:w-[520px]" />
          </div>
          <div className="flex flex-wrap gap-2">
            <FilterSelect value={statusFilter} onValueChange={setStatusFilter} placeholder="Status" options={[['todos', 'Todos os status'], ...Object.entries(statusLabels)]} />
            <FilterSelect value={epiFilter} onValueChange={setEpiFilter} placeholder="EPI" options={[['todos', 'Todos os EPIs'], ...bundle.epis.map((epi) => [epi.id, epi.nome] as [string, string])]} />
            <Button variant="outline" onClick={() => setShowAdvancedFilters((current) => !current)} className="h-11 rounded-md">
              <Filter className="mr-2 h-4 w-4" />
              Filtros avancados
            </Button>
            <Button variant="ghost" onClick={resetFilters} className="h-11 rounded-md">
              Limpar filtros
            </Button>
          </div>
        </div>
        {showAdvancedFilters && (
          <div className="mt-4 grid gap-3 border-t border-[#eceef1] pt-4 md:grid-cols-2 xl:grid-cols-4">
            <FilterSelect value={sectorFilter} onValueChange={setSectorFilter} placeholder="Setor" options={[['todos', 'Todos os setores'], ...sectors.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={functionFilter} onValueChange={setFunctionFilter} placeholder="Funcao" options={[['todas', 'Todas as funcoes'], ...functions.map((item) => [item, item] as [string, string])]} />
            <FilterSelect value={periodFilter} onValueChange={setPeriodFilter} placeholder="Proxima troca" options={[['todos', 'Todas as datas'], ['vencidos', 'Vencidos'], ['30', 'Troca em 30 dias'], ['90', 'Troca em 90 dias']]} />
            <FilterSelect value={caFilter} onValueChange={setCaFilter} placeholder="Validade do CA" options={[['todos', 'Todos os CAs'], ['valido', 'CA valido'], ['vencido', 'CA vencido'], ['sem_ca', 'Sem CA']]} />
            <FilterSelect value={termFilter} onValueChange={setTermFilter} placeholder="Termo" options={[['todos', 'Todos os termos'], ['sim', 'Termo gerado'], ['nao', 'Termo nao gerado']]} />
          </div>
        )}
        {selectedIds.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#e0c0b1] bg-[#fff8f1] p-3 text-sm text-[#4f5f7a]">
            <span>{selectedIds.length} entrega(s) selecionada(s)</span>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => prepared('Geracao de termos em lote preparada')}>Gerar termos</Button>
              <Button variant="outline" size="sm" onClick={() => prepared('Marcacao de assinatura em lote preparada')}>Marcar assinados</Button>
              <Button variant="outline" size="sm" onClick={exportReport}>Exportar selecionados</Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={activeView === 'history' ? 'default' : 'outline'} onClick={() => setActiveView('history')} className={cn('rounded-md', activeView === 'history' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Historico de entregas</Button>
        <Button variant={activeView === 'pendings' ? 'default' : 'outline'} onClick={() => setActiveView('pendings')} className={cn('rounded-md', activeView === 'pendings' && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>Pendencias de EPI</Button>
        <Button variant="outline" onClick={() => prepared('Entrega rapida preparada')} className="rounded-md">Entrega Rapida</Button>
        <Button variant="outline" onClick={() => prepared('Entrega em lote preparada')} className="rounded-md">Entrega em Lote</Button>
      </div>

      <AlertsPanel collaborators={bundle.collaborators} epis={bundle.epis} deliveries={bundle.deliveries} />

      {activeView === 'pendings' ? (
        <EpiPendingsPanel
          items={pendingItems}
          onDeliver={(item) => openNewDelivery(item.collaborator, item.epi)}
          onViewCollaborator={(collaborator) => setViewingCollaborator(collaborator)}
          onPrepared={prepared}
        />
      ) : (
      <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
        <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4">
          <h3 className="text-lg font-bold text-[#191c1e]">Historico de entregas</h3>
          <p className="text-sm text-[#4f5f7a]">{filteredDeliveries.length} registros encontrados</p>
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1320px] border-collapse text-left">
            <thead>
              <tr className="bg-[#fbfbfc] text-sm uppercase tracking-[0.06em] text-[#4f5f7a]">
                <th className="px-5 py-4">
                  <input
                    type="checkbox"
                    checked={filteredDeliveries.length > 0 && filteredDeliveries.every((item) => selectedIds.includes(item.id))}
                    onChange={(event) => setSelectedIds(event.target.checked ? filteredDeliveries.map((item) => item.id) : [])}
                  />
                </th>
                <th className="px-5 py-4">Colaborador</th>
                <th className="px-5 py-4">Funcao/Setor</th>
                <th className="px-5 py-4">EPI</th>
                <th className="px-5 py-4">CA</th>
                <th className="px-5 py-4">Entrega</th>
                <th className="px-5 py-4">Proxima troca</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Termo</th>
                <th className="px-5 py-4 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e0c0b1]">
              {isLoading ? (
                <tr><td colSpan={10} className="px-5 py-14 text-center text-[#4f5f7a]">Carregando entregas...</td></tr>
              ) : filteredDeliveries.length === 0 ? (
                <tr><td colSpan={10} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhuma entrega encontrada.</td></tr>
              ) : filteredDeliveries.map((delivery) => (
                <tr key={delivery.id} className="hover:bg-[#fafbfd]">
                  <td className="px-5 py-5"><input type="checkbox" checked={selectedIds.includes(delivery.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, delivery.id] : current.filter((id) => id !== delivery.id))} /></td>
                  <td className="px-5 py-5">
                    <p className="font-bold text-[#191c1e]">{delivery.colaborador?.nome_completo || 'Nao encontrado'}</p>
                    <p className="text-xs text-[#3f5a88]">{delivery.colaborador?.cpf || '-'}{delivery.colaborador?.matricula ? ` / ${delivery.colaborador.matricula}` : ''}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p>{delivery.colaborador?.funcao || '-'}</p>
                    <p className="text-xs text-[#4f5f7a]">{delivery.colaborador?.setor || '-'}</p>
                  </td>
                  <td className="px-5 py-5">
                    <p className="font-semibold">{delivery.epi?.nome || 'EPI nao encontrado'}</p>
                    <p className="text-xs text-[#4f5f7a]">{delivery.epi?.categoria || 'Sem categoria'}</p>
                  </td>
                  <td className="px-5 py-5">{delivery.epi?.ca || '-'}</td>
                  <td className="px-5 py-5">{formatDate(delivery.data_entrega)}</td>
                  <td className="px-5 py-5">{formatDate(delivery.data_proxima_troca || delivery.data_validade)}</td>
                  <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', statusStyle(delivery.status))}>{statusLabels[delivery.status]}</Badge></td>
                  <td className="px-5 py-5"><Badge className="rounded-full bg-[#eef1f5] px-3 py-1 text-[#4f5f7a]">{termStatus(delivery)}</Badge></td>
                  <td className="px-5 py-5">
                    <div className="flex justify-end gap-1">
                      <IconButton title="Visualizar" onClick={() => setViewingDelivery(delivery)} icon={Eye} />
                      <IconButton title="Editar" onClick={() => openEditDelivery(delivery)} icon={Edit} />
                      <DeliveryRowMenu
                        delivery={delivery}
                        onViewTerm={() => setViewingDelivery(delivery)}
                        onEdit={() => openEditDelivery(delivery)}
                        onRenew={() => openNewDelivery(delivery.colaborador || undefined, delivery.epi || undefined)}
                        onCancel={() => setCancelingDelivery(delivery)}
                        onPrepared={prepared}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="space-y-3 p-4 lg:hidden">
          {filteredDeliveries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#ccb4a6] p-6 text-center text-sm text-[#4f5f7a]">Nenhuma entrega encontrada.</p>
          ) : filteredDeliveries.map((delivery) => (
            <div key={delivery.id} className="rounded-xl border border-[#e0c0b1] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-[#191c1e]">{delivery.colaborador?.nome_completo || 'Nao encontrado'}</p>
                  <p className="text-sm text-[#4f5f7a]">{delivery.colaborador?.funcao || '-'} - {delivery.colaborador?.setor || '-'}</p>
                </div>
                <Badge className={cn('rounded-full px-3 py-1', statusStyle(delivery.status))}>{statusLabels[delivery.status]}</Badge>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <p><span className="text-[#4f5f7a]">EPI:</span> {delivery.epi?.nome || '-'}</p>
                <p><span className="text-[#4f5f7a]">CA:</span> {delivery.epi?.ca || '-'}</p>
                <p><span className="text-[#4f5f7a]">Proxima troca:</span> {formatDate(delivery.data_proxima_troca || delivery.data_validade)}</p>
                <p><span className="text-[#4f5f7a]">Termo:</span> {termStatus(delivery)}</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button variant="outline" onClick={() => setViewingDelivery(delivery)}>Ver</Button>
                <Button variant="outline" onClick={() => openEditDelivery(delivery)}>Editar</Button>
                <Button variant="outline" onClick={() => openNewDelivery(delivery.colaborador || undefined, delivery.epi || undefined)}>Renovar</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      <ReportsPreparation />

      <Dialog open={isDeliveryOpen} onOpenChange={setIsDeliveryOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>{editingDelivery ? 'Editar entrega de EPI' : 'Nova Entrega de EPI'}</DialogTitle></DialogHeader>
          <DeliveryForm
            form={deliveryForm}
            setForm={updateDeliveryForm}
            collaborators={bundle.collaborators}
            epis={bundle.epis}
            selectedCollaborator={selectedCollaborator}
            requiredEpis={requiredForSelected}
            onSubmit={handleSaveDelivery}
            isPending={isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isEpiOpen} onOpenChange={setIsEpiOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader><DialogTitle>Cadastrar EPI</DialogTitle></DialogHeader>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome"><Input value={epiForm.nome} onChange={(e) => setEpiForm((current) => ({ ...current, nome: e.target.value }))} /></Field>
            <Field label="Categoria"><Input value={epiForm.categoria || ''} onChange={(e) => setEpiForm((current) => ({ ...current, categoria: e.target.value }))} /></Field>
            <Field label="CA"><Input value={epiForm.ca || ''} onChange={(e) => setEpiForm((current) => ({ ...current, ca: e.target.value }))} /></Field>
            <Field label="Validade do CA"><Input type="date" value={epiForm.validade_ca || ''} onChange={(e) => setEpiForm((current) => ({ ...current, validade_ca: e.target.value }))} /></Field>
            <Field label="Valor unitario"><Input type="number" min="0" step="0.01" value={epiForm.valor_unitario || 0} onChange={(e) => setEpiForm((current) => ({ ...current, valor_unitario: Number(e.target.value) }))} /></Field>
            <Field label="Fornecedor"><Input value={epiForm.fornecedor || ''} onChange={(e) => setEpiForm((current) => ({ ...current, fornecedor: e.target.value }))} /></Field>
            <Field label="Data da compra"><Input type="date" value={epiForm.data_compra || ''} onChange={(e) => setEpiForm((current) => ({ ...current, data_compra: e.target.value }))} /></Field>
            <Field label="Prazo de troca em dias"><Input type="number" value={epiForm.prazo_troca_dias || 0} onChange={(e) => setEpiForm((current) => ({ ...current, prazo_troca_dias: Number(e.target.value) }))} /></Field>
            <Field label="Descricao" className="md:col-span-2"><Textarea value={epiForm.descricao || ''} onChange={(e) => setEpiForm((current) => ({ ...current, descricao: e.target.value }))} /></Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={handleSaveEpi} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar EPI</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingCollaborator} onOpenChange={(open) => !open && setViewingCollaborator(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader><DialogTitle>Ficha de EPI do colaborador</DialogTitle></DialogHeader>
          {viewingCollaborator && <CollaboratorEpiCard collaborator={viewingCollaborator} epis={bundle.epis} deliveries={bundle.deliveries} onNewDelivery={openNewDelivery} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingDelivery} onOpenChange={(open) => !open && setViewingDelivery(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Termo de entrega de EPI</DialogTitle></DialogHeader>
          {viewingDelivery && <DeliveryTerm delivery={viewingDelivery} companyName={companyName} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!cancelingDelivery} onOpenChange={(open) => !open && setCancelingDelivery(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar entrega?</AlertDialogTitle>
            <AlertDialogDescription>Esta entrega sera arquivada do historico ativo. O registro nao sera apagado definitivamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelDelivery} className="bg-[#ba1a1a] hover:bg-[#93000a]">Cancelar entrega</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({ value, onValueChange, placeholder, options }: { value: string; onValueChange: (value: string) => void; placeholder: string; options: Array<[string, string]> }) {
  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('space-y-2 text-sm font-semibold text-[#191c1e]', className)}><span>{label}</span>{children}</label>;
}

function IconButton({ title, onClick, icon: Icon, danger }: { title: string; onClick: () => void; icon: typeof Eye; danger?: boolean }) {
  return <button type="button" title={title} onClick={onClick} className={cn('rounded-lg p-2 hover:bg-[#eceef1]', danger ? 'text-[#ba1a1a]' : 'text-[#4f5f7a]')}><Icon className="h-5 w-5" /></button>;
}

function DeliveryRowMenu({
  delivery,
  onViewTerm,
  onEdit,
  onRenew,
  onCancel,
  onPrepared,
}: {
  delivery: EpiDelivery;
  onViewTerm: () => void;
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
        <DropdownMenuItem onClick={onViewTerm}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Edit className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={onRenew}><RefreshCw className="mr-2 h-4 w-4" />Renovar/Substituir</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onPrepared('Marcacao de devolucao preparada')}><Undo2 className="mr-2 h-4 w-4" />Marcar devolucao</DropdownMenuItem>
        <DropdownMenuItem onClick={onViewTerm}><ClipboardSignature className="mr-2 h-4 w-4" />Gerar termo</DropdownMenuItem>
        <DropdownMenuItem onClick={onViewTerm}><FileText className="mr-2 h-4 w-4" />Ver termo ({termStatus(delivery)})</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onCancel} className="text-[#ba1a1a]"><Archive className="mr-2 h-4 w-4" />Arquivar/Cancelar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function severityClass(severity: EpiPendingItem['severity']) {
  if (severity === 'critica') return 'bg-[#ffdad6] text-[#ba1a1a]';
  if (severity === 'alta') return 'bg-[#ffe5d6] text-[#9e4300]';
  if (severity === 'media') return 'bg-[#fff0d8] text-[#8a4b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function EpiPendingsPanel({
  items,
  onDeliver,
  onViewCollaborator,
  onPrepared,
}: {
  items: EpiPendingItem[];
  onDeliver: (item: EpiPendingItem) => void;
  onViewCollaborator: (collaborator: Collaborator) => void;
  onPrepared: (title: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
      <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4">
        <h3 className="text-lg font-bold text-[#191c1e]">Pendencias de EPI</h3>
        <p className="text-sm text-[#4f5f7a]">{items.length} pendencias encontradas para resolver rapidamente</p>
      </div>
      <div className="divide-y divide-[#e0c0b1]">
        {items.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#4f5f7a]">Nenhuma pendencia de EPI encontrada.</div>
        ) : items.map((item) => (
          <div key={item.id} className="grid gap-3 p-5 lg:grid-cols-[1.1fr_0.8fr_0.9fr_0.7fr_0.7fr_1.1fr] lg:items-center">
            <div>
              <p className="font-bold text-[#191c1e]">{item.collaborator.nome_completo}</p>
              <p className="text-xs text-[#4f5f7a]">{item.collaborator.funcao} - {item.collaborator.setor}</p>
            </div>
            <p className="font-medium text-[#191c1e]">{item.epiName}</p>
            <p className="text-sm text-[#4f5f7a]">{item.reason}</p>
            <Badge className={cn('w-fit rounded-full px-3 py-1', severityClass(item.severity))}>{item.severity}</Badge>
            <p className="text-sm text-[#4f5f7a]">{item.urgency}</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => item.action === 'configure' ? onPrepared('Configuracao de EPIs por funcao preparada') : onDeliver(item)}>
                {item.action === 'renew' ? 'Renovar EPI' : item.action === 'term' ? 'Gerar termo' : item.action === 'configure' ? 'Configurar' : 'Entregar EPI'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => onViewCollaborator(item.collaborator)}>Ver colaborador</Button>
              <Button size="sm" variant="outline" onClick={() => onPrepared('Justificativa de pendencia preparada')}>Justificar</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeliveryForm({ form, setForm, collaborators, epis, selectedCollaborator, requiredEpis, onSubmit, isPending }: {
  form: EpiDeliveryFormValues;
  setForm: <K extends keyof EpiDeliveryFormValues>(key: K, value: EpiDeliveryFormValues[K]) => void;
  collaborators: Collaborator[];
  epis: Epi[];
  selectedCollaborator: Collaborator | null;
  requiredEpis: EpiRequiredItem[];
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="grid gap-2 sm:grid-cols-5">
        {['1. Colaborador', '2. Obrigatorios', '3. Selecionar', '4. Dados', '5. Revisao'].map((step) => (
          <div key={step} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] px-3 py-2 text-center text-xs font-bold text-[#4f5f7a]">{step}</div>
        ))}
      </div>
      <div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4">
        <div className="mb-3 flex items-center gap-2 font-bold text-[#191c1e]"><UserRound className="h-5 w-5 text-[#9e4300]" />Etapa 1: Selecionar colaborador</div>
        <Field label="Buscar/selecionar colaborador">
          <Select value={form.colaborador_id} onValueChange={(value) => setForm('colaborador_id', value)}>
            <SelectTrigger className="h-11 border-[#ccb4a6] bg-white"><SelectValue placeholder="Selecione por nome, CPF ou matricula" /></SelectTrigger>
            <SelectContent>{collaborators.map((collaborator) => <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.nome_completo} - {collaborator.cpf}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {selectedCollaborator ? (
          <div className="mt-4 grid gap-3 rounded-lg border border-[#e0c0b1] bg-white p-4 md:grid-cols-5">
            <Info label="Nome" value={selectedCollaborator.nome_completo} />
            <Info label="CPF" value={selectedCollaborator.cpf} />
            <Info label="Matricula" value={selectedCollaborator.matricula || '-'} />
            <Info label="Funcao" value={selectedCollaborator.funcao} />
            <Info label="Setor" value={selectedCollaborator.setor} />
            <Info label="Status" value={selectedCollaborator.status} />
          </div>
        ) : null}
        {selectedCollaborator && selectedCollaborator.status !== 'ativo' ? (
          <p className="mt-3 rounded-lg border border-[#ffe5d6] bg-[#fff8f1] p-3 text-sm text-[#8a4b00]">
            Atencao: colaborador {selectedCollaborator.status}. Confirme a necessidade antes de registrar a entrega.
          </p>
        ) : null}
      </div>

      {selectedCollaborator ? (
        <div className="rounded-xl border border-[#e0c0b1] bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <HardHat className="h-5 w-5 text-[#9e4300]" />
            <h3 className="font-bold text-[#191c1e]">Etapa 2 e 3: Conferir e selecionar EPIs obrigatorios</h3>
          </div>
          {requiredEpis.length === 0 ? (
            <p className="rounded-lg border border-[#ffe5d6] bg-[#fff8f1] p-3 text-sm text-[#8a4b00]">Colaborador com funcao sem EPIs cadastrados. Use o cadastro de EPI ou gere recomendacoes com IA na ficha do colaborador.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button type="button" onClick={() => requiredEpis[0] && setForm('epi_id', requiredEpis[0].epi.id)} className="rounded-lg border border-dashed border-[#f46e11] bg-[#fff8f1] p-3 text-left text-sm font-bold text-[#9e4300]">
                Selecionar primeiro EPI pendente
              </button>
              {requiredEpis.map((item) => (
                <button key={item.epi.id} type="button" onClick={() => setForm('epi_id', item.epi.id)} className={cn('rounded-lg border p-3 text-left text-sm transition-colors', form.epi_id === item.epi.id ? 'border-[#f46e11] bg-[#fff4e8]' : 'border-[#e0c0b1] bg-[#f7f9fc] hover:bg-[#fff8f1]')}>
                  <span className="font-bold text-[#191c1e]">{item.epi.nome}</span>
                  <span className="mt-1 block text-xs text-[#4f5f7a]">CA: {item.epi.ca || 'Nao informado'}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2 rounded-xl border border-[#e0c0b1] bg-white p-4">
          <div className="mb-1 font-bold text-[#191c1e]">Etapa 4: Confirmar dados da entrega</div>
          <p className="text-sm text-[#4f5f7a]">CA, prazo de troca e validade sao preenchidos automaticamente quando cadastrados no EPI.</p>
        </div>
        <Field label="EPI">
          <Select value={form.epi_id} onValueChange={(value) => setForm('epi_id', value)}>
            <SelectTrigger className="h-11 border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue placeholder="Selecione o EPI entregue" /></SelectTrigger>
            <SelectContent>{epis.map((epi) => <SelectItem key={epi.id} value={epi.id}>{epi.nome}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Quantidade"><Input type="number" value={form.quantidade} onChange={(event) => setForm('quantidade', Number(event.target.value))} /></Field>
        <Field label="Data de entrega"><Input type="date" value={form.data_entrega} onChange={(event) => setForm('data_entrega', event.target.value)} /></Field>
        <Field label="Proxima troca"><Input type="date" value={form.data_proxima_troca || ''} onChange={(event) => setForm('data_proxima_troca', event.target.value)} /></Field>
        <Field label="Validade/CA"><Input type="date" value={form.data_validade || ''} onChange={(event) => setForm('data_validade', event.target.value)} /></Field>
        <Field label="Responsavel pela entrega"><Input value={form.responsavel_entrega} onChange={(event) => setForm('responsavel_entrega', event.target.value)} /></Field>
        <Field label="Status">
          <Select value={form.status} onValueChange={(value) => setForm('status', value as EpiDeliveryStatus)}>
            <SelectTrigger className="h-11 border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger>
            <SelectContent>{Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Observacoes" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(event) => setForm('observacoes', event.target.value)} /></Field>
      </div>
      <div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4">
        <div className="mb-3 font-bold text-[#191c1e]">Etapa 5: Revisao e termo</div>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <Info label="Colaborador" value={selectedCollaborator?.nome_completo || '-'} />
          <Info label="EPI" value={epis.find((epi) => epi.id === form.epi_id)?.nome || '-'} />
          <Info label="Quantidade" value={String(form.quantidade || 0)} />
          <Info label="Responsavel" value={form.responsavel_entrega || '-'} />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onSubmit} disabled={isPending}>Salvar e abrir ficha</Button>
        <Button variant="outline" onClick={onSubmit} disabled={isPending}>Salvar e gerar termo</Button>
        <Button onClick={onSubmit} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar entrega</Button>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p><p className="text-sm font-semibold text-[#191c1e]">{value}</p></div>;
}

function AlertsPanel({ collaborators, epis, deliveries }: { collaborators: Collaborator[]; epis: Epi[]; deliveries: EpiDelivery[] }) {
  const alerts = useMemo(() => {
    const items: string[] = [];
    deliveries.filter((item) => item.status === 'vencido').slice(0, 2).forEach((item) => items.push(`EPI vencido: ${item.epi?.nome || 'EPI'} de ${item.colaborador?.nome_completo || 'colaborador'}.`));
    deliveries.filter((item) => item.status === 'proximo_troca').slice(0, 2).forEach((item) => items.push(`EPI proximo da troca: ${item.epi?.nome || 'EPI'} de ${item.colaborador?.nome_completo || 'colaborador'}.`));
    epis.filter((epi) => epi.validade_ca && daysUntil(epi.validade_ca)! < 0).slice(0, 2).forEach((epi) => items.push(`CA vencido: ${epi.nome}.`));
    collaborators.filter((collaborator) => getRequiredEpis(collaborator, epis).length === 0).slice(0, 2).forEach((collaborator) => items.push(`Funcao sem EPIs cadastrados: ${collaborator.funcao} (${collaborator.nome_completo}).`));
    return items.slice(0, 5);
  }, [collaborators, deliveries, epis]);

  if (alerts.length === 0) return null;
  return (
    <div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f1] p-4">
      <div className="mb-3 flex items-center gap-2 font-bold text-[#8a4b00]"><AlertTriangle className="h-5 w-5" />Alertas importantes</div>
      <div className="grid gap-2 md:grid-cols-2">{alerts.map((alert) => <p key={alert} className="rounded-lg bg-white p-3 text-sm text-[#521f00]">{alert}</p>)}</div>
    </div>
  );
}

function CollaboratorEpiCard({ collaborator, epis, deliveries, onNewDelivery }: { collaborator: Collaborator; epis: Epi[]; deliveries: EpiDelivery[]; onNewDelivery: (collaborator: Collaborator, epi?: Epi) => void }) {
  const required = getRequiredEpis(collaborator, epis);
  const collaboratorDeliveries = deliveries.filter((delivery) => delivery.colaborador_id === collaborator.id);
  const deliveredIds = new Set(collaboratorDeliveries.filter((delivery) => ['entregue', 'proximo_troca'].includes(delivery.status)).map((delivery) => delivery.epi_id));

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-5">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#dfe5ef] text-xl font-bold text-[#203555]">{getInitials(collaborator.nome_completo)}</div>
          <div>
            <h3 className="text-2xl font-bold text-[#191c1e]">{collaborator.nome_completo}</h3>
            <p className="text-[#4f5f7a]">{collaborator.funcao} - {collaborator.setor} - {collaborator.status}</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-5">
        <Summary label="Obrigatorios" value={required.length} />
        <Summary label="Entregues" value={collaboratorDeliveries.filter((item) => item.status === 'entregue').length} />
        <Summary label="Pendentes" value={required.filter((item) => !deliveredIds.has(item.epi.id)).length} />
        <Summary label="Vencidos" value={collaboratorDeliveries.filter((item) => item.status === 'vencido').length} />
        <Summary label="Prox. troca" value={collaboratorDeliveries.filter((item) => item.status === 'proximo_troca').length} />
      </div>
      <div className="rounded-xl border border-[#e0c0b1] bg-white">
        <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4 font-bold">EPIs obrigatorios da funcao</div>
        <div className="divide-y divide-[#e0c0b1]">
          {required.length === 0 ? <p className="p-5 text-sm text-[#4f5f7a]">Nenhum EPI obrigatorio identificado.</p> : required.map((item) => {
            const last = collaboratorDeliveries.find((delivery) => delivery.epi_id === item.epi.id);
            const status = last?.status || 'pendente';
            return (
              <div key={item.epi.id} className="grid gap-3 p-5 lg:grid-cols-[1.2fr_0.6fr_0.7fr_0.7fr_1fr] lg:items-center">
                <div><p className="font-bold text-[#191c1e]">{item.epi.nome}</p><p className="text-xs text-[#4f5f7a]">Obrigatorio: {item.obrigatorio ? 'sim' : 'nao'}</p></div>
                <Badge className={cn('w-fit rounded-full px-3 py-1 uppercase', statusStyle(status as EpiDeliveryStatus))}>{statusLabels[status as EpiDeliveryStatus]}</Badge>
                <p className="text-sm text-[#4f5f7a]">Ultima: {formatDate(last?.data_entrega)}</p>
                <p className="text-sm text-[#4f5f7a]">Troca: {formatDate(last?.data_proxima_troca)}</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onNewDelivery(collaborator, item.epi)}>Registrar entrega</Button>
                  <Button size="sm" variant="outline" onClick={() => onNewDelivery(collaborator, item.epi)}><RefreshCw className="mr-1 h-4 w-4" />Substituir</Button>
                  <Button size="sm" variant="outline" onClick={() => onNewDelivery(collaborator, item.epi)}><Undo2 className="mr-1 h-4 w-4" />Devolucao</Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-4"><p className="text-xs font-bold uppercase text-[#4f5f7a]">{label}</p><p className="mt-2 text-2xl font-bold text-[#191c1e]">{value}</p></div>;
}

function DeliveryTerm({ delivery, companyName }: { delivery: EpiDelivery; companyName?: string }) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-[#e0c0b1] bg-white p-6">
        <div className="mb-5 flex items-center gap-2 text-xl font-bold text-[#191c1e]"><FileText className="h-5 w-5 text-[#9e4300]" />Termo de Entrega de EPI</div>
        <div className="grid gap-3 md:grid-cols-2">
          <Info label="Empresa" value={companyName || 'Empresa'} />
          <Info label="Colaborador" value={delivery.colaborador?.nome_completo || '-'} />
          <Info label="CPF" value={delivery.colaborador?.cpf || '-'} />
          <Info label="Matricula" value={delivery.colaborador?.matricula || '-'} />
          <Info label="Funcao" value={delivery.colaborador?.funcao || '-'} />
          <Info label="Setor" value={delivery.colaborador?.setor || '-'} />
          <Info label="EPI" value={delivery.epi?.nome || '-'} />
          <Info label="CA" value={delivery.epi?.ca || '-'} />
          <Info label="Quantidade" value={String(delivery.quantidade)} />
          <Info label="Data da entrega" value={formatDate(delivery.data_entrega)} />
          <Info label="Responsavel" value={delivery.responsavel_entrega || '-'} />
        </div>
        <p className="mt-6 rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-4 text-sm leading-7 text-[#191c1e]">
          Declaro, para os devidos fins, que recebi da empresa os Equipamentos de Protecao Individual relacionados acima, em perfeito estado de conservacao e funcionamento, comprometendo-me a utiliza-los corretamente durante a execucao das minhas atividades, zelar por sua guarda e conservacao, comunicar qualquer dano ou extravio e devolve-los quando solicitado.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div className="border-t border-[#191c1e] pt-2 text-center text-sm font-bold">Assinatura do colaborador</div>
          <div className="border-t border-[#191c1e] pt-2 text-center text-sm font-bold">Assinatura do responsavel</div>
        </div>
      </div>
      <div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4">
        <div className="mb-3 flex items-center gap-2 font-bold text-[#191c1e]"><ClipboardSignature className="h-5 w-5 text-[#9e4300]" />Assinatura e termo assinado</div>
        <div className="grid gap-3 md:grid-cols-4">
          <Info label="Status" value={termStatus(delivery)} />
          <Info label="Assinatura digital" value={delivery.assinatura_url ? 'Coletada' : 'Pendente'} />
          <Info label="Termo anexado" value={delivery.comprovante_url ? 'Sim' : 'Nao'} />
          <Info label="Data prevista" value={formatDate(delivery.data_entrega)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button disabled className="bg-[#f46e11] text-white disabled:opacity-70"><ClipboardSignature className="mr-2 h-4 w-4" />Gerar termo</Button>
        <Button disabled variant="outline"><Download className="mr-2 h-4 w-4" />Baixar PDF</Button>
        <Button disabled variant="outline"><FileText className="mr-2 h-4 w-4" />Imprimir</Button>
        <Button disabled variant="outline"><BadgeCheck className="mr-2 h-4 w-4" />Marcar como assinado</Button>
        <Button disabled variant="outline"><Archive className="mr-2 h-4 w-4" />Anexar termo assinado</Button>
      </div>
    </div>
  );
}

function ReportsPreparation() {
  const reports = [
    'EPIs entregues por periodo',
    'EPIs pendentes',
    'EPIs vencidos',
    'EPIs proximos da troca',
    'EPIs por colaborador',
    'EPIs por setor',
    'EPIs por funcao',
    'CAs vencidos',
    'Termos pendentes de assinatura',
    'Historico individual',
    'Termo de entrega individual',
    'Importacao CSV de EPIs',
  ];
  return (
    <div className="rounded-xl border border-[#e0c0b1] bg-white p-5">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div><h3 className="text-lg font-bold text-[#191c1e]">Relatorios do modulo</h3><p className="text-sm text-[#4f5f7a]">Area preparada para relatorios operacionais, importacoes e configuracoes por funcao.</p></div>
        <div className="flex flex-wrap gap-2">
          <Button disabled variant="outline"><ShieldCheck className="mr-2 h-4 w-4" />Gerar EPIs recomendados com IA</Button>
          <Button disabled variant="outline"><HardHat className="mr-2 h-4 w-4" />Configurar EPIs por funcao</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{reports.map((report) => <div key={report} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm font-semibold text-[#191c1e]">{report}</div>)}</div>
    </div>
  );
}
