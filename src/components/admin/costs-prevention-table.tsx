'use client';

import { useEffect, useMemo, useState, useTransition, type ElementType } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Brain,
  CheckCircle2,
  Coins,
  Download,
  Eye,
  FileText,
  Filter,
  HandCoins,
  Loader2,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
  UserRound,
  Wallet,
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
import {
  correctiveCosts,
  costCategoryLabels,
  costOriginLabels,
  costTypeLabels,
  formatCurrency,
  preventionCosts,
  sumCosts,
} from '@/lib/cost-prevention';
import type {
  Collaborator,
  CostPrevention,
  CostPreventionCategory,
  CostPreventionFormValues,
  CostPreventionOrigin,
  CostPreventionType,
  Epi,
  Incident,
  Inspection,
  Nonconformity,
  Training,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { navigateCompanySection } from '@/lib/client-navigation';
import {
  archiveCostPrevention,
  createCostPrevention,
  getCostPreventionModuleData,
  updateCostPrevention,
} from '@/server/cost-prevention-actions';

interface CostsPreventionTableProps {
  companyId: string;
}

type Bundle = {
  collaborators: Collaborator[];
  epis: Epi[];
  trainings: Training[];
  inspections: Inspection[];
  nonconformities: Nonconformity[];
  incidents: Incident[];
  costs: CostPrevention[];
};

type ActiveTab = 'summary' | 'entries' | 'preventive' | 'origin' | 'reports' | 'insights';

const today = new Date().toISOString().slice(0, 10);

const emptyForm: CostPreventionFormValues = {
  descricao: '',
  categoria: 'prevencao',
  tipo_custo: 'custo_real',
  valor: 0,
  data_custo: today,
  fornecedor: '',
  setor: '',
  colaborador_id: '',
  epi_id: '',
  treinamento_id: '',
  inspecao_id: '',
  nao_conformidade_id: '',
  incidente_id: '',
  origem: 'manual',
  comprovante_url: '',
  responsavel_registro: '',
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

function monthKey(value?: string) {
  return value?.slice(0, 7) || '';
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

function badgeStyle(category: CostPreventionCategory) {
  if (['incidente', 'afastamento', 'multa_autuacao'].includes(category)) return 'bg-[#ffdad6] text-[#93000a]';
  if (['correcao', 'manutencao_corretiva', 'retrabalho'].includes(category)) return 'bg-[#ffe5d6] text-[#9e4300]';
  if (['prevencao', 'EPI', 'treinamento', 'manutencao_preventiva'].includes(category)) return 'bg-[#dff7e5] text-[#18703a]';
  return 'bg-[#eef1f5] text-[#4f5f7a]';
}

function costScope(item: CostPrevention) {
  return item.colaborador?.nome_completo || item.setor || item.fornecedor || '-';
}

function relationLabel(item: CostPrevention) {
  return item.incidente?.titulo
    || item.nao_conformidade?.titulo
    || item.inspecao?.titulo
    || item.treinamento?.nome
    || item.epi?.nome
    || item.colaborador?.nome_completo
    || '-';
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(';'), ...rows.map((row) => row.map(escape).join(';'))].join('\n');
  const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function groupedTotals(items: CostPrevention[], getKey: (item: CostPrevention) => string) {
  return Object.entries(items.reduce<Record<string, number>>((acc, item) => {
    const key = getKey(item) || 'Sem informacao';
    acc[key] = (acc[key] || 0) + Number(item.valor || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
}

export function CostsPreventionTable({ companyId }: CostsPreventionTableProps) {
  const [bundle, setBundle] = useState<Bundle>({ collaborators: [], epis: [], trainings: [], inspections: [], nonconformities: [], incidents: [], costs: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [typeFilter, setTypeFilter] = useState('todos');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [collaboratorFilter, setCollaboratorFilter] = useState('todos');
  const [supplierFilter, setSupplierFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('todos');
  const [originFilter, setOriginFilter] = useState('todos');
  const [minValue, setMinValue] = useState('');
  const [maxValue, setMaxValue] = useState('');
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [form, setForm] = useState<CostPreventionFormValues>(emptyForm);
  const [editing, setEditing] = useState<CostPrevention | null>(null);
  const [viewing, setViewing] = useState<CostPrevention | null>(null);
  const [archiving, setArchiving] = useState<CostPrevention | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isQuickFormOpen, setIsQuickFormOpen] = useState(false);
  const { toast } = useToast();

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await getCostPreventionModuleData(companyId);
      if (result.success && result.data) setBundle(result.data as Bundle);
      else toast({ variant: 'destructive', title: 'Erro ao buscar custos', description: getToastError(result.error) });
    } catch {
      toast({ variant: 'destructive', title: 'Erro inesperado', description: 'Nao foi possivel carregar Custos & Prevencao.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) void loadData();
  }, [companyId]);

  const sectors = useMemo(() => uniqueValues(bundle.costs, (item) => item.setor), [bundle.costs]);
  const suppliers = useMemo(() => uniqueValues(bundle.costs, (item) => item.fornecedor), [bundle.costs]);

  const filteredCosts = useMemo(() => {
    const query = normalize(search);
    const min = Number(minValue || 0);
    const max = Number(maxValue || 0);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    return bundle.costs.filter((item) => {
      const matchesSearch = !query || normalize([item.descricao, item.fornecedor, item.setor, item.categoria, item.responsavel_registro].join(' ')).includes(query);
      const matchesCategory = categoryFilter === 'todas' || item.categoria === categoryFilter;
      const matchesType = typeFilter === 'todos' || item.tipo_custo === typeFilter;
      const matchesSector = sectorFilter === 'todos' || item.setor === sectorFilter;
      const matchesCollaborator = collaboratorFilter === 'todos' || item.colaborador_id === collaboratorFilter;
      const matchesSupplier = supplierFilter === 'todos' || item.fornecedor === supplierFilter;
      const matchesOrigin = originFilter === 'todos' || item.origem === originFilter;
      const matchesMin = !minValue || Number(item.valor || 0) >= min;
      const matchesMax = !maxValue || Number(item.valor || 0) <= max;
      const itemMonth = monthKey(item.data_custo);
      const matchesPeriod = periodFilter === 'todos'
        || (periodFilter === 'mes' && itemMonth === currentMonth)
        || (periodFilter === 'mes_anterior' && itemMonth === previousMonth)
        || (periodFilter === 'ano' && item.data_custo.startsWith(String(now.getFullYear())));
      return matchesSearch && matchesCategory && matchesType && matchesSector && matchesCollaborator && matchesSupplier && matchesOrigin && matchesMin && matchesMax && matchesPeriod;
    });
  }, [bundle.costs, categoryFilter, collaboratorFilter, maxValue, minValue, originFilter, periodFilter, search, sectorFilter, supplierFilter, typeFilter]);

  const prevention = useMemo(() => preventionCosts(filteredCosts), [filteredCosts]);
  const corrective = useMemo(() => correctiveCosts(filteredCosts), [filteredCosts]);
  const incidentCosts = useMemo(() => filteredCosts.filter((item) => item.categoria === 'incidente' || item.incidente_id), [filteredCosts]);
  const epiCosts = useMemo(() => filteredCosts.filter((item) => item.categoria === 'EPI' || item.epi_id), [filteredCosts]);
  const trainingCosts = useMemo(() => filteredCosts.filter((item) => item.categoria === 'treinamento' || item.treinamento_id), [filteredCosts]);
  const ncCosts = useMemo(() => filteredCosts.filter((item) => Boolean(item.nao_conformidade_id)), [filteredCosts]);
  const absenceCosts = useMemo(() => filteredCosts.filter((item) => item.categoria === 'afastamento'), [filteredCosts]);

  const topSector = useMemo(() => {
    const [sector, total] = groupedTotals(filteredCosts, (item) => item.setor || 'Sem setor')[0] || ['-', 0];
    return { sector, total };
  }, [filteredCosts]);

  const estimatedEconomy = useMemo(() => Math.max(0, sumCosts(corrective) - sumCosts(prevention)), [corrective, prevention]);
  const total = sumCosts(filteredCosts);
  const preventivePercent = total ? Math.round((sumCosts(prevention) / total) * 100) : 0;
  const correctivePercent = total ? Math.round((sumCosts(corrective) / total) * 100) : 0;

  const stats = useMemo(() => [
    { label: 'Custo total no periodo', value: formatCurrency(total), icon: Wallet, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => setActiveTab('entries') },
    { label: 'Custo com prevencao', value: formatCurrency(sumCosts(prevention)), icon: ShieldAlert, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => { setCategoryFilter('prevencao'); setActiveTab('entries'); } },
    { label: 'Custo com correcao', value: formatCurrency(sumCosts(corrective)), icon: TrendingUp, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => { setCategoryFilter('correcao'); setActiveTab('entries'); } },
    { label: 'Custo com incidentes', value: formatCurrency(sumCosts(incidentCosts)), icon: AlertTriangle, className: 'bg-[#ffdad6] text-[#93000a]', onClick: () => { setOriginFilter('incidente'); setActiveTab('entries'); } },
    { label: 'Custo com EPIs', value: formatCurrency(sumCosts(epiCosts)), icon: Coins, className: 'bg-[#eef1f5] text-[#4f5f7a]', onClick: () => { setCategoryFilter('EPI'); setActiveTab('entries'); } },
    { label: 'Custo com treinamentos', value: formatCurrency(sumCosts(trainingCosts)), icon: Brain, className: 'bg-[#dfe7f5] text-[#334766]', onClick: () => { setCategoryFilter('treinamento'); setActiveTab('entries'); } },
    { label: 'Custo com nao conformidades', value: formatCurrency(sumCosts(ncCosts)), icon: CheckCircle2, className: 'bg-[#fff0d8] text-[#8a4b00]', onClick: () => { setOriginFilter('nao_conformidade'); setActiveTab('entries'); } },
    { label: 'Custo com afastamentos', value: formatCurrency(sumCosts(absenceCosts)), icon: UserRound, className: 'bg-[#ffdad6] text-[#93000a]', onClick: () => { setCategoryFilter('afastamento'); setActiveTab('entries'); } },
    { label: 'Economia preventiva estimada', value: formatCurrency(estimatedEconomy), icon: TrendingDown, className: 'bg-[#dff7e5] text-[#18703a]', onClick: () => setActiveTab('preventive') },
    { label: 'Setor com maior custo', value: topSector.sector === '-' ? '-' : `${topSector.sector} (${formatCurrency(topSector.total)})`, icon: BarChart3, className: 'bg-[#ffe5d6] text-[#9e4300]', onClick: () => { if (topSector.sector !== '-') setSectorFilter(topSector.sector); setActiveTab('entries'); } },
  ], [absenceCosts, corrective, epiCosts, estimatedEconomy, incidentCosts, ncCosts, prevention, topSector, total, trainingCosts]);

  const insights = useMemo(() => buildInsights(filteredCosts), [filteredCosts]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setIsFormOpen(true);
  };

  const openEdit = (item: CostPrevention) => {
    setEditing(item);
    setForm(costToForm(item));
    setIsFormOpen(true);
  };

  const handleSave = (action: 'close' | 'another' | 'details' = 'close') => {
    startTransition(async () => {
      const payload = { ...form, companyId };
      const result = editing ? await updateCostPrevention(editing.id, payload) : await createCostPrevention(payload);
      if (result.success) {
        toast({ title: editing ? 'Custo atualizado' : 'Custo registrado', description: 'Registro financeiro salvo com sucesso.' });
        const createdId = 'id' in result && typeof result.id === 'string' ? result.id : editing?.id;
        if (action === 'another') {
          setForm({ ...emptyForm, data_custo: today });
          setEditing(null);
          setIsQuickFormOpen(false);
        } else {
          setIsFormOpen(false);
          setIsQuickFormOpen(false);
          setEditing(null);
        }
        await loadData();
        if (action === 'details' && createdId) {
          setViewing({
            ...payload,
            id: createdId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            archived_at: null,
          });
        }
      } else {
        toast({ variant: 'destructive', title: 'Erro ao salvar custo', description: getToastError(result.error) });
      }
    });
  };

  const handleArchive = () => {
    if (!archiving) return;
    startTransition(async () => {
      const result = await archiveCostPrevention(archiving.id, companyId);
      if (result.success) {
        toast({ title: 'Custo arquivado', description: 'Registro removido da lista ativa.' });
        setArchiving(null);
        await loadData();
      } else {
        toast({ variant: 'destructive', title: 'Erro ao arquivar custo', description: getToastError(result.error) });
      }
    });
  };

  const resetFilters = () => {
    setSearch('');
    setCategoryFilter('todas');
    setTypeFilter('todos');
    setSectorFilter('todos');
    setCollaboratorFilter('todos');
    setSupplierFilter('todos');
    setPeriodFilter('todos');
    setOriginFilter('todos');
    setMinValue('');
    setMaxValue('');
  };

  const openQuickCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, data_custo: today });
    setIsQuickFormOpen(true);
  };

  const exportReport = () => {
    downloadCsv('custos-prevencao.csv', ['Data', 'Descricao', 'Categoria', 'Tipo', 'Valor', 'Setor', 'Origem', 'Relacionado a', 'Fornecedor', 'Comprovante'], filteredCosts.map((item) => [
      formatDate(item.data_custo),
      item.descricao,
      costCategoryLabels[item.categoria],
      costTypeLabels[item.tipo_custo],
      Number(item.valor || 0),
      item.setor || '',
      costOriginLabels[item.origem],
      relationLabel(item),
      item.fornecedor || '',
      item.comprovante_url ? 'Anexado' : 'Pendente',
    ]));
    toast({ title: 'CSV gerado', description: 'Relatorio de custos exportado com os filtros atuais.' });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-4xl space-y-3">
          <h2 className="font-headline text-[3rem] font-bold leading-[1.05] tracking-[-0.03em] text-[#191c1e]">Custos & Prevencao</h2>
          <p className="text-[1.05rem] leading-8 text-[#4f5f7a]">Acompanhe investimentos em seguranca, custos corretivos, incidentes e oportunidades de prevencao.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={openCreate} className="h-14 rounded-xl bg-[#f46e11] px-7 text-base font-bold text-white shadow-[0_8px_18px_rgba(244,110,17,0.24)] hover:bg-[#e96710]"><Plus className="mr-2 h-5 w-5" />Novo Custo</Button>
          <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'dataImports', { tipo_importacao: 'custos' })} className="h-14 rounded-xl border-[#415778] px-5 font-bold text-[#415778]"><Upload className="mr-2 h-5 w-5" />Importar Custos</Button>
          <Button variant="outline" onClick={openQuickCreate} className="h-14 rounded-xl border-[#415778] px-5 font-bold text-[#415778]"><ReceiptText className="mr-2 h-5 w-5" />Lançamento Rápido</Button>
          <Button variant="outline" onClick={() => setActiveTab('preventive')} className="h-14 rounded-xl border-[#415778] px-5 font-bold text-[#415778]"><HandCoins className="mr-2 h-5 w-5" />Análise Preventiva</Button>
          <Button variant="outline" onClick={exportReport} className="h-14 rounded-xl border-[#415778] px-5 font-bold text-[#415778]"><Download className="mr-2 h-5 w-5" />Exportar Relatório</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
        {stats.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>

      <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_0.9fr_0.9fr_0.9fr_auto_auto]">
          <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4f5f7a]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por descricao, fornecedor, setor, categoria ou responsavel" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] pl-10" /></div>
          <Input value="Empresa atual" disabled className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc] text-[#4f5f7a]" />
          <FilterSelect value={categoryFilter} onValueChange={setCategoryFilter} options={[['todas', 'Categorias'], ...Object.entries(costCategoryLabels)]} />
          <FilterSelect value={periodFilter} onValueChange={setPeriodFilter} options={[['todos', 'Periodo'], ['mes', 'Mes atual'], ['mes_anterior', 'Mes anterior'], ['ano', 'Ano atual']]} />
          <Button type="button" variant="outline" onClick={() => setShowAdvancedFilters((value) => !value)} className="h-11 rounded-md border-[#ccb4a6] text-[#415778]"><Filter className="mr-2 h-4 w-4" />Filtros avancados</Button>
          <Button type="button" variant="ghost" onClick={resetFilters} className="h-11 rounded-md text-[#415778]">Limpar filtros</Button>
        </div>
        {showAdvancedFilters && <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <FilterSelect value={typeFilter} onValueChange={setTypeFilter} options={[['todos', 'Tipos'], ...Object.entries(costTypeLabels)]} />
          <FilterSelect value={sectorFilter} onValueChange={setSectorFilter} options={[['todos', 'Setores'], ...sectors.map((item) => [item, item] as [string, string])]} />
          <FilterSelect value={collaboratorFilter} onValueChange={setCollaboratorFilter} options={[['todos', 'Colaborador'], ...bundle.collaborators.map((item) => [item.id, item.nome_completo] as [string, string])]} />
          <FilterSelect value={supplierFilter} onValueChange={setSupplierFilter} options={[['todos', 'Fornecedor'], ...suppliers.map((item) => [item, item] as [string, string])]} />
          <FilterSelect value={originFilter} onValueChange={setOriginFilter} options={[['todos', 'Origem'], ...Object.entries(costOriginLabels)]} />
          <Input value={minValue} onChange={(event) => setMinValue(event.target.value)} placeholder="Valor min." type="number" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]" />
          <Input value={maxValue} onChange={(event) => setMaxValue(event.target.value)} placeholder="Valor max." type="number" className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]" />
        </div>}
      </div>

      <div className="flex flex-wrap gap-2 rounded-xl border border-[#e0c0b1] bg-white p-2 shadow-sm">
        {[
          ['summary', 'Resumo Financeiro'],
          ['entries', 'Lancamentos'],
          ['preventive', 'Analise Preventiva'],
          ['origin', 'Custos por Origem'],
          ['reports', 'Relatorios'],
          ['insights', 'Insights'],
        ].map(([value, label]) => <Button key={value} variant={activeTab === value ? 'default' : 'outline'} onClick={() => setActiveTab(value as ActiveTab)} className={cn('rounded-md', activeTab === value && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>{label}</Button>)}
      </div>

      {activeTab === 'summary' && <SummaryFinancePanel costs={filteredCosts} insights={insights} prevention={sumCosts(prevention)} corrective={sumCosts(corrective)} preventivePercent={preventivePercent} correctivePercent={correctivePercent} />}
      {activeTab === 'preventive' && <PreventiveAnalysisPanel costs={filteredCosts} />}
      {activeTab === 'origin' && <OriginCostsPanel costs={filteredCosts} onFilterOrigin={(origin) => { setOriginFilter(origin); setActiveTab('entries'); }} />}
      {activeTab === 'reports' && <ReportsPreparation onExport={exportReport} />}
      {activeTab === 'insights' && <><AlertsPanel costs={bundle.costs} incidents={bundle.incidents} nonconformities={bundle.nonconformities} /><InsightsPanel insights={insights} prevention={sumCosts(prevention)} corrective={sumCosts(corrective)} /><AiPreparationPanel /></>}

      {activeTab === 'entries' && <div className="overflow-hidden rounded-xl border border-[#e0c0b1] bg-white shadow-sm">
        <div className="border-b border-[#e0c0b1] bg-[#f7f8fa] px-5 py-4"><h3 className="text-lg font-bold text-[#191c1e]">Lista de custos</h3><p className="text-sm text-[#4f5f7a]">{filteredCosts.length} registros encontrados</p></div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1540px] border-collapse text-left">
            <thead><tr className="bg-[#fbfbfc] text-sm uppercase tracking-[0.06em] text-[#4f5f7a]"><th className="px-5 py-4 font-bold">Data</th><th className="px-5 py-4 font-bold">Descricao</th><th className="px-5 py-4 font-bold">Categoria</th><th className="px-5 py-4 font-bold">Tipo de custo</th><th className="px-5 py-4 font-bold">Valor</th><th className="px-5 py-4 font-bold">Setor</th><th className="px-5 py-4 font-bold">Origem</th><th className="px-5 py-4 font-bold">Relacionado a</th><th className="px-5 py-4 font-bold">Fornecedor</th><th className="px-5 py-4 font-bold">Comprovante</th><th className="px-5 py-4 text-right font-bold">Acoes</th></tr></thead>
            <tbody className="divide-y divide-[#e0c0b1]">
              {isLoading ? Array.from({ length: 4 }).map((_, index) => <LoadingRow key={index} />) : filteredCosts.length === 0 ? <tr><td colSpan={11} className="px-5 py-14 text-center text-[#4f5f7a]">Nenhum custo registrado ainda. Comece registrando um custo de prevencao, correcao ou incidente.</td></tr> : filteredCosts.map((item) => (
                <tr key={item.id} className="hover:bg-[#fafbfd]">
                  <td className="px-5 py-5 text-[#3f5a88]">{formatDate(item.data_custo)}</td>
                  <td className="px-5 py-5"><p className="font-bold text-[#191c1e]">{item.descricao}</p><p className="text-xs text-[#4f5f7a]">{costScope(item)}</p></td>
                  <td className="px-5 py-5"><Badge className={cn('rounded-full px-3 py-1 uppercase', badgeStyle(item.categoria))}>{costCategoryLabels[item.categoria]}</Badge></td>
                  <td className="px-5 py-5 text-[#3f5a88]">{costTypeLabels[item.tipo_custo]}</td>
                  <td className="px-5 py-5 font-bold text-[#191c1e]">{formatCurrency(item.valor)}</td>
                  <td className="px-5 py-5 text-[#191c1e]">{item.setor || '-'}</td>
                  <td className="px-5 py-5"><Badge className="rounded-full bg-[#eef1f5] px-3 py-1 uppercase text-[#4f5f7a]">{costOriginLabels[item.origem]}</Badge></td>
                  <td className="px-5 py-5 text-[#191c1e]">{relationLabel(item)}</td>
                  <td className="px-5 py-5 text-[#191c1e]">{item.fornecedor || '-'}</td>
                  <td className="px-5 py-5">{item.comprovante_url ? <Badge className="rounded-full bg-[#dff7e5] px-3 py-1 text-[#18703a]">Anexado</Badge> : <Badge className="rounded-full bg-[#fff0d8] px-3 py-1 text-[#8a4b00]">Pendente</Badge>}</td>
                  <td className="px-5 py-5"><CostRowMenu item={item} onView={() => setViewing(item)} onEdit={() => openEdit(item)} onDuplicate={() => { setEditing(null); setForm({ ...costToForm(item), descricao: `${item.descricao} (copia)`, data_custo: today }); setIsFormOpen(true); }} onArchive={() => setArchiving(item)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-4 lg:hidden">
          {filteredCosts.length === 0 ? <p className="rounded-xl border border-dashed border-[#ccb4a6] p-6 text-center text-sm text-[#4f5f7a]">Nenhum custo registrado ainda. Comece registrando um custo de prevencao, correcao ou incidente.</p> : filteredCosts.map((item) => <CostMobileCard key={item.id} item={item} onView={() => setViewing(item)} onEdit={() => openEdit(item)} onArchive={() => setArchiving(item)} />)}
        </div>
      </div>}

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader><DialogTitle>{editing ? 'Editar custo' : 'Novo custo'}</DialogTitle></DialogHeader>
          <CostForm form={form} setForm={setForm} bundle={bundle} onSubmit={handleSave} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={isQuickFormOpen} onOpenChange={setIsQuickFormOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader><DialogTitle>Lançamento Rápido</DialogTitle></DialogHeader>
          <QuickCostForm form={form} setForm={setForm} bundle={bundle} onSubmit={handleSave} isPending={isPending} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewing} onOpenChange={(open) => !open && setViewing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader><DialogTitle>Detalhes do custo</DialogTitle></DialogHeader>
          {viewing && <CostDetails item={viewing} />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!archiving} onOpenChange={(open) => !open && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Arquivar custo?</AlertDialogTitle><AlertDialogDescription>O registro sera removido da lista ativa, sem apagar o historico.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleArchive} disabled={isPending} className="bg-[#ba1a1a] hover:bg-[#93000a]">{isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Arquivar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function costToForm(item: CostPrevention): CostPreventionFormValues {
  return {
    descricao: item.descricao || '',
    categoria: item.categoria,
    tipo_custo: item.tipo_custo,
    valor: Number(item.valor || 0),
    data_custo: item.data_custo || today,
    fornecedor: item.fornecedor || '',
    setor: item.setor || '',
    colaborador_id: item.colaborador_id || '',
    epi_id: item.epi_id || '',
    treinamento_id: item.treinamento_id || '',
    inspecao_id: item.inspecao_id || '',
    nao_conformidade_id: item.nao_conformidade_id || '',
    incidente_id: item.incidente_id || '',
    origem: item.origem,
    comprovante_url: item.comprovante_url || '',
    responsavel_registro: item.responsavel_registro || '',
    observacoes: item.observacoes || '',
  };
}

function CostRowMenu({ item, onView, onEdit, onDuplicate, onArchive }: { item: CostPrevention; onView: () => void; onEdit: () => void; onDuplicate: () => void; onArchive: () => void }) {
  return <div className="flex justify-end">
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-9 w-9"><MoreHorizontal className="h-5 w-5" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={onView}><Eye className="mr-2 h-4 w-4" />Visualizar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Pencil className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}><Paperclip className="mr-2 h-4 w-4" />Anexar comprovante</DropdownMenuItem>
        <DropdownMenuItem onClick={onView}><FileText className="mr-2 h-4 w-4" />Ver origem</DropdownMenuItem>
        <DropdownMenuItem onClick={onDuplicate}><Plus className="mr-2 h-4 w-4" />Duplicar lancamento</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onArchive} className="text-[#ba1a1a]"><Archive className="mr-2 h-4 w-4" />Arquivar/cancelar</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>;
}

function CostMobileCard({ item, onView, onEdit, onArchive }: { item: CostPrevention; onView: () => void; onEdit: () => void; onArchive: () => void }) {
  return <article className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="font-bold text-[#191c1e]">{item.descricao}</h3><p className="mt-1 text-sm text-[#4f5f7a]">{formatDate(item.data_custo)} - {item.setor || 'Sem setor'}</p></div>
      <p className="text-right text-lg font-bold text-[#191c1e]">{formatCurrency(item.valor)}</p>
    </div>
    <div className="mt-3 flex flex-wrap gap-2"><Badge className={cn('rounded-full px-3 py-1', badgeStyle(item.categoria))}>{costCategoryLabels[item.categoria]}</Badge><Badge className="rounded-full bg-[#eef1f5] px-3 py-1 text-[#4f5f7a]">{costOriginLabels[item.origem]}</Badge>{item.comprovante_url ? <Badge className="rounded-full bg-[#dff7e5] px-3 py-1 text-[#18703a]">Comprovante anexado</Badge> : <Badge className="rounded-full bg-[#fff0d8] px-3 py-1 text-[#8a4b00]">Sem comprovante</Badge>}</div>
    <div className="mt-3 grid gap-1 text-sm text-[#4f5f7a]"><p>Relacionado a: <span className="font-semibold text-[#191c1e]">{relationLabel(item)}</span></p><p>Fornecedor: <span className="font-semibold text-[#191c1e]">{item.fornecedor || '-'}</span></p></div>
    <div className="mt-4 grid grid-cols-3 gap-2"><Button variant="outline" onClick={onView}>Ver</Button><Button variant="outline" onClick={onEdit}>Editar</Button><Button variant="outline" onClick={onArchive} className="text-[#ba1a1a]">Arquivar</Button></div>
  </article>;
}

function SummaryCard({ label, value, icon: Icon, className, onClick }: { label: string; value: string; icon: ElementType; className: string; onClick?: () => void }) {
  return <button type="button" onClick={onClick} className="rounded-xl border border-[#e0c0b1] bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className="flex items-start justify-between gap-4"><p className="text-sm font-medium text-[#4f5f7a]">{label}</p><span className={cn('rounded-lg p-2.5', className)}><Icon className="h-5 w-5" /></span></div><p className="mt-4 text-[1.55rem] font-bold leading-tight text-[#191c1e]">{value}</p></button>;
}

function FilterSelect({ value, onValueChange, options }: { value: string; onValueChange: (value: string) => void; options: Array<[string, string]> }) {
  return <Select value={value} onValueChange={onValueChange}><SelectTrigger className="h-11 rounded-md border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{options.map(([optionValue, label]) => <SelectItem key={optionValue} value={optionValue}>{label}</SelectItem>)}</SelectContent></Select>;
}

function LoadingRow() {
  return <tr className="animate-pulse">{Array.from({ length: 11 }).map((_, index) => <td key={index} className="px-5 py-5"><div className="h-5 w-28 rounded bg-[#e6e8eb]" /></td>)}</tr>;
}

function IconButton({ title, onClick, icon: Icon, danger }: { title: string; onClick: () => void; icon: ElementType; danger?: boolean }) {
  return <button type="button" title={title} onClick={onClick} className={cn('rounded-lg p-2 hover:bg-[#eceef1]', danger ? 'text-[#ba1a1a]' : 'text-[#4f5f7a]')}><Icon className="h-5 w-5" /></button>;
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={cn('space-y-2 text-sm font-semibold text-[#191c1e]', className)}><span>{label}</span>{children}</label>;
}

function QuickCostForm({ form, setForm, bundle, onSubmit, isPending }: { form: CostPreventionFormValues; setForm: (value: CostPreventionFormValues) => void; bundle: Bundle; onSubmit: (action?: 'close' | 'another' | 'details') => void; isPending: boolean }) {
  const update = <K extends keyof CostPreventionFormValues>(key: K, value: CostPreventionFormValues[K]) => setForm({ ...form, [key]: value });
  return <div className="space-y-5">
    <div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">
      Registre o custo com os campos essenciais. Depois, o lançamento pode ser complementado com fornecedor, vínculos, comprovantes e observações.
    </div>
    <div className="grid gap-4 md:grid-cols-2">
      <Field label="Descricao" className="md:col-span-2"><Input value={form.descricao} onChange={(e) => update('descricao', e.target.value)} placeholder="Ex.: Compra emergencial de luvas" className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Valor"><Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => update('valor', Number(e.target.value))} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Data"><Input type="date" value={form.data_custo} onChange={(e) => update('data_custo', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Categoria"><Select value={form.categoria} onValueChange={(value) => update('categoria', value as CostPreventionCategory)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(costCategoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Setor"><Input value={form.setor || ''} onChange={(e) => update('setor', e.target.value)} placeholder="Ex.: Produção" className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Origem"><Select value={form.origem} onValueChange={(value) => update('origem', value as CostPreventionOrigin)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(costOriginLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Fornecedor"><Input value={form.fornecedor || ''} onChange={(e) => update('fornecedor', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Colaborador relacionado"><Select value={form.colaborador_id || 'none'} onValueChange={(value) => update('colaborador_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem colaborador</SelectItem>{bundle.collaborators.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome_completo}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Comprovante"><Input value={form.comprovante_url || ''} onChange={(e) => update('comprovante_url', e.target.value)} placeholder="URL ou referência do arquivo" className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Observacoes" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(e) => update('observacoes', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
    </div>
    <div className="flex flex-wrap justify-end gap-3 border-t border-[#e0c0b1] pt-5">
      <Button type="button" variant="outline" onClick={() => onSubmit('another')} disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar e registrar outro</Button>
      <Button onClick={() => onSubmit('close')} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar lançamento</Button>
    </div>
  </div>;
}

function CostForm({ form, setForm, bundle, onSubmit, isPending }: { form: CostPreventionFormValues; setForm: (value: CostPreventionFormValues) => void; bundle: Bundle; onSubmit: (action?: 'close' | 'another' | 'details') => void; isPending: boolean }) {
  const [step, setStep] = useState(0);
  const steps = ['Dados principais', 'Origem e vínculo', 'Comprovantes', 'Revisão'];
  const update = <K extends keyof CostPreventionFormValues>(key: K, value: CostPreventionFormValues[K]) => setForm({ ...form, [key]: value });
  const linkedItems = [
    form.colaborador_id && 'Colaborador',
    form.epi_id && 'EPI',
    form.treinamento_id && 'Treinamento',
    form.inspecao_id && 'Inspeção',
    form.nao_conformidade_id && 'Não conformidade',
    form.incidente_id && 'Incidente',
  ].filter(Boolean).join(', ') || 'Sem vínculos';

  return <div className="space-y-5">
    <div className="grid gap-2 sm:grid-cols-4">
      {steps.map((item, index) => <button key={item} type="button" onClick={() => setStep(index)} className={cn('rounded-lg border px-3 py-2 text-left text-sm font-semibold', step === index ? 'border-[#9e4300] bg-[#fff8f1] text-[#9e4300]' : 'border-[#e0c0b1] bg-white text-[#4f5f7a]')}><span className="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#eef1f5] text-xs">{index + 1}</span>{item}</button>)}
    </div>

    {step === 0 && <FormSection title="Dados principais" icon={Wallet}>
      <Field label="Descricao do custo"><Input value={form.descricao} onChange={(e) => update('descricao', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Valor"><Input type="number" min={0} step="0.01" value={form.valor} onChange={(e) => update('valor', Number(e.target.value))} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Data do custo"><Input type="date" value={form.data_custo} onChange={(e) => update('data_custo', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Categoria"><Select value={form.categoria} onValueChange={(value) => update('categoria', value as CostPreventionCategory)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(costCategoryLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Tipo de custo"><Select value={form.tipo_custo} onValueChange={(value) => update('tipo_custo', value as CostPreventionType)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(costTypeLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Setor"><Input value={form.setor || ''} onChange={(e) => update('setor', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Fornecedor"><Input value={form.fornecedor || ''} onChange={(e) => update('fornecedor', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Responsavel pelo registro"><Input value={form.responsavel_registro || ''} onChange={(e) => update('responsavel_registro', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
    </FormSection>}

    {step === 1 && <FormSection title="Origem e vinculo" icon={UserRound}>
      <Field label="Origem"><Select value={form.origem} onValueChange={(value) => update('origem', value as CostPreventionOrigin)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(costOriginLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Colaborador relacionado"><Select value={form.colaborador_id || 'none'} onValueChange={(value) => update('colaborador_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem colaborador</SelectItem>{bundle.collaborators.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome_completo}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="EPI relacionado"><Select value={form.epi_id || 'none'} onValueChange={(value) => update('epi_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem EPI</SelectItem>{bundle.epis.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Treinamento relacionado"><Select value={form.treinamento_id || 'none'} onValueChange={(value) => update('treinamento_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem treinamento</SelectItem>{bundle.trainings.map((item) => <SelectItem key={item.id} value={item.id}>{item.nome}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Inspecao relacionada"><Select value={form.inspecao_id || 'none'} onValueChange={(value) => update('inspecao_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem inspecao</SelectItem>{bundle.inspections.map((item) => <SelectItem key={item.id} value={item.id}>{item.titulo}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Nao conformidade relacionada"><Select value={form.nao_conformidade_id || 'none'} onValueChange={(value) => update('nao_conformidade_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem nao conformidade</SelectItem>{bundle.nonconformities.map((item) => <SelectItem key={item.id} value={item.id}>{item.titulo}</SelectItem>)}</SelectContent></Select></Field>
      <Field label="Incidente relacionado"><Select value={form.incidente_id || 'none'} onValueChange={(value) => update('incidente_id', value === 'none' ? '' : value)}><SelectTrigger className="border-[#ccb4a6] bg-[#f7f9fc]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Sem incidente</SelectItem>{bundle.incidents.map((item) => <SelectItem key={item.id} value={item.id}>{item.titulo}</SelectItem>)}</SelectContent></Select></Field>
    </FormSection>}

    {step === 2 && <FormSection title="Comprovantes" icon={Paperclip}>
      <Field label="Nota fiscal / recibo / comprovante"><Input value={form.comprovante_url || ''} onChange={(e) => update('comprovante_url', e.target.value)} placeholder="URL ou referencia do arquivo" className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <Field label="Observacoes" className="md:col-span-2"><Textarea value={form.observacoes || ''} onChange={(e) => update('observacoes', e.target.value)} className="border-[#ccb4a6] bg-[#f7f9fc]" /></Field>
      <div className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">Status do comprovante: {form.comprovante_url ? 'anexado' : 'pendente'}. Estrutura preparada para substituir, baixar e remover arquivo com confirmação.</div>
      <div className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">Campos preparados para orçamento, documento complementar e histórico de anexos.</div>
    </FormSection>}

    {step === 3 && <FormSection title="Revisao" icon={CheckCircle2}>
      <DetailBlock title="Resumo do custo" items={[['Descricao', form.descricao || '-'], ['Valor', formatCurrency(form.valor)], ['Categoria', costCategoryLabels[form.categoria]], ['Tipo', costTypeLabels[form.tipo_custo]], ['Origem', costOriginLabels[form.origem]], ['Setor', form.setor || '-'], ['Fornecedor', form.fornecedor || '-'], ['Vinculos', linkedItems], ['Comprovante', form.comprovante_url ? 'Anexado' : 'Pendente']]} />
    </FormSection>}

    <div className="flex flex-wrap justify-between gap-3 border-t border-[#e0c0b1] pt-5">
      <div className="flex flex-wrap gap-2"><Button type="button" disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar Análise Financeira com IA</Button><Button type="button" disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar Insights de Prevenção com IA</Button></div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={step === 0} onClick={() => setStep((value) => Math.max(0, value - 1))}>Voltar</Button>
        {step < steps.length - 1 ? <Button type="button" onClick={() => setStep((value) => Math.min(steps.length - 1, value + 1))} className="bg-[#415778] text-white hover:bg-[#334766]">Continuar</Button> : <>
          <Button type="button" variant="outline" onClick={() => onSubmit('another')} disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar e registrar outro</Button>
          <Button type="button" variant="outline" onClick={() => onSubmit('details')} disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar e abrir detalhes</Button>
          <Button onClick={() => onSubmit('close')} disabled={isPending} className="bg-[#f46e11] text-white hover:bg-[#e96710]">{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar custo</Button>
        </>}
      </div>
    </div>
  </div>;
}

function FormSection({ title, icon: Icon, children }: { title: string; icon: ElementType; children: React.ReactNode }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white"><div className="flex items-center gap-2 border-b border-[#e0c0b1] bg-[#eef1f5] px-4 py-3"><Icon className="h-5 w-5 text-[#9e4300]" /><h3 className="font-bold text-[#191c1e]">{title}</h3></div><div className="grid gap-4 p-4 md:grid-cols-2">{children}</div></section>;
}

function CostDetails({ item }: { item: CostPrevention }) {
  return <div className="space-y-5"><div className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><h3 className="text-2xl font-bold text-[#191c1e]">{item.descricao}</h3><p className="mt-2 text-[#4f5f7a]">{item.observacoes || 'Sem observacoes registradas.'}</p></div><Badge className={cn('rounded-full px-3 py-1 uppercase', badgeStyle(item.categoria))}>{costCategoryLabels[item.categoria]}</Badge></div></div><div className="grid gap-4 md:grid-cols-3"><DetailBlock title="Financeiro" items={[['Valor', formatCurrency(item.valor)], ['Data', formatDate(item.data_custo)], ['Tipo', costTypeLabels[item.tipo_custo]], ['Origem', costOriginLabels[item.origem]], ['Fornecedor', item.fornecedor || '-'], ['Responsavel', item.responsavel_registro || '-']]} /><DetailBlock title="Escopo" items={[['Setor', item.setor || '-'], ['Colaborador', item.colaborador?.nome_completo || '-'], ['EPI', item.epi?.nome || '-'], ['Treinamento', item.treinamento?.nome || '-'], ['Inspecao', item.inspecao?.titulo || '-'], ['Incidente', item.incidente?.titulo || '-']]} /><DetailBlock title="Comprovantes" items={[['Comprovante', item.comprovante_url || '-'], ['Nao conformidade', item.nao_conformidade?.titulo || '-'], ['Observacoes', item.observacoes || '-']]} /></div><div className="flex flex-wrap gap-3"><Button disabled className="bg-[#f46e11] text-white disabled:opacity-70"><FileText className="mr-2 h-4 w-4" />Gerar Relatorio em PDF</Button><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar analise financeira com IA</Button></div></div>;
}

function DetailBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-white p-4"><h4 className="mb-4 font-bold text-[#191c1e]">{title}</h4><div className="space-y-3">{items.map(([label, value]) => <div key={label}><p className="text-xs font-bold uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p><p className="text-sm text-[#191c1e]">{value}</p></div>)}</div></section>;
}

function SummaryFinancePanel({ costs, insights, prevention, corrective, preventivePercent, correctivePercent }: { costs: CostPrevention[]; insights: string[]; prevention: number; corrective: number; preventivePercent: number; correctivePercent: number }) {
  const total = sumCosts(costs);
  const averageByCollaborator = costs.length ? total / Math.max(1, new Set(costs.map((item) => item.colaborador_id).filter(Boolean)).size || 1) : 0;
  const averageByIncident = total / Math.max(1, new Set(costs.map((item) => item.incidente_id).filter(Boolean)).size || 1);
  const riskSector = groupedTotals(costs, (item) => item.setor || 'Sem setor')[0]?.[0] || '-';
  const impactCategory = groupedTotals(costs, (item) => costCategoryLabels[item.categoria])[0]?.[0] || '-';

  return <div className="space-y-5">
    <InsightsPanel insights={insights} prevention={prevention} corrective={corrective} />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Custo medio por colaborador" value={formatCurrency(averageByCollaborator)} />
      <MetricCard label="Custo medio por incidente" value={formatCurrency(averageByIncident)} />
      <MetricCard label="% custo preventivo" value={`${preventivePercent}%`} />
      <MetricCard label="% custo corretivo" value={`${correctivePercent}%`} />
      <MetricCard label="Setor com maior risco financeiro" value={riskSector} />
      <MetricCard label="Categoria com maior impacto" value={impactCategory} />
      <MetricCard label="Registros no periodo" value={String(costs.length)} />
      <MetricCard label="Total consolidado" value={formatCurrency(total)} />
    </div>
    <DashboardPreparation costs={costs} />
  </div>;
}

function PreventiveAnalysisPanel({ costs }: { costs: CostPrevention[] }) {
  const prevention = preventionCosts(costs);
  const corrective = correctiveCosts(costs);
  const incident = costs.filter((item) => item.categoria === 'incidente' || item.incidente_id);
  const nonconformity = costs.filter((item) => item.nao_conformidade_id);
  const absence = costs.filter((item) => item.categoria === 'afastamento');
  const preventionTotal = sumCosts(prevention);
  const correctiveTotal = sumCosts(corrective);
  const difference = preventionTotal - correctiveTotal;
  const total = sumCosts(costs);
  const losingMoney = [
    ...groupedTotals(costs, (item) => costCategoryLabels[item.categoria]).slice(0, 2).map(([label, value]) => `${label} - ${formatCurrency(value)}`),
    ...groupedTotals(costs, (item) => item.setor || 'Sem setor').slice(0, 2).map(([label, value]) => `${label} - ${formatCurrency(value)}`),
    ...groupedTotals(costs, (item) => item.fornecedor || 'Sem fornecedor').slice(0, 2).map(([label, value]) => `${label} - ${formatCurrency(value)}`),
  ].slice(0, 5);
  const opportunities = buildPreventionOpportunities(costs);

  return <div className="space-y-5">
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Total investido em prevencao" value={formatCurrency(preventionTotal)} />
      <MetricCard label="Total gasto com correcao" value={formatCurrency(correctiveTotal)} />
      <MetricCard label="Total gasto com incidentes" value={formatCurrency(sumCosts(incident))} />
      <MetricCard label="Total gasto com nao conformidades" value={formatCurrency(sumCosts(nonconformity))} />
      <MetricCard label="Total gasto com afastamentos" value={formatCurrency(sumCosts(absence))} />
      <MetricCard label="Diferenca prevencao x correcao" value={formatCurrency(difference)} />
      <MetricCard label="% preventivo" value={`${total ? Math.round((preventionTotal / total) * 100) : 0}%`} />
      <MetricCard label="% corretivo" value={`${total ? Math.round((correctiveTotal / total) * 100) : 0}%`} />
    </div>
    <div className="grid gap-4 xl:grid-cols-2">
      <ActionInsightList title="Onde sua empresa esta perdendo dinheiro?" items={losingMoney} empty="Sem custos suficientes para apontar perdas." />
      <ChartBlock title="Oportunidades de prevencao" items={opportunities} empty="Sem oportunidades identificadas no periodo." />
    </div>
    <DashboardPreparation costs={costs} />
  </div>;
}

function OriginCostsPanel({ costs, onFilterOrigin }: { costs: CostPrevention[]; onFilterOrigin: (origin: CostPreventionOrigin) => void }) {
  const origins = Object.entries(costOriginLabels).map(([origin, label]) => {
    const items = costs.filter((item) => item.origem === origin);
    const topSector = groupedTotals(items, (item) => item.setor || 'Sem setor')[0]?.[0] || '-';
    const highest = items.slice().sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];
    return { origin: origin as CostPreventionOrigin, label, items, topSector, highest };
  });

  return <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
    {origins.map((item) => <section key={item.origin} className="rounded-xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-bold text-[#191c1e]">{item.label}</h3><Badge className="rounded-full bg-[#eef1f5] text-[#4f5f7a]">{item.items.length} lancamentos</Badge></div>
      <div className="space-y-3 text-sm text-[#4f5f7a]"><p>Valor total: <span className="font-bold text-[#191c1e]">{formatCurrency(sumCosts(item.items))}</span></p><p>Maior custo: <span className="font-bold text-[#191c1e]">{item.highest ? formatCurrency(item.highest.valor) : '-'}</span></p><p>Setor mais impactado: <span className="font-bold text-[#191c1e]">{item.topSector}</span></p></div>
      <Button variant="outline" onClick={() => onFilterOrigin(item.origin)} className="mt-4 w-full">Ver lancamentos relacionados</Button>
    </section>)}
  </div>;
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-4 shadow-sm"><p className="text-sm font-medium text-[#4f5f7a]">{label}</p><p className="mt-2 text-xl font-bold text-[#191c1e]">{value}</p></div>;
}

function AlertsPanel({ costs, incidents, nonconformities }: { costs: CostPrevention[]; incidents: Incident[]; nonconformities: Nonconformity[] }) {
  const alerts = useMemo(() => {
    const output: string[] = [];
    incidents.filter((item) => !costs.some((cost) => cost.incidente_id === item.id)).slice(0, 2).forEach((item) => output.push(`Incidente sem custo registrado: ${item.titulo}.`));
    nonconformities.filter((item) => item.gravidade === 'critica' && !costs.some((cost) => cost.nao_conformidade_id === item.id)).slice(0, 2).forEach((item) => output.push(`Nao conformidade critica sem custo de correcao: ${item.titulo}.`));
    const highSector = Object.entries(costs.reduce<Record<string, number>>((acc, item) => {
      const key = item.setor || 'Sem setor';
      acc[key] = (acc[key] || 0) + Number(item.valor || 0);
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])[0];
    if (highSector && highSector[1] > 0) output.push(`Custo alto concentrado no setor ${highSector[0]}: ${formatCurrency(highSector[1])}.`);
    if (sumCosts(correctiveCosts(costs)) > sumCosts(preventionCosts(costs))) output.push('A maior parte dos custos vem de correcoes/incidentes, nao de prevencao.');
    costs.filter((item) => !item.comprovante_url && Number(item.valor || 0) >= 1000).slice(0, 2).forEach((item) => output.push(`Registro sem comprovante relevante: ${item.descricao}.`));
    return output.slice(0, 6);
  }, [costs, incidents, nonconformities]);
  if (!alerts.length) return null;
  return <div className="rounded-xl border border-[#ffe5d6] bg-[#fff8f1] p-4"><div className="mb-3 flex items-center gap-2 font-bold text-[#8a4b00]"><AlertTriangle className="h-5 w-5" />Alertas importantes</div><div className="grid gap-2 md:grid-cols-2">{alerts.map((alert) => <p key={alert} className="rounded-lg bg-white p-3 text-sm text-[#521f00]">{alert}</p>)}</div></div>;
}

function InsightsPanel({ insights, prevention, corrective }: { insights: string[]; prevention: number; corrective: number }) {
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex items-center gap-2"><HandCoins className="h-5 w-5 text-[#9e4300]" /><h3 className="text-lg font-bold text-[#191c1e]">Economia Preventiva Estimada</h3></div><p className="text-sm leading-7 text-[#4f5f7a]">Neste periodo, a empresa investiu {formatCurrency(prevention)} em prevencao e registrou {formatCurrency(corrective)} em custos corretivos/incidentes.</p><div className="mt-4 grid gap-3 md:grid-cols-2">{insights.map((insight) => <p key={insight} className="rounded-lg border border-[#e0c0b1] bg-[#f7f9fc] p-3 text-sm text-[#191c1e]">{insight}</p>)}</div></div>;
}

function DashboardPreparation({ costs }: { costs: CostPrevention[] }) {
  const topCategories = groupedTotals(costs, (item) => costCategoryLabels[item.categoria]).slice(0, 5);
  const topSectors = groupedTotals(costs, (item) => item.setor || 'Sem setor').slice(0, 5);
  const topOrigins = groupedTotals(costs, (item) => costOriginLabels[item.origem]).slice(0, 5);
  const topSuppliers = groupedTotals(costs, (item) => item.fornecedor || 'Sem fornecedor').slice(0, 5);
  const monthlyCosts = groupedTotals(costs, (item) => monthKey(item.data_custo) || 'Sem data').slice(0, 6);

  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex items-center gap-2"><BarChart3 className="h-5 w-5 text-[#9e4300]" /><h3 className="text-lg font-bold text-[#191c1e]">Dashboard financeiro de seguranca</h3></div><div className="grid gap-4 xl:grid-cols-2"><FinancialBarList title="Top 5 categorias com maior custo" items={topCategories} /><FinancialBarList title="Top 5 setores com maior custo" items={topSectors} /><FinancialBarList title="Custos por origem" items={topOrigins} /><FinancialBarList title="Top 5 fornecedores com maior custo" items={topSuppliers} /><FinancialBarList title="Custos por mes" items={monthlyCosts} className="xl:col-span-2" /></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
    ['Custos por mes', `${new Set(costs.map((item) => monthKey(item.data_custo))).size} meses com registros`],
    ['Prevencao x correcao', `${formatCurrency(sumCosts(preventionCosts(costs)))} x ${formatCurrency(sumCosts(correctiveCosts(costs)))}`],
    ['Evolucao EPIs', `${formatCurrency(sumCosts(costs.filter((item) => item.categoria === 'EPI')))} acumulados`],
    ['Evolucao treinamentos', `${formatCurrency(sumCosts(costs.filter((item) => item.categoria === 'treinamento')))} acumulados`],
  ].map(([title, value]) => <div key={title} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4"><p className="text-sm font-bold text-[#191c1e]">{title}</p><p className="mt-1 text-sm text-[#4f5f7a]">{value}</p></div>)}</div></div>;
}

function ChartBlock({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4"><h4 className="mb-3 font-bold text-[#191c1e]">{title}</h4>{items.length ? <div className="space-y-2">{items.map((item) => <p key={item} className="rounded-lg bg-white p-3 text-sm text-[#191c1e]">{item}</p>)}</div> : <p className="text-sm text-[#4f5f7a]">{empty}</p>}</section>;
}

function ActionInsightList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <section className="rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4"><h4 className="mb-3 font-bold text-[#191c1e]">{title}</h4>{items.length ? <div className="space-y-2">{items.map((item, index) => <div key={item} className="rounded-lg bg-white p-3 text-sm text-[#191c1e]"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p><span className="font-bold">{index + 1}.</span> {item}</p><div className="flex shrink-0 gap-2"><Button size="sm" variant="outline">Ver detalhes</Button><Button size="sm" variant="outline">Ver lançamentos relacionados</Button></div></div></div>)}</div> : <p className="text-sm text-[#4f5f7a]">{empty}</p>}</section>;
}

function FinancialBarList({ title, items, className }: { title: string; items: Array<[string, number]>; className?: string }) {
  const max = Math.max(...items.map(([, value]) => value), 1);
  return <section className={cn('rounded-xl border border-[#e0c0b1] bg-[#f7f9fc] p-4', className)}><h4 className="mb-3 font-bold text-[#191c1e]">{title}</h4>{items.length ? <div className="space-y-3">{items.map(([label, value]) => <div key={label} className="rounded-lg bg-white p-3"><div className="mb-2 flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-[#191c1e]">{label}</span><span className="shrink-0 font-bold text-[#415778]">{formatCurrency(value)}</span></div><div className="h-2 overflow-hidden rounded-full bg-[#eef1f5]"><div className="h-full rounded-full bg-[#f46e11]" style={{ width: `${Math.max(6, (value / max) * 100)}%` }} /></div></div>)}</div> : <p className="text-sm text-[#4f5f7a]">Sem custos registrados.</p>}</section>;
}

function AiPreparationPanel() {
  return <div className="rounded-xl border border-[#dfe7f5] bg-[#f7f9fc] p-5"><div className="mb-4 flex items-center gap-2"><Sparkles className="h-5 w-5 text-[#415778]" /><h3 className="text-lg font-bold text-[#191c1e]">Análises com IA</h3></div><p className="text-sm leading-7 text-[#4f5f7a]">Estrutura preparada para gerar resumo financeiro do período, principais fontes de custo, setores com maior risco financeiro, comparativo prevenção x correção e sugestões para reduzir gastos.</p><div className="mt-4 flex flex-wrap gap-2"><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar Análise Financeira com IA</Button><Button disabled variant="outline"><Sparkles className="mr-2 h-4 w-4" />Gerar Insights de Prevenção com IA</Button></div></div>;
}

function ReportsPreparation({ onExport }: { onExport: () => void }) {
  const reports = ['Custos por periodo', 'Custos por categoria', 'Custos por setor', 'Custos por colaborador', 'Custos por origem', 'Custos com EPIs', 'Custos com treinamentos', 'Custos com incidentes', 'Custos com nao conformidades', 'Prevencao x correcao', 'Economia preventiva', 'Custos com afastamentos', 'Custos por fornecedor'];
  return <div className="rounded-xl border border-[#e0c0b1] bg-white p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-4"><div><h3 className="text-lg font-bold text-[#191c1e]">Relatorios do modulo</h3><p className="text-sm text-[#4f5f7a]">Area preparada para exportacao e consolidacao financeira em PDF, CSV e impressao.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline"><FileText className="mr-2 h-4 w-4" />Gerar relatório</Button><Button onClick={onExport} variant="outline"><Download className="mr-2 h-4 w-4" />Exportar CSV</Button><Button disabled variant="outline"><FileText className="mr-2 h-4 w-4" />Baixar PDF</Button><Button disabled variant="outline">Imprimir</Button></div></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{reports.map((report) => <div key={report} className="rounded-lg border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm font-semibold text-[#191c1e]"><p>{report}</p><p className="mt-2 text-xs font-normal text-[#4f5f7a]">Filtros: periodo, setor, colaborador, categoria, tipo, origem e fornecedor.</p></div>)}</div></div>;
}

function buildInsights(costs: CostPrevention[]) {
  if (!costs.length) return ['Ainda nao ha custos registrados para gerar insights automaticos.'];
  const sectorTotals = Object.entries(costs.reduce<Record<string, number>>((acc, item) => {
    const key = item.setor || 'Sem setor';
    acc[key] = (acc[key] || 0) + Number(item.valor || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const categoryTotals = Object.entries(costs.reduce<Record<string, number>>((acc, item) => {
    acc[item.categoria] = (acc[item.categoria] || 0) + Number(item.valor || 0);
    return acc;
  }, {})).sort((a, b) => b[1] - a[1]);

  const currentMonth = monthKey(today);
  const previousMonthDate = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1);
  const previousMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const currentIncident = sumCosts(costs.filter((item) => item.categoria === 'incidente' && monthKey(item.data_custo) === currentMonth));
  const previousIncident = sumCosts(costs.filter((item) => item.categoria === 'incidente' && monthKey(item.data_custo) === previousMonth));
  const currentPrevention = sumCosts(preventionCosts(costs).filter((item) => monthKey(item.data_custo) === currentMonth));

  return [
    `O setor com maior custo no periodo foi ${sectorTotals[0]?.[0] || 'Sem setor'} (${formatCurrency(sectorTotals[0]?.[1] || 0)}).`,
    `A categoria com maior gasto foi ${costCategoryLabels[(categoryTotals[0]?.[0] || 'outros') as CostPreventionCategory] || categoryTotals[0]?.[0] || 'Outros'}.`,
    currentIncident > previousIncident ? 'Os custos com incidentes aumentaram em relacao ao periodo anterior.' : 'Os custos com incidentes nao aumentaram em relacao ao periodo anterior.',
    currentPrevention === 0 ? 'Nao houve investimento preventivo registrado neste mes.' : `Os custos preventivos registrados neste mes somam ${formatCurrency(currentPrevention)}.`,
  ];
}

function buildPreventionOpportunities(costs: CostPrevention[]) {
  if (!costs.length) return ['Registre custos para identificar oportunidades preventivas.'];
  const output: string[] = [];
  const correctiveTotal = sumCosts(correctiveCosts(costs));
  const preventionTotal = sumCosts(preventionCosts(costs));
  const incidentTotal = sumCosts(costs.filter((item) => item.categoria === 'incidente' || item.incidente_id));
  const topSector = groupedTotals(correctiveCosts(costs), (item) => item.setor || 'Sem setor')[0];
  const maintenanceCorrective = sumCosts(costs.filter((item) => item.categoria === 'manutencao_corretiva'));
  const maintenancePreventive = sumCosts(costs.filter((item) => item.categoria === 'manutencao_preventiva'));

  if (topSector) output.push(`O setor ${topSector[0]} possui alto custo corretivo. Recomenda-se intensificar inspecoes preventivas.`);
  if (incidentTotal > 0) output.push('Os custos com incidentes exigem revisao de treinamentos, EPIs e rotinas dos setores envolvidos.');
  if (correctiveTotal > preventionTotal) output.push('Os custos corretivos superam os preventivos. Pode haver economia com acoes antecipadas.');
  if (maintenanceCorrective > maintenancePreventive) output.push('A manutencao corretiva esta acima da preventiva. Avalie plano recorrente de manutencao e sinalizacao.');
  if (costs.some((item) => item.nao_conformidade_id && Number(item.valor || 0) === 0)) output.push('Existem nao conformidades sem custo de correcao registrado, o que reduz a precisao da analise financeira.');

  return output.slice(0, 5);
}
