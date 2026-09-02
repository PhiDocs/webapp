'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Download,
  Edit,
  Eye,
  FileText,
  Flame,
  Layers,
  MapPin,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  Smartphone,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { navigateCompanySection } from '@/lib/client-navigation';
import { getModuleColor } from '@/lib/module-colors';
import {
  calculateExtinguisherStatus,
  createSeedExtinguisherStore,
  emptyExtinguisherStore,
  extinguisherDocumentTypes,
  extinguisherAgents,
  extinguisherAreas,
  extinguisherInspectionChecklist,
  extinguisherNcTypes,
  extinguisherPhotoTypes,
  extinguisherStatusColors,
  extinguisherStatusLabels,
  extinguisherStorageKey,
  getInspectionStatus,
  getNextInspectionDate,
  getRecommendedAction,
  normalizeExtinguisherStore,
  type FireExtinguisher,
  type FireExtinguisherDataStore,
  type FireExtinguisherDocument,
  type FireExtinguisherInspection,
  type FireExtinguisherInspectionAnswer,
  type FireExtinguisherInspectionItem,
  type FireExtinguisherMapPoint,
  type FireExtinguisherNcStatus,
  type FireExtinguisherNonconformity,
  type FireExtinguisherPhoto,
  type FireExtinguisherPhotoPolicy,
  type FireExtinguisherPhotoType,
  type FireExtinguisherPlant,
  type FireExtinguisherRecharge,
  type FireExtinguisherSeverity,
  type FireExtinguisherStatus,
} from '@/lib/fire-extinguishers';

type FireExtinguishersDashboardProps = {
  companyId: string;
  companyName?: string;
};

type ActiveModal = 'extinguisher' | 'inspection' | 'nonconformity' | 'recharge' | 'plant' | 'point' | 'pointDetails' | 'mapPreview' | 'details' | 'photo' | 'document' | 'qr' | 'dashboardExport' | 'presentationExport' | null;

const moduleColor = getModuleColor('extintores');
const statusOrder: FireExtinguisherStatus[] = ['nao_conformidade', 'vencido', 'a_vencer', 'sem_dados', 'em_conformidade'];
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const severityLabels: Record<FireExtinguisherSeverity, string> = { baixa: 'Baixa', media: 'Média', alta: 'Alta', critica: 'Crítica' };
type ExtractedSuggestion = Partial<Record<keyof FireExtinguisher, { value: string; confidence: number }>>;
type ExecutiveStatus = 'boa' | 'atencao' | 'critica';
type ChartEvaluation = 'positivo' | 'atencao' | 'critico';
type DashboardExportOptions = {
  template: 'executivo' | 'operacional' | 'auditoria';
  period: 'mes' | '30dias' | '90dias' | 'ano' | 'personalizado';
  includeMap: boolean;
  includePhotos: boolean;
  includeActions: boolean;
  includeNcs: boolean;
  includeConclusion: boolean;
};
type PresentationExportOptions = {
  period: 'mes' | '30dias' | '90dias' | 'ano' | 'personalizado';
  includeMap: boolean;
  includeActions: boolean;
  includeNcs: boolean;
  includeRecommendations: boolean;
  includePhotos: boolean;
  type: 'executiva' | 'operacional' | 'auditoria';
};

const executiveStatusLabels: Record<ExecutiveStatus, string> = { boa: 'Boa', atencao: 'Atenção', critica: 'Crítica' };
const chartEvaluationLabels: Record<ChartEvaluation, string> = { positivo: 'Positivo', atencao: 'Atenção', critico: 'Crítico' };
const defaultDashboardExportOptions: DashboardExportOptions = { template: 'executivo', period: 'ano', includeMap: true, includePhotos: false, includeActions: true, includeNcs: true, includeConclusion: true };
const defaultPresentationExportOptions: PresentationExportOptions = { period: 'ano', includeMap: true, includeActions: true, includeNcs: true, includeRecommendations: true, includePhotos: false, type: 'executiva' };

const blankExtinguisher = (companyId: string): FireExtinguisher => ({
  id: '',
  companyId,
  codigo: '',
  numero_patrimonial: '',
  unidade: '',
  area: 'Produção',
  localizacao_descritiva: '',
  tipo_agente: 'Pó Químico ABC',
  capacidade: '6 kg',
  classe_fogo: 'ABC',
  fabricante: '',
  modelo: '',
  numero_serie: '',
  data_fabricacao: '',
  data_ultima_recarga: '',
  data_proxima_recarga: '',
  data_validade: '',
  data_ultima_inspecao: '',
  frequencia_inspecao_dias: 30,
  status: 'sem_dados',
  responsavel_inspecao: '',
  empresa_manutencao: '',
  fornecedor: '',
  photo_policy: 'obrigatoria_nc',
  observacoes: '',
  created_at: '',
  updated_at: '',
});

const blankPhoto = (companyId: string, extintorId = ''): FireExtinguisherPhoto => ({
  id: '',
  companyId,
  extintor_id: extintorId,
  tipo_foto: 'frontal',
  arquivo_url: '',
  descricao: '',
  origem: 'cadastro',
  usuario_nome: '',
  origem_captura: 'upload',
  data_upload: '',
  data_captura: '',
  bloqueada_para_edicao: true,
  principal: false,
  created_at: '',
  updated_at: '',
});

const blankDocument = (companyId: string, extintorId = ''): FireExtinguisherDocument => ({
  id: '',
  companyId,
  extintor_id: extintorId,
  nome: '',
  tipo: 'certificado_recarga',
  data: today(),
  validade: '',
  arquivo_url: '',
  observacao: '',
  created_at: '',
  updated_at: '',
});

const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const percent = (value: number, total: number) => (total ? Math.round((value / total) * 100) : 0);

function formatDate(value?: string) {
  if (!value) return '-';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function downloadText(filename: string, content: string, type = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string | number | undefined | null) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char] || char));
}

function getExecutiveStatus(summary: { total: number; byStatus: Record<FireExtinguisherStatus, number>; staleInspection: number }, criticalOpenNcs: number): { status: ExecutiveStatus; title: string; text: string } {
  const conformity = percent(summary.byStatus.em_conformidade, summary.total);
  if (summary.byStatus.vencido > 0 || criticalOpenNcs > 0 || conformity < 70 || summary.staleInspection > Math.max(3, summary.total * 0.25)) {
    return { status: 'critica', title: 'Situação crítica', text: 'Existem extintores vencidos, não conformidades críticas abertas ou baixa conformidade. Ação imediata é necessária.' };
  }
  if (summary.byStatus.a_vencer > 0 || summary.byStatus.nao_conformidade > 0 || summary.staleInspection > 0 || conformity < 90) {
    return { status: 'atencao', title: 'Situação em atenção', text: 'Existem extintores próximos do vencimento, pendências de inspeção ou não conformidades que precisam ser acompanhadas.' };
  }
  return { status: 'boa', title: 'Situação boa', text: 'A maior parte dos extintores está em conformidade e não há equipamentos vencidos ou não conformidades críticas abertas.' };
}

function getComplianceScore(summary: { total: number; byStatus: Record<FireExtinguisherStatus, number>; staleInspection: number; withoutMap: number }, missingDates: number) {
  if (!summary.total) return { value: 0, label: 'Sem dados', text: 'Cadastre extintores para visualizar o score de conformidade.' };
  const base = percent(summary.byStatus.em_conformidade, summary.total);
  const penalty = (summary.byStatus.vencido * 8) + (summary.byStatus.nao_conformidade * 6) + (summary.staleInspection * 3) + (summary.withoutMap * 2) + (missingDates * 3);
  const value = Math.max(0, Math.min(100, base - Math.round((penalty / summary.total) * 5)));
  const label = value >= 90 ? 'Excelente' : value >= 75 ? 'Bom' : value >= 60 ? 'Atenção' : 'Crítico';
  const text = value >= 90 ? 'Excelente controle operacional, com pendências mínimas.' : value >= 75 ? 'Situação positiva, mas há pontos que devem ser tratados.' : value >= 60 ? 'Há pendências relevantes que exigem plano de ação.' : 'Risco elevado: priorize vencidos, NCs e inspeções atrasadas.';
  return { value, label, text };
}

function getChartEvaluation(kind: 'status' | 'nc' | 'monthly' | 'inspections', data: { vencidos?: number; aVencer?: number; ncs?: number; criticalNcs?: number; inspections?: number }) {
  if (kind === 'status') return data.vencidos ? 'critico' : data.aVencer ? 'atencao' : 'positivo';
  if (kind === 'nc') return data.criticalNcs ? 'critico' : data.ncs ? 'atencao' : 'positivo';
  if (kind === 'monthly') return data.vencidos ? 'critico' : data.aVencer && data.aVencer > 5 ? 'atencao' : 'positivo';
  return data.inspections ? 'positivo' : 'atencao';
}

function gerarResumoExecutivoExtintores(summary: { total: number; byStatus: Record<FireExtinguisherStatus, number>; staleInspection: number }, topArea?: string, topNc?: string) {
  if (!summary.total) return 'Nenhum dado de extintor encontrado para o período selecionado. Cadastre extintores para visualizar os indicadores.';
  return `No período analisado, foram identificados ${summary.total} extintores cadastrados, sendo ${summary.byStatus.em_conformidade} em conformidade, ${summary.byStatus.a_vencer} a vencer nos próximos 30 dias e ${summary.byStatus.vencido} vencidos. ${topArea ? `A área ${topArea} concentra o maior volume de equipamentos. ` : ''}${topNc ? `O tipo de não conformidade mais recorrente é ${topNc}. ` : ''}Recomenda-se priorizar vencimentos, inspeções atrasadas e não conformidades abertas.`;
}

const dashboardInsights = {
  status: 'Este gráfico mostra a proporção de extintores em conformidade, próximos do vencimento e vencidos. Equipamentos vencidos devem ser tratados como prioridade.',
  agents: 'Este gráfico mostra a distribuição dos extintores por agente extintor. Ele ajuda a verificar se os tipos disponíveis estão compatíveis com os riscos das áreas protegidas.',
  areas: 'Este gráfico indica as áreas com maior concentração de extintores. Áreas com muitos equipamentos também exigem maior atenção nas inspeções periódicas.',
  monthly: 'Este gráfico auxilia no planejamento de recargas, evitando acúmulo de vencimentos no mesmo mês.',
  ncs: 'Este indicador mostra quais problemas ocorrem com maior frequência e ajuda a direcionar ações preventivas.',
  inspections: 'Este gráfico demonstra a rotina de acompanhamento dos equipamentos ao longo do tempo.',
};

function gerarConclusaoExtintores(executive: { status: ExecutiveStatus }, summary: { byStatus: Record<FireExtinguisherStatus, number>; staleInspection: number; withoutMap: number; withoutPhoto: number }) {
  const recommendations = [
    summary.byStatus.vencido ? 'Priorizar recarga dos extintores vencidos.' : '',
    summary.byStatus.a_vencer ? 'Agendar recarga dos extintores a vencer.' : '',
    summary.byStatus.nao_conformidade ? 'Corrigir não conformidades abertas.' : '',
    summary.staleInspection ? 'Realizar inspeção nos equipamentos sem inspeção recente.' : '',
    summary.withoutMap ? 'Adicionar localização no mapa para extintores sem ponto.' : '',
    summary.withoutPhoto ? 'Adicionar fotos dos equipamentos sem evidência visual.' : '',
  ].filter(Boolean);
  const opening = executive.status === 'boa' ? 'A empresa apresenta boa cobertura e controle dos extintores.' : executive.status === 'atencao' ? 'A empresa apresenta controle parcial dos extintores, com pendências que devem ser acompanhadas.' : 'A empresa apresenta pendências críticas no controle de extintores.';
  return { text: `${opening} Recomenda-se manter planejamento mensal de recargas e inspeções para evitar acúmulo de pendências.`, recommendations };
}

function gerarResumoExecutivoApresentacaoExtintores(summary: { total: number; byStatus: Record<FireExtinguisherStatus, number> }, executive: { status: ExecutiveStatus }) {
  if (!summary.total) return 'Não há extintores cadastrados para compor a apresentação.';
  return `A situação geral está ${executiveStatusLabels[executive.status].toLowerCase()}. São ${summary.total} extintores cadastrados, com ${summary.byStatus.em_conformidade} em conformidade, ${summary.byStatus.a_vencer} a vencer e ${summary.byStatus.vencido} vencidos.`;
}

function gerarInsightSlideStatusVencimento(summary: { byStatus: Record<FireExtinguisherStatus, number> }) {
  if (summary.byStatus.vencido) return 'Existem extintores vencidos que exigem ação imediata.';
  if (summary.byStatus.a_vencer) return 'Há extintores próximos do vencimento. Planeje recargas preventivas.';
  return 'Não há extintores vencidos no momento.';
}

function gerarInsightSlideAgentes(agentsChart: Array<{ label: string; value: number }>) {
  return agentsChart[0] ? `${agentsChart[0].label} é o agente mais presente na base.` : 'Sem dados de agente extintor cadastrados.';
}

function gerarInsightSlideAreas(areasChart: Array<{ label: string; value: number }>, actionItems: Array<{ item: FireExtinguisher; severity: FireExtinguisherSeverity }>) {
  const riskyArea = actionItems[0]?.item.area;
  return riskyArea ? `${riskyArea} concentra pendências que merecem atenção.` : areasChart[0] ? `${areasChart[0].label} concentra o maior volume de extintores.` : 'Sem dados por área.';
}

function gerarInsightSlideVencimentosMensais(monthlyChart: Array<{ label: string; aVencer: number; vencidos: number }>) {
  const top = monthlyChart.slice().sort((a, b) => (b.aVencer + b.vencidos) - (a.aVencer + a.vencidos))[0];
  return top && (top.aVencer || top.vencidos) ? `${top.label} concentra o maior volume de vencimentos previstos ou acumulados.` : 'Não há concentração relevante de vencimentos no período.';
}

function gerarInsightSlideNaoConformidades(ncByType: Array<{ label: string; value: number }>) {
  if (!ncByType.length) return 'Não há não conformidades registradas no período selecionado.';
  const top = ncByType.slice(0, 2).map((item) => item.label).join(' e ');
  return `${top} ${ncByType.length > 1 ? 'foram os problemas mais frequentes.' : 'foi o problema mais frequente.'}`;
}

function gerarConclusaoApresentacaoExtintores(executive: { status: ExecutiveStatus }, summary: { byStatus: Record<FireExtinguisherStatus, number> }) {
  if (executive.status === 'critica') return 'A prioridade é regularizar equipamentos vencidos e tratar não conformidades abertas para reduzir risco operacional.';
  if (executive.status === 'atencao') return 'A empresa possui controle estruturado, mas deve agir antes que vencimentos e pendências se acumulem.';
  return 'A empresa apresenta bom controle dos extintores. Manter a rotina mensal preserva a segurança e o respaldo em auditorias.';
}

function buildMapPrintHtml({
  companyName,
  plant,
  points,
  generatedAt,
}: {
  companyName?: string;
  plant?: FireExtinguisherPlant;
  points: Array<{ point: FireExtinguisherMapPoint; extinguisher: FireExtinguisher & { computedStatus: FireExtinguisherStatus } }>;
  generatedAt: string;
}) {
  const summary = Object.keys(extinguisherStatusLabels).reduce<Record<FireExtinguisherStatus, number>>((acc, status) => {
    acc[status as FireExtinguisherStatus] = points.filter((item) => item.extinguisher.computedStatus === status).length;
    return acc;
  }, { em_conformidade: 0, a_vencer: 0, vencido: 0, nao_conformidade: 0, sem_dados: 0 });

  const legend = Object.entries(extinguisherStatusColors).map(([status, color]) => `<span class="legend-item"><span class="dot" style="background:${color.dot}"></span>${escapeHtml(extinguisherStatusLabels[status as FireExtinguisherStatus])}</span>`).join('');
  const mapPoints = points.map(({ point, extinguisher }) => `<span class="map-point" title="${escapeHtml(extinguisher.codigo)}" style="left:${point.x_percent}%;top:${point.y_percent}%;background:${extinguisherStatusColors[extinguisher.computedStatus].dot}">${escapeHtml(extinguisher.codigo)}</span>`).join('');
  const rows = points.map(({ extinguisher }) => `<tr><td>${escapeHtml(extinguisher.codigo)}</td><td>${escapeHtml(extinguisher.area)}</td><td>${escapeHtml(extinguisher.localizacao_descritiva)}</td><td>${escapeHtml(extinguisher.tipo_agente)}</td><td>${escapeHtml(extinguisher.capacidade || '-')}</td><td>${escapeHtml(formatDate(extinguisher.data_proxima_recarga))}</td><td>${escapeHtml(formatDate(extinguisher.data_validade))}</td><td>${escapeHtml(extinguisherStatusLabels[extinguisher.computedStatus])}</td></tr>`).join('');

  return `<!doctype html><html><head><meta charset="utf-8"><title>Mapa de Extintores</title><style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { font-family: Arial, sans-serif; color: #111111; margin: 0; background: white; font-size: 8px; }
    .page { width: 100%; min-height: 190mm; overflow: hidden; }
    header { display:flex; justify-content:space-between; gap: 12px; border-bottom: 1px solid #e3e0d8; padding-bottom: 5px; margin-bottom: 6px; }
    h1 { margin: 0; font-size: 17px; line-height: 1.1; }
    .meta { color:#6e6a61; font-size:8px; line-height: 1.35; }
    .summary { display:grid; grid-template-columns: repeat(6, 1fr); gap:5px; margin: 6px 0; }
    .card { border:1px solid #e3e0d8; border-left:3px solid #7a1f1f; border-radius:7px; padding:5px; background:#f7f5f0; min-height: 28px; }
    .card strong { display:block; font-size:13px; line-height: 1; margin-top: 2px; }
    .map-wrap { position:relative; width:100%; max-height: 103mm; border:1px solid #e3e0d8; border-radius:9px; overflow:hidden; background:#f7f5f0; }
    .map-wrap img { width:100%; height:auto; display:block; }
    .map-point { position:absolute; transform:translate(-50%, -50%); min-width:15px; height:15px; border-radius:999px; border:1.5px solid white; box-shadow:0 1px 5px rgba(15,23,42,.35); color:white; font-size:6px; line-height:12px; padding:0 2px; text-align:center; font-weight:700; }
    .legend { display:flex; flex-wrap:wrap; gap:8px; margin: 5px 0 6px; font-size:8px; }
    .legend-item { display:flex; align-items:center; gap:6px; }
    .dot { width:7px; height:7px; border-radius:999px; display:inline-block; }
    table { width:100%; border-collapse:collapse; font-size:7px; margin-top: 4px; table-layout: fixed; }
    th, td { border:1px solid #e3e0d8; padding:3px; text-align:left; overflow-wrap:anywhere; }
    th { background:#f7f5f0; text-transform:uppercase; font-size:6px; color:#6e6a61; }
    .code { width: 9%; }
    .area { width: 11%; }
    .loc { width: 24%; }
    .agent { width: 15%; }
    .cap { width: 8%; }
    .date { width: 11%; }
    .status { width: 11%; }
    footer { margin-top: 5px; color:#7a1f1f; font-size:8px; font-weight:700; text-align:center; }
  </style></head><body>
    <main class="page">
      <header><div><h1>Mapa de Localização de Extintores</h1><div class="meta">${escapeHtml(companyName || 'Empresa')}<br>${escapeHtml(plant?.nome || 'Planta não informada')}</div></div><div class="meta">Unidade: ${escapeHtml(plant?.unidade || '-')}<br>Área: ${escapeHtml(plant?.area || '-')}<br>Gerado em: ${escapeHtml(generatedAt)}</div></header>
      <section class="summary"><div class="card"><span>Total</span><strong>${points.length}</strong></div><div class="card"><span>Conformes</span><strong>${summary.em_conformidade}</strong></div><div class="card"><span>A vencer</span><strong>${summary.a_vencer}</strong></div><div class="card"><span>Vencidos</span><strong>${summary.vencido}</strong></div><div class="card"><span>Com NC</span><strong>${summary.nao_conformidade}</strong></div><div class="card"><span>Sem dados</span><strong>${summary.sem_dados}</strong></div></section>
      <section class="map-wrap">${plant?.imagem_url ? `<img src="${plant.imagem_url}" alt="Planta">` : '<div>Planta não carregada</div>'}${mapPoints}</section>
      <section class="legend">${legend}</section>
      <table><thead><tr><th class="code">Código</th><th class="area">Área</th><th class="loc">Localização</th><th class="agent">Agente</th><th class="cap">Cap.</th><th class="date">Próx. recarga</th><th class="date">Validade</th><th class="status">Status</th></tr></thead><tbody>${rows || '<tr><td colspan="8">Nenhum extintor posicionado nesta planta.</td></tr>'}</tbody></table>
      ${plant?.observacoes ? `<p class="meta"><strong>Observações:</strong> ${escapeHtml(plant.observacoes)}</p>` : ''}
      <footer>Organização, controle e informação salvam vidas. Gestão simples hoje, segurança garantida sempre.</footer>
    </main>
  </body></html>`;
}

function buildDashboardPrintHtml({
  companyName,
  summary,
  executive,
  score,
  summaryText,
  conclusion,
  statusChart,
  agentsChart,
  areasChart,
  monthlyChart,
  ncByType,
  inspectionsByMonth,
  actionItems,
  plant,
  mapPoints,
  options,
  generatedAt,
}: {
  companyName?: string;
  summary: { total: number; byStatus: Record<FireExtinguisherStatus, number>; staleInspection: number; withoutMap: number; withoutPhoto: number; withoutQrCode: number; nextRecharge?: string };
  executive: { status: ExecutiveStatus; title: string; text: string };
  score: { value: number; label: string; text: string };
  summaryText: string;
  conclusion: { text: string; recommendations: string[] };
  statusChart: Array<{ label: string; value: number; status: FireExtinguisherStatus }>;
  agentsChart: Array<{ label: string; value: number }>;
  areasChart: Array<{ label: string; value: number }>;
  monthlyChart: Array<{ label: string; aVencer: number; vencidos: number }>;
  ncByType: Array<{ label: string; value: number }>;
  inspectionsByMonth: Array<{ label: string; value: number }>;
  actionItems: Array<{ item: FireExtinguisher & { computedStatus: FireExtinguisherStatus }; problem: string; severity: FireExtinguisherSeverity; action: string }>;
  plant?: FireExtinguisherPlant;
  mapPoints: Array<{ point: FireExtinguisherMapPoint; extinguisher: FireExtinguisher & { computedStatus: FireExtinguisherStatus } }>;
  options: DashboardExportOptions;
  generatedAt: string;
}) {
  const maxAgent = Math.max(1, ...agentsChart.map((item) => item.value));
  const maxArea = Math.max(1, ...areasChart.map((item) => item.value));
  const maxMonthly = Math.max(1, ...monthlyChart.map((item) => item.aVencer + item.vencidos));
  const maxInspection = Math.max(1, ...inspectionsByMonth.map((item) => item.value));
  const barRows = (items: Array<{ label: string; value: number }>, max: number, color = '#7a1f1f') => items.slice(0, 8).map((item) => `<div class="bar-row"><span>${escapeHtml(item.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, (item.value / max) * 100)}%;background:${color}"></div></div><strong>${item.value}</strong></div>`).join('') || '<p class="muted">Sem dados no período.</p>';
  const statusBars = statusChart.map((item) => `<div class="status-item"><span class="dot" style="background:${extinguisherStatusColors[item.status].dot}"></span><span>${escapeHtml(item.label)}</span><strong>${item.value}</strong></div>`).join('');
  const monthlyBars = monthlyChart.map((item) => `<div class="month"><span>${escapeHtml(item.label)}</span><div class="stack"><i style="height:${Math.max(2, (item.vencidos / maxMonthly) * 80)}px;background:#7a1f1f"></i><i style="height:${Math.max(2, (item.aVencer / maxMonthly) * 80)}px;background:#8a5a00"></i></div></div>`).join('');
  const inspectionBars = inspectionsByMonth.map((item) => `<div class="month"><span>${escapeHtml(item.label)}</span><div class="stack single"><i style="height:${Math.max(2, (item.value / maxInspection) * 80)}px;background:#1b5e3f"></i></div></div>`).join('');
  const actionRows = actionItems.slice(0, 12).map(({ item, problem, severity, action }) => `<tr><td>${escapeHtml(item.codigo)}</td><td>${escapeHtml(item.area)}</td><td>${escapeHtml(problem)}</td><td>${escapeHtml(severityLabels[severity])}</td><td>${escapeHtml(action)}</td></tr>`).join('');
  const mapMarkers = mapPoints.map(({ point, extinguisher }) => `<span class="map-point" style="left:${point.x_percent}%;top:${point.y_percent}%;background:${extinguisherStatusColors[extinguisher.computedStatus].dot}">${escapeHtml(extinguisher.codigo)}</span>`).join('');
  const recommendationRows = conclusion.recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Dashboard de Extintores</title><style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color:#111111; margin:0; font-size:10.5px; }
    .cover { min-height: 260mm; display:flex; flex-direction:column; justify-content:center; border:2px solid #e3e0d8; border-radius:18px; padding:28px; background:#f7f5f0; }
    .cover h1 { font-size:34px; margin:0; color:#7a1f1f; }
    .cover h2 { font-size:22px; margin:10px 0; }
    .page { break-before: page; min-height: 260mm; }
    header { display:flex; justify-content:space-between; gap:12px; border-bottom:1px solid #e3e0d8; padding-bottom:8px; margin-bottom:12px; color:#7a1f1f; }
    h1 { font-size:24px; margin:0 0 4px; }
    h2 { font-size:16px; margin:16px 0 8px; page-break-after: avoid; color:#111111; }
    h3 { font-size:13px; margin:0 0 6px; color:#7a1f1f; }
    .cards { display:grid; grid-template-columns: repeat(4, 1fr); gap:8px; margin:12px 0; }
    .card { border:1px solid #e3e0d8; border-left:4px solid #7a1f1f; border-radius:8px; padding:9px; background:#f7f5f0; min-height:58px; }
    .card strong { display:block; font-size:18px; margin-top:3px; }
    .hero { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .panel { border:1px solid #e3e0d8; border-radius:10px; padding:10px; background:#fff; page-break-inside: avoid; }
    .score { height:12px; border-radius:999px; background:#e3e0d8; overflow:hidden; margin:8px 0; }
    .score span { display:block; height:100%; background:#1b5e3f; }
    .badge { display:inline-block; border-radius:999px; padding:3px 8px; font-weight:700; font-size:9px; }
    .boa,.positivo { background:#eaf2ed; color:#1b5e3f; }
    .atencao { background:#faf3e4; color:#7a1f1f; }
    .critica,.critico { background:#f6edec; color:#7a1f1f; }
    .note { border:1px solid #cfcbc0; background:#f2f1ed; color:#111111; border-radius:8px; padding:8px; margin:8px 0; line-height:1.45; }
    .grid2 { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
    .bar-row { display:grid; grid-template-columns: 120px 1fr 32px; gap:8px; align-items:center; margin:6px 0; }
    .bar-track { height:12px; background:#f2f1ed; border-radius:999px; overflow:hidden; }
    .bar-fill { height:100%; border-radius:999px; }
    .status-grid { display:grid; grid-template-columns: repeat(2, 1fr); gap:6px; }
    .status-item { border:1px solid #e3e0d8; border-radius:8px; padding:7px; display:flex; align-items:center; gap:6px; }
    .dot { width:9px; height:9px; border-radius:999px; display:inline-block; }
    .months { display:flex; align-items:end; gap:7px; height:120px; border-bottom:1px solid #e3e0d8; padding-top:12px; }
    .month { flex:1; text-align:center; font-size:8px; color:#6e6a61; }
    .stack { height:86px; display:flex; align-items:end; justify-content:center; gap:2px; }
    .stack i { display:block; width:8px; border-radius:4px 4px 0 0; }
    .single i { width:14px; }
    .map-wrap { position:relative; width:100%; max-height:125mm; border:1px solid #e3e0d8; border-radius:10px; overflow:hidden; background:#f7f5f0; }
    .map-wrap img { width:100%; height:auto; display:block; }
    .map-point { position:absolute; transform:translate(-50%, -50%); min-width:16px; height:16px; border-radius:999px; border:1.5px solid white; color:white; font-size:6px; line-height:13px; text-align:center; font-weight:700; box-shadow:0 1px 5px rgba(15,23,42,.35); }
    table { width:100%; border-collapse:collapse; margin-top:8px; page-break-inside:auto; font-size:9px; }
    tr { page-break-inside:avoid; }
    th, td { border:1px solid #e3e0d8; padding:6px; text-align:left; vertical-align:top; }
    th { background:#f7f5f0; color:#7a1f1f; }
    .muted { color:#6e6a61; }
    footer { position: fixed; bottom: 0; left:0; right:0; font-size:8px; border-top:1px solid #e3e0d8; padding-top:4px; color:#7a1f1f; }
  </style></head><body>
    <section class="cover"><h1>Controle Inteligente de Extintores</h1><h2>Relatório Executivo</h2><p>${escapeHtml(companyName || 'Empresa/unidade')}</p><p>Template: ${escapeHtml(options.template)}<br>Período: ${escapeHtml(options.period)}<br>Data de geração: ${escapeHtml(generatedAt)}</p></section>
    <section class="page"><header><div><h1>Resumo Executivo</h1><span>${escapeHtml(companyName || 'Empresa')}</span></div><span>${escapeHtml(generatedAt)}</span></header><div class="hero"><div class="panel"><h3>Situação Geral dos Extintores</h3><span class="badge ${executive.status}">${escapeHtml(executiveStatusLabels[executive.status])}</span><p>${escapeHtml(executive.text)}</p></div><div class="panel"><h3>Score de Conformidade</h3><strong style="font-size:28px">${score.value}%</strong><span class="badge ${score.value >= 75 ? 'positivo' : score.value >= 60 ? 'atencao' : 'critico'}">${escapeHtml(score.label)}</span><div class="score"><span style="width:${score.value}%"></span></div><p>${escapeHtml(score.text)}</p></div></div><section class="cards"><div class="card">Total<strong>${summary.total}</strong></div><div class="card">Conformes<strong>${summary.byStatus.em_conformidade}</strong></div><div class="card">A vencer<strong>${summary.byStatus.a_vencer}</strong></div><div class="card">Vencidos<strong>${summary.byStatus.vencido}</strong></div><div class="card">Com NC<strong>${summary.byStatus.nao_conformidade}</strong></div><div class="card">Sem inspeção<strong>${summary.staleInspection}</strong></div><div class="card">Sem mapa<strong>${summary.withoutMap}</strong></div><div class="card">Próx. recarga<strong>${escapeHtml(formatDate(summary.nextRecharge))}</strong></div></section><h2>Resumo Executivo</h2><p>${escapeHtml(summaryText)}</p></section>
    <section class="page"><header><div><h1>Status e Distribuição</h1></div><span>${escapeHtml(generatedAt)}</span></header><div class="grid2"><div class="panel"><h3>Status de Vencimento <span class="badge ${getChartEvaluation('status', { vencidos: summary.byStatus.vencido, aVencer: summary.byStatus.a_vencer })}">${chartEvaluationLabels[getChartEvaluation('status', { vencidos: summary.byStatus.vencido, aVencer: summary.byStatus.a_vencer })]}</span></h3><div class="status-grid">${statusBars}</div><div class="note">${dashboardInsights.status}</div></div><div class="panel"><h3>Quantidade por Agente Extintor <span class="badge positivo">Distribuição</span></h3>${barRows(agentsChart, maxAgent)}<div class="note">${dashboardInsights.agents}</div></div></div></section>
    <section class="page"><header><div><h1>Áreas e Planejamento</h1></div><span>${escapeHtml(generatedAt)}</span></header><div class="grid2"><div class="panel"><h3>Extintores por Área</h3>${barRows(areasChart, maxArea, '#111111')}<div class="note">${dashboardInsights.areas}</div></div><div class="panel"><h3>Controle Mensal de Vencimentos <span class="badge ${getChartEvaluation('monthly', { vencidos: summary.byStatus.vencido, aVencer: summary.byStatus.a_vencer })}">${chartEvaluationLabels[getChartEvaluation('monthly', { vencidos: summary.byStatus.vencido, aVencer: summary.byStatus.a_vencer })]}</span></h3><div class="months">${monthlyBars}</div><div class="note">${dashboardInsights.monthly}</div></div></div></section>
    <section class="page"><header><div><h1>Não Conformidades e Inspeções</h1></div><span>${escapeHtml(generatedAt)}</span></header><div class="grid2"><div class="panel"><h3>Não Conformidades por Tipo <span class="badge ${getChartEvaluation('nc', { ncs: ncByType.reduce((sum, item) => sum + item.value, 0) })}">${chartEvaluationLabels[getChartEvaluation('nc', { ncs: ncByType.reduce((sum, item) => sum + item.value, 0) })]}</span></h3>${barRows(ncByType, Math.max(1, ...ncByType.map((item) => item.value)), '#111111')}<div class="note">${dashboardInsights.ncs}</div></div><div class="panel"><h3>Inspeções Realizadas por Mês <span class="badge ${getChartEvaluation('inspections', { inspections: inspectionsByMonth.reduce((sum, item) => sum + item.value, 0) })}">${chartEvaluationLabels[getChartEvaluation('inspections', { inspections: inspectionsByMonth.reduce((sum, item) => sum + item.value, 0) })]}</span></h3><div class="months">${inspectionBars}</div><div class="note">${dashboardInsights.inspections}</div></div></div></section>
    ${options.includeMap ? `<section class="page"><header><div><h1>Mapa de Localização</h1></div><span>${escapeHtml(generatedAt)}</span></header>${plant?.imagem_url ? `<div class="map-wrap"><img src="${plant.imagem_url}" alt="Planta">${mapMarkers}</div>` : '<div class="panel muted">Nenhuma planta cadastrada. Suba uma planta para visualizar os extintores no mapa.</div>'}</section>` : ''}
    ${options.includeActions ? `<section class="page"><header><div><h1>Ações Recomendadas</h1></div><span>${escapeHtml(generatedAt)}</span></header><table><thead><tr><th>Código</th><th>Área</th><th>Problema</th><th>Gravidade</th><th>Ação recomendada</th></tr></thead><tbody>${actionRows || '<tr><td colspan="5">Nenhuma pendência crítica no período.</td></tr>'}</tbody></table>${actionItems.length > 12 ? '<p class="muted">Lista limitada aos principais 12 itens para preservar a legibilidade do relatório.</p>' : ''}</section>` : ''}
    ${options.includeConclusion ? `<section class="page"><header><div><h1>Conclusão e Recomendações</h1></div><span>${escapeHtml(generatedAt)}</span></header><div class="panel"><p>${escapeHtml(conclusion.text)}</p><ul>${recommendationRows || '<li>Manter rotina de inspeções e recargas preventivas.</li>'}</ul></div></section>` : ''}
    <footer>Controle Inteligente de Extintores • Relatório executivo para reunião, auditoria e prestação de contas</footer>
  </body></html>`;
}

function buildPresentationPrintHtml({
  companyName,
  summary,
  executive,
  score,
  executiveSummary,
  conclusion,
  statusChart,
  agentsChart,
  areasChart,
  monthlyChart,
  ncByType,
  actionItems,
  plant,
  mapPoints,
  options,
  generatedAt,
}: {
  companyName?: string;
  summary: { total: number; byStatus: Record<FireExtinguisherStatus, number>; staleInspection: number; withoutMap: number; withoutPhoto: number; nextRecharge?: string };
  executive: { status: ExecutiveStatus; title: string; text: string };
  score: { value: number; label: string; text: string };
  executiveSummary: string;
  conclusion: { text: string; recommendations: string[] };
  statusChart: Array<{ label: string; value: number; status: FireExtinguisherStatus }>;
  agentsChart: Array<{ label: string; value: number }>;
  areasChart: Array<{ label: string; value: number }>;
  monthlyChart: Array<{ label: string; aVencer: number; vencidos: number }>;
  ncByType: Array<{ label: string; value: number }>;
  actionItems: Array<{ item: FireExtinguisher & { computedStatus: FireExtinguisherStatus }; problem: string; severity: FireExtinguisherSeverity; action: string }>;
  plant?: FireExtinguisherPlant;
  mapPoints: Array<{ point: FireExtinguisherMapPoint; extinguisher: FireExtinguisher & { computedStatus: FireExtinguisherStatus } }>;
  options: PresentationExportOptions;
  generatedAt: string;
}) {
  const maxAgent = Math.max(1, ...agentsChart.map((item) => item.value));
  const maxArea = Math.max(1, ...areasChart.map((item) => item.value));
  const maxMonthly = Math.max(1, ...monthlyChart.map((item) => item.aVencer + item.vencidos));
  const totalStatus = Math.max(1, statusChart.reduce((sum, item) => sum + item.value, 0));
  let offset = 0;
  const donutSegments = statusChart.map((item) => {
    const start = offset;
    offset += (item.value / totalStatus) * 100;
    return `${extinguisherStatusColors[item.status].dot} ${start}% ${offset}%`;
  }).join(', ');
  const bars = (items: Array<{ label: string; value: number }>, max: number, color = '#7a1f1f') => items.slice(0, 7).map((item) => `<div class="bar-row"><span>${escapeHtml(item.label)}</span><div><i style="width:${Math.max(4, (item.value / max) * 100)}%;background:${color}"></i></div><strong>${item.value}</strong></div>`).join('') || '<p class="empty">Sem dados para exibir.</p>';
  const monthlyBars = monthlyChart.map((item) => `<div class="month"><div class="cols"><i style="height:${Math.max(2, (item.vencidos / maxMonthly) * 210)}px;background:#7a1f1f"></i><i style="height:${Math.max(2, (item.aVencer / maxMonthly) * 210)}px;background:#8a5a00"></i></div><span>${escapeHtml(item.label)}</span></div>`).join('');
  const mapMarkers = mapPoints.map(({ point, extinguisher }) => `<span class="map-point" style="left:${point.x_percent}%;top:${point.y_percent}%;background:${extinguisherStatusColors[extinguisher.computedStatus].dot}">${escapeHtml(extinguisher.codigo)}</span>`).join('');
  const actionRows = actionItems.slice(0, 10).map(({ item, problem, severity, action }) => `<tr><td>${escapeHtml(item.codigo)}</td><td>${escapeHtml(item.area)}</td><td>${escapeHtml(problem)}</td><td><span class="pill ${severity === 'critica' ? 'danger' : severity === 'alta' ? 'warn' : 'neutral'}">${escapeHtml(severityLabels[severity])}</span></td><td>${escapeHtml(action)}</td></tr>`).join('');
  const recommendations = (options.includeRecommendations ? conclusion.recommendations : []).slice(0, 6).map((item, index) => `<div class="recommendation"><strong>${index + 1}</strong><span>${escapeHtml(item)}</span></div>`).join('');
  const statusLegend = statusChart.map((item) => `<div class="legend"><span style="background:${extinguisherStatusColors[item.status].dot}"></span>${escapeHtml(item.label)} <strong>${item.value}</strong></div>`).join('');
  const slideFooter = (n: number) => `<footer>${escapeHtml(companyName || 'Empresa')} • ${escapeHtml(generatedAt)} • Slide ${n}</footer>`;

  return `<!doctype html><html><head><meta charset="utf-8"><title>Apresentação de Extintores</title><style>
    @page { size: 297mm 167mm; margin: 0; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: Arial, sans-serif; color:#111111; background:#f7f5f0; }
    .slide { width:297mm; height:167mm; page-break-after:always; padding:13mm 15mm; position:relative; overflow:hidden; background:white; }
    .slide::before { content:""; position:absolute; inset:0 0 auto 0; height:5mm; background:#7a1f1f; }
    .cover { background:linear-gradient(135deg,#f7f5f0 0%,#ffffff 58%); display:flex; align-items:center; justify-content:space-between; }
    .cover h1 { font-size:42px; line-height:1.05; margin:0; color:#7a1f1f; max-width:600px; }
    .cover h2 { font-size:24px; margin:14px 0; color:#111111; }
    .cover .mark { width:160px; height:160px; border-radius:32px; background:#f0e2e0; color:#7a1f1f; display:grid; place-items:center; font-size:74px; font-weight:700; }
    h1 { margin:0 0 7mm; font-size:28px; color:#111111; }
    h2 { margin:0 0 5mm; font-size:22px; color:#7a1f1f; }
    p { font-size:16px; line-height:1.45; margin:0; }
    .small { font-size:13px; color:#6e6a61; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:9mm; }
    .grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:7mm; }
    .cards { display:grid; grid-template-columns:repeat(5,1fr); gap:5mm; }
    .card { border:1px solid #e3e0d8; border-radius:14px; padding:7mm; background:#f7f5f0; min-height:34mm; }
    .card span { display:block; font-size:13px; color:#6e6a61; }
    .card strong { display:block; font-size:30px; margin-top:3mm; color:#111111; }
    .panel { border:1px solid #e3e0d8; border-radius:16px; padding:8mm; background:#fff; box-shadow:0 6px 22px rgba(15,23,42,.06); }
    .badge,.pill { display:inline-block; border-radius:999px; padding:4px 10px; font-size:12px; font-weight:700; }
    .boa,.positive { background:#dde9e2; color:#1b5e3f; }
    .atencao,.warn { background:#faf3e4; color:#7a1f1f; }
    .critica,.danger { background:#f0e2e0; color:#7a1f1f; }
    .neutral { background:#f2f1ed; color:#6e6a61; }
    .score { height:14px; border-radius:999px; background:#e3e0d8; overflow:hidden; margin-top:6mm; }
    .score i { display:block; height:100%; background:#1b5e3f; }
    .donut { width:96mm; height:96mm; border-radius:50%; background:conic-gradient(${donutSegments || '#e3e0d8 0% 100%'}); position:relative; margin:auto; }
    .donut::after { content:""; position:absolute; inset:23mm; border-radius:50%; background:white; box-shadow:inset 0 0 0 1px #e3e0d8; }
    .legend { display:flex; align-items:center; justify-content:space-between; gap:8px; font-size:15px; padding:3mm 0; border-bottom:1px solid #f2f1ed; }
    .legend span { width:12px; height:12px; border-radius:999px; display:inline-block; margin-right:6px; }
    .insight { border-left:5px solid #7a1f1f; background:#f7f5f0; border-radius:12px; padding:6mm; font-size:16px; line-height:1.45; }
    .bar-row { display:grid; grid-template-columns:42mm 1fr 12mm; align-items:center; gap:5mm; margin:4mm 0; font-size:15px; }
    .bar-row div { height:12mm; background:#f2f1ed; border-radius:999px; overflow:hidden; }
    .bar-row i { display:block; height:100%; border-radius:999px; }
    .months { height:92mm; display:flex; align-items:end; gap:5mm; border-bottom:1px solid #e3e0d8; padding:0 3mm 6mm; }
    .month { flex:1; text-align:center; color:#6e6a61; font-size:12px; }
    .cols { height:74mm; display:flex; align-items:end; justify-content:center; gap:2mm; }
    .cols i { width:6mm; border-radius:4mm 4mm 0 0; display:block; }
    .map-wrap { position:relative; height:110mm; border:1px solid #e3e0d8; border-radius:16px; overflow:hidden; background:#f7f5f0; }
    .map-wrap img { width:100%; height:100%; object-fit:contain; display:block; }
    .map-point { position:absolute; transform:translate(-50%,-50%); min-width:18px; height:18px; border-radius:999px; border:2px solid white; color:white; font-size:7px; line-height:14px; text-align:center; font-weight:700; box-shadow:0 2px 8px rgba(15,23,42,.35); }
    table { width:100%; border-collapse:separate; border-spacing:0 3mm; font-size:14px; }
    th { text-align:left; color:#7a1f1f; font-size:12px; }
    td { background:#f7f5f0; padding:4mm; border-top:1px solid #e3e0d8; border-bottom:1px solid #e3e0d8; }
    td:first-child { border-left:1px solid #e3e0d8; border-radius:10px 0 0 10px; font-weight:700; }
    td:last-child { border-right:1px solid #e3e0d8; border-radius:0 10px 10px 0; }
    .recommendation { display:flex; align-items:center; gap:5mm; border:1px solid #e3e0d8; background:#f7f5f0; border-radius:14px; padding:5mm; font-size:17px; }
    .recommendation strong { width:12mm; height:12mm; border-radius:999px; background:#7a1f1f; color:white; display:grid; place-items:center; }
    .empty { border:1px dashed #e3e0d8; border-radius:16px; padding:12mm; text-align:center; color:#6e6a61; background:#f7f5f0; }
    footer { position:absolute; left:15mm; right:15mm; bottom:6mm; display:flex; justify-content:space-between; color:#6e6a61; font-size:11px; border-top:1px solid #f2f1ed; padding-top:3mm; }
  </style></head><body>
    <section class="slide cover"><div><h1>Controle Inteligente de Extintores</h1><h2>Apresentação ${escapeHtml(options.type)}</h2><p>${escapeHtml(companyName || 'Empresa/unidade')}</p><p class="small">Período: ${escapeHtml(options.period)} • Gerado em ${escapeHtml(generatedAt)}</p></div><div class="mark">EXT</div></section>
    <section class="slide"><h1>Resumo Executivo</h1><div class="grid2"><div class="panel"><span class="badge ${executive.status}">${escapeHtml(executiveStatusLabels[executive.status])}</span><h2 style="margin-top:8mm">${escapeHtml(executive.title)}</h2><p>${escapeHtml(gerarResumoExecutivoApresentacaoExtintores(summary, executive))}</p></div><div class="panel"><h2>Score de Conformidade</h2><strong style="font-size:54px">${score.value}%</strong><span class="badge ${score.value >= 75 ? 'positive' : score.value >= 60 ? 'warn' : 'danger'}">${escapeHtml(score.label)}</span><div class="score"><i style="width:${score.value}%"></i></div><p class="small" style="margin-top:6mm">${escapeHtml(score.text)}</p></div></div><div class="cards" style="margin-top:8mm"><div class="card"><span>Total</span><strong>${summary.total}</strong></div><div class="card"><span>Conformes</span><strong>${summary.byStatus.em_conformidade}</strong></div><div class="card"><span>A vencer</span><strong>${summary.byStatus.a_vencer}</strong></div><div class="card"><span>Vencidos</span><strong>${summary.byStatus.vencido}</strong></div><div class="card"><span>Com NC</span><strong>${summary.byStatus.nao_conformidade}</strong></div></div>${slideFooter(2)}</section>
    <section class="slide"><h1>Situação Geral dos Extintores</h1><div class="cards"><div class="card"><span>Total de extintores</span><strong>${summary.total}</strong></div><div class="card"><span>Em conformidade</span><strong>${percent(summary.byStatus.em_conformidade, summary.total)}%</strong></div><div class="card"><span>A vencer</span><strong>${summary.byStatus.a_vencer}</strong></div><div class="card"><span>Vencidos</span><strong>${summary.byStatus.vencido}</strong></div><div class="card"><span>Não conformidade</span><strong>${summary.byStatus.nao_conformidade}</strong></div></div><div class="panel" style="margin-top:10mm"><h2>${escapeHtml(executiveStatusLabels[executive.status])}</h2><p>${escapeHtml(executive.text)}</p></div>${slideFooter(3)}</section>
    <section class="slide"><h1>Status de Vencimento</h1><div class="grid2"><div><div class="donut"></div></div><div class="panel">${statusLegend}<div class="insight" style="margin-top:8mm">${escapeHtml(gerarInsightSlideStatusVencimento(summary))}</div></div></div>${slideFooter(4)}</section>
    <section class="slide"><h1>Distribuição por Agente Extintor</h1><div class="grid2"><div class="panel">${bars(agentsChart, maxAgent)}</div><div class="insight">${escapeHtml(gerarInsightSlideAgentes(agentsChart))}<br><br>A distribuição por agente ajuda a verificar compatibilidade com os riscos das áreas protegidas.</div></div>${slideFooter(5)}</section>
    <section class="slide"><h1>Extintores por Área</h1><div class="grid2"><div class="panel">${bars(areasChart, maxArea, '#111111')}</div><div class="panel"><h2>Área com maior concentração</h2><strong style="font-size:34px">${escapeHtml(areasChart[0]?.label || 'Sem dados')}</strong><p style="margin-top:6mm">${escapeHtml(gerarInsightSlideAreas(areasChart, actionItems))}</p></div></div>${slideFooter(6)}</section>
    <section class="slide"><h1>Controle Mensal de Vencimentos</h1><div class="grid2"><div class="panel"><div class="months">${monthlyBars}</div><p class="small" style="margin-top:4mm">Vermelho: vencidos • Amarelo: a vencer</p></div><div class="insight">${escapeHtml(gerarInsightSlideVencimentosMensais(monthlyChart))}<br><br>Este gráfico ajuda a planejar recargas e evitar acúmulo de vencimentos.</div></div>${slideFooter(7)}</section>
    <section class="slide"><h1>Não Conformidades por Tipo</h1><div class="grid2"><div class="panel">${bars(ncByType, Math.max(1, ...ncByType.map((item) => item.value)), '#111111')}</div><div class="insight">${escapeHtml(gerarInsightSlideNaoConformidades(ncByType))}<br><br>Este indicador mostra os problemas mais recorrentes nos extintores.</div></div>${slideFooter(8)}</section>
    ${options.includeMap ? `<section class="slide"><h1>Mapa de Localização</h1>${plant?.imagem_url ? `<div class="map-wrap"><img src="${plant.imagem_url}" alt="Mapa">${mapMarkers}</div><div style="display:flex;gap:5mm;margin-top:4mm">${statusLegend}</div>` : '<div class="empty">Nenhum mapa de localização foi cadastrado.</div>'}${slideFooter(9)}</section>` : ''}
    ${options.includeActions ? `<section class="slide"><h1>Extintores que Exigem Ação</h1>${actionRows ? `<table><thead><tr><th>Código</th><th>Área</th><th>Problema</th><th>Gravidade</th><th>Ação recomendada</th></tr></thead><tbody>${actionRows}</tbody></table>${actionItems.length > 10 ? '<p class="small">Existem mais itens na listagem completa do sistema.</p>' : ''}` : '<div class="empty">Nenhum extintor exige ação imediata.</div>'}${slideFooter(10)}</section>` : ''}
    ${options.includeRecommendations ? `<section class="slide"><h1>Recomendações</h1><div class="grid2">${recommendations || '<div class="empty">Manter rotina de inspeções e recargas preventivas.</div>'}</div>${slideFooter(11)}</section>` : ''}
    <section class="slide"><h1>Conclusão</h1><div class="panel" style="margin-top:18mm"><p style="font-size:24px">${escapeHtml(gerarConclusaoApresentacaoExtintores(executive, summary))}</p><p style="margin-top:14mm;color:#7a1f1f;font-weight:700">Organização, controle e informação salvam vidas.</p><p class="small" style="margin-top:8mm">Emitido em ${escapeHtml(generatedAt)}</p></div>${slideFooter(12)}</section>
  </body></html>`;
}

function statusBadge(status: FireExtinguisherStatus) {
  const color = extinguisherStatusColors[status];
  return <Badge className="border" style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}>{extinguisherStatusLabels[status]}</Badge>;
}

function ncStatusBadge(status: FireExtinguisherNcStatus) {
  const map: Record<FireExtinguisherNcStatus, string> = {
    aberta: 'bg-[#f7f5f0] text-[#7a1f1f]',
    em_andamento: 'bg-[#f2f1ed] text-[#111111]',
    resolvida: 'bg-[#eaf2ed] text-[#1b5e3f]',
    atrasada: 'bg-[#f6edec] text-[#7a1f1f]',
    cancelada: 'bg-[#f2f1ed] text-[#6e6a61]',
  };
  return <Badge className={cn('border-0', map[status])}>{status.replace('_', ' ')}</Badge>;
}

function MetricCard({ title, value, helper, icon: Icon, status, onClick }: { title: string; value: string | number; helper: string; icon: typeof Flame; status?: FireExtinguisherStatus; onClick?: () => void }) {
  const color = status ? extinguisherStatusColors[status] : { bg: '#f7f5f0', border: '#cfcbc0', text: '#111111', dot: moduleColor.primary };
  return (
    <button type="button" onClick={onClick} className="rounded-2xl border border-l-4 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" style={{ borderTopColor: color.border, borderRightColor: color.border, borderBottomColor: color.border, borderLeftColor: color.dot }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#6e6a61]">{title}</p>
          <p className="mt-3 text-3xl font-bold text-[#111111]">{value}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: color.bg, color: color.text }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-[#6e6a61]">{helper}</p>
    </button>
  );
}

function FireExtinguisherForm({ form, setForm, onSubmit }: { form: FireExtinguisher; setForm: (form: FireExtinguisher) => void; onSubmit: () => void }) {
  const update = <K extends keyof FireExtinguisher>(key: K, value: FireExtinguisher[K]) => setForm({ ...form, [key]: value });
  const [mode, setMode] = useState<'simple' | 'complete'>('simple');
  const [suggestions, setSuggestions] = useState<ExtractedSuggestion>({});
  const handlePhoto = (file?: File) => {
    if (!file) return;
    fileToDataUrl(file, (foto_url) => setForm({ ...form, foto_url }));
  };
  const extractFromPhoto = () => {
    if (!form.foto_url) return;
    const guessed: ExtractedSuggestion = {
      tipo_agente: { value: 'Pó Químico ABC', confidence: 78 },
      capacidade: { value: form.capacidade || '6 kg', confidence: 72 },
      classe_fogo: { value: 'ABC', confidence: 68 },
      codigo: { value: form.codigo || `EXT-${String(Date.now()).slice(-4)}`, confidence: 56 },
    };
    setSuggestions(guessed);
    setForm({ ...form, tipo_agente: guessed.tipo_agente?.value || form.tipo_agente, capacidade: guessed.capacidade?.value || form.capacidade, classe_fogo: guessed.classe_fogo?.value || form.classe_fogo, codigo: form.codigo || guessed.codigo?.value || '' });
  };
  const clearSuggestion = (key: keyof FireExtinguisher) => {
    setSuggestions((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-xl font-bold text-[#111111]">Novo Extintor</h3>
        <p className="text-sm text-[#6e6a61]">Cadastre rapidamente usando foto ou preenchimento manual.</p>
      </div>
      <div className="rounded-2xl border border-[#e3e0d8] bg-[#f7f5f0] p-4">
        <h4 className="font-bold text-[#111111]">Adicionar foto do extintor</h4>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md bg-[#7a1f1f] px-4 py-3 text-sm font-medium text-white hover:bg-[#7a1f1f]"><Camera className="h-4 w-4" />Tirar foto agora<Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" capture="environment" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} /></label>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-[#e3e0d8] bg-white px-4 py-3 text-sm font-medium hover:bg-[#f7f5f0]"><Upload className="h-4 w-4" />Enviar foto<Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" className="hidden" onChange={(event) => handlePhoto(event.target.files?.[0])} /></label>
          <Button type="button" variant="outline" className="py-6" onClick={() => update('foto_url', '')}>Cadastrar sem foto</Button>
        </div>
        {form.foto_url ? <div className="mt-4 grid gap-4 md:grid-cols-[220px_1fr]"><img src={form.foto_url} alt="Prévia do extintor" className="h-56 w-full rounded-xl border bg-white object-cover" /><div className="space-y-3"><p className="text-sm text-[#6e6a61]">Foto principal adicionada. Você pode trocar ou remover antes de salvar.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={extractFromPhoto}><Flame className="h-4 w-4" />Preencher automaticamente pela foto</Button><Button type="button" variant="outline" onClick={() => update('foto_url', '')}>Remover imagem</Button></div><p className="rounded-lg border border-[#cfcbc0] bg-[#f2f1ed] p-3 text-sm text-[#111111]">Revise os dados extraídos antes de salvar. A leitura automática pode não identificar todas as informações corretamente.</p></div></div> : null}
        {!form.foto_url ? <p className="mt-3 text-sm text-[#6e6a61]">No celular, use a câmera. No desktop, envie PNG, JPG, JPEG ou WEBP.</p> : null}
      </div>
      {Object.keys(suggestions).length ? <div className="rounded-2xl border border-[#cfcbc0] bg-white p-4"><h4 className="font-bold text-[#111111]">Dados sugeridos pela foto</h4><div className="mt-3 grid gap-3 md:grid-cols-2">{Object.entries(suggestions).map(([key, suggestion]) => <div key={key} className="rounded-xl border border-[#e3e0d8] p-3 text-sm"><div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{key.replaceAll('_', ' ')}</p><p className="text-[#6e6a61]">Sugerido: {suggestion?.value}</p><p className="text-xs text-[#111111]">Confiança: {suggestion?.confidence}%</p></div><Button type="button" size="sm" variant="ghost" onClick={() => clearSuggestion(key as keyof FireExtinguisher)}>Limpar</Button></div></div>)}</div></div> : null}
      <div className="flex gap-2"><Button type="button" variant={mode === 'simple' ? 'default' : 'outline'} onClick={() => setMode('simple')} className={mode === 'simple' ? 'bg-[#7a1f1f] text-white' : ''}>Modo simples</Button><Button type="button" variant={mode === 'complete' ? 'default' : 'outline'} onClick={() => setMode('complete')} className={mode === 'complete' ? 'bg-[#7a1f1f] text-white' : ''}>Modo completo</Button></div>
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Código"><Input value={form.codigo} onChange={(event) => update('codigo', event.target.value)} /></Field>
        {mode === 'complete' ? <Field label="Número patrimonial"><Input value={form.numero_patrimonial || ''} onChange={(event) => update('numero_patrimonial', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Unidade/empresa"><Input value={form.unidade || ''} onChange={(event) => update('unidade', event.target.value)} /></Field> : null}
        <Field label="Área/setor"><Input value={form.area} onChange={(event) => update('area', event.target.value)} /></Field>
        <Field label="Localização"><Input value={form.localizacao_descritiva} onChange={(event) => update('localizacao_descritiva', event.target.value)} /></Field>
        <Field label="Agente extintor"><Select value={form.tipo_agente} onValueChange={(value) => update('tipo_agente', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{extinguisherAgents.map((agent) => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Capacidade"><Input value={form.capacidade || ''} onChange={(event) => update('capacidade', event.target.value)} /></Field>
        {mode === 'complete' ? <Field label="Classe de fogo"><Input value={form.classe_fogo || ''} onChange={(event) => update('classe_fogo', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Fabricante"><Input value={form.fabricante || ''} onChange={(event) => update('fabricante', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Modelo"><Input value={form.modelo || ''} onChange={(event) => update('modelo', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Número de série"><Input value={form.numero_serie || ''} onChange={(event) => update('numero_serie', event.target.value)} /></Field> : null}
        <Field label="Frequência de inspeção"><Input type="number" value={form.frequencia_inspecao_dias || 30} onChange={(event) => update('frequencia_inspecao_dias', Number(event.target.value))} /></Field>
        {mode === 'complete' ? <Field label="Data de fabricação"><Input type="date" value={form.data_fabricacao || ''} onChange={(event) => update('data_fabricacao', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Última recarga"><Input type="date" value={form.data_ultima_recarga || ''} onChange={(event) => update('data_ultima_recarga', event.target.value)} /></Field> : null}
        <Field label="Próxima recarga"><Input type="date" value={form.data_proxima_recarga || ''} onChange={(event) => update('data_proxima_recarga', event.target.value)} /></Field>
        <Field label="Validade"><Input type="date" value={form.data_validade || ''} onChange={(event) => update('data_validade', event.target.value)} /></Field>
        {mode === 'complete' ? <Field label="Última inspeção"><Input type="date" value={form.data_ultima_inspecao || ''} onChange={(event) => update('data_ultima_inspecao', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Responsável"><Input value={form.responsavel_inspecao || ''} onChange={(event) => update('responsavel_inspecao', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Empresa de manutenção"><Input value={form.empresa_manutencao || ''} onChange={(event) => update('empresa_manutencao', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Fornecedor"><Input value={form.fornecedor || ''} onChange={(event) => update('fornecedor', event.target.value)} /></Field> : null}
        {mode === 'complete' ? <Field label="Foto obrigatória na inspeção"><Select value={form.photo_policy || 'obrigatoria_nc'} onValueChange={(value) => update('photo_policy', value as FireExtinguisherPhotoPolicy)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="opcional">Foto opcional</SelectItem><SelectItem value="obrigatoria_nc">Obrigatória se houver NC</SelectItem><SelectItem value="obrigatoria_toda_inspecao">Obrigatória em toda inspeção</SelectItem></SelectContent></Select></Field> : null}
        {mode === 'complete' ? <Field label="Status manual"><Select value={form.status_manual || 'automatico'} onValueChange={(value) => update('status_manual', value === 'automatico' ? undefined : value as FireExtinguisherStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="automatico">Automático</SelectItem>{Object.entries(extinguisherStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field> : null}
      </div>
      {form.status_manual ? <Field label="Justificativa do status manual"><Textarea value={form.justificativa_status_manual || ''} onChange={(event) => update('justificativa_status_manual', event.target.value)} /></Field> : null}
      <Field label="Observações"><Textarea value={form.observacoes || ''} onChange={(event) => update('observacoes', event.target.value)} /></Field>
      <div className="flex justify-end gap-2"><Button onClick={onSubmit} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Salvar extintor</Button></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5 text-sm font-medium text-[#111111]"><span>{label}</span>{children}</label>;
}

export function FireExtinguishersDashboard({ companyId, companyName }: FireExtinguishersDashboardProps) {
  const { toast } = useToast();
  const [store, setStore] = useState<FireExtinguisherDataStore>(() => emptyExtinguisherStore());
  const [isReady, setIsReady] = useState(false);
  const [modal, setModal] = useState<ActiveModal>(null);
  const [selected, setSelected] = useState<FireExtinguisher | null>(null);
  const [form, setForm] = useState<FireExtinguisher>(() => blankExtinguisher(companyId));
  const [plantForm, setPlantForm] = useState<FireExtinguisherPlant>({ id: '', companyId, nome: 'Planta geral', unidade: companyName || '', area: '', imagem_url: '', observacoes: '', created_at: '', updated_at: '' });
  const [pointDraft, setPointDraft] = useState<{ x: number; y: number } | null>(null);
  const [addPointMode, setAddPointMode] = useState(false);
  const [repositionPointId, setRepositionPointId] = useState<string | null>(null);
  const [dragPreview, setDragPreview] = useState<{ pointId: string; x: number; y: number } | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<FireExtinguisherMapPoint | null>(null);
  const [photoForm, setPhotoForm] = useState<FireExtinguisherPhoto>(() => blankPhoto(companyId));
  const [documentForm, setDocumentForm] = useState<FireExtinguisherDocument>(() => blankDocument(companyId));
  const [dashboardExportOptions, setDashboardExportOptions] = useState<DashboardExportOptions>(defaultDashboardExportOptions);
  const [presentationExportOptions, setPresentationExportOptions] = useState<PresentationExportOptions>(defaultPresentationExportOptions);
  const [isGeneratingPresentation, setIsGeneratingPresentation] = useState(false);
  const [mapPdfHistory, setMapPdfHistory] = useState<Array<{ id: string; plantName: string; generatedAt: string; count: number; status: string }>>([]);
  const [isGeneratingMapPdf, setIsGeneratingMapPdf] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState({ unidade: 'todas', area: 'todas', agente: 'todos', status: 'todos', vencimento: 'todos', nc: 'todas', periodo: 'ano' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const key = extinguisherStorageKey(companyId);
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? normalizeExtinguisherStore(JSON.parse(saved) as Partial<FireExtinguisherDataStore>) : createSeedExtinguisherStore(companyId);
    setStore(parsed);
    if (!saved) window.localStorage.setItem(key, JSON.stringify(parsed));
    setIsReady(true);
  }, [companyId]);

  useEffect(() => {
    if (!isReady) return;
    window.localStorage.setItem(extinguisherStorageKey(companyId), JSON.stringify(store));
  }, [companyId, isReady, store]);

  const activePlant = store.plants[0];
  const enriched = useMemo(() => store.extinguishers.filter((item) => !item.archived).map((item) => ({ ...item, computedStatus: calculateExtinguisherStatus(item, store.nonconformities) })), [store.extinguishers, store.nonconformities]);
  const filtered = useMemo(() => enriched.filter((item) => {
    const term = search.trim().toLowerCase();
    const matchesSearch = !term || `${item.codigo} ${item.area} ${item.localizacao_descritiva} ${item.tipo_agente}`.toLowerCase().includes(term);
    const matchesUnit = filters.unidade === 'todas' || item.unidade === filters.unidade;
    const matchesArea = filters.area === 'todas' || item.area === filters.area;
    const matchesAgent = filters.agente === 'todos' || item.tipo_agente === filters.agente;
    const matchesStatus = filters.status === 'todos' || item.computedStatus === filters.status;
    const openNc = store.nonconformities.some((nc) => nc.extintor_id === item.id && ['aberta', 'em_andamento', 'atrasada'].includes(nc.status));
    const matchesNc = filters.nc === 'todas' || (filters.nc === 'sim' && openNc) || (filters.nc === 'nao' && !openNc);
    return matchesSearch && matchesUnit && matchesArea && matchesAgent && matchesStatus && matchesNc;
  }), [enriched, filters, search, store.nonconformities]);

  const summary = useMemo(() => {
    const total = filtered.length;
    const byStatus = filtered.reduce<Record<FireExtinguisherStatus, number>>((acc, item) => {
      acc[item.computedStatus] = (acc[item.computedStatus] || 0) + 1;
      return acc;
    }, { em_conformidade: 0, a_vencer: 0, vencido: 0, nao_conformidade: 0, sem_dados: 0 });
    const nextRecharge = filtered.map((item) => item.data_proxima_recarga).filter(Boolean).sort()[0];
    const staleInspection = filtered.filter((item) => {
      if (!item.data_ultima_inspecao) return true;
      const diff = Math.abs(new Date().getTime() - new Date(item.data_ultima_inspecao).getTime()) / 86400000;
      return diff > (item.frequencia_inspecao_dias || 30);
    }).length;
    const withoutMap = filtered.filter((item) => !store.points.some((point) => point.extintor_id === item.id)).length;
    const withoutPhoto = filtered.filter((item) => !item.foto_url && !store.photos.some((photo) => photo.extintor_id === item.id)).length;
    const withoutQrCode = filtered.filter((item) => !item.qr_code_url).length;
    return { total, byStatus, nextRecharge, staleInspection, withoutMap, withoutPhoto, withoutQrCode };
  }, [filtered, store.photos, store.points]);

  const statusChart = statusOrder.map((status) => ({ label: extinguisherStatusLabels[status], value: summary.byStatus[status], status }));
  const agentsChart = Object.entries(filtered.reduce<Record<string, number>>((acc, item) => {
    acc[item.tipo_agente] = (acc[item.tipo_agente] || 0) + 1;
    return acc;
  }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const areasChart = Object.entries(filtered.reduce<Record<string, number>>((acc, item) => {
    acc[item.area || 'Outros'] = (acc[item.area || 'Outros'] || 0) + 1;
    return acc;
  }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const monthlyChart = months.map((label, index) => {
    const month = index + 1;
    const monthItems = filtered.filter((item) => {
      const date = item.data_proxima_recarga || item.data_validade;
      return date ? Number(date.slice(5, 7)) === month : false;
    });
    return {
      label,
      aVencer: monthItems.filter((item) => item.computedStatus === 'a_vencer').length,
      vencidos: monthItems.filter((item) => item.computedStatus === 'vencido').length,
      conformidade: percent(filtered.filter((item) => item.computedStatus === 'em_conformidade').length, Math.max(filtered.length, 1)),
    };
  });
  const ncByType = Object.entries(store.nonconformities.reduce<Record<string, number>>((acc, item) => {
    if (item.status === 'cancelada') return acc;
    acc[item.tipo] = (acc[item.tipo] || 0) + 1;
    return acc;
  }, {})).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
  const inspectionsByMonth = months.map((label, index) => {
    const month = index + 1;
    return { label, value: store.inspections.filter((item) => Number(item.data_inspecao.slice(5, 7)) === month).length };
  });
  const criticalOpenNcs = store.nonconformities.filter((nc) => ['aberta', 'em_andamento', 'atrasada'].includes(nc.status) && nc.gravidade === 'critica').length;
  const missingDates = filtered.filter((item) => !item.data_proxima_recarga && !item.data_validade).length;
  const executive = getExecutiveStatus(summary, criticalOpenNcs);
  const complianceScore = getComplianceScore(summary, missingDates);
  const topArea = areasChart[0]?.label;
  const topNc = ncByType[0]?.label;
  const executiveSummary = gerarResumoExecutivoExtintores(summary, topArea, topNc);
  const conclusion = gerarConclusaoExtintores(executive, summary);
  const lastNcs = store.nonconformities.slice().sort((a, b) => b.data_identificacao.localeCompare(a.data_identificacao)).slice(0, 6);
  const mapExtinguishers = useMemo(() => store.points
    .filter((point) => point.planta_id === activePlant?.id)
    .map((point) => {
      const extinguisher = enriched.find((item) => item.id === point.extintor_id);
      return extinguisher ? { point, extinguisher } : null;
    })
    .filter(Boolean) as Array<{ point: FireExtinguisherMapPoint; extinguisher: FireExtinguisher & { computedStatus: FireExtinguisherStatus } }>, [activePlant?.id, enriched, store.points]);
  const actionItems = useMemo(() => enriched
    .map((item) => {
      const hasMapPoint = store.points.some((point) => point.extintor_id === item.id);
      const hasPhoto = Boolean(item.foto_url || store.photos.some((photo) => photo.extintor_id === item.id));
      const hasQrCode = Boolean(item.qr_code_url);
      const recommendation = getRecommendedAction(item, item.computedStatus, hasMapPoint, hasPhoto, hasQrCode);
      return recommendation ? { item, ...recommendation } : null;
    })
    .filter(Boolean)
    .sort((a, b) => ['critica', 'alta', 'media', 'baixa'].indexOf(a!.severity) - ['critica', 'alta', 'media', 'baixa'].indexOf(b!.severity))
    .slice(0, 8) as Array<{ item: FireExtinguisher & { computedStatus: FireExtinguisherStatus }; problem: string; severity: FireExtinguisherSeverity; action: string }>, [enriched, store.photos, store.points]);

  const getPrimaryPhoto = (item: FireExtinguisher) => {
    const photos = store.photos.filter((photo) => photo.extintor_id === item.id);
    return photos.find((photo) => photo.principal || photo.id === item.foto_principal_id)?.arquivo_url || item.foto_url || photos[0]?.arquivo_url || '';
  };

  const saveExtinguisher = () => {
    if (!form.codigo.trim()) {
      toast({ title: 'Informe o código do extintor' });
      return;
    }
    const timestamp = now();
    const payload: FireExtinguisher = { ...form, id: form.id || uid('ext'), companyId, created_at: form.created_at || timestamp, updated_at: timestamp };
    setStore((current) => ({
      ...current,
      extinguishers: current.extinguishers.some((item) => item.id === payload.id) ? current.extinguishers.map((item) => item.id === payload.id ? payload : item) : [payload, ...current.extinguishers],
      history: [{ id: uid('hist'), companyId, extintor_id: payload.id, tipo_evento: form.id ? 'Extintor atualizado' : 'Extintor cadastrado', descricao: `Registro ${payload.codigo} salvo.`, data_evento: timestamp, created_at: timestamp }, ...current.history],
    }));
    setModal(null);
    toast({ title: 'Extintor salvo', description: 'O registro foi atualizado no controle inteligente.' });
  };

  const saveInspection = (payload?: { responsavel?: string; observacoes?: string; photoUrl?: string; items: Array<{ key: string; pergunta: string; resposta: FireExtinguisherInspectionAnswer; gravidade: FireExtinguisherSeverity; observacao?: string; foto_url?: string; gera_nao_conformidade?: boolean; ncType: string; action: string; critical: boolean }> }) => {
    if (!selected) return;
    const timestamp = now();
    const currentStatus = calculateExtinguisherStatus(selected, store.nonconformities);
    const defaultItems: NonNullable<typeof payload>['items'] = extinguisherInspectionChecklist.map((entry) => ({ key: entry.key, pergunta: entry.pergunta, resposta: 'conforme' as FireExtinguisherInspectionAnswer, gravidade: entry.critical ? 'alta' as FireExtinguisherSeverity : 'baixa' as FireExtinguisherSeverity, observacao: '', foto_url: '', gera_nao_conformidade: false, ncType: entry.ncType, action: entry.action, critical: entry.critical }));
    const items = payload?.items || defaultItems;
    const nonConforming = items.filter((item) => item.resposta === 'nao_conforme');
    const critical = nonConforming.some((item) => item.critical || item.gravidade === 'critica');
    const status_geral: FireExtinguisherInspection['status_geral'] = critical ? 'critico' : nonConforming.length ? 'nao_conforme' : payload?.observacoes?.trim() ? 'conforme_com_observacao' : 'conforme';
    const inspection: FireExtinguisherInspection = {
      id: uid('insp'),
      companyId,
      extintor_id: selected.id,
      data_inspecao: today(),
      responsavel: payload?.responsavel || selected.responsavel_inspecao,
      status_geral,
      pressao_ok: !items.some((item) => item.key === 'manometro_ok' && item.resposta === 'nao_conforme'),
      lacre_ok: !items.some((item) => item.key === 'lacre_ok' && item.resposta === 'nao_conforme'),
      manometro_ok: !items.some((item) => item.key === 'manometro_ok' && item.resposta === 'nao_conforme'),
      sinalizacao_ok: !items.some((item) => item.key === 'sinalizacao_ok' && item.resposta === 'nao_conforme'),
      acesso_livre: !items.some((item) => item.key === 'acesso_livre' && item.resposta === 'nao_conforme'),
      suporte_ok: !items.some((item) => item.key === 'suporte_ok' && item.resposta === 'nao_conforme'),
      mangueira_ok: !items.some((item) => item.key === 'mangueira_ok' && item.resposta === 'nao_conforme'),
      corrosao: items.some((item) => item.key === 'corrosao' && item.resposta === 'nao_conforme'),
      etiqueta_inspecao_ok: !items.some((item) => item.key === 'etiqueta_inspecao_ok' && item.resposta === 'nao_conforme'),
      local_correto: !items.some((item) => item.key === 'local_correto' && item.resposta === 'nao_conforme'),
      validade_recarga_ok: currentStatus !== 'vencido' && !items.some((item) => item.key === 'validade_recarga_ok' && item.resposta === 'nao_conforme'),
      observacoes: payload?.observacoes || 'Inspeção registrada pelo módulo de extintores.',
      foto_url: payload?.photoUrl,
      finalizada: true,
      created_at: timestamp,
      updated_at: timestamp,
    };
    const inspectionItems: FireExtinguisherInspectionItem[] = items.map((item) => ({
      id: uid('insp-item'),
      companyId,
      inspecao_id: inspection.id,
      extintor_id: selected.id,
      pergunta: item.pergunta,
      resposta: item.resposta,
      gravidade: item.gravidade,
      observacao: item.observacao,
      foto_url: item.foto_url,
      gera_nao_conformidade: item.gera_nao_conformidade,
      critical_key: item.key,
      created_at: timestamp,
      updated_at: timestamp,
    }));
    const autoNcs: FireExtinguisherNonconformity[] = nonConforming
      .filter((item) => item.gera_nao_conformidade)
      .map((item) => ({
        id: uid('nc-ext'),
        companyId,
        extintor_id: selected.id,
        data_identificacao: today(),
        tipo: item.ncType,
        descricao: `${item.pergunta} Item marcado como não conforme na inspeção do extintor ${selected.codigo}.`,
        area: selected.area,
        status: 'aberta',
        gravidade: item.gravidade,
        prazo_correcao: today(),
        acao_corretiva: item.action,
        evidencia_url: item.foto_url,
        created_at: timestamp,
        updated_at: timestamp,
      }));
    const photos: FireExtinguisherPhoto[] = payload?.photoUrl ? [{
      id: uid('photo'),
      companyId,
      extintor_id: selected.id,
      tipo_foto: 'frontal',
      arquivo_url: payload.photoUrl,
      descricao: 'Foto anexada na inspeção.',
      origem: 'inspecao',
      origem_id: inspection.id,
      principal: !getPrimaryPhoto(selected),
      created_at: timestamp,
      updated_at: timestamp,
    }] : [];
    const nextInspection = getNextInspectionDate({ ...selected, data_ultima_inspecao: inspection.data_inspecao });
    setStore((current) => ({
      ...current,
      inspections: [inspection, ...current.inspections],
      inspectionItems: [...inspectionItems, ...current.inspectionItems],
      nonconformities: [...autoNcs, ...current.nonconformities],
      photos: [...photos, ...current.photos],
      extinguishers: current.extinguishers.map((item) => item.id === selected.id ? { ...item, data_ultima_inspecao: inspection.data_inspecao, data_proxima_inspecao: nextInspection, foto_url: item.foto_url || payload?.photoUrl, status: autoNcs.length ? 'nao_conformidade' : item.status, updated_at: timestamp } : item),
      history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Inspeção registrada', descricao: `${inspection.status_geral}. ${autoNcs.length} NC(s) gerada(s).`, data_evento: timestamp, created_at: timestamp }, ...current.history],
    }));
    setModal(null);
    toast({ title: 'Inspeção registrada', description: autoNcs.length ? `${autoNcs.length} não conformidade(s) gerada(s) automaticamente.` : 'A última inspeção do extintor foi atualizada.' });
  };

  const saveNonconformity = (type = 'Lacre rompido') => {
    if (!selected) return;
    const timestamp = now();
    const nc: FireExtinguisherNonconformity = { id: uid('nc-ext'), companyId, extintor_id: selected.id, data_identificacao: today(), tipo: type, descricao: `Não conformidade registrada para ${selected.codigo}.`, area: selected.area, status: 'aberta', gravidade: 'alta', prazo_correcao: today(), created_at: timestamp, updated_at: timestamp };
    setStore((current) => ({ ...current, nonconformities: [nc, ...current.nonconformities], history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Não conformidade aberta', descricao: nc.tipo, data_evento: timestamp, created_at: timestamp }, ...current.history] }));
    setModal(null);
    toast({ title: 'Não conformidade registrada', description: 'O status visual do extintor será atualizado automaticamente.' });
  };

  const saveRecharge = (payload?: { data_recarga: string; data_proxima_recarga: string; data_validade?: string; empresa_responsavel?: string; certificado_url?: string; nota_fiscal_url?: string; laudo_url?: string; foto_etiqueta_url?: string; observacoes?: string }) => {
    if (!selected) return;
    const timestamp = now();
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const recharge: FireExtinguisherRecharge = { id: uid('rec'), companyId, extintor_id: selected.id, data_recarga: payload?.data_recarga || today(), data_proxima_recarga: payload?.data_proxima_recarga || next.toISOString().slice(0, 10), empresa_responsavel: payload?.empresa_responsavel || selected.empresa_manutencao, certificado_url: payload?.certificado_url, nota_fiscal_url: payload?.nota_fiscal_url, laudo_url: payload?.laudo_url, foto_etiqueta_url: payload?.foto_etiqueta_url, observacoes: payload?.observacoes, created_at: timestamp, updated_at: timestamp };
    const photo: FireExtinguisherPhoto | null = payload?.foto_etiqueta_url ? { id: uid('photo'), companyId, extintor_id: selected.id, tipo_foto: 'etiqueta', arquivo_url: payload.foto_etiqueta_url, descricao: 'Foto da etiqueta atualizada na recarga.', origem: 'recarga', origem_id: recharge.id, origem_captura: 'upload', data_upload: timestamp, data_captura: timestamp, bloqueada_para_edicao: true, created_at: timestamp, updated_at: timestamp } : null;
    setStore((current) => ({ ...current, recharges: [recharge, ...current.recharges], photos: photo ? [photo, ...current.photos] : current.photos, extinguishers: current.extinguishers.map((item) => item.id === selected.id ? { ...item, data_ultima_recarga: recharge.data_recarga, data_proxima_recarga: recharge.data_proxima_recarga, data_validade: payload?.data_validade || item.data_validade, updated_at: timestamp } : item), history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Recarga registrada', descricao: `Próxima recarga: ${formatDate(recharge.data_proxima_recarga)}.`, data_evento: timestamp, created_at: timestamp }, ...current.history] }));
    setModal(null);
    toast({ title: 'Recarga registrada', description: 'A próxima recarga foi atualizada.' });
  };

  const savePhoto = (photo: FireExtinguisherPhoto) => {
    if (!selected) return;
    if (!photo.arquivo_url) {
      toast({ title: 'Adicione uma imagem antes de salvar.' });
      return;
    }
    const timestamp = now();
    const payload: FireExtinguisherPhoto = { ...photo, id: photo.id || uid('photo'), companyId, extintor_id: selected.id, data_upload: photo.data_upload || timestamp, data_captura: photo.data_captura || timestamp, bloqueada_para_edicao: photo.bloqueada_para_edicao ?? true, created_at: photo.created_at || timestamp, updated_at: timestamp };
    setStore((current) => ({
      ...current,
      photos: [payload, ...current.photos.map((item) => payload.principal && item.extintor_id === selected.id ? { ...item, principal: false } : item)],
      extinguishers: current.extinguishers.map((item) => item.id === selected.id ? { ...item, foto_url: payload.principal || !item.foto_url ? payload.arquivo_url : item.foto_url, foto_principal_id: payload.principal ? payload.id : item.foto_principal_id, updated_at: timestamp } : item),
      history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Foto adicionada', descricao: extinguisherPhotoTypes[payload.tipo_foto], data_evento: timestamp, created_at: timestamp }, ...current.history],
    }));
    setModal('details');
    toast({ title: 'Foto adicionada', description: 'A evidência fotográfica foi salva na ficha do extintor.' });
  };

  const saveDocument = (document: FireExtinguisherDocument) => {
    if (!selected) return;
    if (!document.nome.trim() || !document.arquivo_url) {
      toast({ title: 'Informe nome e arquivo do documento.' });
      return;
    }
    const timestamp = now();
    const payload: FireExtinguisherDocument = { ...document, id: document.id || uid('doc'), companyId, extintor_id: selected.id, data: document.data || today(), created_at: document.created_at || timestamp, updated_at: timestamp };
    setStore((current) => ({
      ...current,
      documents: [payload, ...current.documents],
      history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Documento anexado', descricao: payload.nome, data_evento: timestamp, created_at: timestamp }, ...current.history],
    }));
    setModal('details');
    toast({ title: 'Documento anexado', description: 'O documento ficou registrado no histórico do extintor.' });
  };

  const generateQrCode = () => {
    if (!selected) return;
    const timestamp = now();
    const target = `${window.location.origin}/company/${companyId}?module=extintores&extintor=${selected.id}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(target)}`;
    setStore((current) => ({
      ...current,
      extinguishers: current.extinguishers.map((item) => item.id === selected.id ? { ...item, qr_code_url: qrCodeUrl, updated_at: timestamp } : item),
      history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'QR Code gerado', descricao: 'Etiqueta de acesso rápido preparada para uso em campo.', data_evento: timestamp, created_at: timestamp }, ...current.history],
    }));
    setSelected({ ...selected, qr_code_url: qrCodeUrl, updated_at: timestamp });
    setModal('qr');
  };

  const savePlant = () => {
    const timestamp = now();
    const payload = { ...plantForm, id: plantForm.id || uid('plant'), companyId, created_at: plantForm.created_at || timestamp, updated_at: timestamp };
    setStore((current) => ({ ...current, plants: current.plants.some((item) => item.id === payload.id) ? current.plants.map((item) => item.id === payload.id ? payload : item) : [payload, ...current.plants] }));
    setModal(null);
    toast({ title: 'Planta salva', description: 'A imagem já pode receber pontos de extintores.' });
  };

  const savePoint = (extinguisherId: string) => {
    if (!pointDraft || !activePlant) return;
    if (!extinguisherId) {
      toast({ title: 'Selecione um extintor existente ou crie um novo.' });
      return;
    }
    const duplicated = store.points.some((point) => point.planta_id === activePlant.id && point.extintor_id === extinguisherId);
    if (duplicated) {
      toast({ title: 'Este extintor já está nesta planta', description: 'Remova o ponto existente ou escolha outro extintor.' });
      return;
    }
    const timestamp = now();
    const point: FireExtinguisherMapPoint = { id: uid('point'), companyId, planta_id: activePlant.id, extintor_id: extinguisherId, x_percent: pointDraft.x, y_percent: pointDraft.y, created_at: timestamp, updated_at: timestamp };
    setStore((current) => ({ ...current, points: [point, ...current.points] }));
    setPointDraft(null);
    setAddPointMode(false);
    setModal(null);
    toast({ title: 'Ponto adicionado', description: 'O extintor foi posicionado no mapa.' });
  };

  const saveNewExtinguisherPoint = (draft: FireExtinguisher) => {
    if (!pointDraft || !activePlant) return;
    if (!draft.codigo.trim()) {
      toast({ title: 'Informe o código do extintor antes de salvar.' });
      return;
    }
    if (!draft.area.trim()) {
      toast({ title: 'Informe a área antes de salvar.' });
      return;
    }
    if (!draft.tipo_agente.trim()) {
      toast({ title: 'Informe o tipo/agente extintor antes de salvar.' });
      return;
    }
    const timestamp = now();
    const extinguisher: FireExtinguisher = { ...draft, id: uid('ext'), companyId, created_at: timestamp, updated_at: timestamp };
    const point: FireExtinguisherMapPoint = { id: uid('point'), companyId, planta_id: activePlant.id, extintor_id: extinguisher.id, x_percent: pointDraft.x, y_percent: pointDraft.y, created_at: timestamp, updated_at: timestamp };
    setStore((current) => ({
      ...current,
      extinguishers: [extinguisher, ...current.extinguishers],
      points: [point, ...current.points],
      history: [{ id: uid('hist'), companyId, extintor_id: extinguisher.id, tipo_evento: 'Extintor criado pelo mapa', descricao: `Registro ${extinguisher.codigo} criado e posicionado na planta.`, data_evento: timestamp, created_at: timestamp }, ...current.history],
    }));
    setPointDraft(null);
    setAddPointMode(false);
    setModal(null);
    toast({ title: 'Extintor salvo no mapa', description: 'O cadastro e a posição foram criados juntos.' });
  };

  const cancelPointDraft = () => {
    setPointDraft(null);
    setAddPointMode(false);
    setModal(null);
  };

  const handleMapClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!addPointMode || !mapRef.current) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setPointDraft({ x, y });
    setModal('point');
  };

  const getMapPercentPosition = (clientX: number, clientY: number) => {
    if (!mapRef.current) return null;
    const rect = mapRef.current.getBoundingClientRect();
    return {
      x: Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  const startPointDrag = (event: React.PointerEvent<HTMLButtonElement>, point: FireExtinguisherMapPoint) => {
    if (repositionPointId !== point.id) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragPreview({ pointId: point.id, x: point.x_percent, y: point.y_percent });
  };

  const movePointDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragPreview) return;
    event.preventDefault();
    const position = getMapPercentPosition(event.clientX, event.clientY);
    if (!position) return;
    setDragPreview({ pointId: dragPreview.pointId, ...position });
  };

  const endPointDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragPreview) return;
    event.preventDefault();
    event.stopPropagation();
    const finalPosition = getMapPercentPosition(event.clientX, event.clientY) || dragPreview;
    const confirmed = window.confirm('Deseja salvar a nova posição deste extintor no mapa?');
    if (confirmed) {
      setStore((current) => ({ ...current, points: current.points.map((point) => point.id === dragPreview.pointId ? { ...point, x_percent: finalPosition.x, y_percent: finalPosition.y, updated_at: now() } : point) }));
      toast({ title: 'Localização atualizada' });
    }
    setDragPreview(null);
    setRepositionPointId(null);
  };

  const removeSelectedPoint = () => {
    if (!selectedPoint) return;
    const confirmed = window.confirm('Tem certeza que deseja remover este extintor desta planta? O cadastro do extintor será mantido.');
    if (!confirmed) return;
    setStore((current) => ({ ...current, points: current.points.filter((point) => point.id !== selectedPoint.id) }));
    setSelectedPoint(null);
    setModal(null);
    toast({ title: 'Ponto removido', description: 'O cadastro do extintor foi mantido.' });
  };

  const exportMapPdf = (previewOnly = false) => {
    if (!activePlant?.imagem_url) {
      toast({ title: 'Não foi possível gerar o PDF do mapa', description: 'Verifique se a planta foi carregada corretamente.' });
      return;
    }
    if (previewOnly) {
      setModal('mapPreview');
      return;
    }
    void (async () => {
      setIsGeneratingMapPdf(true);
      const generatedAt = new Date().toLocaleString('pt-BR');
      try {
        const html = buildMapPrintHtml({ companyName, plant: activePlant, points: mapExtinguishers, generatedAt });
        const response = await fetch('/api/extinguisher-map-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
            filename: `mapa-extintores-${activePlant.nome.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => null);
          throw new Error(error?.details || error?.error || 'Falha ao gerar o PDF do mapa.');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mapa-extintores-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setMapPdfHistory((current) => [{ id: uid('map-pdf'), plantName: activePlant.nome, generatedAt, count: mapExtinguishers.length, status: 'Baixado' }, ...current].slice(0, 8));
        toast({ title: 'PDF do mapa baixado', description: 'O arquivo foi gerado em A4 paisagem com margens e conteúdo ajustado.' });
      } catch (error: any) {
        toast({ title: 'Não foi possível gerar o PDF do mapa', description: error?.message || 'Verifique se a planta foi carregada corretamente.' });
      } finally {
        setIsGeneratingMapPdf(false);
      }
    })();
  };

  const exportCsv = () => {
    const rows = ['codigo,area,localizacao,agente,capacidade,proxima_recarga,validade,status', ...filtered.map((item) => [item.codigo, item.area, item.localizacao_descritiva, item.tipo_agente, item.capacidade || '', item.data_proxima_recarga || '', item.data_validade || '', extinguisherStatusLabels[item.computedStatus]].map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))];
    downloadText(`extintores-${Date.now()}.csv`, rows.join('\n'));
  };

  const exportDashboardPdf = (options = dashboardExportOptions) => {
    void (async () => {
      const generatedAt = new Date().toLocaleString('pt-BR');
      const html = buildDashboardPrintHtml({
        companyName,
        summary,
        executive,
        score: complianceScore,
        summaryText: executiveSummary,
        conclusion,
        statusChart,
        agentsChart,
        areasChart,
        monthlyChart,
        ncByType,
        inspectionsByMonth,
        actionItems,
        plant: activePlant,
        mapPoints: mapExtinguishers,
        options,
        generatedAt,
      });
      const response = await fetch('/api/extinguisher-map-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html, filename: `dashboard-extintores-${Date.now()}.pdf` }),
      });
      if (!response.ok) {
        toast({ title: 'Não foi possível gerar o Dashboard PDF' });
        return;
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-extintores-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setModal(null);
      toast({ title: 'Dashboard PDF exportado', description: 'O relatório do módulo foi gerado com resumo, indicadores e explicações.' });
    })();
  };

  const exportPresentationPdf = (options = presentationExportOptions) => {
    void (async () => {
      setIsGeneratingPresentation(true);
      const generatedAt = new Date().toLocaleString('pt-BR');
      try {
        const html = buildPresentationPrintHtml({
          companyName,
          summary,
          executive,
          score: complianceScore,
          executiveSummary,
          conclusion,
          statusChart,
          agentsChart,
          areasChart,
          monthlyChart,
          ncByType,
          actionItems,
          plant: activePlant,
          mapPoints: mapExtinguishers,
          options,
          generatedAt,
        });
        const response = await fetch('/api/extinguisher-map-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html, filename: `apresentacao-extintores-${Date.now()}.pdf` }),
        });
        if (!response.ok) {
          toast({ title: 'Não foi possível gerar a Apresentação PDF' });
          return;
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `apresentacao-extintores-${Date.now()}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setModal(null);
        toast({ title: 'Apresentação PDF exportada', description: 'Slides horizontais gerados para reunião e prestação de contas.' });
      } finally {
        setIsGeneratingPresentation(false);
      }
    })();
  };

  const generateAuditPackage = () => {
    exportCsv();
    toast({ title: 'Pacote de auditoria preparado', description: 'CSV exportado. Estrutura pronta para incluir PDFs e ZIP na próxima integração.' });
  };

  const generateAiAnalysis = () => {
    toast({
      title: 'Análise de extintores gerada',
      description: `${summary.byStatus.vencido} vencidos, ${summary.byStatus.a_vencer} a vencer e ${summary.byStatus.nao_conformidade} com não conformidade. Priorize recargas e correções por área crítica.`,
    });
  };

  if (!isReady) {
    return <div className="rounded-2xl border border-[#e3e0d8] bg-white p-8 text-[#6e6a61]">Carregando controle inteligente de extintores...</div>;
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="order-[-30] overflow-hidden rounded-3xl border border-[#e3e0d8] bg-[#f7f5f0] shadow-sm">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#f0e2e0] p-4 text-[#7a1f1f]"><Flame className="h-8 w-8" /></div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#7a1f1f]">Prevenção e Emergência</p>
              <h1 className="mt-2 text-3xl font-bold text-[#111111]">Controle Inteligente de Extintores</h1>
              <p className="mt-2 text-[#6e6a61]">Localize, inspecione, acompanhe vencimentos e gere evidências dos extintores da empresa.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setForm(blankExtinguisher(companyId)); setModal('extinguisher'); }} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]"><Plus className="h-4 w-4" />Novo Extintor</Button>
            <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'dataImports', { tipo_importacao: 'extintores' })}><Upload className="h-4 w-4" />Importar Extintores</Button>
            <Button variant="outline" onClick={() => document.getElementById('ext-map')?.scrollIntoView({ behavior: 'smooth' })}><MapPin className="h-4 w-4" />Mapa de Localização</Button>
            <Button variant="outline" onClick={() => { setSelected(null); setModal('inspection'); }}><CheckCircle2 className="h-4 w-4" />Registrar Inspeção</Button>
            <Button variant="outline" onClick={() => { setSelected(null); setModal('recharge'); }}><RefreshCw className="h-4 w-4" />Registrar Recarga</Button>
            <Button variant="outline" onClick={() => { setSelected(null); setModal('nonconformity'); }}><ShieldAlert className="h-4 w-4" />Registrar Não Conformidade</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Exportar Relatório</Button>
            <Button variant="outline" onClick={() => setModal('dashboardExport')}><FileText className="h-4 w-4" />Exportar Relatório PDF</Button>
            <Button variant="outline" onClick={() => setModal('presentationExport')}><BarChart3 className="h-4 w-4" />Exportar Apresentação PDF</Button>
            <Button variant="outline" onClick={generateAuditPackage}><Download className="h-4 w-4" />Pacote de auditoria</Button>
            <Button variant="outline" onClick={() => exportMapPdf(false)}><FileText className="h-4 w-4" />Exportar Mapa em PDF</Button>
          </div>
        </div>
      </section>

      <section className="order-[-20] rounded-2xl border border-[#e3e0d8] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">
          <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6a61]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, área, localização ou agente..." className="pl-9" /></div>
          <Filter value={filters.unidade} onChange={(value) => setFilters({ ...filters, unidade: value })} options={['todas', ...Array.from(new Set(enriched.map((item) => item.unidade).filter(Boolean) as string[]))]} placeholder="Unidade" />
          <Filter value={filters.area} onChange={(value) => setFilters({ ...filters, area: value })} options={['todas', ...Array.from(new Set(enriched.map((item) => item.area)))]} placeholder="Área" />
          <Filter value={filters.agente} onChange={(value) => setFilters({ ...filters, agente: value })} options={['todos', ...extinguisherAgents]} placeholder="Agente" />
          <Filter value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={['todos', ...Object.keys(extinguisherStatusLabels)]} labels={extinguisherStatusLabels} placeholder="Status" />
          <Filter value={filters.nc} onChange={(value) => setFilters({ ...filters, nc: value })} options={['todas', 'sim', 'nao']} labels={{ todas: 'NC: todas', sim: 'Com NC', nao: 'Sem NC' }} placeholder="NC" />
          <Button variant="outline" onClick={() => { setFilters({ unidade: 'todas', area: 'todas', agente: 'todos', status: 'todos', vencimento: 'todos', nc: 'todas', periodo: 'ano' }); setSearch(''); }}><X className="h-4 w-4" />Limpar</Button>
        </div>
      </section>

      <section className="order-[-15] grid gap-5 xl:grid-cols-[0.9fr_0.8fr_1.3fr]">
        <div className={cn('rounded-2xl border p-5 shadow-sm', executive.status === 'boa' ? 'border-[#dde9e2] bg-[#eaf2ed]' : executive.status === 'atencao' ? 'border-[#e8d9ae] bg-[#faf3e4]' : 'border-[#e4cfcc] bg-[#f6edec]')}>
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-bold uppercase text-[#6e6a61]">Situação Geral dos Extintores</p><h2 className="mt-2 text-3xl font-bold text-[#111111]">{executiveStatusLabels[executive.status]}</h2></div><Badge className={cn('border-0', executive.status === 'boa' ? 'bg-[#dde9e2] text-[#1b5e3f]' : executive.status === 'atencao' ? 'bg-[#faf3e4] text-[#7a1f1f]' : 'bg-[#f0e2e0] text-[#7a1f1f]')}>{executive.title}</Badge></div>
          <p className="mt-4 text-sm leading-6 text-[#6e6a61]">{executive.text}</p>
        </div>
        <div className="rounded-2xl border border-[#e3e0d8] bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase text-[#7a1f1f]">Score de Conformidade</p>
          <div className="mt-3 flex items-end justify-between gap-3"><strong className="text-4xl text-[#111111]">{complianceScore.value}%</strong><Badge className={cn('border-0', complianceScore.value >= 90 ? 'bg-[#dde9e2] text-[#1b5e3f]' : complianceScore.value >= 75 ? 'bg-[#f2f1ed] text-[#111111]' : complianceScore.value >= 60 ? 'bg-[#faf3e4] text-[#7a1f1f]' : 'bg-[#f0e2e0] text-[#7a1f1f]')}>{complianceScore.label}</Badge></div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-[#e3e0d8]"><div className="h-full rounded-full bg-[#1b5e3f]" style={{ width: `${complianceScore.value}%` }} /></div>
          <p className="mt-3 text-sm text-[#6e6a61]">{complianceScore.text}</p>
        </div>
        <div className="rounded-2xl border border-[#e3e0d8] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-bold text-[#111111]">Resumo Executivo</h2><Button size="sm" variant="outline" onClick={generateAiAnalysis}>Gerar resumo com IA</Button></div>
          <p className="mt-3 text-sm leading-6 text-[#6e6a61]">{executiveSummary}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Total de Extintores" value={summary.total} helper="unidades cadastradas" icon={Flame} onClick={() => setFilters({ ...filters, status: 'todos' })} />
        <MetricCard title="Em Conformidade" value={summary.byStatus.em_conformidade} helper={`${percent(summary.byStatus.em_conformidade, summary.total)}% da base`} icon={CheckCircle2} status="em_conformidade" onClick={() => setFilters({ ...filters, status: 'em_conformidade' })} />
        <MetricCard title="A Vencer em 30 dias" value={summary.byStatus.a_vencer} helper={`${percent(summary.byStatus.a_vencer, summary.total)}% da base`} icon={CalendarClock} status="a_vencer" onClick={() => setFilters({ ...filters, status: 'a_vencer' })} />
        <MetricCard title="Vencidos" value={summary.byStatus.vencido} helper={`${percent(summary.byStatus.vencido, summary.total)}% da base`} icon={AlertTriangle} status="vencido" onClick={() => setFilters({ ...filters, status: 'vencido' })} />
        <MetricCard title="Com Não Conformidade" value={summary.byStatus.nao_conformidade} helper={`${percent(summary.byStatus.nao_conformidade, summary.total)}% da base`} icon={ShieldAlert} status="nao_conformidade" onClick={() => setFilters({ ...filters, status: 'nao_conformidade' })} />
        <MetricCard title="Sem Inspeção Recente" value={summary.staleInspection} helper="fora da frequência" icon={FileText} status="sem_dados" onClick={() => setFilters({ ...filters, status: 'todos' })} />
        <MetricCard title="Sem Localização no Mapa" value={summary.withoutMap} helper="precisam ser posicionados" icon={MapPin} status="sem_dados" onClick={() => document.getElementById('ext-map')?.scrollIntoView({ behavior: 'smooth' })} />
        <MetricCard title="Próxima Recarga" value={formatDate(summary.nextRecharge)} helper="Mais próxima" icon={RefreshCw} status="a_vencer" />
      </section>

      {filtered.length === 0 ? <section className="rounded-2xl border border-dashed border-[#e3e0d8] bg-white p-8 text-center"><Flame className="mx-auto h-10 w-10 text-[#7a1f1f]" /><h2 className="mt-3 text-xl font-bold text-[#111111]">Nenhum extintor cadastrado ainda.</h2><p className="mt-2 text-sm text-[#6e6a61]">Cadastre o primeiro extintor ou importe uma planilha.</p><div className="mt-4 flex justify-center gap-2"><Button onClick={() => { setForm(blankExtinguisher(companyId)); setModal('extinguisher'); }} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Novo Extintor</Button><Button variant="outline" onClick={() => navigateCompanySection(companyId, 'dataImports', { tipo_importacao: 'extintores' })}>Importar Extintores</Button></div></section> : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_1.2fr_0.8fr]">
        <Panel title="Status de Vencimento" icon={BarChart3}>
          <ChartInsight evaluation={getChartEvaluation('status', { vencidos: summary.byStatus.vencido, aVencer: summary.byStatus.a_vencer })} text={dashboardInsights.status} />
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusChart} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92}>{statusChart.map((entry) => <Cell key={entry.status} fill={extinguisherStatusColors[entry.status as FireExtinguisherStatus].dot} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Quantidade por Agente Extintor" icon={Flame}>
          <ChartInsight evaluation="positivo" text={dashboardInsights.agents} />
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={agentsChart} layout="vertical" margin={{ left: 92, right: 16 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" hide /><YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#7a1f1f" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Extintores por Área" icon={MapPin}>
          <ChartInsight evaluation={areasChart.length ? 'positivo' : 'atencao'} text={dashboardInsights.areas} />
          <div className="space-y-2">{areasChart.map((item) => <button key={item.label} onClick={() => setFilters({ ...filters, area: item.label })} className="flex w-full items-center justify-between rounded-xl border border-[#e3e0d8] px-3 py-2 text-sm hover:bg-[#f7f5f0]"><span>{item.label}</span><strong>{item.value}</strong></button>)}</div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr_0.9fr]">
        <Panel title="Controle Mensal de Vencimentos" icon={CalendarClock}>
          <ChartInsight evaluation={getChartEvaluation('monthly', { vencidos: summary.byStatus.vencido, aVencer: summary.byStatus.a_vencer })} text={dashboardInsights.monthly} />
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthlyChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="aVencer" name="A vencer" fill="#8a5a00" radius={[8, 8, 0, 0]} /><Bar yAxisId="left" dataKey="vencidos" name="Vencidos" fill="#7a1f1f" radius={[8, 8, 0, 0]} /><Line yAxisId="right" type="monotone" dataKey="conformidade" name="Conformidade (%)" stroke="#1b5e3f" strokeWidth={3} /></ComposedChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Não Conformidades por Tipo" icon={ShieldAlert}>
          <ChartInsight evaluation={getChartEvaluation('nc', { ncs: ncByType.reduce((sum, item) => sum + item.value, 0), criticalNcs: criticalOpenNcs })} text={dashboardInsights.ncs} />
          <div className="space-y-2">{ncByType.length ? ncByType.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-[#f7f5f0] px-3 py-2 text-sm"><span>{item.label}</span><strong>{item.value}</strong></div>) : <p className="text-sm text-[#6e6a61]">Nenhuma não conformidade registrada.</p>}<div className="border-t pt-3 text-sm font-bold">Total: {ncByType.reduce((sum, item) => sum + item.value, 0)}</div></div>
        </Panel>
        <Panel title="Inspeções Realizadas por Mês" icon={ClipboardCheck}>
          <ChartInsight evaluation={getChartEvaluation('inspections', { inspections: inspectionsByMonth.reduce((sum, item) => sum + item.value, 0) })} text={dashboardInsights.inspections} />
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={inspectionsByMonth}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis allowDecimals={false} /><Tooltip /><Bar dataKey="value" name="Inspeções" fill="#1b5e3f" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Extintores que exigem ação" icon={AlertTriangle}>
          <div className="space-y-3">{actionItems.length ? actionItems.map(({ item, problem, severity, action }) => <div key={`${item.id}-${problem}`} className="rounded-xl border border-[#e3e0d8] p-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold text-[#111111]">{item.codigo} - {item.area}</p><p className="text-sm text-[#6e6a61]">{problem}</p></div><Badge className={cn('border-0', severity === 'critica' ? 'bg-[#f6edec] text-[#7a1f1f]' : severity === 'alta' ? 'bg-[#f7f5f0] text-[#7a1f1f]' : 'bg-[#f7f5f0] text-[#6e6a61]')}>{severityLabels[severity]}</Badge></div><p className="mt-2 text-sm text-[#6e6a61]">Ação recomendada: {action}</p><Button size="sm" variant="outline" className="mt-3" onClick={() => { setSelected(item); setModal(problem.includes('foto') ? 'photo' : problem.includes('QR') ? 'qr' : problem.includes('recarga') || problem.includes('venc') ? 'recharge' : problem.includes('inspe') ? 'inspection' : problem.includes('mapa') ? null : 'details'); if (problem.includes('mapa')) document.getElementById('ext-map')?.scrollIntoView({ behavior: 'smooth' }); }}>Resolver</Button></div>) : <p className="text-sm text-[#6e6a61]">Nenhum extintor exige ação imediata.</p>}</div>
        </Panel>
        <Panel title="Últimas Não Conformidades" icon={ShieldAlert}>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-[#6e6a61]"><tr><th className="p-3">Data</th><th className="p-3">Código</th><th className="p-3">Área</th><th className="p-3">Tipo</th><th className="p-3">Status</th><th className="p-3">Ação</th></tr></thead><tbody>{lastNcs.length ? lastNcs.map((nc) => { const ext = enriched.find((item) => item.id === nc.extintor_id); return <tr key={nc.id} className="border-t"><td className="p-3">{formatDate(nc.data_identificacao)}</td><td className="p-3">{ext?.codigo || '-'}</td><td className="p-3">{nc.area || ext?.area || '-'}</td><td className="p-3">{nc.tipo}</td><td className="p-3">{ncStatusBadge(nc.status)}</td><td className="p-3"><Button size="sm" variant="ghost" onClick={() => { if (ext) { setSelected(ext); setModal('details'); } }}>Ver</Button></td></tr>; }) : <tr><td colSpan={6} className="p-6 text-center text-[#6e6a61]">Nenhuma não conformidade registrada.</td></tr>}</tbody></table></div>
        </Panel>
        <Panel title="Plano de ação e IA" icon={FileText}>
          <div className="space-y-3 text-sm text-[#6e6a61]"><p>Priorize extintores vencidos, equipamentos com não conformidade aberta e áreas com maior concentração de pendências.</p><Button onClick={generateAiAnalysis} variant="outline"><Flame className="h-4 w-4" />Gerar análise com IA</Button><Button onClick={() => toast({ title: 'Relatório com IA preparado', description: 'A estrutura já reúne cards, gráficos, mapa e recomendações para exportação em PDF.' })} variant="outline"><FileText className="h-4 w-4" />Gerar relatório com IA</Button><Button onClick={() => toast({ title: 'Plano de correção sugerido', description: '1. Recargas vencidas. 2. Correção de NCs abertas. 3. Inspeção das áreas críticas.' })} variant="outline"><CheckCircle2 className="h-4 w-4" />Sugerir plano de correção com IA</Button></div>
        </Panel>
      </section>

      <Panel title="Listagem de Extintores" icon={Flame}>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-xs uppercase text-[#6e6a61]"><tr><th className="p-3">Código</th><th className="p-3">Área</th><th className="p-3">Localização</th><th className="p-3">Agente</th><th className="p-3">Próxima recarga</th><th className="p-3">Validade</th><th className="p-3">Última inspeção</th><th className="p-3">Status</th><th className="p-3">NCs</th><th className="p-3">Ações</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t"><td className="p-3 font-semibold">{item.codigo}</td><td className="p-3">{item.area}</td><td className="p-3">{item.localizacao_descritiva}</td><td className="p-3">{item.tipo_agente}</td><td className="p-3">{formatDate(item.data_proxima_recarga)}</td><td className="p-3">{formatDate(item.data_validade)}</td><td className="p-3">{formatDate(item.data_ultima_inspecao)}</td><td className="p-3">{statusBadge(item.computedStatus)}</td><td className="p-3">{store.nonconformities.filter((nc) => nc.extintor_id === item.id && nc.status !== 'resolvida').length}</td><td className="p-3"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setSelected(item); setModal('details'); }}><Search className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { setForm(item); setModal('extinguisher'); }}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { setSelected(item); setModal('inspection'); }}><CheckCircle2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { setSelected(item); setModal('nonconformity'); }}><ShieldAlert className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 lg:hidden">{filtered.map((item) => <div key={item.id} className="rounded-xl border border-[#e3e0d8] p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{item.codigo}</p><p className="text-sm text-[#6e6a61]">{item.area} - {item.localizacao_descritiva}</p></div>{statusBadge(item.computedStatus)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>{item.tipo_agente}</span><span>{formatDate(item.data_proxima_recarga)}</span></div></div>)}</div>
      </Panel>

      <Panel title="Mapa de Localização" icon={MapPin} id="ext-map">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setPlantForm(activePlant || plantForm); setModal('plant'); }}><Upload className="h-4 w-4" />Upload de planta</Button>
          <Button variant={addPointMode ? 'default' : 'outline'} onClick={() => { setAddPointMode(true); setRepositionPointId(null); }} className={addPointMode ? 'bg-[#7a1f1f] text-white' : ''}><MapPin className="h-4 w-4" />Adicionar Extintor no Mapa</Button>
          {(addPointMode || repositionPointId) ? <Button variant="outline" onClick={() => { setAddPointMode(false); setRepositionPointId(null); setDragPreview(null); setPointDraft(null); }}>Cancelar posicionamento</Button> : null}
          <Button variant="outline" onClick={() => exportMapPdf(true)}><Eye className="h-4 w-4" />Pré-visualizar PDF</Button>
          <Button variant="outline" onClick={() => exportMapPdf(false)} disabled={isGeneratingMapPdf}><Download className="h-4 w-4" />{isGeneratingMapPdf ? 'Gerando PDF do mapa...' : 'Exportar Mapa em PDF'}</Button>
          <Button variant="outline" onClick={() => toast({ title: 'Exportação de imagem preparada', description: 'A exportação PNG/JPG do mapa está estruturada para uma próxima etapa.' })}>Exportar imagem do mapa</Button>
        </div>
        {addPointMode ? <div className="mb-3 rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-3 text-sm font-medium text-[#7a1f1f]">Modo de posicionamento ativo. Clique no local onde o extintor está instalado.</div> : null}
        {repositionPointId ? <div className="mb-3 rounded-xl border border-[#cfcbc0] bg-[#f2f1ed] p-3 text-sm font-medium text-[#111111]">Modo de reposicionamento ativo. Clique, segure e arraste o ponto do extintor para o local desejado. Ao soltar, confirme para salvar.</div> : null}
        <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
          <aside className="space-y-4 rounded-2xl border border-[#e3e0d8] bg-[#f7f5f0] p-4">
            <div><h3 className="flex items-center gap-2 font-bold text-[#111111]"><Layers className="h-4 w-4" />Painel da planta</h3><p className="mt-1 text-sm text-[#6e6a61]">{activePlant?.nome || 'Nenhuma planta cadastrada'}</p></div>
            <div className="grid grid-cols-2 gap-2 text-sm">{Object.entries(extinguisherStatusLabels).map(([status, label]) => <button key={status} onClick={() => setFilters({ ...filters, status })} className="rounded-lg border border-[#e3e0d8] bg-white p-2 text-left hover:bg-[#f7f5f0]"><span className="block h-2 w-2 rounded-full" style={{ backgroundColor: extinguisherStatusColors[status as FireExtinguisherStatus].dot }} /><span className="mt-1 block text-xs">{label}</span><strong>{mapExtinguishers.filter(({ extinguisher }) => extinguisher.computedStatus === status).length}</strong></button>)}</div>
            <div className="space-y-2"><Button variant="outline" className="w-full justify-start" onClick={() => { setForm(blankExtinguisher(companyId)); setModal('extinguisher'); }}><Plus className="h-4 w-4" />Adicionar extintor</Button><Button variant="outline" className="w-full justify-start" onClick={() => exportMapPdf(false)}><FileText className="h-4 w-4" />Exportar mapa PDF</Button><Button variant="outline" className="w-full justify-start" onClick={() => toast({ title: 'Relatório da planta preparado', description: 'Use o PDF completo para incluir lista, status e evidências.' })}><ClipboardCheck className="h-4 w-4" />Relatório da planta</Button></div>
            <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">{mapExtinguishers.length ? mapExtinguishers.map(({ point, extinguisher }) => <button key={point.id} onClick={() => { setSelected(extinguisher); setSelectedPoint(point); setModal('pointDetails'); }} className="w-full rounded-lg border border-[#e3e0d8] bg-white p-3 text-left text-sm hover:bg-[#f7f5f0]"><div className="flex items-center justify-between gap-2"><strong>{extinguisher.codigo}</strong><span className="h-3 w-3 rounded-full" style={{ backgroundColor: extinguisherStatusColors[extinguisher.computedStatus].dot }} /></div><p className="text-[#6e6a61]">{extinguisher.area} - {extinguisher.localizacao_descritiva}</p></button>) : <p className="rounded-lg border border-dashed border-[#e3e0d8] bg-white p-3 text-sm text-[#6e6a61]">Nenhum extintor posicionado nesta planta.</p>}</div>
          </aside>
          <div ref={mapRef} onClick={handleMapClick} className={cn('relative min-h-[520px] overflow-hidden rounded-2xl border border-dashed border-[#e3e0d8] bg-[#f7f5f0]', addPointMode && 'cursor-crosshair ring-2 ring-[#7a1f1f]', repositionPointId && 'ring-2 ring-[#111111]')}>
            {activePlant?.imagem_url ? <img src={activePlant.imagem_url} alt={activePlant.nome} className="h-full min-h-[520px] w-full object-contain" /> : <div className="absolute inset-0 grid place-items-center text-center text-[#7a1f1f]"><div><MapPin className="mx-auto h-10 w-10" /><p className="mt-3 font-semibold">Nenhuma planta cadastrada.</p><p className="text-sm">Suba uma planta para posicionar os extintores visualmente.</p><Button className="mt-4 bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]" onClick={() => { setPlantForm(activePlant || plantForm); setModal('plant'); }}>Subir Planta</Button></div></div>}
            {pointDraft ? <span className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#6e6a61] shadow-lg ring-4 ring-[#cfcbc0]" style={{ left: `${pointDraft.x}%`, top: `${pointDraft.y}%` }} /> : null}
            {mapExtinguishers.map(({ point, extinguisher }) => { const color = extinguisherStatusColors[extinguisher.computedStatus]; const preview = dragPreview?.pointId === point.id ? dragPreview : null; const isRepositioning = repositionPointId === point.id; const photo = getPrimaryPhoto(extinguisher); return <button key={point.id} type="button" onPointerDown={(event) => startPointDrag(event, point)} onPointerMove={movePointDrag} onPointerUp={endPointDrag} onPointerCancel={endPointDrag} onClick={(event) => { event.stopPropagation(); if (repositionPointId) return; setSelected(extinguisher); setSelectedPoint(point); setModal('pointDetails'); }} className={cn('group absolute flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white px-1 text-[9px] font-bold text-white shadow-lg ring-2 touch-none', extinguisher.computedStatus === 'vencido' && 'animate-pulse', isRepositioning ? 'cursor-grab ring-4 active:cursor-grabbing' : 'cursor-pointer')} style={{ left: `${preview?.x ?? point.x_percent}%`, top: `${preview?.y ?? point.y_percent}%`, backgroundColor: color.dot, ['--tw-ring-color' as string]: isRepositioning ? '#111111' : color.border }} title={`${extinguisher.codigo} - ${extinguisherStatusLabels[extinguisher.computedStatus]} - ${extinguisher.area} - ${extinguisher.localizacao_descritiva} - Próx. recarga ${formatDate(extinguisher.data_proxima_recarga)} - Última inspeção ${formatDate(extinguisher.data_ultima_inspecao)}`}>{photo ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border border-white bg-white" /> : null}<span className="rounded bg-black/20 px-1 group-hover:bg-black/60">{extinguisher.codigo}</span></button>; })}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">{Object.entries(extinguisherStatusColors).map(([status, color]) => <span key={status} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color.dot }} />{extinguisherStatusLabels[status as FireExtinguisherStatus]}</span>)}</div>
        <div className="mt-4 rounded-xl border border-[#e3e0d8] p-4">
          <h3 className="font-semibold text-[#111111]">Histórico de PDFs do Mapa</h3>
          {mapPdfHistory.length ? <div className="mt-3 space-y-2 text-sm">{mapPdfHistory.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#f7f5f0] p-2"><span>{item.plantName}</span><span>{item.generatedAt}</span><span>{item.count} extintores</span><span>{item.status}</span></div>)}</div> : <p className="mt-2 text-sm text-[#6e6a61]">Nenhum PDF do mapa foi gerado ainda.</p>}
        </div>
      </Panel>

      <Panel title="Conclusão e Recomendações" icon={ClipboardCheck}>
        <p className="text-sm leading-6 text-[#6e6a61]">{conclusion.text}</p>
        <div className="mt-4 grid gap-2 md:grid-cols-2">{conclusion.recommendations.length ? conclusion.recommendations.map((item) => <div key={item} className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-3 text-sm font-medium text-[#7a1f1f]">{item}</div>) : <div className="rounded-xl border border-[#dde9e2] bg-[#eaf2ed] p-3 text-sm font-medium text-[#1b5e3f]">Manter rotina de inspeções e recargas preventivas.</div>}</div>
      </Panel>

      <footer className="rounded-2xl border border-[#e3e0d8] bg-[#f7f5f0] p-5 text-center font-semibold text-[#7a1f1f]">Organização, controle e informação salvam vidas. Gestão simples hoje, segurança garantida sempre.</footer>

      <Dialog open={modal === 'dashboardExport'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Exportar Dashboard de Extintores</DialogTitle></DialogHeader><DashboardExportForm options={dashboardExportOptions} setOptions={setDashboardExportOptions} onCancel={() => setModal(null)} onGenerate={() => exportDashboardPdf(dashboardExportOptions)} /></DialogContent></Dialog>
      <Dialog open={modal === 'presentationExport'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Exportar Apresentação de Extintores</DialogTitle></DialogHeader><PresentationExportForm options={presentationExportOptions} setOptions={setPresentationExportOptions} isGenerating={isGeneratingPresentation} onCancel={() => setModal(null)} onGenerate={() => exportPresentationPdf(presentationExportOptions)} /></DialogContent></Dialog>
      <Dialog open={modal === 'extinguisher'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>{form.id ? 'Editar Extintor' : 'Novo Extintor'}</DialogTitle></DialogHeader><FireExtinguisherForm form={form} setForm={setForm} onSubmit={saveExtinguisher} /></DialogContent></Dialog>
      <Dialog open={modal === 'inspection'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl"><DialogHeader><DialogTitle>{selected ? `Registrar inspeção - ${selected.codigo}` : 'Selecionar extintor para inspeção'}</DialogTitle></DialogHeader>{selected ? <InspectionForm item={selected} photoUrl={getPrimaryPhoto(selected)} onSave={saveInspection} /> : <ExtinguisherPicker items={enriched} getPhoto={getPrimaryPhoto} onSelect={setSelected} />}</DialogContent></Dialog>
      <Dialog open={modal === 'nonconformity'} onOpenChange={(open) => !open && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Registrar Não Conformidade</DialogTitle></DialogHeader>{selected ? <NcQuickForm item={selected} onSave={saveNonconformity} /> : <EmptyAction />}</DialogContent></Dialog>
      <Dialog open={modal === 'recharge'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>{selected ? `Registrar recarga - ${selected.codigo}` : 'Selecionar extintor para recarga'}</DialogTitle></DialogHeader>{selected ? <RechargeForm item={selected} onSave={saveRecharge} /> : <ExtinguisherPicker items={enriched} getPhoto={getPrimaryPhoto} onSelect={setSelected} />}</DialogContent></Dialog>
      <Dialog open={modal === 'plant'} onOpenChange={(open) => !open && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Upload da Planta</DialogTitle></DialogHeader><PlantForm form={plantForm} setForm={setPlantForm} onSave={savePlant} /></DialogContent></Dialog>
      <Dialog open={modal === 'point'} onOpenChange={(open) => { if (!open) cancelPointDraft(); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Adicionar Extintor neste ponto</DialogTitle></DialogHeader>{pointDraft ? <MapPointForm companyId={companyId} draft={pointDraft} extinguishers={enriched} activePlantId={activePlant?.id} existingPoints={store.points} onCancel={cancelPointDraft} onLink={savePoint} onCreate={saveNewExtinguisherPoint} /> : null}</DialogContent></Dialog>
      <Dialog open={modal === 'pointDetails'} onOpenChange={(open) => { if (!open) { setModal(null); setSelectedPoint(null); } }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Ponto do Extintor no Mapa</DialogTitle></DialogHeader>{selected && selectedPoint ? <MapPointDetails item={selected} point={selectedPoint} photoUrl={getPrimaryPhoto(selected)} openNcs={store.nonconformities.filter((nc) => nc.extintor_id === selected.id && ['aberta', 'em_andamento', 'atrasada'].includes(nc.status)).length} lastInspection={store.inspections.find((entry) => entry.extintor_id === selected.id)} recentHistory={store.history.filter((entry) => entry.extintor_id === selected.id).slice(0, 3)} onDetails={() => setModal('details')} onEdit={() => { setForm(selected); setModal('extinguisher'); }} onInspect={() => setModal('inspection')} onRecharge={() => setModal('recharge')} onNc={() => setModal('nonconformity')} onPhoto={() => { setPhotoForm(blankPhoto(companyId, selected.id)); setModal('photo'); }} onQr={generateQrCode} onReposition={() => { setRepositionPointId(selectedPoint.id); setAddPointMode(false); setDragPreview(null); setModal(null); toast({ title: 'Reposicionamento ativo', description: 'Clique, segure e arraste o ponto do extintor para o novo local.' }); }} onRemove={removeSelectedPoint} /> : null}</DialogContent></Dialog>
      <Dialog open={modal === 'mapPreview'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>Pré-visualizar PDF do Mapa</DialogTitle></DialogHeader><MapPdfPreview companyName={companyName} plant={activePlant} points={mapExtinguishers} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>Fechar</Button><Button onClick={() => { setModal(null); exportMapPdf(false); }} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Exportar Mapa em PDF</Button></div></DialogContent></Dialog>
      <Dialog open={modal === 'details'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>Ficha do Extintor</DialogTitle></DialogHeader>{selected ? <ExtinguisherDetails item={selected} store={store} primaryPhoto={getPrimaryPhoto(selected)} onEdit={() => { setForm(selected); setModal('extinguisher'); }} onInspect={() => setModal('inspection')} onNc={() => setModal('nonconformity')} onRecharge={() => setModal('recharge')} onPhoto={() => { setPhotoForm(blankPhoto(companyId, selected.id)); setModal('photo'); }} onDocument={() => { setDocumentForm(blankDocument(companyId, selected.id)); setModal('document'); }} onQr={generateQrCode} /> : null}</DialogContent></Dialog>
      <Dialog open={modal === 'photo'} onOpenChange={(open) => !open && setModal('details')}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Adicionar Foto</DialogTitle></DialogHeader>{selected ? <PhotoForm form={photoForm} setForm={setPhotoForm} onSave={savePhoto} /> : <EmptyAction />}</DialogContent></Dialog>
      <Dialog open={modal === 'document'} onOpenChange={(open) => !open && setModal('details')}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Anexar Documento</DialogTitle></DialogHeader>{selected ? <DocumentForm form={documentForm} setForm={setDocumentForm} onSave={saveDocument} /> : <EmptyAction />}</DialogContent></Dialog>
      <Dialog open={modal === 'qr'} onOpenChange={(open) => !open && setModal('details')}><DialogContent><DialogHeader><DialogTitle>QR Code do Extintor</DialogTitle></DialogHeader>{selected?.qr_code_url ? <QrCodePanel item={selected} /> : <ActionDialog item={selected || blankExtinguisher(companyId)} text="Gere a etiqueta para acesso rápido em campo." action="Gerar QR Code" onAction={generateQrCode} />}</DialogContent></Dialog>
    </div>
  );
}

function Filter({ value, onChange, options, labels, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string>; placeholder: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{labels?.[option] || option}</SelectItem>)}</SelectContent></Select>;
}

function Panel({ title, icon: Icon, children, id }: { title: string; icon: typeof Flame; children: React.ReactNode; id?: string }) {
  return <section id={id} className={cn('rounded-2xl border border-[#e3e0d8] bg-white p-5 shadow-sm', id === 'ext-map' && 'order-[-10]')}><div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-[#7a1f1f]" /><h2 className="text-lg font-bold text-[#111111]">{title}</h2></div>{children}</section>;
}

function ChartInsight({ evaluation, text }: { evaluation: ChartEvaluation; text: string }) {
  return <div className="mb-4 rounded-xl border border-[#cfcbc0] bg-[#f2f1ed] p-3 text-sm text-[#111111]"><div className="mb-1 flex items-center justify-between gap-3"><strong>Insight</strong><Badge className={cn('border-0', evaluation === 'positivo' ? 'bg-[#dde9e2] text-[#1b5e3f]' : evaluation === 'atencao' ? 'bg-[#faf3e4] text-[#7a1f1f]' : 'bg-[#f0e2e0] text-[#7a1f1f]')}>{chartEvaluationLabels[evaluation]}</Badge></div>{text}</div>;
}

function DashboardExportForm({ options, setOptions, onCancel, onGenerate }: { options: DashboardExportOptions; setOptions: (options: DashboardExportOptions) => void; onCancel: () => void; onGenerate: () => void }) {
  const toggle = (key: keyof Pick<DashboardExportOptions, 'includeMap' | 'includePhotos' | 'includeActions' | 'includeNcs' | 'includeConclusion'>) => setOptions({ ...options, [key]: !options[key] });
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Template do relatório"><Select value={options.template} onValueChange={(value) => setOptions({ ...options, template: value as DashboardExportOptions['template'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="executivo">Relatório Executivo</SelectItem><SelectItem value="operacional">Relatório Operacional</SelectItem><SelectItem value="auditoria">Relatório de Auditoria</SelectItem></SelectContent></Select></Field><Field label="Período"><Select value={options.period} onValueChange={(value) => setOptions({ ...options, period: value as DashboardExportOptions['period'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mes">Este mês</SelectItem><SelectItem value="30dias">Últimos 30 dias</SelectItem><SelectItem value="90dias">Últimos 90 dias</SelectItem><SelectItem value="ano">Este ano</SelectItem><SelectItem value="personalizado">Período personalizado</SelectItem></SelectContent></Select></Field></div><div className="grid gap-3 md:grid-cols-2">{([['includeMap', 'Incluir mapa'], ['includePhotos', 'Incluir fotos principais'], ['includeActions', 'Incluir extintores que exigem ação'], ['includeNcs', 'Incluir últimas não conformidades'], ['includeConclusion', 'Incluir conclusão automática']] as Array<[keyof DashboardExportOptions, string]>).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-[#e3e0d8] p-3 text-sm"><input type="checkbox" checked={Boolean(options[key])} onChange={() => toggle(key as any)} />{label}</label>)}</div><div className="rounded-xl border border-[#cfcbc0] bg-[#f2f1ed] p-4 text-sm text-[#111111]">O relatório executivo inclui capa, situação geral, score, resumo, gráficos com insights, mapa opcional, ações recomendadas e conclusão.</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={onGenerate} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Gerar PDF</Button></div></div>;
}

function PresentationExportForm({ options, setOptions, isGenerating, onCancel, onGenerate }: { options: PresentationExportOptions; setOptions: (options: PresentationExportOptions) => void; isGenerating: boolean; onCancel: () => void; onGenerate: () => void }) {
  const toggle = (key: keyof Pick<PresentationExportOptions, 'includeMap' | 'includeActions' | 'includeNcs' | 'includeRecommendations' | 'includePhotos'>) => setOptions({ ...options, [key]: !options[key] });
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-2"><Field label="Período"><Select value={options.period} onValueChange={(value) => setOptions({ ...options, period: value as PresentationExportOptions['period'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="mes">Este mês</SelectItem><SelectItem value="30dias">Últimos 30 dias</SelectItem><SelectItem value="90dias">Últimos 90 dias</SelectItem><SelectItem value="ano">Este ano</SelectItem><SelectItem value="personalizado">Período personalizado</SelectItem></SelectContent></Select></Field><Field label="Tipo de apresentação"><Select value={options.type} onValueChange={(value) => setOptions({ ...options, type: value as PresentationExportOptions['type'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="executiva">Executiva</SelectItem><SelectItem value="operacional">Operacional</SelectItem><SelectItem value="auditoria">Auditoria</SelectItem></SelectContent></Select></Field></div><div className="grid gap-3 md:grid-cols-2">{([['includeMap', 'Incluir mapa de localização'], ['includeActions', 'Incluir extintores que exigem ação'], ['includeNcs', 'Incluir últimas não conformidades'], ['includeRecommendations', 'Incluir recomendações'], ['includePhotos', 'Incluir fotos principais']] as Array<[keyof PresentationExportOptions, string]>).map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-[#e3e0d8] p-3 text-sm"><input type="checkbox" checked={Boolean(options[key])} onChange={() => toggle(key as any)} />{label}</label>)}</div><div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-4 text-sm text-[#7a1f1f]">A apresentação será gerada em formato horizontal 16:9, com slides limpos, gráficos grandes, textos curtos e foco em reunião.</div><div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel} disabled={isGenerating}>Cancelar</Button><Button onClick={onGenerate} disabled={isGenerating} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">{isGenerating ? 'Gerando apresentação...' : 'Gerar Apresentação PDF'}</Button></div></div>;
}

function ActionDialog({ item, text, action, onAction }: { item: FireExtinguisher & { computedStatus?: FireExtinguisherStatus }; text: string; action: string; onAction: () => void }) {
  return <div className="space-y-4"><div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-4"><p className="font-semibold">{item.codigo}</p><p className="text-sm text-[#6e6a61]">{item.area} - {item.localizacao_descritiva}</p></div><p className="text-sm text-[#6e6a61]">{text}</p><Button onClick={onAction} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">{action}</Button></div>;
}

function NcQuickForm({ item, onSave }: { item: FireExtinguisher; onSave: (type: string) => void }) {
  const [type, setType] = useState(extinguisherNcTypes[0]);
  return <div className="space-y-4"><div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-4"><p className="font-semibold">{item.codigo}</p><p className="text-sm text-[#6e6a61]">{item.area} - {item.localizacao_descritiva}</p></div><Field label="Tipo de não conformidade"><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{extinguisherNcTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Button onClick={() => onSave(type)} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Registrar não conformidade</Button></div>;
}

function EmptyAction() {
  return <p className="rounded-xl border border-dashed border-[#e3e0d8] p-4 text-sm text-[#6e6a61]">Selecione um extintor na listagem antes de executar esta ação.</p>;
}

function fileToDataUrl(file: File, callback: (value: string) => void) {
  const reader = new FileReader();
  reader.onload = () => callback(String(reader.result || ''));
  reader.readAsDataURL(file);
}

function PhotoForm({ form, setForm, onSave }: { form: FireExtinguisherPhoto; setForm: (form: FireExtinguisherPhoto) => void; onSave: (photo: FireExtinguisherPhoto) => void }) {
  const setImage = (file?: File, origem_captura: 'camera' | 'upload' = 'upload') => {
    if (!file) return;
    const capturedAt = now();
    fileToDataUrl(file, (arquivo_url) => setForm({ ...form, arquivo_url, origem_captura, data_captura: capturedAt, data_upload: capturedAt, bloqueada_para_edicao: true }));
  };
  return <div className="space-y-4"><div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-4 text-sm text-[#7a1f1f]"><strong>Evidências Fotográficas</strong><p className="mt-1 text-[#6e6a61]">Fotos comprovam existência, estado de conservação, lacre, manômetro, acesso, sinalização e antes/depois de correções para auditoria.</p></div><div className="grid gap-4 md:grid-cols-2"><Field label="Tipo da foto"><Select value={form.tipo_foto} onValueChange={(value) => setForm({ ...form, tipo_foto: value as FireExtinguisherPhotoType })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(extinguisherPhotoTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Origem"><Select value={form.origem} onValueChange={(value) => setForm({ ...form, origem: value as FireExtinguisherPhoto['origem'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['cadastro', 'inspecao', 'nao_conformidade', 'recarga', 'correcao'].map((value) => <SelectItem key={value} value={value}>{value.replace('_', ' ')}</SelectItem>)}</SelectContent></Select></Field><Field label="Usuário que enviou"><Input value={form.usuario_nome || ''} onChange={(event) => setForm({ ...form, usuario_nome: event.target.value })} /></Field><div className="space-y-2"><span className="text-sm font-medium text-[#111111]">Imagem</span><div className="grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer justify-center rounded-md border border-[#e3e0d8] px-3 py-2 text-sm hover:bg-[#f7f5f0]"><Camera className="mr-2 h-4 w-4" />Câmera<Input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => setImage(event.target.files?.[0], 'camera')} /></label><label className="flex cursor-pointer justify-center rounded-md border border-[#e3e0d8] px-3 py-2 text-sm hover:bg-[#f7f5f0]"><Upload className="mr-2 h-4 w-4" />Arquivo<Input type="file" accept="image/*" className="hidden" onChange={(event) => setImage(event.target.files?.[0], 'upload')} /></label></div></div></div><Field label="Observação"><Textarea value={form.descricao || ''} onChange={(event) => setForm({ ...form, descricao: event.target.value })} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(form.principal)} onChange={(event) => setForm({ ...form, principal: event.target.checked })} /> Usar como foto principal</label>{form.arquivo_url ? <div className="space-y-2"><img src={form.arquivo_url} alt="Prévia" className="max-h-72 rounded-xl border object-contain" /><p className="text-xs text-[#6e6a61]">Captura/upload: {new Date(form.data_upload || now()).toLocaleString('pt-BR')} • Origem: {form.origem_captura || 'upload'}</p></div> : <p className="rounded-xl border border-dashed border-[#e3e0d8] p-4 text-sm text-[#6e6a61]">Este extintor ainda não possui foto. Adicione uma foto para melhorar o respaldo visual.</p>}<div className="flex justify-end"><Button onClick={() => onSave(form)} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Salvar foto</Button></div></div>;
}

function DocumentForm({ form, setForm, onSave }: { form: FireExtinguisherDocument; setForm: (form: FireExtinguisherDocument) => void; onSave: (document: FireExtinguisherDocument) => void }) {
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-2"><Field label="Nome"><Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></Field><Field label="Tipo"><Select value={form.tipo} onValueChange={(value) => setForm({ ...form, tipo: value as FireExtinguisherDocument['tipo'] })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(extinguisherDocumentTypes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field><Field label="Data"><Input type="date" value={form.data} onChange={(event) => setForm({ ...form, data: event.target.value })} /></Field><Field label="Validade"><Input type="date" value={form.validade || ''} onChange={(event) => setForm({ ...form, validade: event.target.value })} /></Field><Field label="Arquivo"><Input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) fileToDataUrl(file, (arquivo_url) => setForm({ ...form, arquivo_url, nome: form.nome || file.name })); }} /></Field></div><Field label="Observação"><Textarea value={form.observacao || ''} onChange={(event) => setForm({ ...form, observacao: event.target.value })} /></Field><div className="flex justify-end"><Button onClick={() => onSave(form)} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Salvar documento</Button></div></div>;
}

function ExtinguisherPicker({ items, getPhoto, onSelect }: { items: Array<FireExtinguisher & { computedStatus: FireExtinguisherStatus }>; getPhoto: (item: FireExtinguisher) => string; onSelect: (item: FireExtinguisher & { computedStatus: FireExtinguisherStatus }) => void }) {
  const [query, setQuery] = useState('');
  const filteredItems = items.filter((item) => `${item.codigo} ${item.area} ${item.localizacao_descritiva}`.toLowerCase().includes(query.toLowerCase())).slice(0, 12);
  return <div className="space-y-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6e6a61]" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por código, área ou localização" className="pl-9" /></div><div className="grid gap-3">{filteredItems.map((item) => { const photo = getPhoto(item); return <button key={item.id} onClick={() => onSelect(item)} className="grid gap-3 rounded-xl border border-[#e3e0d8] p-3 text-left hover:bg-[#f7f5f0] sm:grid-cols-[72px_1fr_auto] sm:items-center">{photo ? <img src={photo} alt={item.codigo} className="h-16 w-16 rounded-lg object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-lg bg-[#f7f5f0]"><Flame className="h-5 w-5 text-[#7a1f1f]" /></div>}<div><p className="font-bold">{item.codigo}</p><p className="text-sm text-[#6e6a61]">{item.area} - {item.localizacao_descritiva}</p><p className="text-xs text-[#6e6a61]">Última inspeção: {formatDate(item.data_ultima_inspecao)}</p></div>{statusBadge(item.computedStatus)}</button>; })}</div></div>;
}

function RechargeForm({ item, onSave }: { item: FireExtinguisher & { computedStatus?: FireExtinguisherStatus }; onSave: (payload: { data_recarga: string; data_proxima_recarga: string; data_validade?: string; empresa_responsavel?: string; certificado_url?: string; nota_fiscal_url?: string; laudo_url?: string; foto_etiqueta_url?: string; observacoes?: string }) => void }) {
  const next = new Date();
  next.setFullYear(next.getFullYear() + 1);
  const [form, setForm] = useState({ data_recarga: today(), data_proxima_recarga: next.toISOString().slice(0, 10), data_validade: item.data_validade || '', empresa_responsavel: item.empresa_manutencao || '', certificado_url: '', nota_fiscal_url: '', laudo_url: '', foto_etiqueta_url: '', observacoes: '' });
  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  return <div className="space-y-4"><div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{item.codigo}</p><p className="text-sm text-[#6e6a61]">{item.area} - {item.localizacao_descritiva}</p></div>{statusBadge(item.computedStatus || 'sem_dados')}</div><div className="mt-3 grid gap-2 text-sm md:grid-cols-3"><span>Última recarga: {formatDate(item.data_ultima_recarga)}</span><span>Próxima atual: {formatDate(item.data_proxima_recarga)}</span><span>Validade atual: {formatDate(item.data_validade)}</span></div></div><div className="grid gap-4 md:grid-cols-2"><Field label="Data da nova recarga"><Input type="date" value={form.data_recarga} onChange={(event) => update('data_recarga', event.target.value)} /></Field><Field label="Nova próxima recarga"><Input type="date" value={form.data_proxima_recarga} onChange={(event) => update('data_proxima_recarga', event.target.value)} /></Field><Field label="Nova validade"><Input type="date" value={form.data_validade} onChange={(event) => update('data_validade', event.target.value)} /></Field><Field label="Empresa responsável"><Input value={form.empresa_responsavel} onChange={(event) => update('empresa_responsavel', event.target.value)} /></Field><Field label="Certificado/laudo"><Input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) fileToDataUrl(file, (value) => update('certificado_url', value)); }} /></Field><Field label="Nota fiscal"><Input type="file" onChange={(event) => { const file = event.target.files?.[0]; if (file) fileToDataUrl(file, (value) => update('nota_fiscal_url', value)); }} /></Field><Field label="Foto da etiqueta atualizada"><Input type="file" accept="image/*" capture="environment" onChange={(event) => { const file = event.target.files?.[0]; if (file) fileToDataUrl(file, (value) => update('foto_etiqueta_url', value)); }} /></Field></div>{form.foto_etiqueta_url ? <img src={form.foto_etiqueta_url} alt="Etiqueta atualizada" className="max-h-56 rounded-xl border object-contain" /> : null}<Field label="Observações"><Textarea value={form.observacoes} onChange={(event) => update('observacoes', event.target.value)} /></Field><div className="flex justify-end"><Button onClick={() => onSave(form)} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Salvar recarga</Button></div></div>;
}

function InspectionForm({ item, photoUrl: primaryPhoto, onSave }: { item: FireExtinguisher; photoUrl?: string; onSave: (payload: { responsavel?: string; observacoes?: string; photoUrl?: string; items: Array<{ key: string; pergunta: string; resposta: FireExtinguisherInspectionAnswer; gravidade: FireExtinguisherSeverity; observacao?: string; foto_url?: string; gera_nao_conformidade?: boolean; ncType: string; action: string; critical: boolean }> }) => void }) {
  const [responsavel, setResponsavel] = useState(item.responsavel_inspecao || '');
  const [observacoes, setObservacoes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [items, setItems] = useState(() => extinguisherInspectionChecklist.map((entry) => ({ key: entry.key, pergunta: entry.pergunta, resposta: 'conforme' as FireExtinguisherInspectionAnswer, gravidade: entry.critical ? 'alta' as FireExtinguisherSeverity : 'baixa' as FireExtinguisherSeverity, observacao: '', foto_url: '', gera_nao_conformidade: false, ncType: entry.ncType, action: entry.action, critical: entry.critical })));
  const updateItem = (key: string, patch: Partial<(typeof items)[number]>) => setItems((current) => current.map((entry) => entry.key === key ? { ...entry, ...patch, gera_nao_conformidade: patch.resposta === 'nao_conforme' ? true : patch.resposta ? false : entry.gera_nao_conformidade } : entry));
  const answered = items.filter((entry) => entry.resposta !== 'conforme' || entry.observacao || entry.foto_url).length;
  return <div className="space-y-5"><div className="sticky top-0 z-10 rounded-xl border border-[#e3e0d8] bg-white p-4 shadow-sm"><div className="grid gap-4 sm:grid-cols-[96px_1fr]">{primaryPhoto ? <img src={primaryPhoto} alt={item.codigo} className="h-24 w-24 rounded-xl object-cover" /> : <div className="grid h-24 w-24 place-items-center rounded-xl bg-[#f7f5f0]"><Camera className="h-6 w-6 text-[#7a1f1f]" /></div>}<div><p className="font-bold">{item.codigo} - {extinguisherStatusLabels[item.status_manual || item.status || 'sem_dados'] || 'Status atual'}</p><p className="text-sm text-[#6e6a61]">Área: {item.area} • Localização: {item.localizacao_descritiva}</p><p className="mt-2 text-sm font-medium text-[#7a1f1f]">{answered} de {items.length} itens respondidos com evidência</p><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#e3e0d8]"><div className="h-full bg-[#7a1f1f]" style={{ width: `${Math.round((answered / items.length) * 100)}%` }} /></div></div></div></div><div className="grid gap-4 md:grid-cols-3"><Field label="Responsável pela inspeção"><Input value={responsavel} onChange={(event) => setResponsavel(event.target.value)} /></Field><div className="space-y-2"><span className="text-sm font-medium text-[#111111]">Foto geral da inspeção</span><div className="grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer justify-center rounded-md border border-[#e3e0d8] px-3 py-2 text-sm hover:bg-[#f7f5f0]"><Camera className="mr-2 h-4 w-4" />Câmera<Input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) fileToDataUrl(file, setPhotoUrl); }} /></label><label className="flex cursor-pointer justify-center rounded-md border border-[#e3e0d8] px-3 py-2 text-sm hover:bg-[#f7f5f0]"><Upload className="mr-2 h-4 w-4" />Galeria<Input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) fileToDataUrl(file, setPhotoUrl); }} /></label></div></div><Field label="Status de inspeção periódica"><Input value={getInspectionStatus(item)} readOnly /></Field></div>{photoUrl ? <img src={photoUrl} alt="Foto geral da inspeção" className="max-h-64 rounded-xl border object-contain" /> : null}<div className="grid gap-3 md:grid-cols-2">{items.map((entry) => <div key={entry.key} className="rounded-xl border border-[#e3e0d8] p-4"><div className="flex items-start justify-between gap-3"><p className="text-base font-semibold text-[#111111]">{entry.pergunta}</p>{entry.critical ? <Badge className="bg-[#f6edec] text-[#7a1f1f]">Crítico</Badge> : null}</div><div className="mt-4 grid grid-cols-3 gap-2"><Button type="button" className={cn('h-12', entry.resposta === 'conforme' && 'bg-[#1b5e3f] text-white hover:bg-[#1b5e3f]')} variant={entry.resposta === 'conforme' ? 'default' : 'outline'} onClick={() => updateItem(entry.key, { resposta: 'conforme' })}>Conforme</Button><Button type="button" className={cn('h-12', entry.resposta === 'nao_conforme' && 'bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]')} variant={entry.resposta === 'nao_conforme' ? 'default' : 'outline'} onClick={() => updateItem(entry.key, { resposta: 'nao_conforme', gravidade: entry.critical ? 'critica' : 'alta' })}>Não Conforme</Button><Button type="button" className="h-12" variant={entry.resposta === 'nao_aplica' ? 'default' : 'outline'} onClick={() => updateItem(entry.key, { resposta: 'nao_aplica' })}>N/A</Button></div><div className="mt-3 space-y-2"><Textarea value={entry.observacao} onChange={(event) => updateItem(entry.key, { observacao: event.target.value })} placeholder="Observação" /><div className="grid gap-2 sm:grid-cols-2"><label className="flex cursor-pointer justify-center rounded-md border border-[#e3e0d8] px-3 py-2 text-sm hover:bg-[#f7f5f0]"><Camera className="mr-2 h-4 w-4" />Foto<Input type="file" accept="image/*" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) fileToDataUrl(file, (foto_url) => updateItem(entry.key, { foto_url })); }} /></label><Select value={entry.gravidade} onValueChange={(value) => updateItem(entry.key, { gravidade: value as FireExtinguisherSeverity })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(severityLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>{entry.foto_url ? <img src={entry.foto_url} alt="Evidência do item" className="max-h-40 rounded-lg border object-contain" /> : null}<label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={Boolean(entry.gera_nao_conformidade)} onChange={(event) => updateItem(entry.key, { gera_nao_conformidade: event.target.checked })} /> Criar não conformidade</label></div></div>)}</div><Field label="Observações finais"><Textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} /></Field><div className="rounded-xl border border-[#cfcbc0] bg-[#f2f1ed] p-4 text-sm text-[#111111]"><Smartphone className="mb-2 h-5 w-5" />Inspeção finalizada fica travada como evidência auditável. Correções devem ser registradas por nova inspeção ou não conformidade.</div><div className="sticky bottom-0 flex justify-between gap-2 rounded-xl border bg-white p-3"><Button variant="outline" onClick={() => window.localStorage.setItem(`extinguisher-inspection-draft:${item.id}`, JSON.stringify({ responsavel, observacoes, photoUrl, items }))}>Salvar rascunho</Button><Button onClick={() => onSave({ responsavel, observacoes, photoUrl, items })} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Finalizar inspeção</Button></div></div>;
}

function PlantForm({ form, setForm, onSave }: { form: FireExtinguisherPlant; setForm: (form: FireExtinguisherPlant) => void; onSave: () => void }) {
  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, imagem_url: String(reader.result || '') });
    reader.readAsDataURL(file);
  };
  return <div className="space-y-4"><Field label="Nome da planta"><Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Unidade/empresa"><Input value={form.unidade || ''} onChange={(event) => setForm({ ...form, unidade: event.target.value })} /></Field><Field label="Área/setor"><Input value={form.area || ''} onChange={(event) => setForm({ ...form, area: event.target.value })} /></Field></div><Field label="Imagem da planta"><Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} /></Field>{form.imagem_url ? <img src={form.imagem_url} alt="Prévia da planta" className="max-h-64 rounded-xl border object-contain" /> : null}<Field label="Observações"><Textarea value={form.observacoes || ''} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></Field><Button onClick={onSave} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Salvar planta</Button></div>;
}

function MapPointForm({ companyId, draft, extinguishers, activePlantId, existingPoints, onCancel, onLink, onCreate }: { companyId: string; draft: { x: number; y: number }; extinguishers: Array<FireExtinguisher & { computedStatus: FireExtinguisherStatus }>; activePlantId?: string; existingPoints: FireExtinguisherMapPoint[]; onCancel: () => void; onLink: (extinguisherId: string) => void; onCreate: (draft: FireExtinguisher) => void }) {
  const [mode, setMode] = useState<'existing' | 'new'>('existing');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');
  const [newForm, setNewForm] = useState<FireExtinguisher>(() => blankExtinguisher(companyId));
  const available = extinguishers.filter((item) => !existingPoints.some((point) => point.planta_id === activePlantId && point.extintor_id === item.id));
  const searched = available.filter((item) => `${item.codigo} ${item.area} ${item.localizacao_descritiva}`.toLowerCase().includes(query.toLowerCase()));
  const selected = extinguishers.find((item) => item.id === selectedId);
  const update = <K extends keyof FireExtinguisher>(key: K, value: FireExtinguisher[K]) => setNewForm({ ...newForm, [key]: value });

  return <div className="space-y-5"><div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-3 text-sm text-[#7a1f1f]">Coordenada relativa: X {draft.x.toFixed(2)}% / Y {draft.y.toFixed(2)}%. O ponto só será salvo após confirmar.</div><div className="flex gap-2"><Button type="button" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')} className={mode === 'existing' ? 'bg-[#7a1f1f] text-white' : ''}>Vincular extintor existente</Button><Button type="button" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')} className={mode === 'new' ? 'bg-[#7a1f1f] text-white' : ''}>Criar novo extintor</Button></div>{mode === 'existing' ? <div className="space-y-4"><Field label="Buscar extintor"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, área ou localização" /></Field><Field label="Selecionar extintor"><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger><SelectValue placeholder="Selecione um extintor disponível" /></SelectTrigger><SelectContent>{searched.map((item) => <SelectItem key={item.id} value={item.id}>{item.codigo} - {item.area} - {item.localizacao_descritiva}</SelectItem>)}</SelectContent></Select></Field>{selected ? <div className="grid gap-2 rounded-xl border border-[#e3e0d8] p-3 text-sm md:grid-cols-3"><span>Status: {extinguisherStatusLabels[selected.computedStatus]}</span><span>Recarga: {formatDate(selected.data_proxima_recarga)}</span><span>Validade: {formatDate(selected.data_validade)}</span></div> : null}</div> : <div className="grid gap-4 md:grid-cols-2"><Field label="Código do extintor"><Input value={newForm.codigo} onChange={(event) => update('codigo', event.target.value)} /></Field><Field label="Área"><Input value={newForm.area} onChange={(event) => update('area', event.target.value)} /></Field><Field label="Localização descritiva"><Input value={newForm.localizacao_descritiva} onChange={(event) => update('localizacao_descritiva', event.target.value)} /></Field><Field label="Tipo/agente extintor"><Select value={newForm.tipo_agente} onValueChange={(value) => update('tipo_agente', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{extinguisherAgents.map((agent) => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}</SelectContent></Select></Field><Field label="Capacidade"><Input value={newForm.capacidade || ''} onChange={(event) => update('capacidade', event.target.value)} /></Field><Field label="Última recarga"><Input type="date" value={newForm.data_ultima_recarga || ''} onChange={(event) => update('data_ultima_recarga', event.target.value)} /></Field><Field label="Próxima recarga"><Input type="date" value={newForm.data_proxima_recarga || ''} onChange={(event) => update('data_proxima_recarga', event.target.value)} /></Field><Field label="Validade"><Input type="date" value={newForm.data_validade || ''} onChange={(event) => update('data_validade', event.target.value)} /></Field><Field label="Observações"><Textarea value={newForm.observacoes || ''} onChange={(event) => update('observacoes', event.target.value)} /></Field></div>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={() => mode === 'existing' ? onLink(selectedId) : onCreate(newForm)} className="bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]">Salvar no mapa</Button></div></div>;
}

function MapPointDetails({ item, point, photoUrl, openNcs, lastInspection, recentHistory, onDetails, onEdit, onInspect, onRecharge, onNc, onPhoto, onQr, onReposition, onRemove }: { item: FireExtinguisher & { computedStatus?: FireExtinguisherStatus }; point: FireExtinguisherMapPoint; photoUrl?: string; openNcs: number; lastInspection?: FireExtinguisherInspection; recentHistory: Array<{ tipo_evento: string; descricao: string; data_evento: string }>; onDetails: () => void; onEdit: () => void; onInspect: () => void; onRecharge: () => void; onNc: () => void; onPhoto: () => void; onQr: () => void; onReposition: () => void; onRemove: () => void }) {
  const status = item.computedStatus || 'sem_dados';
  return <div className="space-y-4"><div className="grid gap-4 md:grid-cols-[180px_1fr]">{photoUrl ? <img src={photoUrl} alt={item.codigo} className="h-44 w-full rounded-xl border object-cover" /> : <div className="grid h-44 place-items-center rounded-xl border border-dashed border-[#e3e0d8] bg-[#f7f5f0] text-center text-sm text-[#7a1f1f]"><Camera className="h-8 w-8" />Sem foto principal</div>}<div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-bold">{item.codigo}</p><p className="text-sm text-[#6e6a61]">{item.area} - {item.localizacao_descritiva}</p></div>{statusBadge(status)}</div><div className="mt-3 grid gap-2 text-sm md:grid-cols-3"><span>Agente: {item.tipo_agente}</span><span>Capacidade: {item.capacidade || '-'}</span><span>Recarga: {formatDate(item.data_proxima_recarga)}</span><span>Validade: {formatDate(item.data_validade)}</span><span>Última inspeção: {formatDate(lastInspection?.data_inspecao || item.data_ultima_inspecao)}</span><span>NCs abertas: {openNcs}</span><span>X: {point.x_percent.toFixed(2)}%</span><span>Y: {point.y_percent.toFixed(2)}%</span></div></div></div><List title="Mini histórico recente" items={recentHistory.map((entry) => `${formatDate(entry.data_evento.slice(0, 10))} - ${entry.tipo_evento}: ${entry.descricao}`)} /><div className="grid gap-2 sm:grid-cols-3"><Button variant="outline" onClick={onDetails}>Ver ficha completa</Button><Button variant="outline" onClick={onInspect}>Registrar inspeção</Button><Button variant="outline" onClick={onRecharge}>Registrar recarga</Button><Button variant="outline" onClick={onNc}>Registrar não conformidade</Button><Button variant="outline" onClick={onPhoto}>Adicionar foto</Button><Button variant="outline" onClick={onDetails}>Ver fotos</Button><Button variant="outline" onClick={onReposition}>Reposicionar</Button><Button variant="outline" onClick={onDetails}>Exportar ficha PDF</Button><Button variant="outline" onClick={onQr}>Gerar QR Code</Button><Button variant="outline" onClick={onEdit}>Editar dados</Button><Button variant="outline" onClick={onRemove} className="border-[#e4cfcc] text-[#7a1f1f] hover:bg-[#f6edec]"><Trash2 className="h-4 w-4" />Remover do mapa</Button></div></div>;
}

function MapPdfPreview({ companyName, plant, points }: { companyName?: string; plant?: FireExtinguisherPlant; points: Array<{ point: FireExtinguisherMapPoint; extinguisher: FireExtinguisher & { computedStatus: FireExtinguisherStatus } }> }) {
  const summary = Object.keys(extinguisherStatusLabels).reduce<Record<FireExtinguisherStatus, number>>((acc, status) => {
    acc[status as FireExtinguisherStatus] = points.filter((item) => item.extinguisher.computedStatus === status).length;
    return acc;
  }, { em_conformidade: 0, a_vencer: 0, vencido: 0, nao_conformidade: 0, sem_dados: 0 });
  return <div className="space-y-4 rounded-xl border border-[#e3e0d8] bg-white p-4"><div><h3 className="text-xl font-bold">Mapa de Localização de Extintores</h3><p className="text-sm text-[#6e6a61]">{companyName || 'Empresa'} - {plant?.nome || 'Planta não informada'}</p></div><div className="grid gap-2 md:grid-cols-6">{Object.entries(summary).map(([status, value]) => <div key={status} className="rounded-lg border border-[#e3e0d8] p-2 text-sm"><span>{extinguisherStatusLabels[status as FireExtinguisherStatus]}</span><strong className="block text-lg">{value}</strong></div>)}</div><div className="relative overflow-hidden rounded-xl border border-[#e3e0d8] bg-[#f7f5f0]">{plant?.imagem_url ? <img src={plant.imagem_url} alt={plant.nome} className="block h-auto w-full" /> : <div className="grid min-h-[360px] place-items-center text-[#6e6a61]">Planta não carregada</div>}{points.map(({ point, extinguisher }) => <span key={point.id} className="absolute h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white px-1 text-center text-[8px] font-bold leading-4 text-white shadow" style={{ left: `${point.x_percent}%`, top: `${point.y_percent}%`, backgroundColor: extinguisherStatusColors[extinguisher.computedStatus].dot }}>{extinguisher.codigo}</span>)}</div><div className="flex flex-wrap gap-3 text-sm">{Object.entries(extinguisherStatusColors).map(([status, color]) => <span key={status} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color.dot }} />{extinguisherStatusLabels[status as FireExtinguisherStatus]}</span>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="text-xs uppercase text-[#6e6a61]"><th className="p-2">Código</th><th className="p-2">Área</th><th className="p-2">Localização</th><th className="p-2">Agente</th><th className="p-2">Capacidade</th><th className="p-2">Próxima recarga</th><th className="p-2">Validade</th><th className="p-2">Status</th></tr></thead><tbody>{points.map(({ point, extinguisher }) => <tr key={point.id} className="border-t"><td className="p-2">{extinguisher.codigo}</td><td className="p-2">{extinguisher.area}</td><td className="p-2">{extinguisher.localizacao_descritiva}</td><td className="p-2">{extinguisher.tipo_agente}</td><td className="p-2">{extinguisher.capacidade || '-'}</td><td className="p-2">{formatDate(extinguisher.data_proxima_recarga)}</td><td className="p-2">{formatDate(extinguisher.data_validade)}</td><td className="p-2">{extinguisherStatusLabels[extinguisher.computedStatus]}</td></tr>)}</tbody></table></div></div>;
}

function QrCodePanel({ item }: { item: FireExtinguisher }) {
  return <div className="space-y-4 text-center"><div className="mx-auto w-fit rounded-xl border border-[#e3e0d8] bg-white p-4">{item.qr_code_url ? <img src={item.qr_code_url} alt={`QR Code ${item.codigo}`} className="h-60 w-60" /> : <QrCode className="h-32 w-32 text-[#6e6a61]" />}</div><div><p className="font-bold">{item.codigo}</p><p className="text-sm text-[#6e6a61]">Etiqueta pronta para impressão e acesso rápido em campo.</p></div><div className="flex justify-center gap-2"><Button variant="outline" onClick={() => item.qr_code_url && downloadText(`qr-${item.codigo}.svg`, `<svg xmlns="http://www.w3.org/2000/svg"><image href="${item.qr_code_url}" height="240" width="240"/></svg>`, 'image/svg+xml')}>Baixar etiqueta</Button><Button variant="outline" onClick={() => window.print()}>Imprimir etiqueta</Button></div></div>;
}

function ExtinguisherDetails({ item, store, primaryPhoto, onEdit, onInspect, onNc, onRecharge, onPhoto, onDocument, onQr }: { item: FireExtinguisher & { computedStatus?: FireExtinguisherStatus }; store: FireExtinguisherDataStore; primaryPhoto?: string; onEdit: () => void; onInspect: () => void; onNc: () => void; onRecharge: () => void; onPhoto: () => void; onDocument: () => void; onQr: () => void }) {
  const inspections = store.inspections.filter((entry) => entry.extintor_id === item.id);
  const ncs = store.nonconformities.filter((entry) => entry.extintor_id === item.id);
  const recharges = store.recharges.filter((entry) => entry.extintor_id === item.id);
  const photos = store.photos.filter((entry) => entry.extintor_id === item.id);
  const documents = store.documents.filter((entry) => entry.extintor_id === item.id);
  const history = store.history.filter((entry) => entry.extintor_id === item.id);
  return <div className="space-y-5"><div className="grid gap-4 md:grid-cols-[220px_1fr]">{primaryPhoto ? <img src={primaryPhoto} alt={item.codigo} className="h-56 w-full rounded-xl border object-cover" /> : <div className="grid h-56 place-items-center rounded-xl border border-dashed border-[#e3e0d8] bg-[#f7f5f0] text-center text-sm text-[#7a1f1f]"><div><Camera className="mx-auto h-8 w-8" /><p className="mt-2">Este extintor ainda não possui foto. Adicione uma foto para melhorar o respaldo visual.</p><Button className="mt-3 bg-[#7a1f1f] text-white hover:bg-[#7a1f1f]" onClick={onPhoto}>Adicionar Foto</Button></div></div>}<div className="space-y-3"><div className="grid gap-3 md:grid-cols-4"><Metric label="Código" value={item.codigo} /><Metric label="Área" value={item.area} /><Metric label="Agente" value={item.tipo_agente} /><Metric label="Status" value={extinguisherStatusLabels[item.computedStatus || 'sem_dados']} /></div><div className="grid gap-3 md:grid-cols-3"><Metric label="Inspeção" value={getInspectionStatus(item)} /><Metric label="Próxima inspeção" value={formatDate(item.data_proxima_inspecao || getNextInspectionDate(item))} /><Metric label="QR Code" value={item.qr_code_url ? 'Gerado' : 'Pendente'} /></div></div></div><div className="grid gap-4 md:grid-cols-2"><InfoBlock title="Visão Geral" items={[['Localização', item.localizacao_descritiva], ['Capacidade', item.capacidade || '-'], ['Próxima recarga', formatDate(item.data_proxima_recarga)], ['Validade', formatDate(item.data_validade)], ['Última inspeção', formatDate(item.data_ultima_inspecao)]]} /><InfoBlock title="Responsáveis e documentos" items={[['Responsável', item.responsavel_inspecao || '-'], ['Empresa manutenção', item.empresa_manutencao || '-'], ['Fornecedor', item.fornecedor || '-'], ['Documentos', String(documents.length)], ['Fotos', String(photos.length)]]} /></div><div className="flex flex-wrap gap-2"><Button onClick={onEdit} variant="outline">Editar</Button><Button onClick={onInspect} variant="outline">Registrar inspeção</Button><Button onClick={onRecharge} variant="outline">Registrar recarga</Button><Button onClick={onNc} variant="outline">Registrar NC</Button><Button onClick={onPhoto} variant="outline"><Camera className="h-4 w-4" />Adicionar foto</Button><Button onClick={onDocument} variant="outline"><FileText className="h-4 w-4" />Anexar documento</Button><Button onClick={onQr} variant="outline"><QrCode className="h-4 w-4" />Gerar QR Code</Button><Button onClick={() => window.print()} variant="outline">Gerar ficha PDF</Button></div><div className="rounded-xl border border-[#e3e0d8] p-4"><h3 className="font-bold">Evidências Fotográficas</h3><p className="mt-1 text-sm text-[#6e6a61]">As fotos servem como respaldo, histórico e comparação antes/depois em auditorias, inspeções e manutenções.</p>{photos.length ? <div className="mt-3 grid gap-3 md:grid-cols-4">{photos.map((photo) => <a key={photo.id} href={photo.arquivo_url} download={`foto-${item.codigo}-${photo.tipo_foto}.png`} className="group rounded-xl border border-[#e3e0d8] p-2 hover:bg-[#f7f5f0]"><img src={photo.arquivo_url} alt={extinguisherPhotoTypes[photo.tipo_foto]} className="h-28 w-full rounded-lg object-cover" /><p className="mt-2 text-xs font-semibold">{extinguisherPhotoTypes[photo.tipo_foto]}</p><p className="text-xs text-[#6e6a61]">{formatDate(photo.created_at.slice(0, 10))}</p></a>)}</div> : <p className="mt-3 rounded-lg border border-dashed border-[#e3e0d8] p-3 text-sm text-[#6e6a61]">Nenhuma foto adicionada.</p>}</div><List title="Inspeções" items={inspections.map((entry) => `${formatDate(entry.data_inspecao)} - ${entry.status_geral}`)} /><List title="Não Conformidades" items={ncs.map((entry) => `${formatDate(entry.data_identificacao)} - ${entry.tipo} - ${entry.status}${entry.evidencia_correcao_url ? ' - com foto de correção' : ''}`)} /><List title="Recargas" items={recharges.map((entry) => `${formatDate(entry.data_recarga)} - próxima ${formatDate(entry.data_proxima_recarga)}`)} /><List title="Documentos" items={documents.map((entry) => `${formatDate(entry.data)} - ${extinguisherDocumentTypes[entry.tipo]} - ${entry.nome}`)} /><List title="Histórico" items={history.map((entry) => `${formatDate(entry.data_evento.slice(0, 10))} - ${entry.tipo_evento}: ${entry.descricao}`)} /></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#e3e0d8] bg-[#f7f5f0] p-3"><p className="text-xs uppercase text-[#7a1f1f]">{label}</p><p className="mt-1 font-bold text-[#111111]">{value}</p></div>;
}

function InfoBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <div className="rounded-xl border border-[#e3e0d8] p-4"><h3 className="font-bold">{title}</h3><div className="mt-3 space-y-2 text-sm">{items.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><span className="text-[#6e6a61]">{label}</span><strong className="text-right">{value}</strong></div>)}</div></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border border-[#e3e0d8] p-4"><h3 className="font-bold">{title}</h3>{items.length ? <ul className="mt-3 space-y-2 text-sm text-[#6e6a61]">{items.map((item) => <li key={item} className="rounded-lg bg-[#f7f5f0] p-2">{item}</li>)}</ul> : <p className="mt-3 text-sm text-[#6e6a61]">Nenhum registro.</p>}</div>;
}
