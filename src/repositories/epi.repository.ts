import type {
  Collaborator,
  Epi,
  EpiByFunction,
  EpiDelivery,
  EpiDeliveryFormValues,
  EpiFormValues,
  EpiRequiredItem,
} from '@/lib/types';
import { CollaboratorRepository } from '@/repositories/collaborator.repository';
import { createSupabaseAdminClient } from '@/supabase/server';

type DocumentRow<T> = {
  id: string;
  documentName: string;
  formData: T | null;
  createdAt: string;
  updatedAt: string;
};

type EpiData = EpiFormValues & { companyId: string };
type EpiDeliveryData = EpiDeliveryFormValues & { companyId: string };

const DEFAULT_EPIS: Array<Omit<Epi, 'id' | 'companyId' | 'created_at' | 'updated_at'>> = [
  { nome: 'Capacete de seguranca', descricao: 'Protecao contra impactos e queda de objetos.', categoria: 'Protecao da cabeca', ca: '', validade_ca: '', prazo_troca_dias: 365, ativo: true },
  { nome: 'Capacete com jugular', descricao: 'Capacete com jugular para atividades com risco de queda ou altura.', categoria: 'Protecao da cabeca', ca: '', validade_ca: '', prazo_troca_dias: 365, ativo: true },
  { nome: 'Oculos de protecao', descricao: 'Protecao ocular contra particulas e respingos.', categoria: 'Protecao dos olhos', ca: '', validade_ca: '', prazo_troca_dias: 180, ativo: true },
  { nome: 'Protetor auricular', descricao: 'Protecao auditiva para areas com ruido.', categoria: 'Protecao auditiva', ca: '', validade_ca: '', prazo_troca_dias: 90, ativo: true },
  { nome: 'Luva de protecao', descricao: 'Protecao das maos conforme atividade.', categoria: 'Protecao das maos', ca: '', validade_ca: '', prazo_troca_dias: 60, ativo: true },
  { nome: 'Luva isolante', descricao: 'Luva isolante para atividades eletricas.', categoria: 'Protecao eletrica', ca: '', validade_ca: '', prazo_troca_dias: 180, ativo: true },
  { nome: 'Botina de seguranca', descricao: 'Calcado de seguranca para protecao dos pes.', categoria: 'Protecao dos pes', ca: '', validade_ca: '', prazo_troca_dias: 180, ativo: true },
  { nome: 'Cinto de seguranca', descricao: 'Cinto tipo paraquedista para trabalho em altura.', categoria: 'Trabalho em altura', ca: '', validade_ca: '', prazo_troca_dias: 365, ativo: true },
  { nome: 'Mascara respiratoria', descricao: 'Protecao respiratoria contra poeiras, fumos ou vapores.', categoria: 'Protecao respiratoria', ca: '', validade_ca: '', prazo_troca_dias: 90, ativo: true },
  { nome: 'Protetor facial', descricao: 'Protecao facial contra particulas, arco eletrico ou respingos.', categoria: 'Protecao facial', ca: '', validade_ca: '', prazo_troca_dias: 180, ativo: true },
  { nome: 'Avental de protecao', descricao: 'Avental conforme risco da atividade.', categoria: 'Protecao do tronco', ca: '', validade_ca: '', prazo_troca_dias: 180, ativo: true },
  { nome: 'Vestimenta antichama', descricao: 'Vestimenta para atividades com risco de arco eletrico ou fogo repentino.', categoria: 'Protecao eletrica', ca: '', validade_ca: '', prazo_troca_dias: 365, ativo: true },
];

const DEFAULT_FUNCTION_RULES: Record<string, string[]> = {
  eletricista: ['Capacete com jugular', 'Luva isolante', 'Botina de seguranca', 'Oculos de protecao', 'Vestimenta antichama', 'Protetor facial', 'Cinto de seguranca'],
  pedreiro: ['Capacete de seguranca', 'Botina de seguranca', 'Luva de protecao', 'Oculos de protecao', 'Protetor auricular', 'Mascara respiratoria'],
  operador: ['Botina de seguranca', 'Oculos de protecao', 'Protetor auricular', 'Luva de protecao', 'Capacete de seguranca'],
};

function nowIso() {
  return new Date().toISOString();
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function isMissingTable(error: unknown, table: string) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = [record.message, record.details, record.hint, record.code]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return message.includes(`public.${table}`) || message.includes(`relation "public.${table}" does not exist`) || message.includes('PGRST205');
}

function defaultEpis(companyId: string): Epi[] {
  const now = nowIso();
  return DEFAULT_EPIS.map((epi, index) => ({
    ...epi,
    id: `default-${index + 1}-${normalize(epi.nome).replace(/[^a-z0-9]+/g, '-')}`,
    companyId,
    created_at: now,
    updated_at: now,
  }));
}

function mapDocToEpi(row: DocumentRow<Partial<Epi>>): Epi {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    nome: data.nome || row.documentName,
    descricao: data.descricao || '',
    categoria: data.categoria || '',
    ca: data.ca || '',
    validade_ca: data.validade_ca || '',
    valor_unitario: data.valor_unitario ?? undefined,
    fornecedor: data.fornecedor || '',
    data_compra: data.data_compra || '',
    prazo_troca_dias: data.prazo_troca_dias ?? 0,
    ativo: data.ativo ?? true,
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
  };
}

function mapDocToMapping(row: DocumentRow<Partial<EpiByFunction>>): EpiByFunction {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    funcao: data.funcao || row.documentName,
    epi_id: data.epi_id || '',
    obrigatorio: data.obrigatorio ?? true,
    observacao: data.observacao || '',
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
  };
}

function mapDocToDelivery(row: DocumentRow<Partial<EpiDelivery>>): EpiDelivery {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    colaborador_id: data.colaborador_id || '',
    epi_id: data.epi_id || '',
    data_entrega: data.data_entrega || '',
    data_validade: data.data_validade || '',
    data_proxima_troca: data.data_proxima_troca || '',
    quantidade: data.quantidade || 1,
    responsavel_entrega: data.responsavel_entrega || '',
    status: data.status || 'entregue',
    assinatura_url: data.assinatura_url || '',
    comprovante_url: data.comprovante_url || '',
    observacoes: data.observacoes || '',
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
    archived_at: data.archived_at || null,
  };
}

async function getDocuments<T>(companyId: string, documentType: string): Promise<Array<DocumentRow<T>>> {
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .select('id, documentName, formData, createdAt, updatedAt')
    .eq('companyId', companyId)
    .eq('documentType', documentType)
    .order('updatedAt', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<DocumentRow<T>>;
}

async function createDocument(companyId: string, documentType: string, documentName: string, formData: object) {
  const now = nowIso();
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .insert({
      companyId,
      documentType,
      documentName,
      status: 'draft',
      formData,
      analysisData: null,
      equipmentData: null,
      signatureDocumentId: null,
      createdAt: now,
      updatedAt: now,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function updateDocument(id: string, companyId: string, documentType: string, documentName: string, formData: object) {
  const { error } = await createSupabaseAdminClient()
    .from('documents')
    .update({ documentName, formData, updatedAt: nowIso() })
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', documentType);
  if (error) throw error;
}

function attachDeliveryRelations(deliveries: EpiDelivery[], collaborators: Collaborator[], epis: Epi[]) {
  return deliveries.map((delivery) => ({
    ...delivery,
    colaborador: collaborators.find((collaborator) => collaborator.id === delivery.colaborador_id) || null,
    epi: epis.find((epi) => epi.id === delivery.epi_id) || null,
  }));
}

function computeStatus(delivery: EpiDelivery): EpiDelivery['status'] {
  if (['cancelado', 'devolvido', 'substituido', 'pendente'].includes(delivery.status)) return delivery.status;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nextDate = delivery.data_proxima_troca || delivery.data_validade;
  if (!nextDate) return delivery.status;
  const date = new Date(nextDate);
  if (date < today) return 'vencido';
  const diffDays = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (diffDays <= 30) return 'proximo_troca';
  return delivery.status;
}

export const EpiRepository = {
  async getEpis(companyId: string): Promise<Epi[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('epis')
      .select('*')
      .eq('companyId', companyId)
      .order('created_at', { ascending: false });

    if (error && !isMissingTable(error, 'epis')) throw error;
    const saved = error ? (await getDocuments<Partial<Epi>>(companyId, 'epi_catalog')).map(mapDocToEpi) : ((data ?? []) as Epi[]);
    const defaults = defaultEpis(companyId);
    const existing = new Set(saved.map((epi) => normalize(epi.nome)));
    return [...saved, ...defaults.filter((epi) => !existing.has(normalize(epi.nome)))];
  },

  async getMappings(companyId: string): Promise<EpiByFunction[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('epis_por_funcao')
      .select('*')
      .eq('companyId', companyId);
    if (error && !isMissingTable(error, 'epis_por_funcao')) throw error;
    return error ? (await getDocuments<Partial<EpiByFunction>>(companyId, 'epi_function')).map(mapDocToMapping) : ((data ?? []) as EpiByFunction[]);
  },

  async getDeliveries(companyId: string): Promise<EpiDelivery[]> {
    const [collaborators, epis] = await Promise.all([
      CollaboratorRepository.getAllByCompany(companyId),
      this.getEpis(companyId),
    ]);
    const { data, error } = await createSupabaseAdminClient()
      .from('entregas_epi')
      .select('*')
      .eq('companyId', companyId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error && !isMissingTable(error, 'entregas_epi')) throw error;
    const deliveries = error
      ? (await getDocuments<Partial<EpiDelivery>>(companyId, 'epi_delivery')).map(mapDocToDelivery).filter((delivery) => !delivery.archived_at)
      : ((data ?? []) as EpiDelivery[]);
    return attachDeliveryRelations(deliveries.map((delivery) => ({ ...delivery, status: computeStatus(delivery) })), collaborators, epis);
  },

  async getBundle(companyId: string) {
    const [collaborators, epis, mappings, deliveries] = await Promise.all([
      CollaboratorRepository.getAllByCompany(companyId),
      this.getEpis(companyId),
      this.getMappings(companyId),
      this.getDeliveries(companyId),
    ]);
    return { collaborators, epis, mappings, deliveries };
  },

  getRequiredEpis(collaborator: Collaborator, epis: Epi[], mappings: EpiByFunction[]): EpiRequiredItem[] {
    const functionKey = normalize(collaborator.funcao);
    const byId = new Map(epis.map((epi) => [epi.id, epi]));
    const byName = new Map(epis.map((epi) => [normalize(epi.nome), epi]));
    const required = new Map<string, EpiRequiredItem>();

    mappings
      .filter((mapping) => normalize(mapping.funcao) === functionKey)
      .forEach((mapping) => {
        const epi = byId.get(mapping.epi_id);
        if (epi) required.set(epi.id, { epi, obrigatorio: mapping.obrigatorio, observacao: mapping.observacao, source: 'funcao' });
      });

    Object.entries(DEFAULT_FUNCTION_RULES).forEach(([key, names]) => {
      if (!functionKey.includes(key)) return;
      names.forEach((name) => {
        const epi = byName.get(normalize(name));
        if (epi && !required.has(epi.id)) required.set(epi.id, { epi, obrigatorio: true, observacao: 'Regra padrao por funcao.', source: 'padrao' });
      });
    });

    collaborator.ai_recommendations?.epi_obrigatorios.forEach((name) => {
      const epi = byName.get(normalize(name)) || epis.find((item) => normalize(name).includes(normalize(item.nome)) || normalize(item.nome).includes(normalize(name)));
      if (epi && !required.has(epi.id)) required.set(epi.id, { epi, obrigatorio: true, observacao: 'Sugerido pela IA na ficha do colaborador.', source: 'ia' });
    });

    return Array.from(required.values());
  },

  async createEpi(data: EpiData): Promise<string> {
    const now = nowIso();
    const { data: created, error } = await createSupabaseAdminClient()
      .from('epis')
      .insert({ ...data, created_at: now, updated_at: now })
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'epis')) {
        return createDocument(data.companyId, 'epi_catalog', data.nome, { ...data, created_at: now, updated_at: now });
      }
      throw error;
    }
    return created.id;
  },

  async createDelivery(data: EpiDeliveryData): Promise<string> {
    const now = nowIso();
    const { data: created, error } = await createSupabaseAdminClient()
      .from('entregas_epi')
      .insert({ ...data, created_at: now, updated_at: now, archived_at: null })
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'entregas_epi')) {
        return createDocument(data.companyId, 'epi_delivery', `${data.colaborador_id}-${data.epi_id}`, { ...data, created_at: now, updated_at: now, archived_at: null });
      }
      throw error;
    }
    return created.id;
  },

  async updateDelivery(id: string, data: EpiDeliveryData): Promise<void> {
    const now = nowIso();
    const { error } = await createSupabaseAdminClient()
      .from('entregas_epi')
      .update({ ...data, updated_at: now })
      .eq('id', id)
      .eq('companyId', data.companyId);
    if (error) {
      if (isMissingTable(error, 'entregas_epi')) {
        await updateDocument(id, data.companyId, 'epi_delivery', `${data.colaborador_id}-${data.epi_id}`, { ...data, updated_at: now });
        return;
      }
      throw error;
    }
  },

  async archiveDelivery(id: string, companyId: string): Promise<void> {
    const now = nowIso();
    const { error } = await createSupabaseAdminClient()
      .from('entregas_epi')
      .update({ status: 'cancelado', archived_at: now, updated_at: now })
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'entregas_epi')) {
        const rows = await getDocuments<Partial<EpiDelivery>>(companyId, 'epi_delivery');
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, 'epi_delivery', row.documentName, { ...(row.formData ?? {}), status: 'cancelado', archived_at: now, updated_at: now });
        return;
      }
      throw error;
    }
  },
};
