import type {
  Collaborator,
  Inspection,
  InspectionItem,
  Nonconformity,
  NonconformityConclusionValues,
  NonconformityFormValues,
  NonconformityHistoryEntry,
  NonconformityReopenValues,
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

type NonconformityData = NonconformityFormValues & { companyId: string };

function nowIso() {
  return new Date().toISOString();
}

function isMissingTable(error: unknown, table: string) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = [record.message, record.details, record.hint, record.code].filter((value): value is string => typeof value === 'string').join(' ');
  return message.includes(`public.${table}`) || message.includes(`relation "public.${table}" does not exist`) || message.includes('PGRST205');
}

function isOverdue(date?: string) {
  if (!date) return false;
  const due = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

function computeStatus(record: Nonconformity): Nonconformity['status'] {
  if (['resolvida', 'cancelada'].includes(record.status)) return record.status;
  if (isOverdue(record.prazo_correcao)) return 'atrasada';
  return record.status;
}

function mapDocToNonconformity(row: DocumentRow<Partial<Nonconformity>>): Nonconformity {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    titulo: data.titulo || row.documentName,
    descricao: data.descricao || '',
    data_identificacao: data.data_identificacao || '',
    hora_identificacao: data.hora_identificacao || '',
    local: data.local || '',
    setor: data.setor || '',
    colaborador_id: data.colaborador_id || '',
    origem: data.origem || 'observacao_manual',
    origem_id: data.origem_id || '',
    inspecao_id: data.inspecao_id || '',
    item_inspecao_id: data.item_inspecao_id || '',
    gravidade: data.gravidade || 'baixa',
    probabilidade: data.probabilidade || 'baixa',
    nivel_risco: data.nivel_risco || 'baixo',
    risco_associado: data.risco_associado || '',
    evidencia_url: data.evidencia_url || '',
    foto_url: data.foto_url || '',
    responsavel_correcao: data.responsavel_correcao || '',
    prazo_correcao: data.prazo_correcao || '',
    acao_corretiva: data.acao_corretiva || '',
    acao_preventiva: data.acao_preventiva || '',
    causa_provavel: data.causa_provavel || '',
    causa_raiz: data.causa_raiz || '',
    status: data.status || 'aberta',
    data_conclusao: data.data_conclusao || '',
    validado_por: data.validado_por || '',
    observacoes: data.observacoes || '',
    correcao_realizada: data.correcao_realizada || '',
    evidencia_correcao_url: data.evidencia_correcao_url || '',
    data_validacao: data.data_validacao || '',
    validacao_status: data.validacao_status || 'pendente',
    motivo_reabertura: data.motivo_reabertura || '',
    historico: data.historico || [],
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
    .insert({ companyId, documentType, documentName, status: 'draft', formData, analysisData: null, equipmentData: null, signatureDocumentId: null, createdAt: now, updatedAt: now })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

async function updateDocument(id: string, companyId: string, documentName: string, formData: object) {
  const { error } = await createSupabaseAdminClient()
    .from('documents')
    .update({ documentName, formData, updatedAt: nowIso() })
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', 'nonconformity');
  if (error) throw error;
}

function appendHistory(current: NonconformityHistoryEntry[] | undefined, action: string, description?: string) {
  return [...(current || []), { at: nowIso(), action, description }];
}

function attachCollaborator(records: Nonconformity[], collaborators: Collaborator[]) {
  return records.map((record) => ({
    ...record,
    status: computeStatus(record),
    colaborador: collaborators.find((collaborator) => collaborator.id === record.colaborador_id) || null,
  }));
}

export const NonconformityRepository = {
  async getAll(companyId: string): Promise<Nonconformity[]> {
    const collaborators = await CollaboratorRepository.getAllByCompany(companyId);
    const { data, error } = await createSupabaseAdminClient()
      .from('nao_conformidades')
      .select('*')
      .eq('companyId', companyId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error && !isMissingTable(error, 'nao_conformidades')) throw error;
    const records = error
      ? (await getDocuments<Partial<Nonconformity>>(companyId, 'nonconformity')).map(mapDocToNonconformity).filter((item) => !item.archived_at)
      : ((data ?? []) as Nonconformity[]);
    return attachCollaborator(records, collaborators);
  },

  async getBundle(companyId: string) {
    const [collaborators, nonconformities] = await Promise.all([
      CollaboratorRepository.getAllByCompany(companyId),
      this.getAll(companyId),
    ]);
    return { collaborators, nonconformities };
  },

  buildFromInspection(companyId: string, inspection: Inspection, item: InspectionItem): NonconformityData {
    const riskToSeverity = item.grau_risco === 'critico' ? 'critica' : item.grau_risco === 'alto' ? 'alta' : item.grau_risco === 'medio' ? 'media' : 'baixa';
    return {
      companyId,
      titulo: item.pergunta,
      descricao: item.observacao || `Item nao conforme identificado durante a inspecao: ${item.pergunta}`,
      data_identificacao: inspection.data_inspecao || new Date().toISOString().slice(0, 10),
      hora_identificacao: inspection.hora_inspecao || '',
      local: inspection.local,
      setor: inspection.setor,
      colaborador_id: '',
      origem: 'inspecao',
      origem_id: inspection.id,
      inspecao_id: inspection.id,
      item_inspecao_id: item.id,
      gravidade: riskToSeverity,
      probabilidade: item.grau_risco === 'critico' || item.grau_risco === 'alto' ? 'alta' : 'media',
      nivel_risco: item.grau_risco,
      risco_associado: item.categoria || '',
      evidencia_url: item.anexo_url || '',
      foto_url: item.foto_url || '',
      responsavel_correcao: item.responsavel_correcao || inspection.responsavel_correcao || '',
      prazo_correcao: item.prazo_correcao || inspection.prazo_correcao || '',
      acao_corretiva: item.acao_recomendada || '',
      acao_preventiva: '',
      causa_provavel: '',
      causa_raiz: '',
      status: 'aberta',
      data_conclusao: '',
      validado_por: '',
      observacoes: '',
      correcao_realizada: '',
      evidencia_correcao_url: '',
      data_validacao: '',
      validacao_status: 'pendente',
      motivo_reabertura: '',
    };
  },

  async create(data: NonconformityData): Promise<string> {
    const now = nowIso();
    const historico = appendHistory([], 'criacao', 'Nao conformidade registrada.');
    const payload = { ...data, historico, created_at: now, updated_at: now, archived_at: null };
    const { data: created, error } = await createSupabaseAdminClient()
      .from('nao_conformidades')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'nao_conformidades')) return createDocument(data.companyId, 'nonconformity', data.titulo, payload);
      throw error;
    }
    return created.id as string;
  },

  async update(id: string, data: NonconformityData): Promise<void> {
    const now = nowIso();
    const { error } = await createSupabaseAdminClient()
      .from('nao_conformidades')
      .update({ ...data, updated_at: now })
      .eq('id', id)
      .eq('companyId', data.companyId);
    if (error) {
      if (isMissingTable(error, 'nao_conformidades')) {
        const rows = await getDocuments<Partial<Nonconformity>>(data.companyId, 'nonconformity');
        const row = rows.find((item) => item.id === id);
        await updateDocument(id, data.companyId, data.titulo, { ...(row?.formData ?? {}), ...data, updated_at: now });
        return;
      }
      throw error;
    }
  },

  async conclude(id: string, companyId: string, values: NonconformityConclusionValues): Promise<void> {
    const now = nowIso();
    const current = (await this.getAll(companyId)).find((item) => item.id === id);
    const payload = {
      ...values,
      status: 'resolvida',
      historico: appendHistory(current?.historico, 'conclusao', values.correcao_realizada),
      updated_at: now,
    };
    const { error } = await createSupabaseAdminClient()
      .from('nao_conformidades')
      .update(payload)
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'nao_conformidades')) {
        const rows = await getDocuments<Partial<Nonconformity>>(companyId, 'nonconformity');
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, row.documentName, { ...(row.formData ?? {}), ...payload });
        return;
      }
      throw error;
    }
  },

  async reopen(id: string, companyId: string, values: NonconformityReopenValues): Promise<void> {
    const now = nowIso();
    const current = (await this.getAll(companyId)).find((item) => item.id === id);
    const payload = {
      ...values,
      status: 'em_correcao',
      validacao_status: 'pendente',
      historico: appendHistory(current?.historico, 'reabertura', values.motivo_reabertura),
      updated_at: now,
    };
    const { error } = await createSupabaseAdminClient()
      .from('nao_conformidades')
      .update(payload)
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'nao_conformidades')) {
        const rows = await getDocuments<Partial<Nonconformity>>(companyId, 'nonconformity');
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, row.documentName, { ...(row.formData ?? {}), ...payload });
        return;
      }
      throw error;
    }
  },

  async archive(id: string, companyId: string): Promise<void> {
    const now = nowIso();
    const current = (await this.getAll(companyId)).find((item) => item.id === id);
    const payload = {
      status: 'cancelada',
      archived_at: now,
      updated_at: now,
      historico: appendHistory(current?.historico, 'cancelamento', 'Nao conformidade arquivada/cancelada.'),
    };
    const { error } = await createSupabaseAdminClient()
      .from('nao_conformidades')
      .update(payload)
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'nao_conformidades')) {
        const rows = await getDocuments<Partial<Nonconformity>>(companyId, 'nonconformity');
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, row.documentName, { ...(row.formData ?? {}), ...payload });
        return;
      }
      throw error;
    }
  },
};
