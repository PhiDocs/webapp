'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  Download,
  Edit,
  Eye,
  FileText,
  Flame,
  MapPin,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
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
  extinguisherAgents,
  extinguisherAreas,
  extinguisherNcTypes,
  extinguisherStatusColors,
  extinguisherStatusLabels,
  extinguisherStorageKey,
  type FireExtinguisher,
  type FireExtinguisherDataStore,
  type FireExtinguisherInspection,
  type FireExtinguisherMapPoint,
  type FireExtinguisherNcStatus,
  type FireExtinguisherNonconformity,
  type FireExtinguisherPlant,
  type FireExtinguisherRecharge,
  type FireExtinguisherSeverity,
  type FireExtinguisherStatus,
} from '@/lib/fire-extinguishers';

type FireExtinguishersDashboardProps = {
  companyId: string;
  companyName?: string;
};

type ActiveModal = 'extinguisher' | 'inspection' | 'nonconformity' | 'recharge' | 'plant' | 'point' | 'pointDetails' | 'mapPreview' | 'details' | null;

const moduleColor = getModuleColor('extintores');
const statusOrder: FireExtinguisherStatus[] = ['em_conformidade', 'a_vencer', 'vencido'];
const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
  observacoes: '',
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
    body { font-family: Arial, sans-serif; color: #0f172a; margin: 0; background: white; font-size: 8px; }
    .page { width: 100%; min-height: 190mm; overflow: hidden; }
    header { display:flex; justify-content:space-between; gap: 12px; border-bottom: 1px solid #fed7aa; padding-bottom: 5px; margin-bottom: 6px; }
    h1 { margin: 0; font-size: 17px; line-height: 1.1; }
    .meta { color:#475569; font-size:8px; line-height: 1.35; }
    .summary { display:grid; grid-template-columns: repeat(6, 1fr); gap:5px; margin: 6px 0; }
    .card { border:1px solid #fed7aa; border-left:3px solid #ea580c; border-radius:7px; padding:5px; background:#fff7ed; min-height: 28px; }
    .card strong { display:block; font-size:13px; line-height: 1; margin-top: 2px; }
    .map-wrap { position:relative; width:100%; max-height: 103mm; border:1px solid #fed7aa; border-radius:9px; overflow:hidden; background:#fff7ed; }
    .map-wrap img { width:100%; height:auto; display:block; }
    .map-point { position:absolute; transform:translate(-50%, -50%); min-width:15px; height:15px; border-radius:999px; border:1.5px solid white; box-shadow:0 1px 5px rgba(15,23,42,.35); color:white; font-size:6px; line-height:12px; padding:0 2px; text-align:center; font-weight:700; }
    .legend { display:flex; flex-wrap:wrap; gap:8px; margin: 5px 0 6px; font-size:8px; }
    .legend-item { display:flex; align-items:center; gap:6px; }
    .dot { width:7px; height:7px; border-radius:999px; display:inline-block; }
    table { width:100%; border-collapse:collapse; font-size:7px; margin-top: 4px; table-layout: fixed; }
    th, td { border:1px solid #e2e8f0; padding:3px; text-align:left; overflow-wrap:anywhere; }
    th { background:#f8fafc; text-transform:uppercase; font-size:6px; color:#475569; }
    .code { width: 9%; }
    .area { width: 11%; }
    .loc { width: 24%; }
    .agent { width: 15%; }
    .cap { width: 8%; }
    .date { width: 11%; }
    .status { width: 11%; }
    footer { margin-top: 5px; color:#9a3412; font-size:8px; font-weight:700; text-align:center; }
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

function statusBadge(status: FireExtinguisherStatus) {
  const color = extinguisherStatusColors[status];
  return <Badge className="border" style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}>{extinguisherStatusLabels[status]}</Badge>;
}

function ncStatusBadge(status: FireExtinguisherNcStatus) {
  const map: Record<FireExtinguisherNcStatus, string> = {
    aberta: 'bg-[#fff7ed] text-[#9a3412]',
    em_andamento: 'bg-[#eff6ff] text-[#1d4ed8]',
    resolvida: 'bg-[#f0fdf4] text-[#166534]',
    atrasada: 'bg-[#fef2f2] text-[#991b1b]',
    cancelada: 'bg-[#f1f5f9] text-[#475569]',
  };
  return <Badge className={cn('border-0', map[status])}>{status.replace('_', ' ')}</Badge>;
}

function MetricCard({ title, value, helper, icon: Icon, status }: { title: string; value: string | number; helper: string; icon: typeof Flame; status?: FireExtinguisherStatus }) {
  const color = status ? extinguisherStatusColors[status] : { bg: '#f8fafc', border: '#cbd5e1', text: '#1e293b', dot: moduleColor.primary };
  return (
    <div className="rounded-2xl border border-l-4 bg-white p-5 shadow-sm" style={{ borderTopColor: color.border, borderRightColor: color.border, borderBottomColor: color.border, borderLeftColor: color.dot }}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#475569]">{title}</p>
          <p className="mt-3 text-3xl font-bold text-[#0f172a]">{value}</p>
        </div>
        <div className="rounded-xl p-3" style={{ backgroundColor: color.bg, color: color.text }}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-4 text-sm text-[#64748b]">{helper}</p>
    </div>
  );
}

function FireExtinguisherForm({ form, setForm, onSubmit }: { form: FireExtinguisher; setForm: (form: FireExtinguisher) => void; onSubmit: () => void }) {
  const update = <K extends keyof FireExtinguisher>(key: K, value: FireExtinguisher[K]) => setForm({ ...form, [key]: value });
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Código"><Input value={form.codigo} onChange={(event) => update('codigo', event.target.value)} /></Field>
        <Field label="Número patrimonial"><Input value={form.numero_patrimonial || ''} onChange={(event) => update('numero_patrimonial', event.target.value)} /></Field>
        <Field label="Unidade/empresa"><Input value={form.unidade || ''} onChange={(event) => update('unidade', event.target.value)} /></Field>
        <Field label="Área/setor"><Input value={form.area} onChange={(event) => update('area', event.target.value)} /></Field>
        <Field label="Localização"><Input value={form.localizacao_descritiva} onChange={(event) => update('localizacao_descritiva', event.target.value)} /></Field>
        <Field label="Agente extintor"><Select value={form.tipo_agente} onValueChange={(value) => update('tipo_agente', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{extinguisherAgents.map((agent) => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}</SelectContent></Select></Field>
        <Field label="Capacidade"><Input value={form.capacidade || ''} onChange={(event) => update('capacidade', event.target.value)} /></Field>
        <Field label="Classe de fogo"><Input value={form.classe_fogo || ''} onChange={(event) => update('classe_fogo', event.target.value)} /></Field>
        <Field label="Fabricante"><Input value={form.fabricante || ''} onChange={(event) => update('fabricante', event.target.value)} /></Field>
        <Field label="Modelo"><Input value={form.modelo || ''} onChange={(event) => update('modelo', event.target.value)} /></Field>
        <Field label="Número de série"><Input value={form.numero_serie || ''} onChange={(event) => update('numero_serie', event.target.value)} /></Field>
        <Field label="Frequência de inspeção"><Input type="number" value={form.frequencia_inspecao_dias || 30} onChange={(event) => update('frequencia_inspecao_dias', Number(event.target.value))} /></Field>
        <Field label="Data de fabricação"><Input type="date" value={form.data_fabricacao || ''} onChange={(event) => update('data_fabricacao', event.target.value)} /></Field>
        <Field label="Última recarga"><Input type="date" value={form.data_ultima_recarga || ''} onChange={(event) => update('data_ultima_recarga', event.target.value)} /></Field>
        <Field label="Próxima recarga"><Input type="date" value={form.data_proxima_recarga || ''} onChange={(event) => update('data_proxima_recarga', event.target.value)} /></Field>
        <Field label="Validade"><Input type="date" value={form.data_validade || ''} onChange={(event) => update('data_validade', event.target.value)} /></Field>
        <Field label="Última inspeção"><Input type="date" value={form.data_ultima_inspecao || ''} onChange={(event) => update('data_ultima_inspecao', event.target.value)} /></Field>
        <Field label="Responsável"><Input value={form.responsavel_inspecao || ''} onChange={(event) => update('responsavel_inspecao', event.target.value)} /></Field>
        <Field label="Empresa de manutenção"><Input value={form.empresa_manutencao || ''} onChange={(event) => update('empresa_manutencao', event.target.value)} /></Field>
        <Field label="Fornecedor"><Input value={form.fornecedor || ''} onChange={(event) => update('fornecedor', event.target.value)} /></Field>
        <Field label="Status manual"><Select value={form.status_manual || 'automatico'} onValueChange={(value) => update('status_manual', value === 'automatico' ? undefined : value as FireExtinguisherStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="automatico">Automático</SelectItem>{Object.entries(extinguisherStatusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></Field>
      </div>
      {form.status_manual ? <Field label="Justificativa do status manual"><Textarea value={form.justificativa_status_manual || ''} onChange={(event) => update('justificativa_status_manual', event.target.value)} /></Field> : null}
      <Field label="Observações"><Textarea value={form.observacoes || ''} onChange={(event) => update('observacoes', event.target.value)} /></Field>
      <div className="flex justify-end gap-2"><Button onClick={onSubmit} className="bg-[#c2410c] text-white hover:bg-[#9a3412]">Salvar extintor</Button></div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5 text-sm font-medium text-[#334155]"><span>{label}</span>{children}</label>;
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
  const [mapPdfHistory, setMapPdfHistory] = useState<Array<{ id: string; plantName: string; generatedAt: string; count: number; status: string }>>([]);
  const [isGeneratingMapPdf, setIsGeneratingMapPdf] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  const [filters, setFilters] = useState({ unidade: 'todas', area: 'todas', agente: 'todos', status: 'todos', vencimento: 'todos', nc: 'todas', periodo: 'ano' });
  const [search, setSearch] = useState('');

  useEffect(() => {
    const key = extinguisherStorageKey(companyId);
    const saved = window.localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) as FireExtinguisherDataStore : createSeedExtinguisherStore(companyId);
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
    return { total, byStatus, nextRecharge, staleInspection };
  }, [filtered]);

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
  const lastNcs = store.nonconformities.slice().sort((a, b) => b.data_identificacao.localeCompare(a.data_identificacao)).slice(0, 6);
  const mapExtinguishers = useMemo(() => store.points
    .filter((point) => point.planta_id === activePlant?.id)
    .map((point) => {
      const extinguisher = enriched.find((item) => item.id === point.extintor_id);
      return extinguisher ? { point, extinguisher } : null;
    })
    .filter(Boolean) as Array<{ point: FireExtinguisherMapPoint; extinguisher: FireExtinguisher & { computedStatus: FireExtinguisherStatus } }>, [activePlant?.id, enriched, store.points]);

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

  const saveInspection = () => {
    if (!selected) return;
    const timestamp = now();
    const currentStatus = calculateExtinguisherStatus(selected, store.nonconformities);
    const inspection: FireExtinguisherInspection = { id: uid('insp'), companyId, extintor_id: selected.id, data_inspecao: today(), responsavel: selected.responsavel_inspecao, status_geral: 'conforme', pressao_ok: true, lacre_ok: true, manometro_ok: true, sinalizacao_ok: true, acesso_livre: true, suporte_ok: true, mangueira_ok: true, corrosao: false, etiqueta_inspecao_ok: true, local_correto: true, validade_recarga_ok: currentStatus !== 'vencido', observacoes: 'Inspeção registrada pelo módulo de extintores.', created_at: timestamp, updated_at: timestamp };
    setStore((current) => ({ ...current, inspections: [inspection, ...current.inspections], extinguishers: current.extinguishers.map((item) => item.id === selected.id ? { ...item, data_ultima_inspecao: inspection.data_inspecao, updated_at: timestamp } : item), history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Inspeção registrada', descricao: 'Checklist de inspeção registrado.', data_evento: timestamp, created_at: timestamp }, ...current.history] }));
    setModal(null);
    toast({ title: 'Inspeção registrada', description: 'A última inspeção do extintor foi atualizada.' });
  };

  const saveNonconformity = (type = 'Lacre rompido') => {
    if (!selected) return;
    const timestamp = now();
    const nc: FireExtinguisherNonconformity = { id: uid('nc-ext'), companyId, extintor_id: selected.id, data_identificacao: today(), tipo: type, descricao: `Não conformidade registrada para ${selected.codigo}.`, area: selected.area, status: 'aberta', gravidade: 'alta', prazo_correcao: today(), created_at: timestamp, updated_at: timestamp };
    setStore((current) => ({ ...current, nonconformities: [nc, ...current.nonconformities], history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Não conformidade aberta', descricao: nc.tipo, data_evento: timestamp, created_at: timestamp }, ...current.history] }));
    setModal(null);
    toast({ title: 'Não conformidade registrada', description: 'O status visual do extintor será atualizado automaticamente.' });
  };

  const saveRecharge = () => {
    if (!selected) return;
    const timestamp = now();
    const next = new Date();
    next.setFullYear(next.getFullYear() + 1);
    const recharge: FireExtinguisherRecharge = { id: uid('rec'), companyId, extintor_id: selected.id, data_recarga: today(), data_proxima_recarga: next.toISOString().slice(0, 10), empresa_responsavel: selected.empresa_manutencao, created_at: timestamp, updated_at: timestamp };
    setStore((current) => ({ ...current, recharges: [recharge, ...current.recharges], extinguishers: current.extinguishers.map((item) => item.id === selected.id ? { ...item, data_ultima_recarga: recharge.data_recarga, data_proxima_recarga: recharge.data_proxima_recarga, updated_at: timestamp } : item), history: [{ id: uid('hist'), companyId, extintor_id: selected.id, tipo_evento: 'Recarga registrada', descricao: `Próxima recarga: ${formatDate(recharge.data_proxima_recarga)}.`, data_evento: timestamp, created_at: timestamp }, ...current.history] }));
    setModal(null);
    toast({ title: 'Recarga registrada', description: 'A próxima recarga foi atualizada.' });
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

  const generateAiAnalysis = () => {
    toast({
      title: 'Análise de extintores gerada',
      description: `${summary.byStatus.vencido} vencidos, ${summary.byStatus.a_vencer} a vencer e ${summary.byStatus.nao_conformidade} com não conformidade. Priorize recargas e correções por área crítica.`,
    });
  };

  if (!isReady) {
    return <div className="rounded-2xl border border-[#fed7aa] bg-white p-8 text-[#64748b]">Carregando controle inteligente de extintores...</div>;
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#fed7aa] bg-[#fff7ed] shadow-sm">
        <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-[#fee2e2] p-4 text-[#dc2626]"><Flame className="h-8 w-8" /></div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#c2410c]">Prevenção e Emergência</p>
              <h1 className="mt-2 text-3xl font-bold text-[#0f172a]">Controle Inteligente de Extintores</h1>
              <p className="mt-2 text-[#475569]">Informação que protege. Gestão que salva.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { setForm(blankExtinguisher(companyId)); setModal('extinguisher'); }} className="bg-[#c2410c] text-white hover:bg-[#9a3412]"><Plus className="h-4 w-4" />Novo Extintor</Button>
            <Button variant="outline" onClick={() => navigateCompanySection(companyId, 'dataImports', { tipo_importacao: 'extintores' })}><Upload className="h-4 w-4" />Importar Extintores</Button>
            <Button variant="outline" onClick={() => document.getElementById('ext-map')?.scrollIntoView({ behavior: 'smooth' })}><MapPin className="h-4 w-4" />Mapa de Localização</Button>
            <Button variant="outline" onClick={() => { setSelected(filtered[0] || null); setModal('inspection'); }}><CheckCircle2 className="h-4 w-4" />Registrar Inspeção</Button>
            <Button variant="outline" onClick={() => { setSelected(filtered[0] || null); setModal('nonconformity'); }}><ShieldAlert className="h-4 w-4" />Registrar Não Conformidade</Button>
            <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4" />Exportar Relatório</Button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-[#fed7aa] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-8">
          <div className="relative md:col-span-2"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por código, área, localização ou agente..." className="pl-9" /></div>
          <Filter value={filters.unidade} onChange={(value) => setFilters({ ...filters, unidade: value })} options={['todas', ...Array.from(new Set(enriched.map((item) => item.unidade).filter(Boolean) as string[]))]} placeholder="Unidade" />
          <Filter value={filters.area} onChange={(value) => setFilters({ ...filters, area: value })} options={['todas', ...Array.from(new Set(enriched.map((item) => item.area)))]} placeholder="Área" />
          <Filter value={filters.agente} onChange={(value) => setFilters({ ...filters, agente: value })} options={['todos', ...extinguisherAgents]} placeholder="Agente" />
          <Filter value={filters.status} onChange={(value) => setFilters({ ...filters, status: value })} options={['todos', ...Object.keys(extinguisherStatusLabels)]} labels={extinguisherStatusLabels} placeholder="Status" />
          <Filter value={filters.nc} onChange={(value) => setFilters({ ...filters, nc: value })} options={['todas', 'sim', 'nao']} labels={{ todas: 'NC: todas', sim: 'Com NC', nao: 'Sem NC' }} placeholder="NC" />
          <Button variant="outline" onClick={() => { setFilters({ unidade: 'todas', area: 'todas', agente: 'todos', status: 'todos', vencimento: 'todos', nc: 'todas', periodo: 'ano' }); setSearch(''); }}><X className="h-4 w-4" />Limpar</Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
        <MetricCard title="Total de Extintores" value={summary.total} helper="unidades cadastradas" icon={Flame} />
        <MetricCard title="Em Conformidade" value={summary.byStatus.em_conformidade} helper={`${percent(summary.byStatus.em_conformidade, summary.total)}% da base`} icon={CheckCircle2} status="em_conformidade" />
        <MetricCard title="A Vencer em 30 dias" value={summary.byStatus.a_vencer} helper={`${percent(summary.byStatus.a_vencer, summary.total)}% da base`} icon={CalendarClock} status="a_vencer" />
        <MetricCard title="Vencidos" value={summary.byStatus.vencido} helper={`${percent(summary.byStatus.vencido, summary.total)}% da base`} icon={AlertTriangle} status="vencido" />
        <MetricCard title="Próxima Recarga" value={formatDate(summary.nextRecharge)} helper="Mais próxima" icon={RefreshCw} status="nao_conformidade" />
        <MetricCard title="Com Não Conformidade" value={summary.byStatus.nao_conformidade} helper={`${percent(summary.byStatus.nao_conformidade, summary.total)}% da base`} icon={ShieldAlert} status="nao_conformidade" />
        <MetricCard title="Sem Inspeção Recente" value={summary.staleInspection} helper="fora da frequência" icon={FileText} status="sem_dados" />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1.2fr_0.8fr]">
        <Panel title="Status de Vencimento" icon={BarChart3}>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={statusChart} dataKey="value" nameKey="label" innerRadius={62} outerRadius={92}>{statusChart.map((entry) => <Cell key={entry.status} fill={extinguisherStatusColors[entry.status as FireExtinguisherStatus].dot} />)}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Quantidade por Agente Extintor" icon={Flame}>
          <div className="h-72"><ResponsiveContainer width="100%" height="100%"><BarChart data={agentsChart} layout="vertical" margin={{ left: 92, right: 16 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" hide /><YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="value" fill="#ea580c" radius={[0, 8, 8, 0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Extintores por Área" icon={MapPin}>
          <div className="space-y-2">{areasChart.map((item) => <button key={item.label} onClick={() => setFilters({ ...filters, area: item.label })} className="flex w-full items-center justify-between rounded-xl border border-[#fed7aa] px-3 py-2 text-sm hover:bg-[#fff7ed]"><span>{item.label}</span><strong>{item.value}</strong></button>)}</div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.4fr_0.8fr]">
        <Panel title="Controle Mensal de Vencimentos" icon={CalendarClock}>
          <div className="h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={monthlyChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="label" /><YAxis yAxisId="left" /><YAxis yAxisId="right" orientation="right" /><Tooltip /><Legend /><Bar yAxisId="left" dataKey="aVencer" name="A vencer" fill="#facc15" radius={[8, 8, 0, 0]} /><Bar yAxisId="left" dataKey="vencidos" name="Vencidos" fill="#ef4444" radius={[8, 8, 0, 0]} /><Line yAxisId="right" type="monotone" dataKey="conformidade" name="Conformidade (%)" stroke="#22c55e" strokeWidth={3} /></ComposedChart></ResponsiveContainer></div>
        </Panel>
        <Panel title="Não Conformidades por Tipo" icon={ShieldAlert}>
          <div className="space-y-2">{ncByType.length ? ncByType.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-[#fff7ed] px-3 py-2 text-sm"><span>{item.label}</span><strong>{item.value}</strong></div>) : <p className="text-sm text-[#64748b]">Nenhuma não conformidade registrada.</p>}<div className="border-t pt-3 text-sm font-bold">Total: {ncByType.reduce((sum, item) => sum + item.value, 0)}</div></div>
        </Panel>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Últimas Não Conformidades" icon={ShieldAlert}>
          <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-sm"><thead className="text-xs uppercase text-[#64748b]"><tr><th className="p-3">Data</th><th className="p-3">Código</th><th className="p-3">Área</th><th className="p-3">Tipo</th><th className="p-3">Status</th><th className="p-3">Ação</th></tr></thead><tbody>{lastNcs.length ? lastNcs.map((nc) => { const ext = enriched.find((item) => item.id === nc.extintor_id); return <tr key={nc.id} className="border-t"><td className="p-3">{formatDate(nc.data_identificacao)}</td><td className="p-3">{ext?.codigo || '-'}</td><td className="p-3">{nc.area || ext?.area || '-'}</td><td className="p-3">{nc.tipo}</td><td className="p-3">{ncStatusBadge(nc.status)}</td><td className="p-3"><Button size="sm" variant="ghost" onClick={() => { if (ext) { setSelected(ext); setModal('details'); } }}>Ver</Button></td></tr>; }) : <tr><td colSpan={6} className="p-6 text-center text-[#64748b]">Nenhuma não conformidade registrada.</td></tr>}</tbody></table></div>
        </Panel>
        <Panel title="Plano de ação e IA" icon={FileText}>
          <div className="space-y-3 text-sm text-[#475569]"><p>Priorize extintores vencidos, equipamentos com não conformidade aberta e áreas com maior concentração de pendências.</p><Button onClick={generateAiAnalysis} variant="outline"><Flame className="h-4 w-4" />Gerar análise com IA</Button><Button onClick={() => toast({ title: 'Relatório com IA preparado', description: 'A estrutura já reúne cards, gráficos, mapa e recomendações para exportação em PDF.' })} variant="outline"><FileText className="h-4 w-4" />Gerar relatório com IA</Button><Button onClick={() => toast({ title: 'Plano de correção sugerido', description: '1. Recargas vencidas. 2. Correção de NCs abertas. 3. Inspeção das áreas críticas.' })} variant="outline"><CheckCircle2 className="h-4 w-4" />Sugerir plano de correção com IA</Button></div>
        </Panel>
      </section>

      <Panel title="Listagem de Extintores" icon={Flame}>
        <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="text-xs uppercase text-[#64748b]"><tr><th className="p-3">Código</th><th className="p-3">Área</th><th className="p-3">Localização</th><th className="p-3">Agente</th><th className="p-3">Próxima recarga</th><th className="p-3">Validade</th><th className="p-3">Última inspeção</th><th className="p-3">Status</th><th className="p-3">NCs</th><th className="p-3">Ações</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t"><td className="p-3 font-semibold">{item.codigo}</td><td className="p-3">{item.area}</td><td className="p-3">{item.localizacao_descritiva}</td><td className="p-3">{item.tipo_agente}</td><td className="p-3">{formatDate(item.data_proxima_recarga)}</td><td className="p-3">{formatDate(item.data_validade)}</td><td className="p-3">{formatDate(item.data_ultima_inspecao)}</td><td className="p-3">{statusBadge(item.computedStatus)}</td><td className="p-3">{store.nonconformities.filter((nc) => nc.extintor_id === item.id && nc.status !== 'resolvida').length}</td><td className="p-3"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={() => { setSelected(item); setModal('details'); }}><Search className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { setForm(item); setModal('extinguisher'); }}><Edit className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { setSelected(item); setModal('inspection'); }}><CheckCircle2 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" onClick={() => { setSelected(item); setModal('nonconformity'); }}><ShieldAlert className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>
        <div className="grid gap-3 lg:hidden">{filtered.map((item) => <div key={item.id} className="rounded-xl border border-[#fed7aa] p-4"><div className="flex justify-between gap-3"><div><p className="font-bold">{item.codigo}</p><p className="text-sm text-[#64748b]">{item.area} - {item.localizacao_descritiva}</p></div>{statusBadge(item.computedStatus)}</div><div className="mt-3 grid grid-cols-2 gap-2 text-sm"><span>{item.tipo_agente}</span><span>{formatDate(item.data_proxima_recarga)}</span></div></div>)}</div>
      </Panel>

      <Panel title="Mapa de Localização" icon={MapPin} id="ext-map">
        <div className="mb-4 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => { setPlantForm(activePlant || plantForm); setModal('plant'); }}><Upload className="h-4 w-4" />Upload de planta</Button>
          <Button variant={addPointMode ? 'default' : 'outline'} onClick={() => { setAddPointMode(true); setRepositionPointId(null); }} className={addPointMode ? 'bg-[#c2410c] text-white' : ''}><MapPin className="h-4 w-4" />Adicionar Extintor no Mapa</Button>
          {(addPointMode || repositionPointId) ? <Button variant="outline" onClick={() => { setAddPointMode(false); setRepositionPointId(null); setDragPreview(null); setPointDraft(null); }}>Cancelar posicionamento</Button> : null}
          <Button variant="outline" onClick={() => exportMapPdf(true)}><Eye className="h-4 w-4" />Pré-visualizar PDF</Button>
          <Button variant="outline" onClick={() => exportMapPdf(false)} disabled={isGeneratingMapPdf}><Download className="h-4 w-4" />{isGeneratingMapPdf ? 'Gerando PDF do mapa...' : 'Exportar Mapa em PDF'}</Button>
          <Button variant="outline" onClick={() => toast({ title: 'Exportação de imagem preparada', description: 'A exportação PNG/JPG do mapa está estruturada para uma próxima etapa.' })}>Exportar imagem do mapa</Button>
        </div>
        {addPointMode ? <div className="mb-3 rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm font-medium text-[#9a3412]">Modo de posicionamento ativo. Clique no local onde o extintor está instalado.</div> : null}
        {repositionPointId ? <div className="mb-3 rounded-xl border border-[#bfdbfe] bg-[#eff6ff] p-3 text-sm font-medium text-[#1d4ed8]">Modo de reposicionamento ativo. Clique, segure e arraste o ponto do extintor para o local desejado. Ao soltar, confirme para salvar.</div> : null}
        <div ref={mapRef} onClick={handleMapClick} className={cn('relative min-h-[420px] overflow-hidden rounded-2xl border border-dashed border-[#fed7aa] bg-[#fff7ed]', addPointMode && 'cursor-crosshair ring-2 ring-[#ea580c]', repositionPointId && 'ring-2 ring-[#2563eb]')}>
          {activePlant?.imagem_url ? <img src={activePlant.imagem_url} alt={activePlant.nome} className="h-full min-h-[420px] w-full object-contain" /> : <div className="absolute inset-0 grid place-items-center text-center text-[#92400e]"><div><MapPin className="mx-auto h-10 w-10" /><p className="mt-3 font-semibold">Nenhuma planta carregada</p><p className="text-sm">Use "Upload de planta" para enviar PNG, JPG, JPEG ou WEBP.</p></div></div>}
          {pointDraft ? <span className="absolute h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#64748b] shadow-lg ring-4 ring-[#cbd5e1]" style={{ left: `${pointDraft.x}%`, top: `${pointDraft.y}%` }} /> : null}
          {mapExtinguishers.map(({ point, extinguisher }) => { const color = extinguisherStatusColors[extinguisher.computedStatus]; const preview = dragPreview?.pointId === point.id ? dragPreview : null; const isRepositioning = repositionPointId === point.id; return <button key={point.id} type="button" onPointerDown={(event) => startPointDrag(event, point)} onPointerMove={movePointDrag} onPointerUp={endPointDrag} onPointerCancel={endPointDrag} onClick={(event) => { event.stopPropagation(); if (repositionPointId) return; setSelected(extinguisher); setSelectedPoint(point); setModal('pointDetails'); }} className={cn('group absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white shadow-lg ring-2 touch-none', isRepositioning ? 'cursor-grab ring-4 active:cursor-grabbing' : 'cursor-pointer')} style={{ left: `${preview?.x ?? point.x_percent}%`, top: `${preview?.y ?? point.y_percent}%`, backgroundColor: color.dot, ['--tw-ring-color' as string]: isRepositioning ? '#2563eb' : color.border }} title={`${extinguisher.codigo} - ${extinguisherStatusLabels[extinguisher.computedStatus]} - ${extinguisher.area} - Recarga ${formatDate(extinguisher.data_proxima_recarga)} - Validade ${formatDate(extinguisher.data_validade)}`}><span className="hidden rounded bg-black/60 px-1 group-hover:block">{extinguisher.codigo}</span></button>; })}
        </div>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">{Object.entries(extinguisherStatusColors).map(([status, color]) => <span key={status} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color.dot }} />{extinguisherStatusLabels[status as FireExtinguisherStatus]}</span>)}</div>
        <div className="mt-4 rounded-xl border border-[#fed7aa] p-4">
          <h3 className="font-semibold text-[#0f172a]">Histórico de PDFs do Mapa</h3>
          {mapPdfHistory.length ? <div className="mt-3 space-y-2 text-sm">{mapPdfHistory.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-[#fff7ed] p-2"><span>{item.plantName}</span><span>{item.generatedAt}</span><span>{item.count} extintores</span><span>{item.status}</span></div>)}</div> : <p className="mt-2 text-sm text-[#64748b]">Nenhum PDF do mapa foi gerado ainda.</p>}
        </div>
      </Panel>

      <footer className="rounded-2xl border border-[#fed7aa] bg-[#fff7ed] p-5 text-center font-semibold text-[#9a3412]">Organização, controle e informação salvam vidas. Gestão simples hoje, segurança garantida sempre.</footer>

      <Dialog open={modal === 'extinguisher'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>{form.id ? 'Editar Extintor' : 'Novo Extintor'}</DialogTitle></DialogHeader><FireExtinguisherForm form={form} setForm={setForm} onSubmit={saveExtinguisher} /></DialogContent></Dialog>
      <Dialog open={modal === 'inspection'} onOpenChange={(open) => !open && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Registrar Inspeção</DialogTitle></DialogHeader>{selected ? <ActionDialog item={selected} text="O checklist padrão será registrado como conforme. Caso haja item não conforme, registre uma NC em seguida." action="Registrar inspeção" onAction={saveInspection} /> : <EmptyAction />}</DialogContent></Dialog>
      <Dialog open={modal === 'nonconformity'} onOpenChange={(open) => !open && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Registrar Não Conformidade</DialogTitle></DialogHeader>{selected ? <NcQuickForm item={selected} onSave={saveNonconformity} /> : <EmptyAction />}</DialogContent></Dialog>
      <Dialog open={modal === 'recharge'} onOpenChange={(open) => !open && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Registrar Recarga</DialogTitle></DialogHeader>{selected ? <ActionDialog item={selected} text="A próxima recarga será calculada para daqui a 12 meses." action="Registrar recarga" onAction={saveRecharge} /> : <EmptyAction />}</DialogContent></Dialog>
      <Dialog open={modal === 'plant'} onOpenChange={(open) => !open && setModal(null)}><DialogContent><DialogHeader><DialogTitle>Upload da Planta</DialogTitle></DialogHeader><PlantForm form={plantForm} setForm={setPlantForm} onSave={savePlant} /></DialogContent></Dialog>
      <Dialog open={modal === 'point'} onOpenChange={(open) => { if (!open) cancelPointDraft(); }}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl"><DialogHeader><DialogTitle>Adicionar Extintor neste ponto</DialogTitle></DialogHeader>{pointDraft ? <MapPointForm companyId={companyId} draft={pointDraft} extinguishers={enriched} activePlantId={activePlant?.id} existingPoints={store.points} onCancel={cancelPointDraft} onLink={savePoint} onCreate={saveNewExtinguisherPoint} /> : null}</DialogContent></Dialog>
      <Dialog open={modal === 'pointDetails'} onOpenChange={(open) => { if (!open) { setModal(null); setSelectedPoint(null); } }}><DialogContent><DialogHeader><DialogTitle>Ponto do Extintor no Mapa</DialogTitle></DialogHeader>{selected && selectedPoint ? <MapPointDetails item={selected} point={selectedPoint} openNcs={store.nonconformities.filter((nc) => nc.extintor_id === selected.id && ['aberta', 'em_andamento', 'atrasada'].includes(nc.status)).length} onDetails={() => setModal('details')} onEdit={() => { setForm(selected); setModal('extinguisher'); }} onInspect={() => setModal('inspection')} onNc={() => setModal('nonconformity')} onReposition={() => { setRepositionPointId(selectedPoint.id); setAddPointMode(false); setDragPreview(null); setModal(null); toast({ title: 'Reposicionamento ativo', description: 'Clique, segure e arraste o ponto do extintor para o novo local.' }); }} onRemove={removeSelectedPoint} /> : null}</DialogContent></Dialog>
      <Dialog open={modal === 'mapPreview'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-6xl"><DialogHeader><DialogTitle>Pré-visualizar PDF do Mapa</DialogTitle></DialogHeader><MapPdfPreview companyName={companyName} plant={activePlant} points={mapExtinguishers} /><div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setModal(null)}>Fechar</Button><Button onClick={() => { setModal(null); exportMapPdf(false); }} className="bg-[#c2410c] text-white hover:bg-[#9a3412]">Exportar Mapa em PDF</Button></div></DialogContent></Dialog>
      <Dialog open={modal === 'details'} onOpenChange={(open) => !open && setModal(null)}><DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-4xl"><DialogHeader><DialogTitle>Detalhes do Extintor</DialogTitle></DialogHeader>{selected ? <ExtinguisherDetails item={selected} store={store} onEdit={() => { setForm(selected); setModal('extinguisher'); }} onInspect={() => setModal('inspection')} onNc={() => setModal('nonconformity')} onRecharge={() => setModal('recharge')} /> : null}</DialogContent></Dialog>
    </div>
  );
}

function Filter({ value, onChange, options, labels, placeholder }: { value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string>; placeholder: string }) {
  return <Select value={value} onValueChange={onChange}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{labels?.[option] || option}</SelectItem>)}</SelectContent></Select>;
}

function Panel({ title, icon: Icon, children, id }: { title: string; icon: typeof Flame; children: React.ReactNode; id?: string }) {
  return <section id={id} className="rounded-2xl border border-[#fed7aa] bg-white p-5 shadow-sm"><div className="mb-4 flex items-center gap-2"><Icon className="h-5 w-5 text-[#ea580c]" /><h2 className="text-lg font-bold text-[#0f172a]">{title}</h2></div>{children}</section>;
}

function ActionDialog({ item, text, action, onAction }: { item: FireExtinguisher & { computedStatus?: FireExtinguisherStatus }; text: string; action: string; onAction: () => void }) {
  return <div className="space-y-4"><div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4"><p className="font-semibold">{item.codigo}</p><p className="text-sm text-[#64748b]">{item.area} - {item.localizacao_descritiva}</p></div><p className="text-sm text-[#475569]">{text}</p><Button onClick={onAction} className="bg-[#c2410c] text-white hover:bg-[#9a3412]">{action}</Button></div>;
}

function NcQuickForm({ item, onSave }: { item: FireExtinguisher; onSave: (type: string) => void }) {
  const [type, setType] = useState(extinguisherNcTypes[0]);
  return <div className="space-y-4"><div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4"><p className="font-semibold">{item.codigo}</p><p className="text-sm text-[#64748b]">{item.area} - {item.localizacao_descritiva}</p></div><Field label="Tipo de não conformidade"><Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{extinguisherNcTypes.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select></Field><Button onClick={() => onSave(type)} className="bg-[#c2410c] text-white hover:bg-[#9a3412]">Registrar não conformidade</Button></div>;
}

function EmptyAction() {
  return <p className="rounded-xl border border-dashed border-[#fed7aa] p-4 text-sm text-[#64748b]">Selecione um extintor na listagem antes de executar esta ação.</p>;
}

function PlantForm({ form, setForm, onSave }: { form: FireExtinguisherPlant; setForm: (form: FireExtinguisherPlant) => void; onSave: () => void }) {
  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm({ ...form, imagem_url: String(reader.result || '') });
    reader.readAsDataURL(file);
  };
  return <div className="space-y-4"><Field label="Nome da planta"><Input value={form.nome} onChange={(event) => setForm({ ...form, nome: event.target.value })} /></Field><div className="grid gap-4 md:grid-cols-2"><Field label="Unidade/empresa"><Input value={form.unidade || ''} onChange={(event) => setForm({ ...form, unidade: event.target.value })} /></Field><Field label="Área/setor"><Input value={form.area || ''} onChange={(event) => setForm({ ...form, area: event.target.value })} /></Field></div><Field label="Imagem da planta"><Input type="file" accept="image/png,image/jpeg,image/jpg,image/webp" onChange={(event) => handleFile(event.target.files?.[0])} /></Field>{form.imagem_url ? <img src={form.imagem_url} alt="Prévia da planta" className="max-h-64 rounded-xl border object-contain" /> : null}<Field label="Observações"><Textarea value={form.observacoes || ''} onChange={(event) => setForm({ ...form, observacoes: event.target.value })} /></Field><Button onClick={onSave} className="bg-[#c2410c] text-white hover:bg-[#9a3412]">Salvar planta</Button></div>;
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

  return <div className="space-y-5"><div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3 text-sm text-[#9a3412]">Coordenada relativa: X {draft.x.toFixed(2)}% / Y {draft.y.toFixed(2)}%. O ponto só será salvo após confirmar.</div><div className="flex gap-2"><Button type="button" variant={mode === 'existing' ? 'default' : 'outline'} onClick={() => setMode('existing')} className={mode === 'existing' ? 'bg-[#c2410c] text-white' : ''}>Vincular extintor existente</Button><Button type="button" variant={mode === 'new' ? 'default' : 'outline'} onClick={() => setMode('new')} className={mode === 'new' ? 'bg-[#c2410c] text-white' : ''}>Criar novo extintor</Button></div>{mode === 'existing' ? <div className="space-y-4"><Field label="Buscar extintor"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Código, área ou localização" /></Field><Field label="Selecionar extintor"><Select value={selectedId} onValueChange={setSelectedId}><SelectTrigger><SelectValue placeholder="Selecione um extintor disponível" /></SelectTrigger><SelectContent>{searched.map((item) => <SelectItem key={item.id} value={item.id}>{item.codigo} - {item.area} - {item.localizacao_descritiva}</SelectItem>)}</SelectContent></Select></Field>{selected ? <div className="grid gap-2 rounded-xl border border-[#fed7aa] p-3 text-sm md:grid-cols-3"><span>Status: {extinguisherStatusLabels[selected.computedStatus]}</span><span>Recarga: {formatDate(selected.data_proxima_recarga)}</span><span>Validade: {formatDate(selected.data_validade)}</span></div> : null}</div> : <div className="grid gap-4 md:grid-cols-2"><Field label="Código do extintor"><Input value={newForm.codigo} onChange={(event) => update('codigo', event.target.value)} /></Field><Field label="Área"><Input value={newForm.area} onChange={(event) => update('area', event.target.value)} /></Field><Field label="Localização descritiva"><Input value={newForm.localizacao_descritiva} onChange={(event) => update('localizacao_descritiva', event.target.value)} /></Field><Field label="Tipo/agente extintor"><Select value={newForm.tipo_agente} onValueChange={(value) => update('tipo_agente', value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{extinguisherAgents.map((agent) => <SelectItem key={agent} value={agent}>{agent}</SelectItem>)}</SelectContent></Select></Field><Field label="Capacidade"><Input value={newForm.capacidade || ''} onChange={(event) => update('capacidade', event.target.value)} /></Field><Field label="Última recarga"><Input type="date" value={newForm.data_ultima_recarga || ''} onChange={(event) => update('data_ultima_recarga', event.target.value)} /></Field><Field label="Próxima recarga"><Input type="date" value={newForm.data_proxima_recarga || ''} onChange={(event) => update('data_proxima_recarga', event.target.value)} /></Field><Field label="Validade"><Input type="date" value={newForm.data_validade || ''} onChange={(event) => update('data_validade', event.target.value)} /></Field><Field label="Observações"><Textarea value={newForm.observacoes || ''} onChange={(event) => update('observacoes', event.target.value)} /></Field></div>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={onCancel}>Cancelar</Button><Button onClick={() => mode === 'existing' ? onLink(selectedId) : onCreate(newForm)} className="bg-[#c2410c] text-white hover:bg-[#9a3412]">Salvar no mapa</Button></div></div>;
}

function MapPointDetails({ item, point, openNcs, onDetails, onEdit, onInspect, onNc, onReposition, onRemove }: { item: FireExtinguisher & { computedStatus?: FireExtinguisherStatus }; point: FireExtinguisherMapPoint; openNcs: number; onDetails: () => void; onEdit: () => void; onInspect: () => void; onNc: () => void; onReposition: () => void; onRemove: () => void }) {
  const status = item.computedStatus || 'sem_dados';
  return <div className="space-y-4"><div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-lg font-bold">{item.codigo}</p><p className="text-sm text-[#64748b]">{item.area} - {item.localizacao_descritiva}</p></div>{statusBadge(status)}</div><div className="mt-3 grid gap-2 text-sm md:grid-cols-3"><span>Recarga: {formatDate(item.data_proxima_recarga)}</span><span>Validade: {formatDate(item.data_validade)}</span><span>NCs abertas: {openNcs}</span><span>X: {point.x_percent.toFixed(2)}%</span><span>Y: {point.y_percent.toFixed(2)}%</span></div></div><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={onDetails}>Ver detalhes</Button><Button variant="outline" onClick={onEdit}>Editar dados</Button><Button variant="outline" onClick={onReposition}>Reposicionar</Button><Button variant="outline" onClick={onInspect}>Registrar inspeção</Button><Button variant="outline" onClick={onNc}>Registrar não conformidade</Button><Button variant="outline" onClick={onRemove} className="border-[#fecaca] text-[#991b1b] hover:bg-[#fef2f2]"><Trash2 className="h-4 w-4" />Remover do mapa</Button></div></div>;
}

function MapPdfPreview({ companyName, plant, points }: { companyName?: string; plant?: FireExtinguisherPlant; points: Array<{ point: FireExtinguisherMapPoint; extinguisher: FireExtinguisher & { computedStatus: FireExtinguisherStatus } }> }) {
  const summary = Object.keys(extinguisherStatusLabels).reduce<Record<FireExtinguisherStatus, number>>((acc, status) => {
    acc[status as FireExtinguisherStatus] = points.filter((item) => item.extinguisher.computedStatus === status).length;
    return acc;
  }, { em_conformidade: 0, a_vencer: 0, vencido: 0, nao_conformidade: 0, sem_dados: 0 });
  return <div className="space-y-4 rounded-xl border border-[#fed7aa] bg-white p-4"><div><h3 className="text-xl font-bold">Mapa de Localização de Extintores</h3><p className="text-sm text-[#64748b]">{companyName || 'Empresa'} - {plant?.nome || 'Planta não informada'}</p></div><div className="grid gap-2 md:grid-cols-6">{Object.entries(summary).map(([status, value]) => <div key={status} className="rounded-lg border border-[#fed7aa] p-2 text-sm"><span>{extinguisherStatusLabels[status as FireExtinguisherStatus]}</span><strong className="block text-lg">{value}</strong></div>)}</div><div className="relative overflow-hidden rounded-xl border border-[#fed7aa] bg-[#fff7ed]">{plant?.imagem_url ? <img src={plant.imagem_url} alt={plant.nome} className="block h-auto w-full" /> : <div className="grid min-h-[360px] place-items-center text-[#64748b]">Planta não carregada</div>}{points.map(({ point, extinguisher }) => <span key={point.id} className="absolute h-5 min-w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white px-1 text-center text-[8px] font-bold leading-4 text-white shadow" style={{ left: `${point.x_percent}%`, top: `${point.y_percent}%`, backgroundColor: extinguisherStatusColors[extinguisher.computedStatus].dot }}>{extinguisher.codigo}</span>)}</div><div className="flex flex-wrap gap-3 text-sm">{Object.entries(extinguisherStatusColors).map(([status, color]) => <span key={status} className="flex items-center gap-2"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color.dot }} />{extinguisherStatusLabels[status as FireExtinguisherStatus]}</span>)}</div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr className="text-xs uppercase text-[#64748b]"><th className="p-2">Código</th><th className="p-2">Área</th><th className="p-2">Localização</th><th className="p-2">Agente</th><th className="p-2">Capacidade</th><th className="p-2">Próxima recarga</th><th className="p-2">Validade</th><th className="p-2">Status</th></tr></thead><tbody>{points.map(({ point, extinguisher }) => <tr key={point.id} className="border-t"><td className="p-2">{extinguisher.codigo}</td><td className="p-2">{extinguisher.area}</td><td className="p-2">{extinguisher.localizacao_descritiva}</td><td className="p-2">{extinguisher.tipo_agente}</td><td className="p-2">{extinguisher.capacidade || '-'}</td><td className="p-2">{formatDate(extinguisher.data_proxima_recarga)}</td><td className="p-2">{formatDate(extinguisher.data_validade)}</td><td className="p-2">{extinguisherStatusLabels[extinguisher.computedStatus]}</td></tr>)}</tbody></table></div></div>;
}

function ExtinguisherDetails({ item, store, onEdit, onInspect, onNc, onRecharge }: { item: FireExtinguisher & { computedStatus?: FireExtinguisherStatus }; store: FireExtinguisherDataStore; onEdit: () => void; onInspect: () => void; onNc: () => void; onRecharge: () => void }) {
  const inspections = store.inspections.filter((entry) => entry.extintor_id === item.id);
  const ncs = store.nonconformities.filter((entry) => entry.extintor_id === item.id);
  const recharges = store.recharges.filter((entry) => entry.extintor_id === item.id);
  const history = store.history.filter((entry) => entry.extintor_id === item.id);
  return <div className="space-y-5"><div className="grid gap-3 md:grid-cols-4"><Metric label="Código" value={item.codigo} /><Metric label="Área" value={item.area} /><Metric label="Agente" value={item.tipo_agente} /><Metric label="Status" value={extinguisherStatusLabels[item.computedStatus || 'sem_dados']} /></div><div className="grid gap-4 md:grid-cols-2"><InfoBlock title="Visão Geral" items={[['Localização', item.localizacao_descritiva], ['Capacidade', item.capacidade || '-'], ['Próxima recarga', formatDate(item.data_proxima_recarga)], ['Validade', formatDate(item.data_validade)], ['Última inspeção', formatDate(item.data_ultima_inspecao)]]} /><InfoBlock title="Responsáveis e documentos" items={[['Responsável', item.responsavel_inspecao || '-'], ['Empresa manutenção', item.empresa_manutencao || '-'], ['Fornecedor', item.fornecedor || '-'], ['Certificado', item.certificado_url ? 'Anexado' : 'Pendente'], ['Laudo', item.laudo_url ? 'Anexado' : 'Pendente']]} /></div><div className="flex flex-wrap gap-2"><Button onClick={onEdit} variant="outline">Editar</Button><Button onClick={onInspect} variant="outline">Registrar inspeção</Button><Button onClick={onNc} variant="outline">Registrar NC</Button><Button onClick={onRecharge} variant="outline">Registrar recarga</Button></div><List title="Inspeções" items={inspections.map((entry) => `${formatDate(entry.data_inspecao)} - ${entry.status_geral}`)} /><List title="Não Conformidades" items={ncs.map((entry) => `${formatDate(entry.data_identificacao)} - ${entry.tipo} - ${entry.status}`)} /><List title="Recargas" items={recharges.map((entry) => `${formatDate(entry.data_recarga)} - próxima ${formatDate(entry.data_proxima_recarga)}`)} /><List title="Histórico" items={history.map((entry) => `${formatDate(entry.data_evento.slice(0, 10))} - ${entry.tipo_evento}: ${entry.descricao}`)} /></div>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-[#fed7aa] bg-[#fff7ed] p-3"><p className="text-xs uppercase text-[#9a3412]">{label}</p><p className="mt-1 font-bold text-[#0f172a]">{value}</p></div>;
}

function InfoBlock({ title, items }: { title: string; items: Array<[string, string]> }) {
  return <div className="rounded-xl border border-[#fed7aa] p-4"><h3 className="font-bold">{title}</h3><div className="mt-3 space-y-2 text-sm">{items.map(([label, value]) => <div key={label} className="flex justify-between gap-3"><span className="text-[#64748b]">{label}</span><strong className="text-right">{value}</strong></div>)}</div></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border border-[#fed7aa] p-4"><h3 className="font-bold">{title}</h3>{items.length ? <ul className="mt-3 space-y-2 text-sm text-[#475569]">{items.map((item) => <li key={item} className="rounded-lg bg-[#fff7ed] p-2">{item}</li>)}</ul> : <p className="mt-3 text-sm text-[#64748b]">Nenhum registro.</p>}</div>;
}
