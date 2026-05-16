export type FireExtinguisherStatus = 'em_conformidade' | 'a_vencer' | 'vencido' | 'nao_conformidade' | 'sem_dados';
export type FireExtinguisherNcStatus = 'aberta' | 'em_andamento' | 'resolvida' | 'atrasada' | 'cancelada';
export type FireExtinguisherSeverity = 'baixa' | 'media' | 'alta' | 'critica';

export type FireExtinguisher = {
  id: string;
  companyId: string;
  codigo: string;
  numero_patrimonial?: string;
  unidade?: string;
  area: string;
  localizacao_descritiva: string;
  tipo_agente: string;
  capacidade?: string;
  classe_fogo?: string;
  fabricante?: string;
  modelo?: string;
  numero_serie?: string;
  data_fabricacao?: string;
  data_ultima_recarga?: string;
  data_proxima_recarga?: string;
  data_validade?: string;
  data_ultima_inspecao?: string;
  frequencia_inspecao_dias?: number;
  status?: FireExtinguisherStatus;
  status_manual?: FireExtinguisherStatus;
  justificativa_status_manual?: string;
  responsavel_inspecao?: string;
  empresa_manutencao?: string;
  fornecedor?: string;
  certificado_url?: string;
  nota_fiscal_url?: string;
  laudo_url?: string;
  foto_url?: string;
  observacoes?: string;
  archived?: boolean;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherPlant = {
  id: string;
  companyId: string;
  nome: string;
  unidade?: string;
  area?: string;
  imagem_url?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherMapPoint = {
  id: string;
  companyId: string;
  planta_id: string;
  extintor_id: string;
  x_percent: number;
  y_percent: number;
  status_visual?: FireExtinguisherStatus;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherInspection = {
  id: string;
  companyId: string;
  extintor_id: string;
  data_inspecao: string;
  responsavel?: string;
  status_geral: 'conforme' | 'nao_conforme' | 'parcial';
  pressao_ok: boolean;
  lacre_ok: boolean;
  manometro_ok: boolean;
  sinalizacao_ok: boolean;
  acesso_livre: boolean;
  suporte_ok: boolean;
  mangueira_ok: boolean;
  corrosao: boolean;
  etiqueta_inspecao_ok: boolean;
  local_correto: boolean;
  validade_recarga_ok: boolean;
  observacoes?: string;
  foto_url?: string;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherNonconformity = {
  id: string;
  companyId: string;
  extintor_id: string;
  data_identificacao: string;
  tipo: string;
  descricao?: string;
  area?: string;
  status: FireExtinguisherNcStatus;
  gravidade: FireExtinguisherSeverity;
  responsavel_correcao?: string;
  prazo_correcao?: string;
  acao_corretiva?: string;
  evidencia_url?: string;
  data_conclusao?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherRecharge = {
  id: string;
  companyId: string;
  extintor_id: string;
  data_recarga: string;
  data_proxima_recarga: string;
  empresa_responsavel?: string;
  valor?: number;
  certificado_url?: string;
  nota_fiscal_url?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherHistory = {
  id: string;
  companyId: string;
  extintor_id: string;
  tipo_evento: string;
  descricao: string;
  usuario?: string;
  data_evento: string;
  created_at: string;
};

export type FireExtinguisherDataStore = {
  extinguishers: FireExtinguisher[];
  plants: FireExtinguisherPlant[];
  points: FireExtinguisherMapPoint[];
  inspections: FireExtinguisherInspection[];
  nonconformities: FireExtinguisherNonconformity[];
  recharges: FireExtinguisherRecharge[];
  history: FireExtinguisherHistory[];
};

export const extinguisherAgents = ['Pó Químico ABC', 'Água Pressurizada', 'CO2', 'Pó Químico BC', 'Espuma', 'Classe D', 'Classe K'];
export const extinguisherAreas = ['Produção', 'Almoxarifado', 'Administrativo', 'Expedição', 'Manutenção', 'Refeitório', 'Outros'];
export const extinguisherNcTypes = ['Lacre rompido', 'Pressão baixa', 'Manômetro danificado', 'Corrosão', 'Sinalização ausente', 'Acesso obstruído', 'Suporte danificado', 'Mangueira danificada', 'Extintor fora do local', 'Validade vencida', 'Sem etiqueta de inspeção', 'Sem identificação', 'Outro'];

export const extinguisherStatusLabels: Record<FireExtinguisherStatus, string> = {
  em_conformidade: 'Em conformidade',
  a_vencer: 'A vencer em 30 dias',
  vencido: 'Vencido',
  nao_conformidade: 'Não conformidade',
  sem_dados: 'Sem dados',
};

export const extinguisherStatusColors: Record<FireExtinguisherStatus, { bg: string; text: string; border: string; dot: string }> = {
  em_conformidade: { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0', dot: '#22c55e' },
  a_vencer: { bg: '#fffbeb', text: '#92400e', border: '#fde68a', dot: '#facc15' },
  vencido: { bg: '#fef2f2', text: '#991b1b', border: '#fecaca', dot: '#ef4444' },
  nao_conformidade: { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', dot: '#3b82f6' },
  sem_dados: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1', dot: '#94a3b8' },
};

export function daysUntilDate(value?: string) {
  if (!value) return null;
  const target = new Date(`${value}T00:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function calculateExtinguisherStatus(item: FireExtinguisher, nonconformities: FireExtinguisherNonconformity[] = []): FireExtinguisherStatus {
  if (item.status_manual) return item.status_manual;
  const hasOpenNc = nonconformities.some((nc) => nc.extintor_id === item.id && ['aberta', 'em_andamento', 'atrasada'].includes(nc.status));
  if (hasOpenNc) return 'nao_conformidade';

  const rechargeDays = daysUntilDate(item.data_proxima_recarga);
  const validityDays = daysUntilDate(item.data_validade);
  if (rechargeDays === null && validityDays === null) return 'sem_dados';
  if ((rechargeDays !== null && rechargeDays < 0) || (validityDays !== null && validityDays < 0)) return 'vencido';
  if ((rechargeDays !== null && rechargeDays <= 30) || (validityDays !== null && validityDays <= 30)) return 'a_vencer';
  return 'em_conformidade';
}

export function emptyExtinguisherStore(): FireExtinguisherDataStore {
  return { extinguishers: [], plants: [], points: [], inspections: [], nonconformities: [], recharges: [], history: [] };
}

export function createSeedExtinguisherStore(companyId: string): FireExtinguisherDataStore {
  const now = new Date().toISOString();
  const addDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const extinguishers: FireExtinguisher[] = [
    { id: 'ext-1', companyId, codigo: 'EXT-001', area: 'Produção', localizacao_descritiva: 'Entrada da linha 1', tipo_agente: 'Pó Químico ABC', capacidade: '6 kg', classe_fogo: 'ABC', data_ultima_recarga: addDays(-310), data_proxima_recarga: addDays(55), data_validade: addDays(180), data_ultima_inspecao: addDays(-18), frequencia_inspecao_dias: 30, status: 'em_conformidade', created_at: now, updated_at: now },
    { id: 'ext-2', companyId, codigo: 'EXT-002', area: 'Almoxarifado', localizacao_descritiva: 'Corredor central', tipo_agente: 'CO2', capacidade: '4 kg', classe_fogo: 'BC', data_ultima_recarga: addDays(-350), data_proxima_recarga: addDays(18), data_validade: addDays(90), data_ultima_inspecao: addDays(-42), frequencia_inspecao_dias: 30, status: 'a_vencer', created_at: now, updated_at: now },
    { id: 'ext-3', companyId, codigo: 'EXT-003', area: 'Manutenção', localizacao_descritiva: 'Ao lado do painel elétrico', tipo_agente: 'Pó Químico BC', capacidade: '6 kg', classe_fogo: 'BC', data_ultima_recarga: addDays(-410), data_proxima_recarga: addDays(-12), data_validade: addDays(-4), data_ultima_inspecao: addDays(-60), frequencia_inspecao_dias: 30, status: 'vencido', created_at: now, updated_at: now },
    { id: 'ext-4', companyId, codigo: 'EXT-004', area: 'Administrativo', localizacao_descritiva: 'Recepção', tipo_agente: 'Água Pressurizada', capacidade: '10 L', classe_fogo: 'A', data_ultima_recarga: addDays(-200), data_proxima_recarga: addDays(140), data_validade: addDays(280), data_ultima_inspecao: addDays(-8), frequencia_inspecao_dias: 30, status: 'em_conformidade', created_at: now, updated_at: now },
  ];
  const plants: FireExtinguisherPlant[] = [{ id: 'plant-1', companyId, nome: 'Planta geral', unidade: 'Matriz', area: 'Geral', observacoes: 'Planta demonstrativa para posicionamento dos extintores.', created_at: now, updated_at: now }];
  const points: FireExtinguisherMapPoint[] = [
    { id: 'point-1', companyId, planta_id: 'plant-1', extintor_id: 'ext-1', x_percent: 18, y_percent: 34, created_at: now, updated_at: now },
    { id: 'point-2', companyId, planta_id: 'plant-1', extintor_id: 'ext-2', x_percent: 48, y_percent: 52, created_at: now, updated_at: now },
    { id: 'point-3', companyId, planta_id: 'plant-1', extintor_id: 'ext-3', x_percent: 72, y_percent: 38, created_at: now, updated_at: now },
  ];
  const nonconformities: FireExtinguisherNonconformity[] = [{ id: 'nc-ext-1', companyId, extintor_id: 'ext-3', data_identificacao: addDays(-7), tipo: 'Validade vencida', descricao: 'Equipamento com validade vencida e recarga atrasada.', area: 'Manutenção', status: 'aberta', gravidade: 'alta', prazo_correcao: addDays(3), created_at: now, updated_at: now }];
  return { extinguishers, plants, points, inspections: [], nonconformities, recharges: [], history: [] };
}

export function extinguisherStorageKey(companyId: string) {
  return `safety-extinguishers:${companyId}`;
}
