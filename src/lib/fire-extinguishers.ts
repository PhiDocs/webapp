export type FireExtinguisherStatus = 'em_conformidade' | 'a_vencer' | 'vencido' | 'nao_conformidade' | 'sem_dados';
export type FireExtinguisherNcStatus = 'aberta' | 'em_andamento' | 'resolvida' | 'atrasada' | 'cancelada';
export type FireExtinguisherSeverity = 'baixa' | 'media' | 'alta' | 'critica';
export type FireExtinguisherInspectionStatus = 'conforme' | 'conforme_com_observacao' | 'nao_conforme' | 'critico';
export type FireExtinguisherInspectionAnswer = 'conforme' | 'nao_conforme' | 'nao_aplica';
export type FireExtinguisherPhotoType = 'frontal' | 'lacre' | 'manometro' | 'etiqueta' | 'sinalizacao' | 'local' | 'acesso' | 'nao_conformidade' | 'correcao' | 'outro';
export type FireExtinguisherPhotoOrigin = 'cadastro' | 'inspecao' | 'nao_conformidade' | 'recarga' | 'correcao';
export type FireExtinguisherPhotoCaptureOrigin = 'camera' | 'upload' | 'sistema';
export type FireExtinguisherDocumentType = 'certificado_recarga' | 'laudo_manutencao' | 'nota_fiscal' | 'foto_etiqueta' | 'relatorio_inspecao' | 'relatorio_nao_conformidade' | 'outros';
export type FireExtinguisherPhotoPolicy = 'opcional' | 'obrigatoria_nc' | 'obrigatoria_toda_inspecao';

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
  foto_principal_id?: string;
  qr_code_url?: string;
  data_proxima_inspecao?: string;
  latitude?: number;
  longitude?: number;
  photo_policy?: FireExtinguisherPhotoPolicy;
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
  status_geral: FireExtinguisherInspectionStatus | 'parcial';
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
  assinatura_url?: string;
  latitude?: number;
  longitude?: number;
  finalizada?: boolean;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherInspectionItem = {
  id: string;
  companyId: string;
  inspecao_id: string;
  extintor_id: string;
  pergunta: string;
  resposta: FireExtinguisherInspectionAnswer;
  gravidade: FireExtinguisherSeverity;
  observacao?: string;
  foto_url?: string;
  gera_nao_conformidade?: boolean;
  critical_key?: string;
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
  evidencia_correcao_url?: string;
  data_conclusao?: string;
  validado_por?: string;
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
  laudo_url?: string;
  foto_etiqueta_url?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherPhoto = {
  id: string;
  companyId: string;
  extintor_id: string;
  tipo_foto: FireExtinguisherPhotoType;
  arquivo_url: string;
  descricao?: string;
  origem: FireExtinguisherPhotoOrigin;
  origem_id?: string;
  usuario_id?: string;
  usuario_nome?: string;
  inspecao_id?: string;
  data_captura?: string;
  data_upload?: string;
  latitude?: number;
  longitude?: number;
  origem_captura?: FireExtinguisherPhotoCaptureOrigin;
  bloqueada_para_edicao?: boolean;
  removida_em?: string;
  removida_por?: string;
  principal?: boolean;
  created_at: string;
  updated_at: string;
};

export type FireExtinguisherDocument = {
  id: string;
  companyId: string;
  extintor_id: string;
  nome: string;
  tipo: FireExtinguisherDocumentType;
  data: string;
  validade?: string;
  arquivo_url: string;
  observacao?: string;
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
  inspectionItems: FireExtinguisherInspectionItem[];
  nonconformities: FireExtinguisherNonconformity[];
  recharges: FireExtinguisherRecharge[];
  photos: FireExtinguisherPhoto[];
  documents: FireExtinguisherDocument[];
  history: FireExtinguisherHistory[];
};

export const extinguisherAgents = ['Pó Químico ABC', 'Água Pressurizada', 'CO2', 'Pó Químico BC', 'Espuma', 'Classe D', 'Classe K'];
export const extinguisherAreas = ['Produção', 'Almoxarifado', 'Administrativo', 'Expedição', 'Manutenção', 'Refeitório', 'Outros'];
export const extinguisherNcTypes = ['Lacre rompido', 'Pressão baixa', 'Manômetro danificado', 'Corrosão', 'Sinalização ausente', 'Acesso obstruído', 'Suporte danificado', 'Mangueira danificada', 'Extintor fora do local', 'Validade vencida', 'Sem etiqueta de inspeção', 'Sem identificação', 'Outro'];

export const extinguisherPhotoTypes: Record<FireExtinguisherPhotoType, string> = {
  frontal: 'Foto frontal do extintor',
  lacre: 'Foto do lacre',
  manometro: 'Foto do manômetro',
  etiqueta: 'Foto da etiqueta/validade',
  sinalizacao: 'Foto da sinalização',
  local: 'Foto do local instalado',
  acesso: 'Foto do acesso ao extintor',
  nao_conformidade: 'Foto da não conformidade',
  correcao: 'Foto da correção',
  outro: 'Outro',
};

export const extinguisherDocumentTypes: Record<FireExtinguisherDocumentType, string> = {
  certificado_recarga: 'Certificado de recarga',
  laudo_manutencao: 'Laudo de manutenção',
  nota_fiscal: 'Nota fiscal',
  foto_etiqueta: 'Foto da etiqueta',
  relatorio_inspecao: 'Relatório de inspeção',
  relatorio_nao_conformidade: 'Relatório de não conformidade',
  outros: 'Outros',
};

export const extinguisherInspectionChecklist = [
  { key: 'local_correto', pergunta: 'Extintor está no local correto?', critical: true, ncType: 'Extintor fora do local', action: 'Reposicionar o extintor no local correto e atualizar a sinalização da área.' },
  { key: 'acesso_livre', pergunta: 'Acesso está livre/desobstruído?', critical: true, ncType: 'Acesso obstruído', action: 'Remover obstrução e orientar responsáveis pela área.' },
  { key: 'sinalizacao_ok', pergunta: 'Sinalização está visível?', critical: true, ncType: 'Sinalização ausente', action: 'Instalar sinalização adequada de identificação do extintor.' },
  { key: 'suporte_ok', pergunta: 'Suporte está adequado?', critical: false, ncType: 'Suporte danificado', action: 'Corrigir ou substituir o suporte do equipamento.' },
  { key: 'lacre_ok', pergunta: 'Lacre está íntegro?', critical: true, ncType: 'Lacre rompido', action: 'Substituir lacre e verificar integridade do extintor.' },
  { key: 'pino_ok', pergunta: 'Pino de segurança está presente?', critical: true, ncType: 'Sem identificação', action: 'Instalar pino de segurança e revisar o equipamento.' },
  { key: 'manometro_ok', pergunta: 'Manômetro está na faixa verde?', critical: true, ncType: 'Pressão baixa', action: 'Encaminhar extintor para manutenção/recarga.' },
  { key: 'mangueira_ok', pergunta: 'Mangueira está em bom estado?', critical: false, ncType: 'Mangueira danificada', action: 'Substituir mangueira ou encaminhar equipamento para manutenção.' },
  { key: 'bico_ok', pergunta: 'Bico/esguicho está em bom estado?', critical: false, ncType: 'Mangueira danificada', action: 'Substituir bico/esguicho danificado.' },
  { key: 'corrosao', pergunta: 'Cilindro apresenta corrosão?', critical: true, ncType: 'Corrosão', action: 'Retirar de uso e encaminhar para avaliação técnica.' },
  { key: 'identificacao_ok', pergunta: 'Pintura/identificação está legível?', critical: false, ncType: 'Sem identificação', action: 'Repor identificação e etiqueta do extintor.' },
  { key: 'etiqueta_inspecao_ok', pergunta: 'Etiqueta de inspeção está presente?', critical: false, ncType: 'Sem etiqueta de inspeção', action: 'Inserir etiqueta de inspeção atualizada.' },
  { key: 'validade_recarga_ok', pergunta: 'Data de recarga está válida?', critical: true, ncType: 'Validade vencida', action: 'Registrar recarga ou retirar de uso.' },
  { key: 'validade_ok', pergunta: 'Data de validade está válida?', critical: true, ncType: 'Validade vencida', action: 'Encaminhar extintor para manutenção/recarga.' },
  { key: 'classe_ok', pergunta: 'Classe/agente extintor está adequado ao local?', critical: false, ncType: 'Outro', action: 'Reavaliar classe de fogo e agente extintor da área.' },
  { key: 'conservacao_ok', pergunta: 'Extintor está limpo e conservado?', critical: false, ncType: 'Outro', action: 'Realizar limpeza e conservação do equipamento.' },
] as const;

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
  return { extinguishers: [], plants: [], points: [], inspections: [], inspectionItems: [], nonconformities: [], recharges: [], photos: [], documents: [], history: [] };
}

export function normalizeExtinguisherStore(store: Partial<FireExtinguisherDataStore>): FireExtinguisherDataStore {
  return {
    extinguishers: store.extinguishers || [],
    plants: store.plants || [],
    points: store.points || [],
    inspections: store.inspections || [],
    inspectionItems: store.inspectionItems || [],
    nonconformities: store.nonconformities || [],
    recharges: store.recharges || [],
    photos: store.photos || [],
    documents: store.documents || [],
    history: store.history || [],
  };
}

export function addDaysToDate(value: string, days: number) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getNextInspectionDate(item: FireExtinguisher) {
  if (!item.data_ultima_inspecao) return '';
  return addDaysToDate(item.data_ultima_inspecao, item.frequencia_inspecao_dias || 30);
}

export function getInspectionStatus(item: FireExtinguisher) {
  const nextDate = item.data_proxima_inspecao || getNextInspectionDate(item);
  const days = daysUntilDate(nextDate);
  if (days === null) return 'Sem inspeção';
  if (days < 0) return 'Inspeção atrasada';
  if (days <= 7) return 'Inspeção próxima';
  return 'Inspeção em dia';
}

export function getRecommendedAction(item: FireExtinguisher, status: FireExtinguisherStatus, hasMapPoint: boolean, hasPhoto: boolean, hasQrCode: boolean) {
  if (status === 'vencido') return { problem: 'Extintor vencido', severity: 'critica' as FireExtinguisherSeverity, action: 'Registrar recarga ou retirar de uso.' };
  if (status === 'a_vencer') return { problem: 'A vencer em 30 dias', severity: 'alta' as FireExtinguisherSeverity, action: 'Agendar recarga.' };
  if (status === 'nao_conformidade') return { problem: 'Com não conformidade', severity: 'alta' as FireExtinguisherSeverity, action: 'Corrigir não conformidade.' };
  if (!item.data_ultima_inspecao || getInspectionStatus(item) === 'Inspeção atrasada') return { problem: 'Sem inspeção recente', severity: 'media' as FireExtinguisherSeverity, action: 'Realizar inspeção.' };
  if (!hasMapPoint) return { problem: 'Sem localização no mapa', severity: 'media' as FireExtinguisherSeverity, action: 'Posicionar no mapa.' };
  if (!hasPhoto) return { problem: 'Sem foto', severity: 'baixa' as FireExtinguisherSeverity, action: 'Adicionar foto do equipamento.' };
  if (!hasQrCode) return { problem: 'Sem QR Code', severity: 'baixa' as FireExtinguisherSeverity, action: 'Gerar QR Code.' };
  if (!item.data_proxima_recarga) return { problem: 'Sem data de recarga', severity: 'media' as FireExtinguisherSeverity, action: 'Registrar próxima recarga.' };
  return null;
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
  return normalizeExtinguisherStore({ extinguishers, plants, points, inspections: [], nonconformities, recharges: [], history: [] });
}

export function extinguisherStorageKey(companyId: string) {
  return `safety-extinguishers:${companyId}`;
}
