'use client';

import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BarChart3,
  Brain,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coins,
  Download,
  FileText,
  Flame,
  GraduationCap,
  HardHat,
  PackageCheck,
  ShieldAlert,
  Siren,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Triangle,
  Users,
  Wallet,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { costCategoryLabels, formatCurrency, preventionCosts, correctiveCosts, sumCosts } from '@/lib/cost-prevention';
import { getModuleColor, moduleBadgeStyle, moduleColorForChartModule, moduleColorForLabel, moduleColorForSection } from '@/lib/module-colors';
import { calculateExtinguisherStatus, createSeedExtinguisherStore, extinguisherStorageKey, type FireExtinguisherDataStore } from '@/lib/fire-extinguishers';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type {
  Collaborator,
  CollaboratorTraining,
  CostPrevention,
  EpiByFunction,
  EpiDelivery,
  Incident,
  Inspection,
  Nonconformity,
  TrainingByFunction,
} from '@/lib/types';
import { cn } from '@/lib/utils';
import { navigateCompanySection } from '@/lib/client-navigation';
import { getCollaborators } from '@/server/collaborator-actions';
import { getCostPreventionModuleData } from '@/server/cost-prevention-actions';
import { getEpiModuleData } from '@/server/epi-actions';
import { getIncidentModuleData } from '@/server/incident-actions';
import { getInspectionModuleData } from '@/server/inspection-actions';
import { getNonconformityModuleData } from '@/server/nonconformity-actions';
import { getTrainingModuleData } from '@/server/training-actions';

type DashboardSection =
  | 'dashboardGeneral'
  | 'collaborators'
  | 'epiDeliveries'
  | 'trainings'
  | 'inspections'
  | 'fireExtinguishers'
  | 'incidents'
  | 'costsPrevention'
  | 'nonconformities';

type SeverityFilter = 'todas' | 'baixa' | 'media' | 'alta' | 'critica' | 'critico';

type DashboardData = {
  collaborators: Collaborator[];
  epi: {
    deliveries: EpiDelivery[];
    mappings: EpiByFunction[];
  };
  training: {
    records: CollaboratorTraining[];
    mappings: TrainingByFunction[];
  };
  inspections: Inspection[];
  nonconformities: Nonconformity[];
  incidents: Incident[];
  costs: CostPrevention[];
};

type AlertItem = {
  id: string;
  title: string;
  description: string;
  module: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  date?: string;
  section: DashboardSection;
  filterKey?: string;
  filterValue?: string;
};

type PendingItem = {
  id: string;
  type: string;
  module: string;
  description: string;
  collaborator?: string;
  sector?: string;
  responsible?: string;
  dueDate?: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  status: string;
  section: DashboardSection;
};

type PriorityItem = {
  id: string;
  priority: 'critica' | 'alta' | 'media' | 'baixa';
  description: string;
  reason: string;
  module: string;
  section: DashboardSection;
  related?: string;
  responsible?: string;
  dueDate?: string;
};

type ReportItem = {
  id: string;
  name: string;
  module: string;
  description: string;
  section: DashboardSection;
};

type DashboardCardConfig = {
  title: string;
  value: string | number;
  helper?: string;
  icon: typeof BarChart3;
  tone?: 'default' | 'danger' | 'warning' | 'success';
  section: DashboardSection;
  filters?: Record<string, string>;
};

interface SafetyDashboardGeneralProps {
  companyId: string;
  companyName?: string;
}

type DashboardTab = 'overview' | 'alerts' | 'pendings' | 'week' | 'reports' | 'charts' | 'executive' | 'exports';
type VisualChartKind = 'line' | 'bar' | 'donut' | 'ranking' | 'comparison';
type VisualChartModule = 'resumo' | 'colaboradores' | 'epis' | 'treinamentos' | 'inspecoes' | 'naoConformidades' | 'incidentes' | 'custos';
type VisualChartDefinition = {
  id: string;
  title: string;
  description: string;
  module: VisualChartModule;
  kind: VisualChartKind;
  data: Array<{ label: string; value: number }>;
  insight: string;
  formatter?: (value: number) => string;
  target?: { section: DashboardSection; filters?: Record<string, string> };
};

const defaultEpiRules: Record<string, string[]> = {
  eletricista: ['capecete com jugular', 'luva isolante', 'botina de seguranca', 'oculos de protecao', 'vestimenta antichama', 'protetor facial', 'cinto de seguranca'],
  pedreiro: ['capacete de seguranca', 'botina de seguranca', 'luva de protecao', 'oculos de protecao', 'protetor auricular', 'mascara respiratoria'],
  operador: ['botina de seguranca', 'oculos de protecao', 'protetor auricular', 'luva de protecao', 'capacete de seguranca'],
};

const defaultTrainingRules: Record<string, string[]> = {
  eletricista: ['NR10 - seguranca em instalacoes e servicos em eletricidade', 'NR10 SEP', 'NR35 - trabalho em altura', 'integracao de seguranca', 'uso correto de EPIs'],
  empilhadeira: ['NR11 - movimentacao de materiais', 'operacao de empilhadeira', 'direcao defensiva', 'integracao de seguranca', 'uso correto de EPIs'],
  operador: ['NR11 - movimentacao de materiais', 'NR12 - maquinas e equipamentos', 'integracao de seguranca', 'uso correto de EPIs'],
  pedreiro: ['NR18 - industria da construcao', 'NR35 - trabalho em altura', 'integracao de seguranca', 'uso correto de EPIs'],
  soldador: ['trabalho a quente', 'uso correto de EPIs', 'combate a incendio', 'integracao de seguranca', 'NR35 - trabalho em altura'],
};

const reportItems: ReportItem[] = [
  { id: 'col-geral', name: 'Relatorio geral de colaboradores', module: 'Colaboradores', description: 'Panorama geral de status e pendencias.', section: 'collaborators' },
  { id: 'col-ativos', name: 'Relatorio de colaboradores ativos', module: 'Colaboradores', description: 'Colaboradores ativos por setor, funcao e empresa.', section: 'collaborators' },
  { id: 'col-afastados', name: 'Relatorio de colaboradores afastados', module: 'Colaboradores', description: 'Afastamentos e situacao atual dos colaboradores.', section: 'collaborators' },
  { id: 'col-pendencias', name: 'Relatorio de colaboradores com pendencias', module: 'Colaboradores', description: 'Pendencias de EPI, treinamento e aptidao.', section: 'collaborators' },
  { id: 'col-nao-aptos', name: 'Relatorio de colaboradores nao aptos', module: 'Colaboradores', description: 'Colaboradores nao aptos por pendencias de seguranca.', section: 'collaborators' },
  { id: 'epi-entregues', name: 'Relatorio de EPIs entregues', module: 'Entregas de EPI', description: 'Historico de entregas realizadas.', section: 'epiDeliveries' },
  { id: 'epi-pendentes', name: 'Relatorio de EPIs pendentes', module: 'Entregas de EPI', description: 'EPIs obrigatorios ainda nao entregues.', section: 'epiDeliveries' },
  { id: 'epi-vencidos', name: 'Relatorio de EPIs vencidos', module: 'Entregas de EPI', description: 'EPIs vencidos e com necessidade de substituicao.', section: 'epiDeliveries' },
  { id: 'epi-troca', name: 'Relatorio de EPIs proximos da troca', module: 'Entregas de EPI', description: 'EPIs com troca prevista para os proximos ciclos.', section: 'epiDeliveries' },
  { id: 'epi-historico', name: 'Historico de EPIs por colaborador', module: 'Entregas de EPI', description: 'Entregas consolidadas por colaborador.', section: 'epiDeliveries' },
  { id: 'epi-termo', name: 'Termo de entrega de EPI', module: 'Entregas de EPI', description: 'Documento de entrega individual de EPI.', section: 'epiDeliveries' },
  { id: 'tre-realizados', name: 'Relatorio de treinamentos realizados', module: 'Treinamentos', description: 'Treinamentos concluidos e validos.', section: 'trainings' },
  { id: 'tre-pendentes', name: 'Relatorio de treinamentos pendentes', module: 'Treinamentos', description: 'Capacitacoes obrigatorias em aberto.', section: 'trainings' },
  { id: 'tre-vencidos', name: 'Relatorio de treinamentos vencidos', module: 'Treinamentos', description: 'Treinamentos vencidos e colaboradores impactados.', section: 'trainings' },
  { id: 'tre-proximos', name: 'Relatorio de treinamentos proximos do vencimento', module: 'Treinamentos', description: 'Reciclagens proximas do prazo.', section: 'trainings' },
  { id: 'tre-aptos', name: 'Relatorio de colaboradores aptos', module: 'Treinamentos', description: 'Colaboradores sem pendencias de treinamento.', section: 'trainings' },
  { id: 'tre-nao-aptos', name: 'Relatorio de colaboradores nao aptos', module: 'Treinamentos', description: 'Nao aptidao causada por treinamento vencido ou pendente.', section: 'trainings' },
  { id: 'tre-historico', name: 'Historico de treinamentos por colaborador', module: 'Treinamentos', description: 'Trilha de capacitacao por colaborador.', section: 'trainings' },
  { id: 'ins-realizadas', name: 'Relatorio de inspecoes realizadas', module: 'Inspecoes', description: 'Inspecoes por periodo, setor e responsavel.', section: 'inspections' },
  { id: 'ins-abertas', name: 'Relatorio de inspecoes abertas', module: 'Inspecoes', description: 'Inspecoes em aberto e em andamento.', section: 'inspections' },
  { id: 'ins-atrasadas', name: 'Relatorio de inspecoes atrasadas', module: 'Inspecoes', description: 'Inspecoes atrasadas e planos de acao.', section: 'inspections' },
  { id: 'ins-itens', name: 'Relatorio de itens nao conformes', module: 'Inspecoes', description: 'Itens nao conformes encontrados em campo.', section: 'inspections' },
  { id: 'ins-plano', name: 'Relatorio de plano de acao', module: 'Inspecoes', description: 'Acoes corretivas por prazo e responsavel.', section: 'inspections' },
  { id: 'ins-individual', name: 'Relatorio individual de inspecao', module: 'Inspecoes', description: 'Registro detalhado de uma inspecao.', section: 'inspections' },
  { id: 'nc-abertas', name: 'Relatorio de nao conformidades abertas', module: 'Nao Conformidades', description: 'Nao conformidades abertas e em analise.', section: 'nonconformities' },
  { id: 'nc-atrasadas', name: 'Relatorio de nao conformidades atrasadas', module: 'Nao Conformidades', description: 'Prazos vencidos e responsaveis.', section: 'nonconformities' },
  { id: 'nc-criticas', name: 'Relatorio de nao conformidades criticas', module: 'Nao Conformidades', description: 'Itens criticos abertos, atrasados e em correcao.', section: 'nonconformities' },
  { id: 'nc-resolvidas', name: 'Relatorio de nao conformidades resolvidas', module: 'Nao Conformidades', description: 'Correcoes concluidas e evidencias.', section: 'nonconformities' },
  { id: 'nc-setor', name: 'Relatorio por setor', module: 'Nao Conformidades', description: 'Distribuicao de nao conformidades por setor.', section: 'nonconformities' },
  { id: 'nc-responsavel', name: 'Relatorio por responsavel', module: 'Nao Conformidades', description: 'Tratativas por responsavel de correcao.', section: 'nonconformities' },
  { id: 'nc-tempo', name: 'Relatorio de tempo medio de resolucao', module: 'Nao Conformidades', description: 'Tempo medio entre identificacao e conclusao.', section: 'nonconformities' },
  { id: 'inc-periodo', name: 'Relatorio de incidentes por periodo', module: 'Incidentes', description: 'Ocorrencias, causas e acoes preventivas.', section: 'incidents' },
  { id: 'inc-quase', name: 'Relatorio de quase acidentes', module: 'Incidentes', description: 'Quase acidentes por setor e causa.', section: 'incidents' },
  { id: 'inc-lesao', name: 'Relatorio de acidentes com lesao', module: 'Incidentes', description: 'Acidentes com lesao e partes atingidas.', section: 'incidents' },
  { id: 'inc-afastamento', name: 'Relatorio de acidentes com afastamento', module: 'Incidentes', description: 'Afastamentos, dias perdidos e investigacao.', section: 'incidents' },
  { id: 'inc-causas', name: 'Relatorio de causas mais frequentes', module: 'Incidentes', description: 'Padroes de causa imediata e raiz.', section: 'incidents' },
  { id: 'inc-acoes', name: 'Relatorio de acoes preventivas', module: 'Incidentes', description: 'Acoes preventivas abertas, atrasadas e concluidas.', section: 'incidents' },
  { id: 'inc-individual', name: 'Relatorio individual de investigacao', module: 'Incidentes', description: 'Documento detalhado da investigacao.', section: 'incidents' },
  { id: 'cus-periodo', name: 'Relatorio de custos por periodo', module: 'Custos & Prevencao', description: 'Custos consolidados no periodo filtrado.', section: 'costsPrevention' },
  { id: 'cus-categoria', name: 'Relatorio de custos por categoria', module: 'Custos & Prevencao', description: 'Prevencao, correcao, incidentes e demais categorias.', section: 'costsPrevention' },
  { id: 'cus-setor', name: 'Relatorio de custos por setor', module: 'Custos & Prevencao', description: 'Distribuicao financeira por setor.', section: 'costsPrevention' },
  { id: 'cus-prev-cor', name: 'Relatorio prevencao x correcao', module: 'Custos & Prevencao', description: 'Comparativo entre investimento preventivo e gasto corretivo.', section: 'costsPrevention' },
  { id: 'cus-incidentes', name: 'Relatorio de custos com incidentes', module: 'Custos & Prevencao', description: 'Impacto financeiro de incidentes registrados.', section: 'costsPrevention' },
  { id: 'cus-economia', name: 'Relatorio de economia preventiva', module: 'Custos & Prevencao', description: 'Estimativa de economia gerada por prevencao.', section: 'costsPrevention' },
  { id: 'exec', name: 'Relatorio Executivo de Seguranca', module: 'Dashboard Geral', description: 'Resumo consolidado para gestao, diretoria ou cliente.', section: 'dashboardGeneral' },
];

function normalize(value?: string) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatDate(value?: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function isWithinPeriod(date?: string, period = '90_dias') {
  if (!date || period === 'todos' || period === 'personalizado') return true;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return true;
  const now = new Date();
  now.setHours(23, 59, 59, 999);

  const start = new Date(now);
  if (period === 'hoje') start.setHours(0, 0, 0, 0);
  if (period === 'semana') start.setDate(start.getDate() - 7);
  if (period === 'mes') start.setDate(1);
  if (period === '30_dias') start.setDate(start.getDate() - 30);
  if (period === '90_dias') start.setDate(start.getDate() - 90);
  if (period === '180_dias') start.setDate(start.getDate() - 180);
  if (period === 'ano') {
    start.setMonth(0);
    start.setDate(1);
  }

  start.setHours(0, 0, 0, 0);
  return parsed >= start && parsed <= now;
}

function getAsoStatus(collaborator: Collaborator) {
  const days = daysUntil(collaborator.aso_validade);
  if (!collaborator.aso_validade || days === null) return 'missing';
  if (days < 0) return 'expired';
  if (days <= 30) return 'near';
  return 'valid';
}

function monthLabel(value?: string) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function daysUntil(date?: string) {
  if (!date) return null;
  const due = new Date(date);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.ceil((due.getTime() - today.getTime()) / 86400000);
}

function csvEscape(value: unknown) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (!rows.length) return false;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}

function severityBadge(severity: 'baixa' | 'media' | 'alta' | 'critica') {
  if (severity === 'critica') return 'bg-[#ffdad6] text-[#93000a]';
  if (severity === 'alta') return 'bg-[#ffe4cc] text-[#9e4300]';
  if (severity === 'media') return 'bg-[#fff1c2] text-[#7a5b00]';
  return 'bg-[#dff7e5] text-[#18703a]';
}

function statusBadge(status?: string) {
  const normalized = normalize(status);
  if (normalized.includes('crit')) return 'bg-[#ffdad6] text-[#93000a]';
  if (normalized.includes('atras') || normalized.includes('venc')) return 'bg-[#ffe4cc] text-[#9e4300]';
  if (normalized.includes('pend') || normalized.includes('invest')) return 'bg-[#fff1c2] text-[#7a5b00]';
  if (normalized.includes('concl') || normalized.includes('resolv') || normalized.includes('valid')) return 'bg-[#dff7e5] text-[#18703a]';
  return 'bg-[#eef1f5] text-[#4f5f7a]';
}

function severityWeight(severity: 'baixa' | 'media' | 'alta' | 'critica') {
  return { baixa: 1, media: 2, alta: 3, critica: 4 }[severity];
}

function toChartItems(grouped: Record<string, number>, limit?: number) {
  const items = Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
  return typeof limit === 'number' ? items.slice(0, limit) : items;
}

function variationInsight(title: string, data: Array<{ label: string; value: number }>, unit = 'registros') {
  if (data.length < 2) return `Ainda nao ha comparativo suficiente para ${title.toLowerCase()}.`;
  const previous = data[data.length - 2]?.value || 0;
  const current = data[data.length - 1]?.value || 0;
  if (previous === 0 && current > 0) return `${title} passou a registrar ${current} ${unit} no ultimo periodo.`;
  if (previous === 0) return `${title} permaneceu sem registros no ultimo periodo.`;
  const percent = Math.round(((current - previous) / previous) * 100);
  if (percent > 0) return `${title} aumentou ${percent}% em relacao ao periodo anterior.`;
  if (percent < 0) return `${title} reduziu ${Math.abs(percent)}% em relacao ao periodo anterior.`;
  return `${title} permaneceu estavel em relacao ao periodo anterior.`;
}

function getRequiredNames(
  collaborator: Collaborator,
  mappings: Array<{ funcao: string; obrigatorio: boolean; epi_id?: string; treinamento_id?: string }>,
  aiItems: string[] | undefined,
  defaults: Record<string, string[]>,
) {
  const funcao = normalize(collaborator.funcao);
  const explicit = mappings
    .filter((item) => normalize(item.funcao) === funcao && item.obrigatorio)
    .map((item) => item.epi_id || item.treinamento_id || '')
    .filter(Boolean);

  const fallback = Object.entries(defaults)
    .filter(([key]) => funcao.includes(key))
    .flatMap(([, names]) => names)
    .map((item) => normalize(item));

  const ai = (aiItems || []).map((item) => normalize(item));

  return unique([...explicit, ...fallback, ...ai]);
}

function matchesRequiredByName(name: string, requiredName: string) {
  const normalizedName = normalize(name);
  return normalizedName === requiredName || normalizedName.includes(requiredName) || requiredName.includes(normalizedName);
}

function DashboardCard({
  title,
  value,
  helper,
  icon: Icon,
  tone = 'default',
  onClick,
  module,
}: {
  title: string;
  value: string | number;
  helper?: string;
  icon: typeof BarChart3;
  tone?: 'default' | 'danger' | 'warning' | 'success';
  onClick?: () => void;
  module?: string;
}) {
  const moduleColor = getModuleColor(module);
  const tones = {
    default: 'bg-white',
    danger: 'border-[#f1b2b2] bg-[#fff8f7]',
    warning: 'border-[#f3d6ab] bg-[#fffaf2]',
    success: 'border-[#b7e2c2] bg-[#f7fff8]',
  } as const;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex min-h-[128px] w-full flex-col justify-between rounded-2xl border border-l-4 p-5 text-left shadow-sm transition-transform hover:-translate-y-0.5',
        tones[tone],
        !onClick && 'cursor-default hover:translate-y-0',
      )}
      style={{
        borderTopColor: tone === 'default' ? moduleColor.border : undefined,
        borderRightColor: tone === 'default' ? moduleColor.border : undefined,
        borderBottomColor: tone === 'default' ? moduleColor.border : undefined,
        borderLeftColor: moduleColor.primary,
        backgroundColor: tone === 'default' ? moduleColor.soft : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-[#4f5f7a]">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-[#191c1e]">{value}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: moduleColor.soft, color: moduleColor.icon }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {helper ? <p className="mt-4 text-sm text-[#4f5f7a]">{helper}</p> : null}
    </button>
  );
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[#eceef1] bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-[#4f5f7a]">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[#191c1e]">{value}</p>
    </div>
  );
}

function BarList({
  title,
  items,
  formatter,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  formatter?: (value: number) => string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  const moduleColor = getModuleColor(moduleColorForLabel(title));

  return (
    <div className="rounded-2xl border border-l-4 bg-white p-5 shadow-sm" style={{ borderTopColor: moduleColor.border, borderRightColor: moduleColor.border, borderBottomColor: moduleColor.border, borderLeftColor: moduleColor.primary }}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[#191c1e]">{title}</h3>
        <BarChart3 className="h-4 w-4" style={{ color: moduleColor.icon }} />
      </div>
      <div className="space-y-4">
        {items.length === 0 ? (
          <p className="text-sm text-[#4f5f7a]">Sem dados para o filtro atual.</p>
        ) : (
          items.map((item) => (
            <div key={item.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-[#191c1e]">{item.label}</span>
                <span className="font-medium text-[#4f5f7a]">{formatter ? formatter(item.value) : item.value}</span>
              </div>
              <div className="h-2 rounded-full bg-[#eef1f5]">
                <div
                  className="h-2 rounded-full"
                  style={{ backgroundColor: moduleColor.chart, width: `${Math.max((item.value / max) * 100, item.value > 0 ? 8 : 0)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ChartSkeletonGrid() {
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="h-5 w-48 animate-pulse rounded bg-[#eef1f5]" />
          <div className="mt-5 space-y-4">
            {Array.from({ length: 4 }).map((__, row) => (
              <div key={row} className="space-y-2">
                <div className="h-4 w-2/3 animate-pulse rounded bg-[#eef1f5]" />
                <div className="h-2 w-full animate-pulse rounded bg-[#eef1f5]" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DeferredRender({ children, fallback }: { children: React.ReactNode; fallback: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  return ready ? <>{children}</> : <>{fallback}</>;
}

function VisualChartCanvas({ chart }: { chart: VisualChartDefinition }) {
  const data = chart.data.map((item) => ({ ...item, label: item.label.length > 18 ? `${item.label.slice(0, 18)}...` : item.label }));
  const moduleColor = getModuleColor(moduleColorForChartModule(chart.module));
  const colorForItem = (label: string, index: number) => {
    const byLabel = getModuleColor(moduleColorForLabel(label)).chart;
    return byLabel || [moduleColor.chart, '#64748b', '#0f766e', '#7c3aed', '#c2410c', '#dc2626', '#ca8a04'][index % 7];
  };
  if (!data.length) return <div className="flex h-72 items-center justify-center rounded-xl border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-6 text-center text-sm text-[#4f5f7a]">Nenhum dado encontrado para este gráfico no período selecionado.</div>;
  if (chart.kind === 'line') return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ left: 8, right: 8, top: 16, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => chart.formatter ? chart.formatter(Number(value)).replace('R$', '') : String(value)} /><Tooltip formatter={(value) => chart.formatter ? chart.formatter(Number(value)) : value} /><Line type="monotone" dataKey="value" stroke={moduleColor.chart} strokeWidth={3} dot={{ r: 4, fill: moduleColor.chart }} /></LineChart></ResponsiveContainer></div>;
  if (chart.kind === 'donut') return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="label" innerRadius={62} outerRadius={96} paddingAngle={3}>{data.map((item, index) => <Cell key={item.label} fill={colorForItem(item.label, index)} />)}</Pie><Tooltip formatter={(value) => chart.formatter ? chart.formatter(Number(value)) : value} /><Legend /></PieChart></ResponsiveContainer></div>;
  return <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} layout={chart.kind === 'ranking' ? 'vertical' : 'horizontal'} margin={{ left: chart.kind === 'ranking' ? 78 : 8, right: 12, top: 16, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" stroke="#e6e8eb" />{chart.kind === 'ranking' ? <><XAxis type="number" hide /><YAxis type="category" dataKey="label" width={86} tick={{ fontSize: 11 }} /></> : <><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => chart.formatter ? chart.formatter(Number(value)).replace('R$', '') : String(value)} /></>}<Tooltip formatter={(value) => chart.formatter ? chart.formatter(Number(value)) : value} /><Bar dataKey="value" radius={[6, 6, 0, 0]} fill={moduleColor.chart}>{data.map((item, index) => <Cell key={item.label} fill={chart.id === 'risk-summary' ? colorForItem(item.label, index) : moduleColor.chart} />)}</Bar></BarChart></ResponsiveContainer></div>;
}

function generateChartAiAnalysis(chart: VisualChartDefinition) {
  const total = chart.data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const leader = chart.data.slice().sort((a, b) => b.value - a.value)[0];
  const formattedTotal = chart.formatter ? chart.formatter(total) : String(total);
  const leaderValue = leader ? (chart.formatter ? chart.formatter(leader.value) : String(leader.value)) : '0';

  if (!leader || total === 0) {
    return `O gráfico "${chart.title}" ainda não possui dados suficientes para uma análise conclusiva no período filtrado. Recomenda-se manter os registros atualizados para que o dashboard consiga apontar tendências e prioridades.`;
  }

  return `Análise do gráfico "${chart.title}": o total consolidado é ${formattedTotal}. O principal ponto de atenção é "${leader.label}", com ${leaderValue}, representando a maior concentração do indicador. ${chart.insight} Recomenda-se abrir os detalhes, verificar os registros relacionados e priorizar ações preventivas nos itens de maior impacto.`;
}

function generateExecutiveAiAnalysis(companyName: string, risk: { level: string; helper: string }, charts: VisualChartDefinition[], recommendations: string[]) {
  const selected = charts.slice(0, 5);
  const highlights = selected
    .map((chart) => {
      const leader = chart.data.slice().sort((a, b) => b.value - a.value)[0];
      if (!leader) return chart.insight;
      const value = chart.formatter ? chart.formatter(leader.value) : String(leader.value);
      return `${chart.title}: ${leader.label} lidera com ${value}.`;
    })
    .filter(Boolean);

  return [
    `Resumo executivo de segurança para ${companyName}: o nível geral de risco atual é ${risk.level}. ${risk.helper}`,
    highlights.length ? `Principais leituras dos gráficos selecionados: ${highlights.join(' ')}` : 'Os gráficos selecionados ainda não possuem dados suficientes para uma leitura executiva completa.',
    `Recomendações preventivas: ${recommendations.slice(0, 3).join(' ')}`,
    'Conclusão: priorize os módulos e setores com maior concentração de pendências, acompanhe a evolução mensal dos incidentes e mantenha o comparativo de prevenção x correção como indicador financeiro central.',
  ].join('\n\n');
}

function VisualChartCard({ chart, selected, aiAnalysis, onToggle, onDetails, onAi, onExport }: { chart: VisualChartDefinition; selected: boolean; aiAnalysis?: string; onToggle: () => void; onDetails: () => void; onAi: () => void; onExport: () => void }) {
  const color = getModuleColor(moduleColorForChartModule(chart.module));

  return <section className="rounded-2xl border border-t-4 bg-white p-5 shadow-sm" style={{ borderTopColor: color.primary, borderRightColor: color.border, borderBottomColor: color.border, borderLeftColor: color.border }}><div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-[#191c1e]">{chart.title}</h3><Badge className="border" style={moduleBadgeStyle(moduleColorForChartModule(chart.module))}>{chart.module}</Badge></div><p className="mt-1 text-sm text-[#4f5f7a]">{chart.description}</p></div><Badge className={selected ? 'border-0 bg-[#dff7e5] text-[#18703a]' : 'border-0 bg-[#fff1e7] text-[#9e4300]'}>{selected ? 'No relatório' : 'Disponível'}</Badge></div><VisualChartCanvas chart={chart} /><div className="mt-4 rounded-xl border p-3 text-sm leading-6 text-[#191c1e]" style={{ borderColor: color.border, backgroundColor: color.soft }}><span className="font-semibold">Insight:</span> {chart.insight}</div>{aiAnalysis ? <div className="mt-3 rounded-xl border border-[#dfe7f5] bg-[#f8fbff] p-3 text-sm leading-6 text-[#2f3b52]"><div className="mb-1 flex items-center gap-2 font-semibold text-[#191c1e]"><Sparkles className="h-4 w-4" style={{ color: color.icon }} />Análise gerada</div>{aiAnalysis}</div> : null}<div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={onDetails} className="rounded-xl">Ver detalhes</Button><Button variant={selected ? 'default' : 'outline'} onClick={onToggle} className={selected ? 'rounded-xl text-white hover:opacity-95' : 'rounded-xl'} style={selected ? { backgroundColor: color.primary } : undefined}>{selected ? 'Remover do relatório' : 'Adicionar ao relatório'}</Button><Button variant="outline" onClick={onExport} className="rounded-xl">Exportar gráfico</Button><Button variant="outline" onClick={onAi} className="rounded-xl"><Sparkles className="h-4 w-4" />Gerar análise com IA</Button></div></section>;
}

function VisualAnalyticsSection({ charts, selectedCharts, selectedIds, chartAnalyses, executiveAnalysis, chartTypeFilter, chartModuleFilter, onTypeChange, onModuleChange, onToggleChart, onDetails, onAi, onExecutiveAi, onExport, onGeneratePdf }: { charts: VisualChartDefinition[]; selectedCharts: VisualChartDefinition[]; selectedIds: string[]; chartAnalyses: Record<string, string>; executiveAnalysis?: string; chartTypeFilter: string; chartModuleFilter: string; onTypeChange: (value: string) => void; onModuleChange: (value: string) => void; onToggleChart: (id: string) => void; onDetails: (chart: VisualChartDefinition) => void; onAi: (chart: VisualChartDefinition) => void; onExecutiveAi: () => void; onExport: (chart: VisualChartDefinition) => void; onGeneratePdf: () => void }) {
  return <div className="space-y-6"><section className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between"><div><h2 className="text-xl font-semibold text-[#191c1e]">Análise Visual de Segurança</h2><p className="mt-1 text-sm text-[#4f5f7a]">Gráficos interativos, insights automáticos e seleção de itens para relatório visual.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:flex"><Select value={chartModuleFilter} onValueChange={onModuleChange}><SelectTrigger className="h-10 rounded-xl lg:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os módulos</SelectItem><SelectItem value="resumo">Resumo</SelectItem><SelectItem value="colaboradores">Colaboradores</SelectItem><SelectItem value="epis">EPIs</SelectItem><SelectItem value="treinamentos">Treinamentos</SelectItem><SelectItem value="inspecoes">Inspeções</SelectItem><SelectItem value="naoConformidades">Não Conformidades</SelectItem><SelectItem value="incidentes">Incidentes</SelectItem><SelectItem value="custos">Custos</SelectItem></SelectContent></Select><Select value={chartTypeFilter} onValueChange={onTypeChange}><SelectTrigger className="h-10 rounded-xl lg:w-44"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos os gráficos</SelectItem><SelectItem value="line">Linha</SelectItem><SelectItem value="bar">Barra</SelectItem><SelectItem value="donut">Pizza/Donut</SelectItem><SelectItem value="ranking">Ranking</SelectItem><SelectItem value="comparison">Comparação</SelectItem></SelectContent></Select><Button onClick={onGeneratePdf} className="rounded-xl bg-[#9e4300] text-white hover:bg-[#8c3b00]"><FileText className="h-4 w-4" />Gerar Relatório Visual</Button></div></div></section><section className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]"><div className="rounded-2xl border border-[#dfe7f5] bg-[#f7f9fc] p-5"><div className="mb-3 flex items-center gap-2"><Brain className="h-5 w-5 text-[#415778]" /><h3 className="font-semibold text-[#191c1e]">Análise Executiva com IA</h3></div><p className="text-sm leading-6 text-[#4f5f7a]">Gere um texto executivo com base nos gráficos selecionados, indicadores atuais e recomendações preventivas.</p><Button variant="outline" onClick={onExecutiveAi} className="mt-4 rounded-xl"><Sparkles className="h-4 w-4" />Gerar análise executiva com IA</Button>{executiveAnalysis ? <div className="mt-4 whitespace-pre-line rounded-xl border border-[#dfe7f5] bg-white p-4 text-sm leading-6 text-[#2f3b52]">{executiveAnalysis}</div> : null}</div><div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm"><h3 className="font-semibold text-[#191c1e]">Relatório em montagem</h3><p className="mt-1 text-sm text-[#4f5f7a]">{selectedCharts.length} gráficos selecionados</p><div className="mt-3 space-y-2">{selectedCharts.length ? selectedCharts.map((chart) => <div key={chart.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#eceef1] p-2 text-sm"><span className="truncate text-[#191c1e]">{chart.title}</span><Button size="sm" variant="ghost" onClick={() => onToggleChart(chart.id)}>Remover</Button></div>) : <p className="rounded-lg border border-dashed border-[#ccb4a6] p-3 text-sm text-[#4f5f7a]">Nenhum gráfico selecionado ainda.</p>}</div></div></section><div className="grid gap-5 xl:grid-cols-2">{charts.length ? charts.map((chart) => <VisualChartCard key={chart.id} chart={chart} selected={selectedIds.includes(chart.id)} aiAnalysis={chartAnalyses[chart.id]} onToggle={() => onToggleChart(chart.id)} onDetails={() => onDetails(chart)} onAi={() => onAi(chart)} onExport={() => onExport(chart)} />) : <div className="rounded-2xl border border-dashed border-[#ccb4a6] bg-white p-8 text-center text-sm text-[#4f5f7a]">Nenhum dado encontrado para os filtros de gráficos selecionados.</div>}</div></div>;
}

export function SafetyDashboardGeneral({ companyId, companyName }: SafetyDashboardGeneralProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [period, setPeriod] = useState('90_dias');
  const [companyFilter, setCompanyFilter] = useState('todas');
  const [sectorFilter, setSectorFilter] = useState('todos');
  const [roleFilter, setRoleFilter] = useState('todas');
  const [collaboratorFilter, setCollaboratorFilter] = useState('todos');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('todas');
  const [occurrenceTypeFilter, setOccurrenceTypeFilter] = useState('todos');
  const [riskLevelFilter, setRiskLevelFilter] = useState('todos');
  const [costCategoryFilter, setCostCategoryFilter] = useState('todas');
  const [chartTypeFilter, setChartTypeFilter] = useState('todos');
  const [chartModuleFilter, setChartModuleFilter] = useState('todos');
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>(['risk-summary', 'incidents-month', 'nc-severity', 'prevention-correction']);
  const [chartAnalyses, setChartAnalyses] = useState<Record<string, string>>({});
  const [executiveAiAnalysis, setExecutiveAiAnalysis] = useState('');
  const [extinguisherStore, setExtinguisherStore] = useState<FireExtinguisherDataStore | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [visiblePendings, setVisiblePendings] = useState(20);
  const [data, setData] = useState<DashboardData>({
    collaborators: [],
    epi: { deliveries: [], mappings: [] },
    training: { records: [], mappings: [] },
    inspections: [],
    nonconformities: [],
    incidents: [],
    costs: [],
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      try {
        setData({ collaborators: [], epi: { deliveries: [], mappings: [] }, training: { records: [], mappings: [] }, inspections: [], nonconformities: [], incidents: [], costs: [] });

        const tasks = [
          getCollaborators(companyId).then((result) => {
            if (!active) return;
            if (result.success && result.data) setData((current) => ({ ...current, collaborators: result.data || [] }));
            else throw result.error;
          }),
          getEpiModuleData(companyId).then((result) => {
            if (!active) return;
            if (result.success && result.data) setData((current) => ({ ...current, epi: { deliveries: result.data.deliveries || [], mappings: result.data.mappings || [] } }));
            else throw result.error;
          }),
          getTrainingModuleData(companyId).then((result) => {
            if (!active) return;
            if (result.success && result.data) setData((current) => ({ ...current, training: { records: result.data.records || [], mappings: result.data.mappings || [] } }));
            else throw result.error;
          }),
          getInspectionModuleData(companyId).then((result) => {
            if (!active) return;
            if (result.success && result.data) setData((current) => ({ ...current, inspections: result.data.inspections || [] }));
            else throw result.error;
          }),
          getNonconformityModuleData(companyId).then((result) => {
            if (!active) return;
            if (result.success && result.data) setData((current) => ({ ...current, nonconformities: result.data.nonconformities || [] }));
            else throw result.error;
          }),
          getIncidentModuleData(companyId).then((result) => {
            if (!active) return;
            if (result.success && result.data) setData((current) => ({ ...current, incidents: result.data.incidents || [] }));
            else throw result.error;
          }),
          getCostPreventionModuleData(companyId).then((result) => {
            if (!active) return;
            if (result.success && result.data) setData((current) => ({ ...current, costs: result.data.costs || [] }));
            else throw result.error;
          }),
        ];

        const results = await Promise.allSettled(tasks);
        if (active && results.some((result) => result.status === 'rejected')) {
          toast({ variant: 'destructive', title: 'Alguns dados nao foram carregados', description: 'O dashboard foi montado com os modulos disponiveis no momento.' });
        }
      } catch {
        if (!active) return;
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar dashboard',
          description: 'Nao foi possivel consolidar os indicadores gerais.',
        });
      } finally {
        if (active) setIsLoading(false);
      }
    }

    if (companyId) {
      void loadData();
    }

    return () => {
      active = false;
    };
  }, [companyId, reloadKey, toast]);

  useEffect(() => {
    if (!companyId) return;
    const key = extinguisherStorageKey(companyId);
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) as FireExtinguisherDataStore : createSeedExtinguisherStore(companyId);
    if (!saved) window.localStorage.setItem(key, JSON.stringify(parsed));
    setExtinguisherStore(parsed);
  }, [companyId, reloadKey]);

  const collaboratorMap = useMemo(
    () => new Map(data.collaborators.map((collaborator) => [collaborator.id, collaborator])),
    [data.collaborators],
  );

  const sectors = useMemo(
    () =>
      unique(
        [
          ...data.collaborators.map((item) => item.setor),
          ...data.incidents.map((item) => item.setor),
          ...data.nonconformities.map((item) => item.setor),
          ...data.inspections.map((item) => item.setor),
          ...data.costs.map((item) => item.setor),
        ]
          .map((item) => item?.trim())
          .filter(Boolean) as string[],
      ).sort(),
    [data],
  );

  const companies = useMemo(
    () => unique(data.collaborators.map((item) => item.empresa?.trim()).filter(Boolean) as string[]).sort(),
    [data.collaborators],
  );

  const functions = useMemo(
    () => unique(data.collaborators.map((item) => item.funcao).filter(Boolean)).sort(),
    [data.collaborators],
  );

  const filteredCollaborators = useMemo(() => {
    const query = normalize(deferredSearch);
    return data.collaborators.filter((collaborator) => {
      const matchesSearch =
        !query ||
        normalize(
          [
            collaborator.nome_completo,
            collaborator.setor,
            collaborator.funcao,
            collaborator.gestor_responsavel,
            collaborator.empresa,
          ].join(' '),
        ).includes(query);
      const matchesSector = sectorFilter === 'todos' || collaborator.setor === sectorFilter;
      const matchesCompany = companyFilter === 'todas' || collaborator.empresa === companyFilter;
      const matchesRole = roleFilter === 'todas' || collaborator.funcao === roleFilter;
      const matchesCollaborator = collaboratorFilter === 'todos' || collaborator.id === collaboratorFilter;
      const matchesStatus = statusFilter === 'todos' || collaborator.status === statusFilter;
      return matchesSearch && matchesCompany && matchesSector && matchesRole && matchesCollaborator && matchesStatus;
    });
  }, [collaboratorFilter, companyFilter, data.collaborators, deferredSearch, roleFilter, sectorFilter, statusFilter]);

  const filteredCollaboratorIds = useMemo(
    () => new Set(filteredCollaborators.map((item) => item.id)),
    [filteredCollaborators],
  );

  const filteredEpiDeliveries = useMemo(
    () =>
      data.epi.deliveries.filter((delivery) => {
        const collaborator = collaboratorMap.get(delivery.colaborador_id);
        const query = normalize(deferredSearch);
        const matchesSearch =
          !query ||
          normalize(
            [
              collaborator?.nome_completo,
              collaborator?.setor,
              collaborator?.funcao,
              delivery.epi?.nome,
              delivery.responsavel_entrega,
            ].join(' '),
          ).includes(query);
        const matchesCollaborator = collaboratorFilter === 'todos' || delivery.colaborador_id === collaboratorFilter;
        const matchesSector = sectorFilter === 'todos' || collaborator?.setor === sectorFilter;
        const matchesRole = roleFilter === 'todas' || collaborator?.funcao === roleFilter;
        const matchesStatus = statusFilter === 'todos' || delivery.status === statusFilter;
        return (
          filteredCollaboratorIds.has(delivery.colaborador_id) &&
          matchesSearch &&
          matchesCollaborator &&
          matchesSector &&
          matchesRole &&
          matchesStatus &&
          isWithinPeriod(delivery.data_entrega, period)
        );
      }),
    [collaboratorFilter, collaboratorMap, data.epi.deliveries, deferredSearch, filteredCollaboratorIds, period, roleFilter, sectorFilter, statusFilter],
  );

  const filteredTrainingRecords = useMemo(
    () =>
      data.training.records.filter((record) => {
        const collaborator = collaboratorMap.get(record.colaborador_id);
        const query = normalize(deferredSearch);
        const matchesSearch =
          !query ||
          normalize(
            [
              collaborator?.nome_completo,
              collaborator?.setor,
              collaborator?.funcao,
              record.treinamento?.nome,
              record.instrutor,
            ].join(' '),
          ).includes(query);
        const matchesCollaborator = collaboratorFilter === 'todos' || record.colaborador_id === collaboratorFilter;
        const matchesSector = sectorFilter === 'todos' || collaborator?.setor === sectorFilter;
        const matchesRole = roleFilter === 'todas' || collaborator?.funcao === roleFilter;
        const matchesStatus = statusFilter === 'todos' || record.status === statusFilter;
        return (
          filteredCollaboratorIds.has(record.colaborador_id) &&
          matchesSearch &&
          matchesCollaborator &&
          matchesSector &&
          matchesRole &&
          matchesStatus &&
          isWithinPeriod(record.data_realizacao || record.data_vencimento, period)
        );
      }),
    [collaboratorFilter, collaboratorMap, data.training.records, deferredSearch, filteredCollaboratorIds, period, roleFilter, sectorFilter, statusFilter],
  );

  const filteredInspections = useMemo(
    () =>
      data.inspections.filter((inspection) => {
        const query = normalize(deferredSearch);
        const matchesSearch =
          !query ||
          normalize([inspection.titulo, inspection.descricao, inspection.local, inspection.setor, inspection.responsavel_inspecao].join(' ')).includes(query);
        const matchesSector = sectorFilter === 'todos' || inspection.setor === sectorFilter;
        const matchesStatus = statusFilter === 'todos' || inspection.status === statusFilter;
        const matchesSeverity = severityFilter === 'todas' || inspection.grau_risco === severityFilter;
        const matchesRisk = riskLevelFilter === 'todos' || inspection.grau_risco === riskLevelFilter;
        return matchesSearch && matchesSector && matchesStatus && matchesSeverity && matchesRisk && isWithinPeriod(inspection.data_inspecao, period);
      }),
    [data.inspections, deferredSearch, period, riskLevelFilter, sectorFilter, severityFilter, statusFilter],
  );

  const filteredNonconformities = useMemo(
    () =>
      data.nonconformities.filter((item) => {
        const collaborator = item.colaborador_id ? collaboratorMap.get(item.colaborador_id) : null;
        const query = normalize(deferredSearch);
        const matchesSearch =
          !query ||
          normalize(
            [item.titulo, item.descricao, item.local, item.setor, item.responsavel_correcao, collaborator?.nome_completo].join(' '),
          ).includes(query);
        const matchesSector = sectorFilter === 'todos' || item.setor === sectorFilter;
        const matchesCollaborator = collaboratorFilter === 'todos' || item.colaborador_id === collaboratorFilter;
        const matchesRole = roleFilter === 'todas' || collaborator?.funcao === roleFilter;
        const matchesStatus = statusFilter === 'todos' || item.status === statusFilter;
        const matchesSeverity = severityFilter === 'todas' || item.gravidade === severityFilter || item.nivel_risco === severityFilter;
        const matchesRisk = riskLevelFilter === 'todos' || item.nivel_risco === riskLevelFilter;
        return matchesSearch && matchesSector && matchesCollaborator && matchesRole && matchesStatus && matchesSeverity && matchesRisk && isWithinPeriod(item.data_identificacao, period);
      }),
    [collaboratorFilter, collaboratorMap, data.nonconformities, deferredSearch, period, riskLevelFilter, roleFilter, sectorFilter, severityFilter, statusFilter],
  );

  const filteredIncidents = useMemo(
    () =>
      data.incidents.filter((item) => {
        const collaborator = item.colaborador_id ? collaboratorMap.get(item.colaborador_id) : null;
        const query = normalize(deferredSearch);
        const matchesSearch =
          !query ||
          normalize(
            [item.titulo, item.descricao, item.local, item.setor, item.responsavel_investigacao, collaborator?.nome_completo].join(' '),
          ).includes(query);
        const matchesSector = sectorFilter === 'todos' || item.setor === sectorFilter;
        const matchesCollaborator = collaboratorFilter === 'todos' || item.colaborador_id === collaboratorFilter;
        const matchesRole = roleFilter === 'todas' || collaborator?.funcao === roleFilter;
        const matchesStatus = statusFilter === 'todos' || item.status === statusFilter;
        const matchesSeverity = severityFilter === 'todas' || item.gravidade === severityFilter || item.nivel_risco === severityFilter;
        const matchesType = occurrenceTypeFilter === 'todos' || item.tipo_ocorrencia === occurrenceTypeFilter;
        const matchesRisk = riskLevelFilter === 'todos' || item.nivel_risco === riskLevelFilter;
        return matchesSearch && matchesSector && matchesCollaborator && matchesRole && matchesStatus && matchesSeverity && matchesRisk && matchesType && isWithinPeriod(item.data_ocorrencia, period);
      }),
    [collaboratorFilter, collaboratorMap, data.incidents, deferredSearch, occurrenceTypeFilter, period, riskLevelFilter, roleFilter, sectorFilter, severityFilter, statusFilter],
  );

  const filteredCosts = useMemo(
    () =>
      data.costs.filter((item) => {
        const collaborator = item.colaborador_id ? collaboratorMap.get(item.colaborador_id) : null;
        const query = normalize(deferredSearch);
        const matchesSearch =
          !query ||
          normalize(
            [item.descricao, item.fornecedor, item.setor, item.categoria, item.responsavel_registro, collaborator?.nome_completo].join(' '),
          ).includes(query);
        const matchesSector = sectorFilter === 'todos' || item.setor === sectorFilter;
        const matchesCollaborator = collaboratorFilter === 'todos' || item.colaborador_id === collaboratorFilter;
        const matchesRole = roleFilter === 'todas' || collaborator?.funcao === roleFilter;
        const matchesStatus = statusFilter === 'todos' || !statusFilter;
        const matchesCostCategory = costCategoryFilter === 'todas' || item.categoria === costCategoryFilter;
        return matchesSearch && matchesSector && matchesCollaborator && matchesRole && matchesStatus && matchesCostCategory && isWithinPeriod(item.data_custo, period);
      }),
    [collaboratorFilter, collaboratorMap, costCategoryFilter, data.costs, deferredSearch, period, roleFilter, sectorFilter, statusFilter],
  );

  const collaboratorRequirements = useMemo(() => {
    return filteredCollaborators.map((collaborator) => {
      const requiredEpis = getRequiredNames(
        collaborator,
        data.epi.mappings.map((item) => ({ funcao: item.funcao, obrigatorio: item.obrigatorio, epi_id: item.epi_id })),
        collaborator.ai_recommendations?.epi_obrigatorios,
        defaultEpiRules,
      );
      const collaboratorDeliveries = data.epi.deliveries.filter((item) => item.colaborador_id === collaborator.id);
      const hasMissingEpi = requiredEpis.some((required) => {
        if (required.includes('default-') || required.includes('-')) {
          return !collaboratorDeliveries.some((delivery) => delivery.epi?.nome && matchesRequiredByName(delivery.epi.nome, required));
        }
        return !collaboratorDeliveries.some((delivery) => delivery.epi_id === required || (delivery.epi?.nome && matchesRequiredByName(delivery.epi.nome, required)));
      });

      const requiredTrainings = getRequiredNames(
        collaborator,
        data.training.mappings.map((item) => ({ funcao: item.funcao, obrigatorio: item.obrigatorio, treinamento_id: item.treinamento_id })),
        collaborator.ai_recommendations?.treinamentos_obrigatorios,
        defaultTrainingRules,
      );
      const collaboratorRecords = data.training.records.filter((item) => item.colaborador_id === collaborator.id);
      const hasMissingTraining = requiredTrainings.some((required) => {
        return !collaboratorRecords.some((record) => {
          if (record.status === 'cancelado' || record.status === 'dispensado') return false;
          if (record.treinamento?.nome && matchesRequiredByName(record.treinamento.nome, required)) return true;
          return record.treinamento_id === required;
        });
      });

      const hasExpiredTraining = collaboratorRecords.some((item) => item.status === 'vencido');
      const hasPendingTraining = collaboratorRecords.some((item) => item.status === 'pendente');

      return {
        collaborator,
        hasMissingEpi,
        hasMissingTraining,
        hasExpiredTraining,
        hasPendingTraining,
      };
    });
  }, [data.epi.deliveries, data.epi.mappings, data.training.mappings, data.training.records, filteredCollaborators]);

  const summary = useMemo(() => {
    const activeCollaborators = filteredCollaborators.filter((item) => item.status === 'ativo');
    const afastados = filteredCollaborators.filter((item) => item.status === 'afastado');
    const desligados = filteredCollaborators.filter((item) => item.status === 'desligado');
    const expiredAso = activeCollaborators.filter((item) => getAsoStatus(item) === 'expired');
    const nearAso = activeCollaborators.filter((item) => getAsoStatus(item) === 'near');
    const collaboratorsWithPending = collaboratorRequirements.filter((item) => item.hasMissingEpi || item.hasMissingTraining || item.hasPendingTraining || item.hasExpiredTraining);
    const notAptCollaborators = collaboratorRequirements.filter((item) => item.hasExpiredTraining || item.hasMissingTraining || getAsoStatus(item.collaborator) === 'expired');

    const epiPending = filteredEpiDeliveries.filter((item) => item.status === 'pendente');
    const epiExpired = filteredEpiDeliveries.filter((item) => item.status === 'vencido');
    const epiNearReplacement = filteredEpiDeliveries.filter((item) => item.status === 'proximo_troca');
    const caExpired = filteredEpiDeliveries.filter((item) => item.epi?.validade_ca && (daysUntil(item.epi.validade_ca) ?? 1) < 0);
    const collaboratorsWithoutRequiredEpi = collaboratorRequirements.filter((item) => item.hasMissingEpi);

    const validTrainings = filteredTrainingRecords.filter((item) => item.status === 'valido');
    const pendingTrainings = filteredTrainingRecords.filter((item) => item.status === 'pendente');
    const expiredTrainings = filteredTrainingRecords.filter((item) => item.status === 'vencido');
    const nearExpiryTrainings = filteredTrainingRecords.filter((item) => item.status === 'proximo_vencimento');

    const openInspections = filteredInspections.filter((item) => item.status === 'aberta' || item.status === 'em_andamento');
    const lateInspections = filteredInspections.filter((item) => item.status === 'atrasada');
    const highRiskInspections = filteredInspections.filter((item) => item.grau_risco === 'alto' || item.grau_risco === 'critico');
    const nonConformingItems = filteredInspections.flatMap((item) => item.itens || []).filter((item) => item.status === 'nao_conforme');
    const lateInspectionActions = filteredInspections.flatMap((item) => item.acoes || []).filter((item) => item.status === 'atrasada');

    const openNonconformities = filteredNonconformities.filter((item) => item.status === 'aberta');
    const correctingNonconformities = filteredNonconformities.filter((item) => item.status === 'em_correcao');
    const lateNonconformities = filteredNonconformities.filter((item) => item.status === 'atrasada');
    const criticalNonconformities = filteredNonconformities.filter((item) => item.gravidade === 'critica' || item.nivel_risco === 'critico');
    const resolvedNonconformities = filteredNonconformities.filter((item) => item.status === 'resolvida');
    const pendingValidation = filteredNonconformities.filter((item) => item.status === 'resolvida' && item.validacao_status === 'pendente');
    const withoutResponsibleNc = filteredNonconformities.filter((item) => ['aberta', 'atrasada', 'em_correcao'].includes(item.status) && !item.responsavel_correcao);

    const nearMisses = filteredIncidents.filter((item) => item.tipo_ocorrencia === 'quase_acidente');
    const injuryIncidents = filteredIncidents.filter((item) => item.tipo_ocorrencia === 'acidente_com_lesao');
    const leaveIncidents = filteredIncidents.filter((item) => item.tipo_ocorrencia === 'acidente_com_afastamento');
    const criticalIncidents = filteredIncidents.filter((item) => item.gravidade === 'critica' || item.nivel_risco === 'critico');
    const openIncidents = filteredIncidents.filter((item) => item.status !== 'concluido' && item.status !== 'cancelado');
    const investigatingIncidents = filteredIncidents.filter((item) => item.status === 'em_investigacao');
    const lateInvestigations = filteredIncidents.filter((item) => item.prazo_investigacao && (daysUntil(item.prazo_investigacao) ?? 0) < 0 && item.status !== 'concluido' && item.status !== 'cancelado');
    const preventiveActionsOpen = filteredIncidents.flatMap((item) => item.acoes || []).filter((item) => item.tipo_acao === 'acao_preventiva' && item.status !== 'concluida' && item.status !== 'cancelada');

    const prevention = preventionCosts(filteredCosts);
    const correction = correctiveCosts(filteredCosts);
    const incidentCosts = filteredCosts.filter((item) => item.categoria === 'incidente' || item.incidente_id);
    const epiCosts = filteredCosts.filter((item) => item.categoria === 'EPI' || item.epi_id);
    const trainingCosts = filteredCosts.filter((item) => item.categoria === 'treinamento' || item.treinamento_id);
    const ncCosts = filteredCosts.filter((item) => item.categoria === 'correcao' || item.nao_conformidade_id);
    const estimatedSavings = Math.max(sumCosts(correction) - sumCosts(prevention), 0);

    const sectorTotals = filteredCosts.reduce<Record<string, number>>((acc, item) => {
      const key = item.setor || 'Nao informado';
      acc[key] = (acc[key] || 0) + Number(item.valor || 0);
      return acc;
    }, {});
    const topSector = Object.entries(sectorTotals).sort((a, b) => b[1] - a[1])[0];

    return {
      collaborators: {
        active: activeCollaborators.length,
        afastados: afastados.length,
        desligados: desligados.length,
        pending: collaboratorsWithPending.length,
        notApt: notAptCollaborators.length,
        asoExpired: expiredAso.length,
        asoNear: nearAso.length,
      },
      epi: {
        delivered: filteredEpiDeliveries.filter((item) => item.status === 'entregue').length,
        pending: epiPending.length,
        expired: epiExpired.length,
        nearReplacement: epiNearReplacement.length,
        caExpired: caExpired.length,
        withoutRequired: collaboratorsWithoutRequiredEpi.length,
      },
      training: {
        valid: validTrainings.length,
        pending: pendingTrainings.length,
        expired: expiredTrainings.length,
        nearExpiry: nearExpiryTrainings.length,
        collaboratorsExpired: collaboratorRequirements.filter((item) => item.hasExpiredTraining).length,
        collaboratorsNotApt: notAptCollaborators.length,
      },
      inspections: {
        total: filteredInspections.length,
        open: openInspections.length,
        inProgress: filteredInspections.filter((item) => item.status === 'em_andamento').length,
        late: lateInspections.length,
        nonConformingItems: nonConformingItems.length,
        lateActions: lateInspectionActions.length,
        highRisk: highRiskInspections.length,
      },
      nonconformities: {
        open: openNonconformities.length,
        correcting: correctingNonconformities.length,
        late: lateNonconformities.length,
        critical: criticalNonconformities.length,
        resolved: resolvedNonconformities.length,
        pendingValidation: pendingValidation.length,
        withoutResponsible: withoutResponsibleNc.length,
      },
      incidents: {
        total: filteredIncidents.length,
        open: openIncidents.length,
        investigating: investigatingIncidents.length,
        nearMisses: nearMisses.length,
        withInjury: injuryIncidents.length,
        withLeave: leaveIncidents.length,
        critical: criticalIncidents.length,
        lateInvestigations: lateInvestigations.length,
        preventiveActionsOpen: preventiveActionsOpen.length,
      },
      costs: {
        total: sumCosts(filteredCosts),
        prevention: sumCosts(prevention),
        correction: sumCosts(correction),
        incidents: sumCosts(incidentCosts),
        nonconformities: sumCosts(ncCosts),
        epi: sumCosts(epiCosts),
        trainings: sumCosts(trainingCosts),
        estimatedSavings,
        topSector: topSector ? `${topSector[0]} (${formatCurrency(topSector[1])})` : '-',
      },
    };
  }, [collaboratorRequirements, filteredCollaborators, filteredCosts, filteredEpiDeliveries, filteredIncidents, filteredInspections, filteredNonconformities, filteredTrainingRecords]);

  const extinguisherSummary = useMemo(() => {
    const store = extinguisherStore || createSeedExtinguisherStore(companyId);
    const active = store.extinguishers.filter((item) => !item.archived);
    const statuses = active.map((item) => calculateExtinguisherStatus(item, store.nonconformities));
    return {
      total: active.length,
      compliant: statuses.filter((status) => status === 'em_conformidade').length,
      expiring: statuses.filter((status) => status === 'a_vencer').length,
      expired: statuses.filter((status) => status === 'vencido').length,
      nonconformity: statuses.filter((status) => status === 'nao_conformidade').length,
    };
  }, [companyId, extinguisherStore]);

  const risk = useMemo(() => {
    const overduePreventiveActions = filteredIncidents.flatMap((item) => item.acoes || []).filter((item) => item.tipo_acao === 'acao_preventiva' && item.status === 'atrasada').length;
    const score =
      summary.nonconformities.critical * 3 +
      summary.incidents.critical * 3 +
      summary.training.expired * 2 +
      summary.collaborators.asoExpired * 2 +
      (summary.epi.expired + summary.epi.pending) * 1 +
      summary.inspections.late * 2 +
      overduePreventiveActions * 2 +
      (summary.costs.correction > summary.costs.prevention ? 3 : 0);

    if (score >= 20) {
      return {
        level: 'Critico',
        helper: 'Existem ocorrencias criticas, pendencias vencidas e acoes preventivas atrasadas que exigem resposta imediata.',
        tone: 'danger' as const,
      };
    }
    if (score >= 12) {
      return {
        level: 'Alto',
        helper: 'O risco esta elevado por causa de nao conformidades abertas, treinamentos vencidos e pendencias operacionais.',
        tone: 'warning' as const,
      };
    }
    if (score >= 6) {
      return {
        level: 'Medio',
        helper: 'Ha pontos de atencao relevantes, mas com capacidade de controle no curto prazo.',
        tone: 'default' as const,
      };
    }
    return {
      level: 'Baixo',
      helper: 'O ambiente esta sob controle, com menor acumulado de pendencias criticas neste filtro.',
      tone: 'success' as const,
    };
  }, [filteredIncidents, summary]);

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];

    collaboratorRequirements
      .filter((item) => item.hasExpiredTraining)
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `training-expired-${item.collaborator.id}`,
          title: 'Colaborador com treinamento vencido',
          description: `${item.collaborator.nome_completo} esta com treinamento vencido e exige reciclagem.`,
          module: 'Treinamentos',
          severity: 'alta',
          section: 'trainings',
        });
      });

    collaboratorRequirements
      .filter((item) => item.hasMissingEpi)
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `epi-missing-${item.collaborator.id}`,
          title: 'Colaborador sem EPI obrigatorio',
          description: `${item.collaborator.nome_completo} possui pendencia de EPI obrigatorio para a funcao.`,
          module: 'Entregas de EPI',
          severity: 'critica',
          section: 'epiDeliveries',
        });
      });

    filteredEpiDeliveries
      .filter((item) => item.status === 'vencido')
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `epi-expired-${item.id}`,
          title: 'EPI vencido',
          description: `${item.epi?.nome || 'EPI'} vencido para ${item.colaborador?.nome_completo || 'colaborador'}.`,
          module: 'Entregas de EPI',
          severity: 'alta',
          date: item.data_validade || item.data_proxima_troca,
          section: 'epiDeliveries',
        });
      });

    filteredEpiDeliveries
      .filter((item) => item.epi?.validade_ca && (daysUntil(item.epi.validade_ca) ?? 1) < 0)
      .slice(0, 4)
      .forEach((item) => {
        items.push({
          id: `ca-expired-${item.id}`,
          title: 'CA vencido',
          description: `${item.epi?.nome || 'EPI'} possui CA vencido e deve ser revisado.`,
          module: 'Entregas de EPI',
          severity: 'alta',
          date: item.epi?.validade_ca,
          section: 'epiDeliveries',
        });
      });

    filteredCollaborators
      .filter((item) => item.status === 'ativo' && getAsoStatus(item) === 'expired')
      .slice(0, 4)
      .forEach((item) => {
        items.push({
          id: `aso-expired-${item.id}`,
          title: 'ASO vencido',
          description: `${item.nome_completo} esta com ASO vencido.`,
          module: 'Colaboradores',
          severity: 'critica',
          date: item.aso_validade,
          section: 'collaborators',
        });
      });

    filteredInspections
      .filter((item) => item.status === 'atrasada')
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `inspection-late-${item.id}`,
          title: 'Inspecao atrasada',
          description: `${item.titulo} permanece aberta ou atrasada no setor ${item.setor}.`,
          module: 'Inspecoes',
          severity: item.grau_risco === 'critico' ? 'critica' : item.grau_risco === 'alto' ? 'alta' : 'media',
          date: item.prazo_correcao,
          section: 'inspections',
        });
      });

    filteredNonconformities
      .filter((item) => item.gravidade === 'critica' || item.nivel_risco === 'critico' || item.status === 'atrasada')
      .slice(0, 8)
      .forEach((item) => {
        items.push({
          id: `nc-${item.id}`,
          title: item.status === 'atrasada' ? 'Nao conformidade atrasada' : 'Nao conformidade critica aberta',
          description: `${item.titulo} no setor ${item.setor}.`,
          module: 'Nao Conformidades',
          severity: item.gravidade === 'critica' || item.nivel_risco === 'critico' ? 'critica' : 'alta',
          date: item.prazo_correcao || item.data_identificacao,
          section: 'nonconformities',
        });
      });

    filteredIncidents
      .filter((item) => (item.gravidade === 'critica' || item.nivel_risco === 'critico') && item.status !== 'concluido')
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `incident-critical-${item.id}`,
          title: 'Incidente critico em investigacao',
          description: `${item.titulo} no setor ${item.setor} ainda exige tratativa.`,
          module: 'Incidentes',
          severity: 'critica',
          date: item.data_ocorrencia,
          section: 'incidents',
        });
      });

    filteredIncidents
      .filter((item) => !item.causa_raiz && !item.causa_raiz_confirmada && item.status !== 'concluido' && item.status !== 'cancelado')
      .slice(0, 6)
      .forEach((item) => {
        items.push({
          id: `incident-root-${item.id}`,
          title: 'Incidente sem causa raiz definida',
          description: `${item.titulo} ainda nao possui causa raiz confirmada.`,
          module: 'Incidentes',
          severity: 'alta',
          date: item.prazo_investigacao || item.data_ocorrencia,
          section: 'incidents',
        });
      });

    const incidentCosts = filteredCosts.filter((item) => item.categoria === 'incidente' || item.incidente_id);
    const previousPeriodCosts = data.costs.filter((item) => !filteredCosts.some((filtered) => filtered.id === item.id) && (item.categoria === 'incidente' || item.incidente_id));
    if (sumCosts(incidentCosts) > sumCosts(previousPeriodCosts) && incidentCosts.length > 0) {
      items.push({
        id: 'incident-cost-growth',
        title: 'Custos com incidentes em alta',
        description: `Os custos de incidentes no filtro atual chegaram a ${formatCurrency(sumCosts(incidentCosts))}.`,
        module: 'Custos & Prevencao',
        severity: 'alta',
        section: 'costsPrevention',
      });
    }

    return items.slice(0, 12);
  }, [collaboratorRequirements, data.costs, filteredCollaborators, filteredCosts, filteredEpiDeliveries, filteredIncidents, filteredInspections, filteredNonconformities]);

  const pendings = useMemo<PendingItem[]>(() => {
    const items: PendingItem[] = [];

    collaboratorRequirements.forEach((item) => {
      const asoStatus = getAsoStatus(item.collaborator);
      if (asoStatus === 'expired' || asoStatus === 'missing') {
        items.push({
          id: `pending-aso-${item.collaborator.id}`,
          type: asoStatus === 'expired' ? 'ASO vencido' : 'ASO nao informado',
          module: 'Colaboradores',
          description: asoStatus === 'expired' ? 'Colaborador ativo com ASO fora da validade.' : 'Colaborador sem validade de ASO cadastrada.',
          collaborator: item.collaborator.nome_completo,
          sector: item.collaborator.setor,
          responsible: item.collaborator.gestor_responsavel,
          dueDate: item.collaborator.aso_validade,
          severity: asoStatus === 'expired' ? 'critica' : 'media',
          status: asoStatus === 'expired' ? 'vencido' : 'pendente',
          section: 'collaborators',
        });
      }
      if (item.hasMissingEpi) {
        items.push({
          id: `pending-epi-${item.collaborator.id}`,
          type: 'EPI pendente',
          module: 'Entregas de EPI',
          description: 'Colaborador sem EPI obrigatorio entregue.',
          collaborator: item.collaborator.nome_completo,
          sector: item.collaborator.setor,
          responsible: item.collaborator.gestor_responsavel,
          severity: 'critica',
          status: 'pendente',
          section: 'epiDeliveries',
        });
      }
      if (item.hasExpiredTraining || item.hasMissingTraining || item.hasPendingTraining) {
        items.push({
          id: `pending-training-${item.collaborator.id}`,
          type: item.hasExpiredTraining ? 'Treinamento vencido' : 'Treinamento pendente',
          module: 'Treinamentos',
          description: 'Colaborador com requisito de capacitacao em aberto.',
          collaborator: item.collaborator.nome_completo,
          sector: item.collaborator.setor,
          responsible: item.collaborator.gestor_responsavel,
          severity: item.hasExpiredTraining ? 'alta' : 'media',
          status: item.hasExpiredTraining ? 'vencido' : 'pendente',
          section: 'trainings',
        });
      }
    });

    filteredInspections
      .filter((item) => item.status === 'atrasada')
      .forEach((item) => {
        items.push({
          id: `pending-inspection-${item.id}`,
          type: 'Inspecao atrasada',
          module: 'Inspecoes',
          description: item.titulo,
          sector: item.setor,
          responsible: item.responsavel_correcao || item.responsavel_inspecao,
          dueDate: item.prazo_correcao,
          severity: item.grau_risco === 'critico' ? 'critica' : item.grau_risco === 'alto' ? 'alta' : 'media',
          status: item.status,
          section: 'inspections',
        });
      });

    filteredNonconformities
      .filter((item) => ['aberta', 'atrasada', 'em_correcao'].includes(item.status))
      .forEach((item) => {
        items.push({
          id: `pending-nc-${item.id}`,
          type: item.status === 'atrasada' ? 'Nao conformidade atrasada' : 'Nao conformidade aberta',
          module: 'Nao Conformidades',
          description: item.titulo,
          collaborator: item.colaborador?.nome_completo,
          sector: item.setor,
          responsible: item.responsavel_correcao,
          dueDate: item.prazo_correcao,
          severity: item.gravidade === 'critica' ? 'critica' : item.gravidade === 'alta' ? 'alta' : 'media',
          status: item.status,
          section: 'nonconformities',
        });
      });

    filteredIncidents
      .filter((item) => item.status === 'em_investigacao' || item.status === 'aguardando_acao')
      .forEach((item) => {
        items.push({
          id: `pending-incident-${item.id}`,
          type: 'Incidente em investigacao',
          module: 'Incidentes',
          description: item.titulo,
          collaborator: item.colaborador?.nome_completo,
          sector: item.setor,
          responsible: item.responsavel_investigacao,
          dueDate: item.prazo_investigacao,
          severity: item.gravidade === 'critica' ? 'critica' : item.gravidade === 'alta' ? 'alta' : 'media',
          status: item.status,
          section: 'incidents',
        });
      });

    filteredIncidents
      .flatMap((item) => item.acoes || [])
      .filter((item) => item.status === 'atrasada')
      .forEach((item, index) => {
        items.push({
          id: `pending-action-${index}`,
          type: 'Acao preventiva atrasada',
          module: 'Incidentes',
          description: item.descricao || 'Acao preventiva em atraso.',
          responsible: item.responsavel,
          dueDate: item.prazo,
          severity: 'alta',
          status: item.status,
          section: 'incidents',
        });
      });

    filteredCosts
      .filter((item) => !item.categoria || !item.responsavel_registro || !item.comprovante_url)
      .forEach((item) => {
        items.push({
          id: `pending-cost-${item.id}`,
          type: 'Cadastro financeiro incompleto',
          module: 'Custos & Prevencao',
          description: item.descricao,
          collaborator: item.colaborador?.nome_completo,
          sector: item.setor,
          responsible: item.responsavel_registro,
          severity: !item.comprovante_url ? 'media' : 'baixa',
          status: 'incompleto',
          section: 'costsPrevention',
        });
      });

    return items
      .sort((a, b) => {
        const severityRank = { critica: 4, alta: 3, media: 2, baixa: 1 };
        return severityRank[b.severity] - severityRank[a.severity];
      })
      .slice(0, 40);
  }, [collaboratorRequirements, filteredCosts, filteredIncidents, filteredInspections, filteredNonconformities]);

  useEffect(() => {
    setVisiblePendings(20);
  }, [collaboratorFilter, costCategoryFilter, deferredSearch, occurrenceTypeFilter, period, riskLevelFilter, roleFilter, sectorFilter, severityFilter, statusFilter]);

  const priorities = useMemo<PriorityItem[]>(() => {
    return pendings.slice(0, 8).map((item, index) => ({
      id: `priority-${index}-${item.id}`,
      priority: item.severity,
      description: item.description,
      reason: item.dueDate ? `Prazo ${daysUntil(item.dueDate)! < 0 ? 'vencido' : 'proximo'} e impacto ${item.severity}.` : `Pendencia com impacto ${item.severity}.`,
      module: item.module,
      section: item.section,
      related: item.collaborator || item.sector,
      responsible: item.responsible,
      dueDate: item.dueDate,
    }));
  }, [pendings]);

  const recommendations = useMemo(() => {
    const items: string[] = [];
    if (summary.epi.pending > 0 || summary.epi.expired > 0) {
      items.push('Regularizar a entrega dos EPIs pendentes e substituir imediatamente os itens vencidos para funcoes com maior exposicao.');
    }
    if (summary.training.expired > 0 || summary.training.pending > 0) {
      items.push('Programar reciclagem dos treinamentos vencidos e concluir os registros pendentes para evitar colaboradores nao aptos.');
    }
    if (summary.nonconformities.critical > 0) {
      items.push('Priorizar a correcao das nao conformidades criticas abertas com prazo, responsavel e evidencias de fechamento.');
    }
    if (summary.incidents.total > 0) {
      items.push('Realizar inspecao preventiva no setor com mais incidentes e revisar as acoes preventivas ainda abertas.');
    }
    if (summary.costs.correction > summary.costs.prevention) {
      items.push('Aumentar investimentos preventivos em treinamento, sinalizacao e rotina de verificacao para reduzir o peso dos custos corretivos.');
    }
    if (items.length === 0) {
      items.push('Manter o ritmo de prevencao e acompanhar os indicadores para evitar acumulacao de pendencias nos proximos ciclos.');
    }
    return items;
  }, [summary]);

  const centralStatus = useMemo(() => {
    const criticalTotal =
      summary.collaborators.notApt +
      summary.collaborators.asoExpired +
      summary.training.expired +
      summary.epi.expired +
      summary.nonconformities.critical +
      summary.incidents.critical +
      summary.inspections.late +
      extinguisherSummary.expired;
    const attentionTotal =
      summary.collaborators.asoNear +
      summary.training.nearExpiry +
      summary.epi.nearReplacement +
      summary.nonconformities.late +
      summary.incidents.lateInvestigations +
      extinguisherSummary.expiring;
    const totalPendings = pendings.length + extinguisherSummary.expired + extinguisherSummary.expiring + extinguisherSummary.nonconformity;

    if (criticalTotal > 0) {
      return {
        label: 'Critica',
        tone: 'danger' as const,
        text: `Sua empresa esta em situacao critica. Existem ${totalPendings} pendencias ativas, incluindo ${criticalTotal} itens vencidos ou criticos que exigem resposta imediata.`,
        criticalTotal,
        attentionTotal,
      };
    }
    if (attentionTotal > 0 || totalPendings > 0) {
      return {
        label: 'Atencao',
        tone: 'warning' as const,
        text: `Sua empresa esta em atencao. Existem ${totalPendings} pendencias ou vencimentos proximos que precisam ser acompanhados antes de virarem risco critico.`,
        criticalTotal,
        attentionTotal,
      };
    }
    return {
      label: 'Regular',
      tone: 'success' as const,
      text: 'Sua empresa esta regular nos filtros atuais. Nao ha pendencias criticas ou vencimentos relevantes acumulados.',
      criticalTotal,
      attentionTotal,
    };
  }, [extinguisherSummary, pendings.length, summary]);

  const todayAttentionItems = useMemo(() => {
    const items: Array<{ id: string; module: string; severity: 'baixa' | 'media' | 'alta' | 'critica'; description: string; count: number; section: DashboardSection; filters: Record<string, string> }> = [
      { id: 'aso-expired', module: 'Colaboradores', severity: 'critica' as const, description: 'ASOs vencidos em colaboradores ativos', count: summary.collaborators.asoExpired, section: 'collaborators' as DashboardSection, filters: { aso: 'vencido' } },
      { id: 'training-expired', module: 'Treinamentos', severity: 'critica' as const, description: 'Treinamentos obrigatorios vencidos', count: summary.training.expired, section: 'trainings' as DashboardSection, filters: { status: 'vencido' } },
      { id: 'epi-pending', module: 'Entregas de EPI', severity: 'alta' as const, description: 'EPIs pendentes ou vencidos', count: summary.epi.pending + summary.epi.expired, section: 'epiDeliveries' as DashboardSection, filters: { status: 'pendente' } },
      { id: 'ext-expired', module: 'Extintores', severity: 'critica' as const, description: 'Extintores vencidos ou com nao conformidade', count: extinguisherSummary.expired + extinguisherSummary.nonconformity, section: 'fireExtinguishers' as DashboardSection, filters: { status: 'vencido' } },
      { id: 'nc-late', module: 'Nao Conformidades', severity: 'alta' as const, description: 'Nao conformidades atrasadas ou criticas', count: summary.nonconformities.late + summary.nonconformities.critical, section: 'nonconformities' as DashboardSection, filters: { status: 'atrasada' } },
      { id: 'incidents-open', module: 'Incidentes', severity: 'alta' as const, description: 'Incidentes abertos ou investigacoes atrasadas', count: summary.incidents.open + summary.incidents.lateInvestigations, section: 'incidents' as DashboardSection, filters: { status: 'aberto' } },
      { id: 'inspections-late', module: 'Inspecoes', severity: 'media' as const, description: 'Inspecoes e planos de acao atrasados', count: summary.inspections.late + summary.inspections.lateActions, section: 'inspections' as DashboardSection, filters: { status: 'atrasada' } },
    ];
    return items.filter((item) => item.count > 0).slice(0, 8);
  }, [extinguisherSummary, summary]);

  const modulePendencyCards = useMemo(() => [
    {
      module: 'Colaboradores',
      section: 'collaborators' as DashboardSection,
      icon: Users,
      metrics: [
        ['Ativos', summary.collaborators.active],
        ['Com pendencias', summary.collaborators.pending],
        ['Nao aptos', summary.collaborators.notApt],
        ['ASOs vencidos', summary.collaborators.asoExpired],
      ],
    },
    {
      module: 'EPIs',
      section: 'epiDeliveries' as DashboardSection,
      icon: PackageCheck,
      metrics: [
        ['Pendentes', summary.epi.pending],
        ['Vencidos', summary.epi.expired],
        ['Prox. troca', summary.epi.nearReplacement],
        ['CAs vencidos', summary.epi.caExpired],
      ],
    },
    {
      module: 'Treinamentos',
      section: 'trainings' as DashboardSection,
      icon: GraduationCap,
      metrics: [
        ['Vencidos', summary.training.expired],
        ['A vencer', summary.training.nearExpiry],
        ['Pendentes', summary.training.pending],
        ['Nao aptos', summary.training.collaboratorsNotApt],
      ],
    },
    {
      module: 'Inspecoes',
      section: 'inspections' as DashboardSection,
      icon: ClipboardCheck,
      metrics: [
        ['Abertas', summary.inspections.open],
        ['Atrasadas', summary.inspections.late],
        ['Itens NC', summary.inspections.nonConformingItems],
        ['Acoes atrasadas', summary.inspections.lateActions],
      ],
    },
    {
      module: 'Nao Conformidades',
      section: 'nonconformities' as DashboardSection,
      icon: ShieldAlert,
      metrics: [
        ['Abertas', summary.nonconformities.open],
        ['Atrasadas', summary.nonconformities.late],
        ['Criticas', summary.nonconformities.critical],
        ['Sem responsavel', summary.nonconformities.withoutResponsible],
      ],
    },
    {
      module: 'Incidentes',
      section: 'incidents' as DashboardSection,
      icon: Siren,
      metrics: [
        ['Abertos', summary.incidents.open],
        ['Em investigacao', summary.incidents.investigating],
        ['Criticos', summary.incidents.critical],
        ['Acoes abertas', summary.incidents.preventiveActionsOpen],
      ],
    },
    {
      module: 'Extintores',
      section: 'fireExtinguishers' as DashboardSection,
      icon: Flame,
      metrics: [
        ['Conformes', extinguisherSummary.compliant],
        ['A vencer', extinguisherSummary.expiring],
        ['Vencidos', extinguisherSummary.expired],
        ['Com NC', extinguisherSummary.nonconformity],
      ],
    },
    {
      module: 'Custos',
      section: 'costsPrevention' as DashboardSection,
      icon: Wallet,
      metrics: [
        ['Preventivos', formatCurrency(summary.costs.prevention)],
        ['Corretivos', formatCurrency(summary.costs.correction)],
        ['Incidentes', formatCurrency(summary.costs.incidents)],
        ['Economia', formatCurrency(summary.costs.estimatedSavings)],
      ],
    },
  ], [extinguisherSummary, summary]);

  const upcomingExpirations = useMemo(() => {
    const items: Array<{ id: string; type: string; name: string; owner?: string; dueDate?: string; days: number; section: DashboardSection; status: string }> = [];
    filteredCollaborators.forEach((collaborator) => {
      const days = daysUntil(collaborator.aso_validade);
      if (typeof days === 'number' && days <= 60) items.push({ id: `aso-${collaborator.id}`, type: 'ASO', name: collaborator.nome_completo, owner: collaborator.setor, dueDate: collaborator.aso_validade, days, section: 'collaborators', status: days < 0 ? 'Vencido' : 'A vencer' });
    });
    filteredTrainingRecords.forEach((record) => {
      const days = daysUntil(record.data_vencimento);
      if (typeof days === 'number' && days <= 60) items.push({ id: `training-${record.id}`, type: 'Treinamento', name: record.treinamento?.nome || 'Treinamento', owner: record.colaborador?.nome_completo, dueDate: record.data_vencimento, days, section: 'trainings', status: days < 0 ? 'Vencido' : 'A vencer' });
    });
    filteredEpiDeliveries.forEach((delivery) => {
      const dueDate = delivery.data_proxima_troca || delivery.data_validade || delivery.epi?.validade_ca;
      const days = daysUntil(dueDate);
      if (typeof days === 'number' && days <= 60) items.push({ id: `epi-${delivery.id}`, type: 'EPI', name: delivery.epi?.nome || 'EPI', owner: delivery.colaborador?.nome_completo, dueDate, days, section: 'epiDeliveries', status: days < 0 ? 'Vencido' : 'A vencer' });
    });
    return items.sort((a, b) => a.days - b.days).slice(0, 10);
  }, [filteredCollaborators, filteredEpiDeliveries, filteredTrainingRecords]);

  const backingSummary = useMemo(() => {
    const signedEpiTerms = filteredEpiDeliveries.filter((item) => item.assinatura_url || item.comprovante_url).length;
    const certificates = filteredTrainingRecords.filter((item) => item.certificado_url).length;
    const asoValid = filteredCollaborators.filter((item) => getAsoStatus(item) === 'valid').length;
    const inspectionsWithEvidence = filteredInspections.filter((item) => item.itens?.some((child) => child.foto_url || child.anexo_url)).length;
    const ncEvidence = filteredNonconformities.filter((item) => item.evidencia_url || item.foto_url || item.evidencia_correcao_url).length;
    const incidentEvidence = filteredIncidents.filter((item) => item.evidencia_url || item.foto_url || item.evidencia_final_url).length;
    return {
      valid: signedEpiTerms + certificates + asoValid + inspectionsWithEvidence + ncEvidence + incidentEvidence,
      expired: summary.collaborators.asoExpired + summary.training.expired,
      missing: summary.epi.pending + summary.training.pending + filteredEpiDeliveries.filter((item) => !item.assinatura_url && !item.comprovante_url).length,
      unsigned: filteredEpiDeliveries.filter((item) => !item.assinatura_url).length,
      reportsMonth: reportItems.length,
      signedEpiTerms,
      certificates,
      asoValid,
    };
  }, [filteredCollaborators, filteredEpiDeliveries, filteredIncidents, filteredInspections, filteredNonconformities, filteredTrainingRecords, summary]);

  const topPendingSectors = useMemo(() => {
    const grouped = pendings.reduce<Record<string, number>>((acc, item) => {
      const key = item.sector || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [pendings]);

  const daySummaryText = useMemo(() => {
    const topSector = topPendingSectors[0]?.label;
    const main = todayAttentionItems.slice(0, 3).map((item) => `${item.count} ${item.description.toLowerCase()}`).join(', ');
    if (!todayAttentionItems.length) {
      return `Hoje nao ha pendencias criticas nos filtros atuais. ${topSector ? `O setor ${topSector} ainda merece acompanhamento preventivo.` : 'Mantenha os registros atualizados para preservar o respaldo documental.'}`;
    }
    return `Hoje existem ${pendings.length} pendencias ativas. As mais importantes envolvem ${main}. ${topSector ? `O setor ${topSector} concentra a maior quantidade de pendencias.` : ''}`;
  }, [pendings.length, todayAttentionItems, topPendingSectors]);

  const criticalSectors = useMemo(() => {
    const grouped = pendings.reduce<Record<string, { pending: number; critical: number; cost: number }>>((acc, item) => {
      const key = item.sector || 'Nao informado';
      acc[key] = acc[key] || { pending: 0, critical: 0, cost: 0 };
      acc[key].pending += 1;
      if (item.severity === 'critica' || item.severity === 'alta') acc[key].critical += 1;
      return acc;
    }, {});
    filteredCosts.forEach((item) => {
      const key = item.setor || 'Nao informado';
      grouped[key] = grouped[key] || { pending: 0, critical: 0, cost: 0 };
      if (['correcao', 'incidente', 'afastamento', 'multa_autuacao', 'retrabalho', 'manutencao_corretiva'].includes(item.categoria)) grouped[key].cost += Number(item.valor || 0);
    });
    return Object.entries(grouped)
      .map(([sector, value]) => ({
        sector,
        pending: value.pending,
        cost: value.cost,
        risk: value.critical >= 5 || value.cost > 10000 ? 'alto' : value.critical >= 2 || value.pending >= 5 ? 'medio' : 'baixo',
      }))
      .sort((a, b) => b.pending - a.pending || b.cost - a.cost)
      .slice(0, 5);
  }, [filteredCosts, pendings]);

  const collaboratorsWithMostPendings = useMemo(() => {
    const grouped = pendings.reduce<Record<string, { count: number; critical?: PendingItem }>>((acc, item) => {
      if (!item.collaborator) return acc;
      acc[item.collaborator] = acc[item.collaborator] || { count: 0 };
      acc[item.collaborator].count += 1;
      if (!acc[item.collaborator].critical || severityWeight(item.severity) > severityWeight(acc[item.collaborator].critical!.severity)) acc[item.collaborator].critical = item;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([name, info]) => {
        const collaborator = filteredCollaborators.find((item) => item.nome_completo === name);
        return {
          name,
          role: collaborator?.funcao || '-',
          sector: collaborator?.setor || info.critical?.sector || '-',
          count: info.count,
          critical: info.critical?.type || '-',
          status: info.critical?.severity === 'critica' ? 'Critico' : info.critical?.severity === 'alta' ? 'Atencao' : 'Monitorar',
          id: collaborator?.id,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredCollaborators, pendings]);

  const topIncidentSectors = useMemo(() => {
    const grouped = filteredIncidents.reduce<Record<string, number>>((acc, item) => {
      const key = item.setor || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredIncidents]);

  const costsByCategory = useMemo(() => {
    const grouped = filteredCosts.reduce<Record<string, number>>((acc, item) => {
      const key = item.categoria || 'Nao informado';
      acc[key] = (acc[key] || 0) + Number(item.valor || 0);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredCosts]);

  const costsByMonth = useMemo(() => {
    const grouped = filteredCosts.reduce<Record<string, number>>((acc, item) => {
      const key = monthLabel(item.data_custo);
      acc[key] = (acc[key] || 0) + Number(item.valor || 0);
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .slice(-6);
  }, [filteredCosts]);

  const incidentsByMonth = useMemo(() => {
    const grouped = filteredIncidents.reduce<Record<string, number>>((acc, item) => {
      const key = monthLabel(item.data_ocorrencia);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .slice(-6);
  }, [filteredIncidents]);

  const nonconformitiesByMonth = useMemo(() => {
    const grouped = filteredNonconformities.reduce<Record<string, number>>((acc, item) => {
      const key = monthLabel(item.data_identificacao);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([label, value]) => ({ label, value }))
      .slice(-6);
  }, [filteredNonconformities]);

  const collaboratorsByStatus = useMemo(() => {
    const grouped = filteredCollaborators.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredCollaborators]);

  const trainingsByStatus = useMemo(() => {
    const grouped = filteredTrainingRecords.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredTrainingRecords]);

  const episByStatus = useMemo(() => {
    const grouped = filteredEpiDeliveries.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredEpiDeliveries]);

  const inspectionsByStatus = useMemo(() => {
    const grouped = filteredInspections.reduce<Record<string, number>>((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredInspections]);

  const incidentsByType = useMemo(() => {
    const grouped = filteredIncidents.reduce<Record<string, number>>((acc, item) => {
      acc[item.tipo_ocorrencia] = (acc[item.tipo_ocorrencia] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredIncidents]);

  const incidentsBySector = useMemo(() => {
    const grouped = filteredIncidents.reduce<Record<string, number>>((acc, item) => {
      const key = item.setor || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredIncidents]);

  const nonconformitiesBySeverity = useMemo(() => {
    const grouped = filteredNonconformities.reduce<Record<string, number>>((acc, item) => {
      acc[item.gravidade] = (acc[item.gravidade] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([label, value]) => ({ label, value }));
  }, [filteredNonconformities]);

  const preventionVsCorrection = useMemo(
    () => [
      { label: 'Prevencao', value: summary.costs.prevention },
      { label: 'Correcao', value: summary.costs.correction },
      { label: 'Incidentes', value: summary.costs.incidents },
    ],
    [summary.costs],
  );

  const visualCharts = useMemo<VisualChartDefinition[]>(() => {
    const collaboratorsBySector = toChartItems(filteredCollaborators.reduce<Record<string, number>>((acc, item) => {
      const key = item.setor || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}), 8);
    const pendingByModule = toChartItems(pendings.reduce<Record<string, number>>((acc, item) => {
      acc[item.module] = (acc[item.module] || 0) + 1;
      return acc;
    }, {}));
    const epiPendingBySector = toChartItems(filteredEpiDeliveries.filter((item) => item.status === 'pendente' || item.status === 'vencido').reduce<Record<string, number>>((acc, item) => {
      const key = item.colaborador?.setor || collaboratorMap.get(item.colaborador_id)?.setor || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}), 8);
    const epiTopDelivered = toChartItems(filteredEpiDeliveries.reduce<Record<string, number>>((acc, item) => {
      const key = item.epi?.nome || 'EPI nao informado';
      acc[key] = (acc[key] || 0) + Number(item.quantidade || 1);
      return acc;
    }, {}), 5);
    const expiredTrainingByRole = toChartItems(filteredTrainingRecords.filter((item) => item.status === 'vencido').reduce<Record<string, number>>((acc, item) => {
      const key = item.colaborador?.funcao || collaboratorMap.get(item.colaborador_id)?.funcao || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}), 8);
    const inspectionsByResponsible = toChartItems(filteredInspections.reduce<Record<string, number>>((acc, item) => {
      const key = item.responsavel_inspecao || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}), 8);
    const ncBySector = toChartItems(filteredNonconformities.reduce<Record<string, number>>((acc, item) => {
      const key = item.setor || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}), 8);
    const ncByOrigin = toChartItems(filteredNonconformities.reduce<Record<string, number>>((acc, item) => {
      const key = item.origem || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}), 8);
    const incidentsBySeverity = toChartItems(filteredIncidents.reduce<Record<string, number>>((acc, item) => {
      const key = item.gravidade || item.nivel_risco || 'Nao informado';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}));
    const incidentCauses = toChartItems(filteredIncidents.reduce<Record<string, number>>((acc, item) => {
      const key = item.causa_raiz_confirmada || item.causa_raiz || item.causa_imediata || 'Sem causa raiz';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}), 5);
    const costsBySector = toChartItems(filteredCosts.reduce<Record<string, number>>((acc, item) => {
      const key = item.setor || 'Nao informado';
      acc[key] = (acc[key] || 0) + Number(item.valor || 0);
      return acc;
    }, {}), 8);
    const costsByOrigin = toChartItems(filteredCosts.reduce<Record<string, number>>((acc, item) => {
      const key = item.origem || 'Nao informado';
      acc[key] = (acc[key] || 0) + Number(item.valor || 0);
      return acc;
    }, {}), 8);
    const topCosts = filteredCosts
      .slice()
      .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))
      .slice(0, 5)
      .map((item) => ({ label: item.descricao || item.categoria, value: Number(item.valor || 0) }));

    const charts: VisualChartDefinition[] = [
      { id: 'risk-summary', title: 'Pendencias por modulo', description: 'Distribuicao das pendencias consolidadas por origem.', module: 'resumo', kind: 'bar', data: pendingByModule, insight: pendingByModule[0] ? `${pendingByModule[0].label} concentra a maior quantidade de pendencias no periodo.` : 'Nenhuma pendencia encontrada no periodo.', target: { section: 'dashboardGeneral' } },
      { id: 'collaborators-status', title: 'Colaboradores por status', description: 'Situacao geral da base de colaboradores.', module: 'colaboradores', kind: 'donut', data: collaboratorsByStatus, insight: summary.collaborators.notApt > 0 ? 'Existem colaboradores nao aptos ou com pendencias criticas.' : 'A base de colaboradores nao apresenta pendencias criticas no filtro atual.', target: { section: 'collaborators' } },
      { id: 'collaborators-sector', title: 'Colaboradores por setor', description: 'Distribuicao de colaboradores ativos por setor.', module: 'colaboradores', kind: 'bar', data: collaboratorsBySector, insight: collaboratorsBySector[0] ? `${collaboratorsBySector[0].label} possui a maior concentracao de colaboradores.` : 'Nenhum colaborador encontrado.', target: { section: 'collaborators' } },
      { id: 'epi-status', title: 'EPIs por status', description: 'Entregas de EPI agrupadas por situacao.', module: 'epis', kind: 'donut', data: episByStatus, insight: summary.epi.pending + summary.epi.expired > 0 ? 'Existem EPIs pendentes ou vencidos que exigem regularizacao.' : 'Nao ha EPIs vencidos ou pendentes no filtro atual.', target: { section: 'epiDeliveries' } },
      { id: 'epi-sector', title: 'EPIs pendentes por setor', description: 'Setores com maior concentracao de EPIs pendentes ou vencidos.', module: 'epis', kind: 'bar', data: epiPendingBySector, insight: epiPendingBySector[0] ? `O setor ${epiPendingBySector[0].label} concentra mais EPIs pendentes ou vencidos.` : 'Nao ha EPIs pendentes por setor no filtro atual.', target: { section: 'epiDeliveries', filters: { status: 'pendente' } } },
      { id: 'epi-top', title: 'Top 5 EPIs mais entregues', description: 'EPIs com maior volume de entregas registradas.', module: 'epis', kind: 'ranking', data: epiTopDelivered, insight: epiTopDelivered[0] ? `${epiTopDelivered[0].label} e o EPI mais entregue no periodo.` : 'Sem entregas de EPI no periodo.', target: { section: 'epiDeliveries' } },
      { id: 'training-status', title: 'Treinamentos por status', description: 'Distribuicao dos registros de treinamento.', module: 'treinamentos', kind: 'donut', data: trainingsByStatus, insight: summary.training.expired > 0 ? 'Treinamentos vencidos podem impactar a aptidao dos colaboradores.' : 'Nao ha treinamentos vencidos no filtro atual.', target: { section: 'trainings' } },
      { id: 'training-expired-role', title: 'Treinamentos vencidos por funcao', description: 'Funcoes mais impactadas por treinamentos vencidos.', module: 'treinamentos', kind: 'bar', data: expiredTrainingByRole, insight: expiredTrainingByRole[0] ? `${expiredTrainingByRole[0].label} e a funcao mais impactada por treinamentos vencidos.` : 'Nao ha treinamentos vencidos por funcao.', target: { section: 'trainings', filters: { status: 'vencido' } } },
      { id: 'inspection-status', title: 'Inspecoes por status', description: 'Situacao operacional das inspecoes.', module: 'inspecoes', kind: 'donut', data: inspectionsByStatus, insight: summary.inspections.late > 0 ? 'Inspecoes atrasadas devem ser priorizadas para reduzir risco operacional.' : 'Nao ha inspecoes atrasadas no filtro atual.', target: { section: 'inspections' } },
      { id: 'inspection-responsible', title: 'Inspecoes por responsavel', description: 'Volume de inspecoes por responsavel.', module: 'inspecoes', kind: 'bar', data: inspectionsByResponsible, insight: inspectionsByResponsible[0] ? `${inspectionsByResponsible[0].label} concentra mais inspecoes registradas.` : 'Sem inspecoes por responsavel.', target: { section: 'inspections' } },
      { id: 'nc-month', title: 'Evolucao de nao conformidades por mes', description: 'Evolucao mensal das nao conformidades registradas.', module: 'naoConformidades', kind: 'line', data: nonconformitiesByMonth, insight: variationInsight('Nao conformidades', nonconformitiesByMonth), target: { section: 'nonconformities' } },
      { id: 'nc-severity', title: 'Nao conformidades por gravidade', description: 'Distribuicao das NCs por gravidade.', module: 'naoConformidades', kind: 'donut', data: nonconformitiesBySeverity, insight: summary.nonconformities.critical > 0 ? 'As nao conformidades criticas devem ser priorizadas para reduzir risco operacional.' : 'Nao ha NCs criticas no filtro atual.', target: { section: 'nonconformities', filters: { gravidade: 'critica' } } },
      { id: 'nc-sector', title: 'Nao conformidades por setor', description: 'Setores com maior numero de desvios.', module: 'naoConformidades', kind: 'bar', data: ncBySector, insight: ncBySector[0] ? `${ncBySector[0].label} concentra mais nao conformidades.` : 'Sem NCs por setor.', target: { section: 'nonconformities' } },
      { id: 'nc-origin', title: 'Top origens de nao conformidades', description: 'Origens mais recorrentes das NCs.', module: 'naoConformidades', kind: 'ranking', data: ncByOrigin, insight: ncByOrigin[0] ? `${ncByOrigin[0].label} e a origem mais recorrente de NCs.` : 'Sem origens de NC no periodo.', target: { section: 'nonconformities' } },
      { id: 'incidents-month', title: 'Incidentes por mes', description: 'Evolucao mensal das ocorrencias registradas.', module: 'incidentes', kind: 'line', data: incidentsByMonth, insight: variationInsight('Incidentes', incidentsByMonth), target: { section: 'incidents' } },
      { id: 'incidents-type', title: 'Incidentes por tipo', description: 'Distribuicao das ocorrencias por tipo.', module: 'incidentes', kind: 'donut', data: incidentsByType, insight: incidentsByType[0] ? `${incidentsByType[0].label} e o tipo de ocorrencia mais frequente.` : 'Sem incidentes por tipo.', target: { section: 'incidents' } },
      { id: 'incidents-sector', title: 'Incidentes por setor', description: 'Setores com maior volume de incidentes.', module: 'incidentes', kind: 'bar', data: incidentsBySector, insight: incidentsBySector[0] ? `${incidentsBySector[0].label} concentra mais incidentes no periodo.` : 'Sem incidentes por setor.', target: { section: 'incidents' } },
      { id: 'incidents-severity', title: 'Incidentes por gravidade', description: 'Distribuicao dos incidentes por gravidade.', module: 'incidentes', kind: 'donut', data: incidentsBySeverity, insight: summary.incidents.critical > 0 ? 'Incidentes criticos exigem investigacao e acao preventiva imediata.' : 'Nao ha incidentes criticos no filtro atual.', target: { section: 'incidents', filters: { gravidade: 'critica' } } },
      { id: 'incident-causes', title: 'Top 5 causas de incidentes', description: 'Causas mais frequentes informadas nas investigacoes.', module: 'incidentes', kind: 'ranking', data: incidentCauses, insight: incidentCauses[0] ? `${incidentCauses[0].label} aparece como causa mais frequente.` : 'Sem causas registradas.', target: { section: 'incidents' } },
      { id: 'costs-month', title: 'Custos por mes', description: 'Evolucao mensal dos custos de seguranca.', module: 'custos', kind: 'line', data: costsByMonth, insight: variationInsight('Custos', costsByMonth, 'em custos'), formatter: formatCurrency, target: { section: 'costsPrevention' } },
      { id: 'costs-category', title: 'Custos por categoria', description: 'Distribuicao dos custos por categoria financeira.', module: 'custos', kind: 'bar', data: costsByCategory, insight: costsByCategory[0] ? `${costCategoryLabels[costsByCategory[0].label as keyof typeof costCategoryLabels] || costsByCategory[0].label} concentra o maior custo.` : 'Sem custos por categoria.', formatter: formatCurrency, target: { section: 'costsPrevention' } },
      { id: 'costs-sector', title: 'Custos por setor', description: 'Setores com maior impacto financeiro.', module: 'custos', kind: 'bar', data: costsBySector, insight: costsBySector[0] ? `${costsBySector[0].label} e o setor com maior custo no periodo.` : 'Sem custos por setor.', formatter: formatCurrency, target: { section: 'costsPrevention' } },
      { id: 'costs-origin', title: 'Custos por origem', description: 'Distribuicao financeira por origem do lancamento.', module: 'custos', kind: 'donut', data: costsByOrigin, insight: costsByOrigin[0] ? `${costsByOrigin[0].label} e a origem com maior impacto financeiro.` : 'Sem custos por origem.', formatter: formatCurrency, target: { section: 'costsPrevention' } },
      { id: 'prevention-correction', title: 'Prevencao x Correcao', description: 'Comparativo entre investimento preventivo e custos corretivos/incidentes.', module: 'custos', kind: 'comparison', data: preventionVsCorrection, insight: summary.costs.correction > summary.costs.prevention ? 'Os custos corretivos estao maiores que os preventivos no periodo filtrado.' : 'Os custos preventivos estao em melhor posicao que os corretivos.', formatter: formatCurrency, target: { section: 'costsPrevention' } },
      { id: 'top-costs', title: 'Top 5 custos mais altos', description: 'Lancamentos financeiros com maior valor individual.', module: 'custos', kind: 'ranking', data: topCosts, insight: topCosts[0] ? `${topCosts[0].label} e o maior custo registrado no periodo.` : 'Sem custos registrados.', formatter: formatCurrency, target: { section: 'costsPrevention' } },
    ];

    return charts;
  }, [collaboratorMap, collaboratorsByStatus, costsByCategory, costsByMonth, episByStatus, filteredCollaborators, filteredCosts, filteredEpiDeliveries, filteredIncidents, filteredInspections, filteredNonconformities, filteredTrainingRecords, incidentsByMonth, incidentsBySector, incidentsByType, inspectionsByStatus, nonconformitiesByMonth, nonconformitiesBySeverity, pendings, preventionVsCorrection, summary, trainingsByStatus]);

  const filteredVisualCharts = useMemo(
    () => visualCharts.filter((chart) => (chartTypeFilter === 'todos' || chart.kind === chartTypeFilter) && (chartModuleFilter === 'todos' || chart.module === chartModuleFilter)),
    [chartModuleFilter, chartTypeFilter, visualCharts],
  );

  const selectedCharts = useMemo(
    () => visualCharts.filter((chart) => selectedChartIds.includes(chart.id)),
    [selectedChartIds, visualCharts],
  );

  const toggleChartInReport = (chartId: string) => {
    setSelectedChartIds((current) => current.includes(chartId) ? current.filter((id) => id !== chartId) : [...current, chartId]);
  };

  const handleGenerateChartAiAnalysis = (chart: VisualChartDefinition) => {
    const analysis = generateChartAiAnalysis(chart);
    setChartAnalyses((current) => ({ ...current, [chart.id]: analysis }));
    toast({
      title: 'Análise gerada',
      description: `A análise do gráfico "${chart.title}" foi criada no card.`,
    });
  };

  const handleGenerateExecutiveAiAnalysis = () => {
    const chartsForAnalysis = selectedCharts.length ? selectedCharts : visualCharts.slice(0, 5);
    const analysis = generateExecutiveAiAnalysis(companyName || 'empresa', risk, chartsForAnalysis, recommendations);
    setExecutiveAiAnalysis(analysis);
    toast({
      title: 'Análise executiva gerada',
      description: 'O texto executivo foi criado com base nos indicadores atuais.',
    });
  };

  const cardGroups = useMemo(
    (): Array<{ title: string; icon: typeof BarChart3; cards: DashboardCardConfig[] }> => [
      {
        title: 'Colaboradores',
        icon: Users,
        cards: [
          { title: 'Total de colaboradores ativos', value: summary.collaborators.active, helper: `${summary.collaborators.pending} com pendencias`, icon: Users, section: 'collaborators' as DashboardSection, filters: { status: 'ativo' } },
          { title: 'Colaboradores afastados', value: summary.collaborators.afastados, helper: 'Status afastado', icon: Users, tone: summary.collaborators.afastados > 0 ? 'warning' as const : 'default' as const, section: 'collaborators' as DashboardSection, filters: { status: 'afastado' } },
          { title: 'Colaboradores com pendencias', value: summary.collaborators.pending, helper: 'EPI ou treinamento pendente', icon: AlertTriangle, tone: summary.collaborators.pending > 0 ? 'warning' as const : 'default' as const, section: 'collaborators' as DashboardSection, filters: { metric: 'pendencias' } },
          { title: 'Colaboradores nao aptos', value: summary.collaborators.notApt, helper: 'Restricao por pendencias criticas', icon: ShieldAlert, tone: summary.collaborators.notApt > 0 ? 'danger' as const : 'default' as const, section: 'collaborators' as DashboardSection, filters: { metric: 'nao_aptos' } },
          { title: 'ASOs vencidos', value: summary.collaborators.asoExpired, helper: 'Colaboradores ativos com ASO vencido', icon: AlertTriangle, tone: summary.collaborators.asoExpired > 0 ? 'danger' as const : 'default' as const, section: 'collaborators' as DashboardSection, filters: { aso: 'expired' } },
          { title: 'ASOs proximos do vencimento', value: summary.collaborators.asoNear, helper: 'Vencem nos proximos 30 dias', icon: FileText, tone: summary.collaborators.asoNear > 0 ? 'warning' as const : 'default' as const, section: 'collaborators' as DashboardSection, filters: { aso: 'near' } },
        ],
      },
      {
        title: 'EPIs',
        icon: PackageCheck,
        cards: [
          { title: 'EPIs entregues', value: summary.epi.delivered, helper: 'Entregas confirmadas', icon: PackageCheck, section: 'epiDeliveries' as DashboardSection, filters: { status: 'entregue' } },
          { title: 'EPIs pendentes', value: summary.epi.pending, helper: 'Entregas em aberto', icon: PackageCheck, tone: summary.epi.pending > 0 ? 'warning' as const : 'default' as const, section: 'epiDeliveries' as DashboardSection, filters: { status: 'pendente' } },
          { title: 'EPIs vencidos', value: summary.epi.expired, helper: 'Substituicao necessaria', icon: PackageCheck, tone: summary.epi.expired > 0 ? 'danger' as const : 'default' as const, section: 'epiDeliveries' as DashboardSection, filters: { status: 'vencido' } },
          { title: 'EPIs proximos da troca', value: summary.epi.nearReplacement, helper: 'Troca planejada', icon: PackageCheck, tone: summary.epi.nearReplacement > 0 ? 'warning' as const : 'default' as const, section: 'epiDeliveries' as DashboardSection, filters: { status: 'proximo_troca' } },
          { title: 'CAs vencidos', value: summary.epi.caExpired, helper: 'Certificados de aprovacao vencidos', icon: ShieldAlert, tone: summary.epi.caExpired > 0 ? 'danger' as const : 'default' as const, section: 'epiDeliveries' as DashboardSection, filters: { ca: 'vencido' } },
          { title: 'Colaboradores sem EPI obrigatorio', value: summary.epi.withoutRequired, helper: 'Pendencia por funcao', icon: ShieldAlert, tone: summary.epi.withoutRequired > 0 ? 'danger' as const : 'default' as const, section: 'epiDeliveries' as DashboardSection, filters: { metric: 'sem_epi_obrigatorio' } },
        ],
      },
      {
        title: 'Treinamentos',
        icon: GraduationCap,
        cards: [
          { title: 'Treinamentos validos', value: summary.training.valid, helper: 'Registros em dia', icon: GraduationCap, section: 'trainings' as DashboardSection, filters: { status: 'valido' } },
          { title: 'Treinamentos pendentes', value: summary.training.pending, helper: 'Capacitacoes em aberto', icon: GraduationCap, tone: summary.training.pending > 0 ? 'warning' as const : 'default' as const, section: 'trainings' as DashboardSection, filters: { status: 'pendente' } },
          { title: 'Treinamentos vencidos', value: summary.training.expired, helper: 'Reciclagem necessaria', icon: GraduationCap, tone: summary.training.expired > 0 ? 'danger' as const : 'default' as const, section: 'trainings' as DashboardSection, filters: { status: 'vencido' } },
          { title: 'Treinamentos proximos do vencimento', value: summary.training.nearExpiry, helper: 'Reciclagem proxima', icon: GraduationCap, tone: summary.training.nearExpiry > 0 ? 'warning' as const : 'default' as const, section: 'trainings' as DashboardSection, filters: { status: 'proximo_vencimento' } },
          { title: 'Colaboradores com treinamento vencido', value: summary.training.collaboratorsExpired, helper: 'Impacto direto na aptidao', icon: ShieldAlert, tone: summary.training.collaboratorsExpired > 0 ? 'danger' as const : 'default' as const, section: 'trainings' as DashboardSection, filters: { metric: 'colaboradores_vencidos' } },
          { title: 'Colaboradores nao aptos por treinamento', value: summary.training.collaboratorsNotApt, helper: 'Treinamento vencido ou ausente', icon: ShieldAlert, tone: summary.training.collaboratorsNotApt > 0 ? 'danger' as const : 'default' as const, section: 'trainings' as DashboardSection, filters: { metric: 'nao_aptos' } },
          { title: 'Certificados pendentes', value: summary.training.pending, helper: 'Registros que exigem comprovante', icon: FileText, tone: summary.training.pending > 0 ? 'warning' as const : 'default' as const, section: 'trainings' as DashboardSection, filters: { metric: 'certificados_pendentes' } },
        ],
      },
      {
        title: 'Inspecoes',
        icon: ClipboardCheck,
        cards: [
          { title: 'Inspecoes realizadas', value: summary.inspections.total, helper: 'Total no filtro atual', icon: ClipboardCheck, section: 'inspections' as DashboardSection },
          { title: 'Inspecoes abertas', value: summary.inspections.open, helper: 'Abertas ou em andamento', icon: ClipboardCheck, tone: summary.inspections.open > 0 ? 'warning' as const : 'default' as const, section: 'inspections' as DashboardSection, filters: { status: 'aberta' } },
          { title: 'Inspecoes em andamento', value: summary.inspections.inProgress, helper: 'Em execucao ou tratativa', icon: ClipboardCheck, tone: summary.inspections.inProgress > 0 ? 'warning' as const : 'default' as const, section: 'inspections' as DashboardSection, filters: { status: 'em_andamento' } },
          { title: 'Inspecoes atrasadas', value: summary.inspections.late, helper: 'Prazos vencidos', icon: ClipboardCheck, tone: summary.inspections.late > 0 ? 'danger' as const : 'default' as const, section: 'inspections' as DashboardSection, filters: { status: 'atrasada' } },
          { title: 'Itens nao conformes encontrados', value: summary.inspections.nonConformingItems, helper: 'Itens de checklist', icon: ShieldAlert, tone: summary.inspections.nonConformingItems > 0 ? 'warning' as const : 'default' as const, section: 'inspections' as DashboardSection, filters: { metric: 'itens_nao_conformes' } },
          { title: 'Planos de acao atrasados', value: summary.inspections.lateActions, helper: 'Acoes de inspecao em atraso', icon: AlertTriangle, tone: summary.inspections.lateActions > 0 ? 'danger' as const : 'default' as const, section: 'inspections' as DashboardSection, filters: { metric: 'acoes_atrasadas' } },
          { title: 'Inspecoes com risco alto ou critico', value: summary.inspections.highRisk, helper: 'Priorizacao de campo', icon: AlertTriangle, tone: summary.inspections.highRisk > 0 ? 'danger' as const : 'default' as const, section: 'inspections' as DashboardSection, filters: { gravidade: 'alto' } },
        ],
      },
      {
        title: 'Nao Conformidades',
        icon: ShieldAlert,
        cards: [
          { title: 'Nao conformidades abertas', value: summary.nonconformities.open, helper: 'Aguardando tratativa', icon: ShieldAlert, tone: summary.nonconformities.open > 0 ? 'warning' as const : 'default' as const, section: 'nonconformities' as DashboardSection, filters: { status: 'aberta' } },
          { title: 'Nao conformidades em correcao', value: summary.nonconformities.correcting, helper: 'Com acao em andamento', icon: ShieldAlert, section: 'nonconformities' as DashboardSection, filters: { status: 'em_correcao' } },
          { title: 'Nao conformidades atrasadas', value: summary.nonconformities.late, helper: 'Prazo de correcao vencido', icon: ShieldAlert, tone: summary.nonconformities.late > 0 ? 'danger' as const : 'default' as const, section: 'nonconformities' as DashboardSection, filters: { status: 'atrasada' } },
          { title: 'Nao conformidades criticas', value: summary.nonconformities.critical, helper: 'Gravidade ou risco critico', icon: ShieldAlert, tone: summary.nonconformities.critical > 0 ? 'danger' as const : 'default' as const, section: 'nonconformities' as DashboardSection, filters: { gravidade: 'critica' } },
          { title: 'Correcoes pendentes de validacao', value: summary.nonconformities.pendingValidation, helper: 'Resolvidas aguardando validacao', icon: CheckCircle2, tone: summary.nonconformities.pendingValidation > 0 ? 'warning' as const : 'default' as const, section: 'nonconformities' as DashboardSection, filters: { validacao: 'pendente' } },
          { title: 'NCs sem responsavel', value: summary.nonconformities.withoutResponsible, helper: 'Abertas sem dono definido', icon: Users, tone: summary.nonconformities.withoutResponsible > 0 ? 'warning' as const : 'default' as const, section: 'nonconformities' as DashboardSection, filters: { responsavel: 'sem_responsavel' } },
        ],
      },
      {
        title: 'Extintores',
        icon: Flame,
        cards: [
          { title: 'Total de extintores', value: extinguisherSummary.total, helper: 'Equipamentos cadastrados', icon: Flame, section: 'fireExtinguishers' as DashboardSection },
          { title: 'Extintores em conformidade', value: extinguisherSummary.compliant, helper: 'Dentro do prazo e sem NC aberta', icon: CheckCircle2, tone: 'success' as const, section: 'fireExtinguishers' as DashboardSection, filters: { status: 'em_conformidade' } },
          { title: 'Extintores vencidos', value: extinguisherSummary.expired, helper: 'Recarga ou validade vencida', icon: AlertTriangle, tone: extinguisherSummary.expired > 0 ? 'danger' as const : 'default' as const, section: 'fireExtinguishers' as DashboardSection, filters: { status: 'vencido' } },
          { title: 'Extintores a vencer', value: extinguisherSummary.expiring, helper: 'Vencimento em ate 30 dias', icon: CalendarClock, tone: extinguisherSummary.expiring > 0 ? 'warning' as const : 'default' as const, section: 'fireExtinguishers' as DashboardSection, filters: { status: 'a_vencer' } },
          { title: 'Extintores com NC', value: extinguisherSummary.nonconformity, helper: 'Nao conformidade aberta', icon: ShieldAlert, tone: extinguisherSummary.nonconformity > 0 ? 'danger' as const : 'default' as const, section: 'fireExtinguishers' as DashboardSection, filters: { nc: 'sim' } },
        ],
      },
      {
        title: 'Incidentes',
        icon: Siren,
        cards: [
          { title: 'Incidentes abertos', value: summary.incidents.open, helper: 'Ainda nao concluidos', icon: Siren, tone: summary.incidents.open > 0 ? 'warning' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { status: 'aberto' } },
          { title: 'Incidentes em investigacao', value: summary.incidents.investigating, helper: 'Investigacao em andamento', icon: Siren, tone: summary.incidents.investigating > 0 ? 'warning' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { status: 'em_investigacao' } },
          { title: 'Quase acidentes', value: summary.incidents.nearMisses, helper: 'Ocorrencias sem lesao', icon: Siren, tone: summary.incidents.nearMisses > 0 ? 'warning' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { tipo_ocorrencia: 'quase_acidente' } },
          { title: 'Acidentes com lesao', value: summary.incidents.withInjury, helper: 'Lesao registrada', icon: Siren, tone: summary.incidents.withInjury > 0 ? 'danger' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { tipo_ocorrencia: 'acidente_com_lesao' } },
          { title: 'Acidentes com afastamento', value: summary.incidents.withLeave, helper: 'Com dias de afastamento', icon: Siren, tone: summary.incidents.withLeave > 0 ? 'danger' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { tipo_ocorrencia: 'acidente_com_afastamento' } },
          { title: 'Incidentes criticos', value: summary.incidents.critical, helper: 'Gravidade ou risco critico', icon: AlertTriangle, tone: summary.incidents.critical > 0 ? 'danger' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { gravidade: 'critica' } },
          { title: 'Investigacoes atrasadas', value: summary.incidents.lateInvestigations, helper: 'Prazo de investigacao vencido', icon: AlertTriangle, tone: summary.incidents.lateInvestigations > 0 ? 'danger' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { metric: 'investigacoes_atrasadas' } },
          { title: 'Acoes preventivas abertas', value: summary.incidents.preventiveActionsOpen, helper: 'Acoes ainda nao concluidas', icon: CheckCircle2, tone: summary.incidents.preventiveActionsOpen > 0 ? 'warning' as const : 'default' as const, section: 'incidents' as DashboardSection, filters: { metric: 'acoes_preventivas_abertas' } },
        ],
      },
      {
        title: 'Custos',
        icon: Wallet,
        cards: [
          { title: 'Custo total de seguranca', value: formatCurrency(summary.costs.total), helper: 'Soma geral filtrada', icon: Wallet, section: 'costsPrevention' as DashboardSection, filters: { metric: 'total' } },
          { title: 'Custo com prevencao', value: formatCurrency(summary.costs.prevention), helper: 'Investimento preventivo', icon: TrendingUp, tone: 'success' as const, section: 'costsPrevention' as DashboardSection, filters: { categoria: 'prevencao' } },
          { title: 'Custo com correcao', value: formatCurrency(summary.costs.correction), helper: 'Gastos corretivos', icon: TrendingDown, tone: summary.costs.correction > summary.costs.prevention ? 'warning' as const : 'default' as const, section: 'costsPrevention' as DashboardSection, filters: { categoria: 'correcao' } },
          { title: 'Custo com incidentes', value: formatCurrency(summary.costs.incidents), helper: 'Impacto financeiro de incidentes', icon: Coins, tone: summary.costs.incidents > 0 ? 'warning' as const : 'default' as const, section: 'costsPrevention' as DashboardSection, filters: { categoria: 'incidente' } },
          { title: 'Custo com nao conformidades', value: formatCurrency(summary.costs.nonconformities), helper: 'Correcoes e adequacoes vinculadas', icon: ShieldAlert, tone: summary.costs.nonconformities > 0 ? 'warning' as const : 'default' as const, section: 'costsPrevention' as DashboardSection, filters: { origem: 'nao_conformidade' } },
          { title: 'Custo com EPIs', value: formatCurrency(summary.costs.epi), helper: 'Entregas e compras de EPI', icon: PackageCheck, section: 'costsPrevention' as DashboardSection, filters: { categoria: 'EPI' } },
          { title: 'Custo com treinamentos', value: formatCurrency(summary.costs.trainings), helper: 'Capacitacoes e reciclagens', icon: GraduationCap, section: 'costsPrevention' as DashboardSection, filters: { categoria: 'treinamento' } },
          { title: 'Economia preventiva estimada', value: formatCurrency(summary.costs.estimatedSavings), helper: summary.costs.topSector, icon: TrendingUp, tone: summary.costs.prevention >= summary.costs.correction ? 'success' as const : 'warning' as const, section: 'costsPrevention' as DashboardSection, filters: { metric: 'economia' } },
        ],
      },
    ],
    [extinguisherSummary, summary],
  );

  const navigateToSection = (section: DashboardSection, filters?: Record<string, string>) => {
    navigateCompanySection(companyId, section, filters);
  };

  const exportExecutiveCsv = () => {
    const success = downloadCsv(`dashboard-geral-seguranca-${Date.now()}.csv`, [
      {
        empresa: companyName || 'Empresa',
        periodo: period,
        colaboradores_ativos: summary.collaborators.active,
        colaboradores_afastados: summary.collaborators.afastados,
        colaboradores_desligados: summary.collaborators.desligados,
        epi_pendentes: summary.epi.pending,
        epi_vencidos: summary.epi.expired,
        treinamentos_vencidos: summary.training.expired,
        inspecoes_atrasadas: summary.inspections.late,
        nao_conformidades_criticas: summary.nonconformities.critical,
        incidentes_criticos: summary.incidents.critical,
        custo_total: summary.costs.total,
        custo_prevencao: summary.costs.prevention,
        custo_correcao: summary.costs.correction,
        custo_incidentes: summary.costs.incidents,
        economia_preventiva_estimada: summary.costs.estimatedSavings,
        nivel_geral_de_risco: risk.level,
      },
    ]);

    if (success) {
      toast({ title: 'CSV exportado', description: 'O resumo executivo foi baixado em CSV.' });
      return;
    }

    toast({ variant: 'destructive', title: 'Sem dados', description: 'Nao ha dados suficientes para exportar.' });
  };

  const exportPendingsCsv = () => {
    const success = downloadCsv(
      `pendencias-gerais-${Date.now()}.csv`,
      pendings.map((item) => ({
        tipo: item.type,
        modulo: item.module,
        descricao: item.description,
        colaborador: item.collaborator || '',
        setor: item.sector || '',
        responsavel: item.responsible || '',
        prazo: item.dueDate || '',
        gravidade: item.severity,
        status: item.status,
      })),
    );

    if (success) {
      toast({ title: 'CSV exportado', description: 'A tabela de pendencias gerais foi baixada.' });
      return;
    }

    toast({ variant: 'destructive', title: 'Sem dados', description: 'Nao ha pendencias para exportar.' });
  };

  const showPreparedPdfMessage = () => {
    toast({ title: 'PDF preparado', description: 'O botao de PDF foi deixado pronto para a integracao completa da geracao de arquivos.' });
  };

  const resetFilters = () => {
    setSearch('');
    setPeriod('90_dias');
    setCompanyFilter('todas');
    setSectorFilter('todos');
    setRoleFilter('todas');
    setCollaboratorFilter('todos');
    setStatusFilter('todos');
    setSeverityFilter('todas');
    setOccurrenceTypeFilter('todos');
    setRiskLevelFilter('todos');
    setCostCategoryFilter('todas');
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-[#e0c0b1] bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-[#191c1e]">Central de Seguranca</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[#4f5f7a]">
              Veja pendencias, vencimentos, riscos e documentos de respaldo da sua empresa.
            </p>
            <p className="mt-4 text-sm text-[#4f5f7a]">
              {companyName || 'Empresa'} | Situacao geral: <span className="font-semibold text-[#191c1e]">{centralStatus.label}</span>. {centralStatus.text}
            </p>
            {isLoading ? <p className="mt-2 text-sm font-medium text-[#9e4300]">Carregando indicadores em segundo plano...</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setActiveTab('executive')} className="rounded-xl bg-[#9e4300] text-white hover:bg-[#8c3b00]">
              <FileText className="h-4 w-4" />
              Gerar Relatorio Executivo
            </Button>
            <Button variant="outline" onClick={showPreparedPdfMessage} className="rounded-xl">
              <ShieldAlert className="h-4 w-4" />
              Relatorio de Respaldo
            </Button>
            <Button variant="outline" onClick={showPreparedPdfMessage} className="rounded-xl">
              <FileText className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button variant="outline" onClick={exportExecutiveCsv} className="rounded-xl">
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button variant="outline" onClick={() => setReloadKey((value) => value + 1)} className="rounded-xl">
              <TrendingUp className="h-4 w-4" />
              Atualizar Indicadores
            </Button>
            <Button variant="outline" onClick={() => toast({ title: 'Dashboard preparado', description: 'A configuracao de widgets e permissoes por perfil esta preparada para evolucao futura.' })} className="rounded-xl">
              <BarChart3 className="h-4 w-4" />
              Configurar Dashboard
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <BarChart3 className="h-5 w-5 text-[#b74813]" />
          <h2 className="text-lg font-semibold text-[#191c1e]">Filtros Globais</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por colaborador, setor, local, descricao ou responsavel" />

          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo o periodo</SelectItem>
              <SelectItem value="hoje">Hoje</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="30_dias">Ultimos 30 dias</SelectItem>
              <SelectItem value="90_dias">Ultimos 90 dias</SelectItem>
              <SelectItem value="ano">Este ano</SelectItem>
              <SelectItem value="personalizado">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger><SelectValue placeholder="Empresa" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as empresas</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company} value={company}>{company}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sectorFilter} onValueChange={setSectorFilter}>
            <SelectTrigger><SelectValue placeholder="Setor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os setores</SelectItem>
              {sectors.map((sector) => (
                <SelectItem key={sector} value={sector}>{sector}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger><SelectValue placeholder="Funcao" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as funcoes</SelectItem>
              {functions.map((role) => (
                <SelectItem key={role} value={role}>{role}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={collaboratorFilter} onValueChange={setCollaboratorFilter}>
            <SelectTrigger><SelectValue placeholder="Colaborador" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os colaboradores</SelectItem>
              {filteredCollaborators.map((collaborator) => (
                <SelectItem key={collaborator.id} value={collaborator.id}>{collaborator.nome_completo}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="ativo">Colaborador ativo</SelectItem>
              <SelectItem value="afastado">Colaborador afastado</SelectItem>
              <SelectItem value="desligado">Colaborador desligado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="vencido">Vencido</SelectItem>
              <SelectItem value="atrasada">Atrasada</SelectItem>
              <SelectItem value="aberta">Aberta</SelectItem>
              <SelectItem value="em_investigacao">Em investigacao</SelectItem>
            </SelectContent>
          </Select>

          <Select value={severityFilter} onValueChange={(value) => setSeverityFilter(value as SeverityFilter)}>
            <SelectTrigger><SelectValue placeholder="Gravidade" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as gravidades</SelectItem>
              <SelectItem value="baixa">Baixa</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="alta">Alta</SelectItem>
              <SelectItem value="critica">Critica</SelectItem>
              <SelectItem value="critico">Critico</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
            <SelectTrigger><SelectValue placeholder="Nivel de risco" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os riscos</SelectItem>
              <SelectItem value="baixo">Baixo</SelectItem>
              <SelectItem value="medio">Medio</SelectItem>
              <SelectItem value="alto">Alto</SelectItem>
              <SelectItem value="critico">Critico</SelectItem>
            </SelectContent>
          </Select>

          <Select value={occurrenceTypeFilter} onValueChange={setOccurrenceTypeFilter}>
            <SelectTrigger><SelectValue placeholder="Tipo de ocorrencia" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="incidente_sem_lesao">Incidente sem lesao</SelectItem>
              <SelectItem value="quase_acidente">Quase acidente</SelectItem>
              <SelectItem value="acidente_com_lesao">Acidente com lesao</SelectItem>
              <SelectItem value="acidente_com_afastamento">Acidente com afastamento</SelectItem>
              <SelectItem value="dano_material">Dano material</SelectItem>
              <SelectItem value="condicao_insegura">Condicao insegura</SelectItem>
              <SelectItem value="comportamento_inseguro">Comportamento inseguro</SelectItem>
              <SelectItem value="ocorrencia_ambiental">Ocorrencia ambiental</SelectItem>
              <SelectItem value="emergencia">Emergencia</SelectItem>
            </SelectContent>
          </Select>

          <Select value={costCategoryFilter} onValueChange={setCostCategoryFilter}>
            <SelectTrigger><SelectValue placeholder="Categoria de custo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas as categorias de custo</SelectItem>
              {Object.entries(costCategoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button type="button" variant="outline" onClick={resetFilters} className="rounded-xl">
            Limpar filtros
          </Button>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_1.4fr]">
        <div className={cn('rounded-2xl border p-6 shadow-sm', centralStatus.tone === 'danger' ? 'border-[#f1b2b2] bg-[#fff8f7]' : centralStatus.tone === 'warning' ? 'border-[#f3d6ab] bg-[#fffaf2]' : 'border-[#b7e2c2] bg-[#f7fff8]')}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#4f5f7a]">Situacao Geral da Empresa</p>
              <h2 className="mt-3 text-4xl font-semibold text-[#191c1e]">{centralStatus.label}</h2>
              <p className="mt-4 text-sm leading-6 text-[#334766]">{centralStatus.text}</p>
            </div>
            <div className="rounded-2xl bg-white/80 p-3 text-[#b74813]">
              <AlertTriangle className="h-7 w-7" />
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MiniMetric label="Criticos" value={centralStatus.criticalTotal} />
            <MiniMetric label="Atencao" value={centralStatus.attentionTotal} />
            <MiniMetric label="Pendencias" value={pendings.length} />
          </div>
          <div className="mt-5 rounded-xl border border-[#e0c0b1] bg-white p-4">
            <div className="flex items-start gap-3">
              <Brain className="mt-0.5 h-5 w-5 text-[#b74813]" />
              <div>
                <p className="font-semibold text-[#191c1e]">Resumo do dia</p>
                <p className="mt-1 text-sm leading-6 text-[#4f5f7a]">{daySummaryText}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[#191c1e]">O que precisa de atencao hoje</h2>
              <p className="text-sm text-[#4f5f7a]">Lista priorizada para resolver riscos, vencimentos e atrasos primeiro.</p>
            </div>
            <Button variant="outline" onClick={() => setActiveTab('pendings')} className="rounded-xl">Ver todas</Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {todayAttentionItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a] md:col-span-2">
                Nenhuma pendencia critica para hoje nos filtros atuais.
              </div>
            ) : todayAttentionItems.map((item) => (
              <div key={item.id} className="rounded-xl border border-[#eceef1] bg-[#f7f9fc] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="border" style={moduleBadgeStyle(moduleColorForLabel(item.module))}>{item.module}</Badge>
                      <Badge className={cn('border-0', severityBadge(item.severity))}>{item.severity}</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-[#191c1e]">{item.description}</p>
                    <p className="mt-1 text-2xl font-semibold text-[#191c1e]">{item.count}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => navigateToSection(item.section, item.filters)} className="text-[#b74813]">Resolver</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-[#b74813]" />
          <h2 className="text-lg font-semibold text-[#191c1e]">Pendencias por modulo</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {modulePendencyCards.map((card) => {
            const Icon = card.icon;
            const moduleColor = getModuleColor(moduleColorForLabel(card.module));
            return (
              <button
                key={card.module}
                type="button"
                onClick={() => navigateToSection(card.section)}
                className="rounded-2xl border border-l-4 bg-white p-4 text-left shadow-sm transition-transform hover:-translate-y-0.5"
                style={{ borderLeftColor: moduleColor.primary, borderTopColor: moduleColor.border, borderRightColor: moduleColor.border, borderBottomColor: moduleColor.border }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" style={{ color: moduleColor.icon }} />
                    <h3 className="font-semibold text-[#191c1e]">{card.module}</h3>
                  </div>
                  <ChevronRight className="h-4 w-4 text-[#4f5f7a]" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {card.metrics.map(([label, value]) => (
                    <div key={label} className="rounded-xl bg-[#f7f9fc] p-3">
                      <p className="text-xs text-[#4f5f7a]">{label}</p>
                      <p className="mt-1 text-lg font-semibold text-[#191c1e]">{value}</p>
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-[#191c1e]">Colaboradores com risco</h2>
              <p className="text-sm text-[#4f5f7a]">Pessoas com ASO, EPI, treinamento, NC ou incidente que exigem acao.</p>
            </div>
            <Button variant="outline" onClick={() => navigateToSection('collaborators', { metric: 'risco' })} className="rounded-xl">Abrir lista</Button>
          </div>
          <div className="space-y-3">
            {collaboratorsWithMostPendings.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">Nenhum colaborador com risco relevante nos filtros atuais.</p>
            ) : collaboratorsWithMostPendings.map((item) => (
              <button key={item.name} type="button" onClick={() => navigateToSection('collaborators', item.id ? { colaborador_id: item.id } : { search: item.name })} className="w-full rounded-xl border border-[#eceef1] bg-[#f7f9fc] p-4 text-left hover:border-[#f46e11]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-[#191c1e]">{item.name}</p>
                    <p className="text-sm text-[#4f5f7a]">{item.role} | {item.sector}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={cn('border-0', item.status === 'Critico' ? severityBadge('critica') : severityBadge('alta'))}>{item.status}</Badge>
                    <span className="text-sm font-semibold text-[#191c1e]">{item.count} pendencias</span>
                  </div>
                </div>
                <p className="mt-2 text-sm text-[#4f5f7a]">Maior risco: {item.critical}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-[#191c1e]">Vencimentos proximos</h2>
            <p className="text-sm text-[#4f5f7a]">Itens vencidos ou com prazo em ate 60 dias.</p>
          </div>
          <div className="space-y-3">
            {upcomingExpirations.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-4 text-sm text-[#4f5f7a]">Nenhum vencimento proximo encontrado.</p>
            ) : upcomingExpirations.map((item) => (
              <button key={item.id} type="button" onClick={() => navigateToSection(item.section)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#eceef1] bg-[#f7f9fc] p-3 text-left hover:border-[#f46e11]">
                <div>
                  <p className="text-sm font-semibold text-[#191c1e]">{item.type}: {item.name}</p>
                  <p className="text-xs text-[#4f5f7a]">{item.owner || 'Sem responsavel'} | {formatDate(item.dueDate)}</p>
                </div>
                <Badge className={cn('border-0', item.days < 0 ? severityBadge('critica') : item.days <= 7 ? severityBadge('alta') : severityBadge('media'))}>
                  {item.days < 0 ? `${Math.abs(item.days)}d vencido` : `${item.days}d`}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#191c1e]">Ocorrencias e nao conformidades</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Incidentes abertos" value={summary.incidents.open} />
            <MiniMetric label="Incidentes criticos" value={summary.incidents.critical} />
            <MiniMetric label="NCs abertas" value={summary.nonconformities.open} />
            <MiniMetric label="NCs criticas" value={summary.nonconformities.critical} />
          </div>
          <Button variant="outline" onClick={() => setActiveTab('alerts')} className="mt-4 w-full rounded-xl">Ver alertas</Button>
        </div>

        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#191c1e]">Extintores e emergencia</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Total" value={extinguisherSummary.total} />
            <MiniMetric label="Conformes" value={extinguisherSummary.compliant} />
            <MiniMetric label="A vencer" value={extinguisherSummary.expiring} />
            <MiniMetric label="Vencidos/NC" value={extinguisherSummary.expired + extinguisherSummary.nonconformity} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigateToSection('fireExtinguishers', { view: 'map' })} className="rounded-xl">Ver mapa</Button>
            <Button variant="outline" onClick={() => navigateToSection('fireExtinguishers', { status: 'vencido' })} className="rounded-xl">Ver vencidos</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#191c1e]">Documentos e Respaldo</h2>
          <p className="mt-1 text-sm text-[#4f5f7a]">Evidencias que ajudam em auditoria, diretoria e defesa documental.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <MiniMetric label="Validos/evidencias" value={backingSummary.valid} />
            <MiniMetric label="Vencidos" value={backingSummary.expired} />
            <MiniMetric label="Ausentes" value={backingSummary.missing} />
            <MiniMetric label="Sem assinatura" value={backingSummary.unsigned} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="outline" onClick={showPreparedPdfMessage} className="rounded-xl">Gerar respaldo</Button>
            <Button variant="outline" onClick={() => router.replace('/documents')} className="rounded-xl">Ver documentos</Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-[#191c1e]">Acoes recomendadas</h2>
            <p className="text-sm text-[#4f5f7a]">Prioridades praticas geradas por regras simples dos dados atuais.</p>
          </div>
          <Button variant="outline" onClick={() => toast({ title: 'Resumo com IA preparado', description: 'A estrutura esta pronta para gerar resumo avancado, impactos e recomendacoes praticas.' })} className="rounded-xl">
            <Brain className="h-4 w-4" />
            Gerar resumo com IA
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {recommendations.map((item, index) => (
            <div key={item} className="rounded-xl border border-[#eceef1] bg-[#f7f9fc] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#fff4e8] text-sm font-semibold text-[#9e4300]">{index + 1}</div>
                <div>
                  <p className="text-sm leading-6 text-[#334766]">{item}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setActiveTab('pendings')}>Resolver</Button>
                    <Button size="sm" variant="ghost" onClick={() => toast({ title: 'Acao marcada em andamento', description: 'Controle operacional preparado para integrar responsaveis e prazos.' })}>Em andamento</Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-2 rounded-2xl border border-[#e0c0b1] bg-white p-2 shadow-sm">
        {[
          ['overview', 'Visao Geral'],
          ['alerts', 'Alertas Criticos'],
          ['pendings', 'Pendencias Gerais'],
          ['week', 'Prioridades da Semana'],
          ['reports', 'Relatorios'],
          ['charts', 'Graficos'],
          ['executive', 'Analise Executiva'],
          ['exports', 'Exportacoes'],
        ].map(([value, label]) => (
          <Button key={value} type="button" variant={activeTab === value ? 'default' : 'outline'} onClick={() => setActiveTab(value as DashboardTab)} className={cn('rounded-xl', activeTab === value && 'bg-[#9e4300] text-white hover:bg-[#8c3b00]')}>
            {label}
          </Button>
        ))}
      </section>

      {activeTab === 'overview' && <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Triangle className="h-5 w-5 text-[#b74813]" />
          <h2 className="text-lg font-semibold text-[#191c1e]">Nivel Geral de Risco</h2>
        </div>
        <DashboardCard
          title="Nivel Geral de Risco"
          value={risk.level}
          helper={risk.helper}
          icon={AlertTriangle}
          tone={risk.tone}
          module="dashboard"
        />
      </section>}

      {activeTab === 'overview' && <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-[#b74813]" />
          <h2 className="text-lg font-semibold text-[#191c1e]">Cards Principais</h2>
        </div>
        <div className="space-y-5">
          {cardGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupColor = getModuleColor(moduleColorForLabel(group.title));
            return (
              <div key={group.title} className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#4f5f7a]">
                  <GroupIcon className="h-4 w-4" style={{ color: groupColor.icon }} />
                  {group.title}
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {group.cards.map((card) => (
                    <DashboardCard
                      key={card.title}
                      title={card.title}
                      value={card.value}
                      helper={card.helper}
                      icon={card.icon}
                      tone={card.tone}
                      module={moduleColorForSection(card.section)}
                      onClick={() => navigateToSection(card.section, card.filters)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>}

      {activeTab === 'overview' && <DeferredRender fallback={<ChartSkeletonGrid />}>
        <section className="grid gap-6 xl:grid-cols-3">
          <BarList title="Colaboradores por status" items={collaboratorsByStatus} />
          <BarList title="EPIs por status" items={episByStatus} />
          <BarList title="Treinamentos por status" items={trainingsByStatus} />
          <BarList title="Inspecoes por status" items={inspectionsByStatus} />
          <BarList title="Nao conformidades por gravidade" items={nonconformitiesBySeverity} />
          <BarList title="Incidentes por tipo" items={incidentsByType} />
          <BarList title="Incidentes por setor" items={incidentsBySector} />
          <BarList title="Top 5 setores com pendencias" items={topPendingSectors} />
          <BarList title="Top 5 setores com incidentes" items={topIncidentSectors} />
          <BarList title="Top 5 custos por categoria" items={costsByCategory} formatter={formatCurrency} />
          <BarList title="Custos por mes" items={costsByMonth} formatter={formatCurrency} />
          <BarList title="Incidentes por mes" items={incidentsByMonth} />
          <BarList title="Nao conformidades por mes" items={nonconformitiesByMonth} />
          <BarList title="Prevencao x Correcao" items={preventionVsCorrection} formatter={formatCurrency} />
        </section>
      </DeferredRender>}

      {activeTab === 'charts' && <DeferredRender fallback={<ChartSkeletonGrid />}>
        <VisualAnalyticsSection
          charts={filteredVisualCharts}
          selectedCharts={selectedCharts}
          selectedIds={selectedChartIds}
          chartAnalyses={chartAnalyses}
          executiveAnalysis={executiveAiAnalysis}
          chartTypeFilter={chartTypeFilter}
          chartModuleFilter={chartModuleFilter}
          onTypeChange={setChartTypeFilter}
          onModuleChange={setChartModuleFilter}
          onToggleChart={toggleChartInReport}
          onDetails={(chart) => {
            if (chart.target) {
              navigateToSection(chart.target.section, chart.target.filters);
              return;
            }
            setActiveTab('pendings');
          }}
          onAi={handleGenerateChartAiAnalysis}
          onExecutiveAi={handleGenerateExecutiveAiAnalysis}
          onExport={(chart) => toast({
            title: 'Exportação de gráfico preparada',
            description: `O gráfico "${chart.title}" será exportado quando a rotina visual estiver conectada.`,
          })}
          onGeneratePdf={() => toast({
            title: 'Relatório visual preparado',
            description: `${selectedCharts.length} gráficos selecionados para compor o PDF visual.`,
          })}
        />
      </DeferredRender>}

      {(activeTab === 'alerts' || activeTab === 'week' || activeTab === 'overview') && <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-[#b74813]" />
              <h2 className="text-lg font-semibold text-[#191c1e]">Alertas Criticos</h2>
            </div>
          </div>
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <p className="text-sm text-[#4f5f7a]">Nenhum alerta critico encontrado para os filtros atuais.</p>
            ) : (
              alerts.map((alert) => (
                <div key={alert.id} className="rounded-xl border border-[#eceef1] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium text-[#191c1e]">{alert.title}</h3>
                        <Badge className={cn('border-0', severityBadge(alert.severity))}>{alert.severity}</Badge>
                        <Badge className="border" style={moduleBadgeStyle(moduleColorForLabel(alert.module))}>{alert.module}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-[#4f5f7a]">{alert.description}</p>
                      {alert.date ? <p className="mt-2 text-xs text-[#6b7280]">Data: {formatDate(alert.date)}</p> : null}
                    </div>
                    <Button variant="ghost" onClick={() => navigateToSection(alert.section, alert.filterKey && alert.filterValue ? { [alert.filterKey]: alert.filterValue } : undefined)} className="rounded-xl text-[#b74813]">
                      Ver detalhes
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <HardHat className="h-5 w-5 text-[#b74813]" />
              <h2 className="text-lg font-semibold text-[#191c1e]">Prioridades da Semana</h2>
            </div>
            <div className="space-y-3">
              {priorities.length === 0 ? (
                <p className="text-sm text-[#4f5f7a]">Sem prioridades criticas para o filtro atual.</p>
              ) : (
                priorities.map((item) => (
                  <button key={item.id} type="button" onClick={() => navigateToSection(item.section)} className="w-full rounded-xl border border-[#eceef1] p-4 text-left transition-colors hover:bg-[#faf7f4]">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className={cn('border-0', item.priority === 'alta' ? severityBadge('critica') : item.priority === 'media' ? severityBadge('media') : severityBadge('baixa'))}>
                        {item.priority}
                      </Badge>
                      <Badge className="border text-xs" style={moduleBadgeStyle(moduleColorForLabel(item.module))}>{item.module}</Badge>
                    </div>
                    <p className="mt-3 font-medium text-[#191c1e]">{item.description}</p>
                    <p className="mt-1 text-sm text-[#4f5f7a]">{item.reason}</p>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-[#b74813]" />
              <h2 className="text-lg font-semibold text-[#191c1e]">Recomendacoes Preventivas</h2>
            </div>
            <div className="space-y-3">
              {recommendations.map((item, index) => (
                <div key={index} className="rounded-xl border border-[#eceef1] p-4">
                  <p className="text-sm leading-6 text-[#191c1e]">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>}

      {activeTab === 'week' && <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <ShieldAlert className="h-5 w-5 text-[#b74813]" />
            <h2 className="text-lg font-semibold text-[#191c1e]">Setores Criticos</h2>
          </div>
          <div className="space-y-3">
            {criticalSectors.length === 0 ? <p className="text-sm text-[#4f5f7a]">Nenhum setor critico encontrado para os filtros selecionados.</p> : criticalSectors.map((item, index) => (
              <div key={item.sector} className="rounded-xl border border-[#eceef1] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[#191c1e]">{index + 1}. {item.sector} - risco {item.risk}</p>
                    <p className="mt-1 text-sm text-[#4f5f7a]">{item.pending} pendencias | {formatCurrency(item.cost)} em custos corretivos/incidentes</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setSectorFilter(item.sector)} className="rounded-xl">Filtrar dashboard</Button>
                    <Button variant="ghost" onClick={() => setSectorFilter(item.sector)} className="rounded-xl text-[#b74813]">Ver detalhes</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Users className="h-5 w-5 text-[#b74813]" />
            <h2 className="text-lg font-semibold text-[#191c1e]">Colaboradores com Mais Pendencias</h2>
          </div>
          <div className="space-y-3">
            {collaboratorsWithMostPendings.length === 0 ? <p className="text-sm text-[#4f5f7a]">Nenhum colaborador com pendencias para os filtros selecionados.</p> : collaboratorsWithMostPendings.map((item) => (
              <div key={item.name} className="rounded-xl border border-[#eceef1] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium text-[#191c1e]">{item.name}</p>
                    <p className="mt-1 text-sm text-[#4f5f7a]">{item.role} | {item.sector} | {item.count} pendencias</p>
                    <p className="mt-1 text-xs text-[#6b7280]">Mais critica: {item.critical} | Situacao: {item.status}</p>
                  </div>
                  <Button variant="outline" onClick={() => item.id ? navigateToSection('collaborators', { colaborador_id: item.id }) : navigateToSection('collaborators')} className="rounded-xl">Abrir ficha</Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>}

      {activeTab === 'pendings' && <section className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-[#b74813]" />
            <h2 className="text-lg font-semibold text-[#191c1e]">Pendencias Gerais</h2>
          </div>
          <Button variant="outline" onClick={exportPendingsCsv} className="rounded-xl">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[#eceef1] text-left text-[#4f5f7a]">
                <th className="px-3 py-3 font-medium">Tipo</th>
                <th className="px-3 py-3 font-medium">Modulo</th>
                <th className="px-3 py-3 font-medium">Descricao</th>
                <th className="px-3 py-3 font-medium">Colaborador</th>
                <th className="px-3 py-3 font-medium">Setor</th>
                <th className="px-3 py-3 font-medium">Responsavel</th>
                <th className="px-3 py-3 font-medium">Prazo</th>
                <th className="px-3 py-3 font-medium">Gravidade</th>
                <th className="px-3 py-3 font-medium">Status</th>
                <th className="px-3 py-3 font-medium">Acao</th>
              </tr>
            </thead>
            <tbody>
              {pendings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-[#4f5f7a]">
                    Nenhuma pendencia consolidada com os filtros atuais.
                  </td>
                </tr>
              ) : (
                pendings.slice(0, visiblePendings).map((item) => (
                  <tr key={item.id} className="border-b border-[#f3f4f6] align-top">
                    <td className="px-3 py-3 text-[#191c1e]">{item.type}</td>
                    <td className="px-3 py-3"><Badge className="border" style={moduleBadgeStyle(moduleColorForLabel(item.module))}>{item.module}</Badge></td>
                    <td className="px-3 py-3 text-[#4f5f7a]">{item.description}</td>
                    <td className="px-3 py-3 text-[#4f5f7a]">{item.collaborator || '-'}</td>
                    <td className="px-3 py-3 text-[#4f5f7a]">{item.sector || '-'}</td>
                    <td className="px-3 py-3 text-[#4f5f7a]">{item.responsible || '-'}</td>
                    <td className="px-3 py-3 text-[#4f5f7a]">{formatDate(item.dueDate)}</td>
                    <td className="px-3 py-3"><Badge className={cn('border-0', severityBadge(item.severity))}>{item.severity}</Badge></td>
                    <td className="px-3 py-3"><Badge className={cn('border-0', statusBadge(item.status))}>{item.status}</Badge></td>
                    <td className="px-3 py-3">
                      <Button variant="ghost" onClick={() => navigateToSection(item.section)} className="rounded-xl text-[#b74813]">
                        Visualizar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {pendings.length > visiblePendings ? (
          <div className="mt-4 flex justify-center">
            <Button variant="outline" onClick={() => setVisiblePendings((value) => value + 20)} className="rounded-xl">
              Carregar mais pendencias
            </Button>
          </div>
        ) : null}
      </section>}

      {(activeTab === 'reports' || activeTab === 'executive') && <section className="grid gap-6 xl:grid-cols-[1.2fr_1fr]">
        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#b74813]" />
            <h2 className="text-lg font-semibold text-[#191c1e]">Relatorios Disponiveis</h2>
          </div>
          <div className="space-y-3">
            {reportItems.map((report) => (
              <div key={report.id} className="rounded-xl border border-[#eceef1] p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-[#191c1e]">{report.name}</h3>
                      <Badge className="border" style={moduleBadgeStyle(moduleColorForLabel(report.module))}>{report.module}</Badge>
                    </div>
                    <p className="mt-2 text-sm text-[#4f5f7a]">{report.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => navigateToSection(report.section)} className="rounded-xl">
                      Abrir modulo
                    </Button>
                    <Button variant="outline" onClick={showPreparedPdfMessage} className="rounded-xl">
                      Exportar PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (report.section === 'dashboardGeneral') {
                          exportExecutiveCsv();
                          return;
                        }
                        toast({ title: 'CSV preparado', description: 'A exportacao CSV por modulo foi preparada para aproveitar os filtros e tabelas do respectivo modulo.' });
                      }}
                      className="rounded-xl"
                    >
                      Exportar CSV
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Wallet className="h-5 w-5 text-[#b74813]" />
            <h2 className="text-lg font-semibold text-[#191c1e]">Relatorio Executivo</h2>
          </div>
          <div className="space-y-4">
            <p className="text-sm leading-6 text-[#4f5f7a]">
              No periodo analisado, a empresa registrou <span className="font-semibold text-[#191c1e]">{summary.incidents.total}</span> incidentes,{' '}
              <span className="font-semibold text-[#191c1e]">{summary.nonconformities.open}</span> nao conformidades abertas e{' '}
              <span className="font-semibold text-[#191c1e]">{summary.inspections.late}</span> inspecoes atrasadas.
            </p>
            <p className="text-sm leading-6 text-[#4f5f7a]">
              O investimento em prevencao foi de <span className="font-semibold text-[#191c1e]">{formatCurrency(summary.costs.prevention)}</span>, enquanto os custos de correcao e incidentes somaram{' '}
              <span className="font-semibold text-[#191c1e]">{formatCurrency(summary.costs.correction + summary.costs.incidents)}</span>.
            </p>
            <p className="text-sm leading-6 text-[#4f5f7a]">
              Principais alertas: {alerts.slice(0, 3).map((item) => item.title).join(', ') || 'Nenhum alerta relevante no filtro atual'}.
            </p>
            <p className="text-sm leading-6 text-[#4f5f7a]">
              Recomendacao central: {recommendations[0]}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button onClick={exportExecutiveCsv} className="rounded-xl bg-[#9e4300] text-white hover:bg-[#8c3b00]">
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button variant="outline" onClick={showPreparedPdfMessage} className="rounded-xl">
                <FileText className="h-4 w-4" />
                Gerar Relatorio em PDF
              </Button>
            </div>
          </div>
        </div>
      </section>}

      {activeTab === 'executive' && <section className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Coins className="h-5 w-5 text-[#b74813]" />
          <h2 className="text-lg font-semibold text-[#191c1e]">Insights Automaticos</h2>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-[#eceef1] p-4">
            <div className="flex items-center gap-2 text-[#191c1e]">
              <TrendingUp className="h-4 w-4 text-[#18703a]" />
              <span className="font-medium">Setor com maior custo</span>
            </div>
            <p className="mt-2 text-sm text-[#4f5f7a]">{summary.costs.topSector}</p>
          </div>
          <div className="rounded-xl border border-[#eceef1] p-4">
            <div className="flex items-center gap-2 text-[#191c1e]">
              <TrendingDown className="h-4 w-4 text-[#9e4300]" />
              <span className="font-medium">Prevencao x correcao</span>
            </div>
            <p className="mt-2 text-sm text-[#4f5f7a]">
              {summary.costs.prevention >= summary.costs.correction
                ? `O investimento preventivo (${formatCurrency(summary.costs.prevention)}) esta acima do custo corretivo (${formatCurrency(summary.costs.correction)}).`
                : `Os custos corretivos (${formatCurrency(summary.costs.correction)}) superam a prevencao (${formatCurrency(summary.costs.prevention)}).`}
            </p>
          </div>
          <div className="rounded-xl border border-[#eceef1] p-4">
            <div className="flex items-center gap-2 text-[#191c1e]">
              <ShieldAlert className="h-4 w-4 text-[#93000a]" />
              <span className="font-medium">Pendencias mais sensiveis</span>
            </div>
            <p className="mt-2 text-sm text-[#4f5f7a]">
              Existem {summary.nonconformities.critical} nao conformidades criticas, {summary.epi.expired} EPIs vencidos e {summary.training.expired} treinamentos vencidos.
            </p>
          </div>
          <div className="rounded-xl border border-[#eceef1] p-4">
            <div className="flex items-center gap-2 text-[#191c1e]">
              <Siren className="h-4 w-4 text-[#9e4300]" />
              <span className="font-medium">Incidentes sem custo</span>
            </div>
            <p className="mt-2 text-sm text-[#4f5f7a]">
              {filteredIncidents.filter((incident) => !filteredCosts.some((cost) => cost.incidente_id === incident.id)).length} incidentes ainda nao possuem custo relacionado informado.
            </p>
          </div>
        </div>
      </section>}

      {activeTab === 'executive' && <section className="rounded-2xl border border-[#dfe7f5] bg-[#f7f9fc] p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Brain className="h-5 w-5 text-[#415778]" />
          <h2 className="text-lg font-semibold text-[#191c1e]">IA preparada para analise executiva</h2>
        </div>
        <p className="text-sm leading-6 text-[#4f5f7a]">
          Estrutura pronta para analisar colaboradores, EPIs, treinamentos, inspecoes, nao conformidades, incidentes, custos, pendencias, setores e funcoes.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled variant="outline"><Brain className="h-4 w-4" />Gerar analise geral com IA</Button>
          <Button disabled variant="outline"><Sparkles className="h-4 w-4" />Gerar recomendacoes com IA</Button>
          <Button disabled variant="outline"><FileText className="h-4 w-4" />Gerar resumo executivo com IA</Button>
          <Button disabled variant="outline"><CheckCircle2 className="h-4 w-4" />Gerar plano de acao preventivo com IA</Button>
        </div>
      </section>}

      {activeTab === 'exports' && <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <Download className="h-5 w-5 text-[#b74813]" />
            <h2 className="text-lg font-semibold text-[#191c1e]">Exportacoes</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Button onClick={showPreparedPdfMessage} variant="outline" className="justify-start rounded-xl"><FileText className="h-4 w-4" />Exportar PDF</Button>
            <Button onClick={exportExecutiveCsv} variant="outline" className="justify-start rounded-xl"><Download className="h-4 w-4" />Exportar CSV</Button>
            <Button onClick={() => toast({ title: 'Excel preparado', description: 'Exportacao Excel preparada para integracao futura.' })} variant="outline" className="justify-start rounded-xl"><Download className="h-4 w-4" />Exportar Excel</Button>
            <Button onClick={() => setActiveTab('executive')} variant="outline" className="justify-start rounded-xl"><FileText className="h-4 w-4" />Exportar relatorio executivo</Button>
            <Button onClick={exportPendingsCsv} variant="outline" className="justify-start rounded-xl"><CheckCircle2 className="h-4 w-4" />Exportar pendencias gerais</Button>
            <Button onClick={exportExecutiveCsv} variant="outline" className="justify-start rounded-xl"><BarChart3 className="h-4 w-4" />Exportar dashboard filtrado</Button>
            <Button onClick={() => toast({ title: 'Exportacao preparada', description: 'Exportacao de dados por modulo preparada para respeitar os filtros aplicados.' })} variant="outline" className="justify-start rounded-xl"><Download className="h-4 w-4" />Exportar dados por modulo</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e0c0b1] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <FileText className="h-5 w-5 text-[#b74813]" />
            <h2 className="text-lg font-semibold text-[#191c1e]">Historico de Relatorios</h2>
          </div>
          <div className="rounded-xl border border-dashed border-[#ccb4a6] bg-[#f7f9fc] p-6 text-sm text-[#4f5f7a]">
            Nenhum relatorio foi gerado ainda.
            <div className="mt-4">
              <Button onClick={() => setActiveTab('executive')} className="rounded-xl bg-[#9e4300] text-white hover:bg-[#8c3b00]">Gerar relatorio executivo</Button>
            </div>
          </div>
        </div>
      </section>}
    </div>
  );
}
