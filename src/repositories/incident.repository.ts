import type {
  Collaborator,
  Incident,
  IncidentAction,
  IncidentActionFormValues,
  IncidentConclusionValues,
  IncidentFormValues,
  IncidentHistoryEntry,
  IncidentWitness,
  IncidentWitnessFormValues,
  NonconformityFormValues,
} from '@/lib/types';
import { CollaboratorRepository } from '@/repositories/collaborator.repository';
import { createSupabaseAdminClient } from '@/supabase/server';

type IncidentData = IncidentFormValues & { companyId: string };

type DocumentRow<T> = {
  id: string;
  documentName: string;
  formData: T | null;
  createdAt: string;
  updatedAt: string;
};

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

function computeStatus(record: Incident): Incident['status'] {
  if (['concluido', 'cancelado'].includes(record.status)) return record.status;
  if (isOverdue(record.prazo_investigacao)) return 'aguardando_acao';
  return record.status;
}

function computeActionStatus(action: IncidentAction): IncidentAction['status'] {
  if (['concluida', 'cancelada', 'atrasada'].includes(action.status)) return action.status;
  return isOverdue(action.prazo) ? 'atrasada' : action.status;
}

function appendHistory(current: IncidentHistoryEntry[] | undefined, action: string, description?: string) {
  return [...(current || []), { at: nowIso(), action, description }];
}

function normalizeWitnesses(items?: IncidentWitnessFormValues[]): IncidentWitnessFormValues[] {
  return (items || []).filter((item) => [item.nome, item.contato, item.funcao, item.relato].some((value) => value?.trim()));
}

function normalizeActions(items?: IncidentActionFormValues[]): IncidentActionFormValues[] {
  return (items || []).filter((item) => item.descricao?.trim() || item.responsavel?.trim() || item.prazo || item.observacoes?.trim());
}

function splitPayload(data: IncidentData) {
  const { testemunhas, acoes, ...incident } = data;
  return {
    incident,
    testemunhas: normalizeWitnesses(testemunhas),
    acoes: normalizeActions(acoes),
  };
}

function attachCollaborators(records: Incident[], collaborators: Collaborator[]) {
  return records.map((record) => ({
    ...record,
    status: computeStatus(record),
    acoes: record.acoes?.map((action) => ({ ...action, status: computeActionStatus(action) })) || [],
    colaborador: collaborators.find((collaborator) => collaborator.id === record.colaborador_id) || null,
  }));
}

function buildDocumentIncident(row: DocumentRow<Partial<IncidentData & Incident>>): Incident {
  const data = row.formData ?? {};
  const base = {
    id: row.id,
    companyId: data.companyId || '',
    titulo: data.titulo || row.documentName,
    tipo_ocorrencia: data.tipo_ocorrencia || 'incidente_sem_lesao',
    data_ocorrencia: data.data_ocorrencia || '',
    hora_ocorrencia: data.hora_ocorrencia || '',
    local: data.local || '',
    setor: data.setor || '',
    colaborador_id: data.colaborador_id || '',
    descricao: data.descricao || '',
    atividade_realizada: data.atividade_realizada || '',
    houve_lesao: Boolean(data.houve_lesao),
    tipo_lesao: data.tipo_lesao || '',
    parte_corpo_atingida: data.parte_corpo_atingida || '',
    houve_afastamento: Boolean(data.houve_afastamento),
    dias_afastamento: data.dias_afastamento || 0,
    houve_dano_material: Boolean(data.houve_dano_material),
    descricao_dano_material: data.descricao_dano_material || '',
    gravidade: data.gravidade || 'baixa',
    probabilidade: data.probabilidade || 'baixa',
    nivel_risco: data.nivel_risco || 'baixo',
    causa_imediata: data.causa_imediata || '',
    causa_raiz: data.causa_raiz || '',
    medidas_imediatas: data.medidas_imediatas || '',
    acao_corretiva: data.acao_corretiva || '',
    acao_preventiva: data.acao_preventiva || '',
    responsavel_investigacao: data.responsavel_investigacao || '',
    prazo_investigacao: data.prazo_investigacao || '',
    status: data.status || 'aberto',
    data_conclusao: data.data_conclusao || '',
    evidencia_url: data.evidencia_url || '',
    foto_url: data.foto_url || '',
    observacoes: data.observacoes || '',
    resumo_investigacao: data.resumo_investigacao || '',
    causa_raiz_confirmada: data.causa_raiz_confirmada || '',
    correcao_realizada: data.correcao_realizada || '',
    prevencao_recomendada: data.prevencao_recomendada || '',
    responsavel_conclusao: data.responsavel_conclusao || '',
    evidencia_final_url: data.evidencia_final_url || '',
    epi_obrigatorio: Boolean(data.epi_obrigatorio),
    epi_entregue: Boolean(data.epi_entregue),
    epi_utilizado: Boolean(data.epi_utilizado),
    epi_adequado: Boolean(data.epi_adequado),
    observacao_epi: data.observacao_epi || '',
    treinamento_obrigatorio: Boolean(data.treinamento_obrigatorio),
    treinamento_realizado: Boolean(data.treinamento_realizado),
    treinamento_valido: Boolean(data.treinamento_valido),
    treinamento_relacionado_id: data.treinamento_relacionado_id || '',
    observacao_treinamento: data.observacao_treinamento || '',
    historico: data.historico || [],
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
    archived_at: data.archived_at || null,
    testemunhas: (data.testemunhas || []).map((item, index) => ({
      id: `${row.id}-w-${index}`,
      incidente_id: row.id,
      created_at: data.created_at || row.createdAt,
      updated_at: data.updated_at || row.updatedAt,
      ...item,
    })),
    acoes: (data.acoes || []).map((item, index) => ({
      id: `${row.id}-a-${index}`,
      incidente_id: row.id,
      created_at: data.created_at || row.createdAt,
      updated_at: data.updated_at || row.updatedAt,
      ...item,
    })),
  } satisfies Incident;
  return base;
}

async function getDocuments<T>(companyId: string): Promise<Array<DocumentRow<T>>> {
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .select('id, documentName, formData, createdAt, updatedAt')
    .eq('companyId', companyId)
    .eq('documentType', 'incident')
    .order('updatedAt', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<DocumentRow<T>>;
}

async function createDocument(data: IncidentData, payload: object) {
  const now = nowIso();
  const { data: created, error } = await createSupabaseAdminClient()
    .from('documents')
    .insert({ companyId: data.companyId, documentType: 'incident', documentName: data.titulo, status: 'draft', formData: payload, analysisData: null, equipmentData: null, signatureDocumentId: null, createdAt: now, updatedAt: now })
    .select('id')
    .single();
  if (error) throw error;
  return created.id as string;
}

async function updateDocument(id: string, companyId: string, documentName: string, formData: object) {
  const { error } = await createSupabaseAdminClient()
    .from('documents')
    .update({ documentName, formData, updatedAt: nowIso() })
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', 'incident');
  if (error) throw error;
}

async function insertChildren(incidenteId: string, testemunhas: IncidentWitnessFormValues[], acoes: IncidentActionFormValues[]) {
  const supabase = createSupabaseAdminClient();
  const now = nowIso();
  if (testemunhas.length) {
    const { error } = await supabase.from('incidente_testemunhas').insert(testemunhas.map((item) => ({ ...item, incidente_id: incidenteId, created_at: now, updated_at: now })));
    if (error) throw error;
  }
  if (acoes.length) {
    const { error } = await supabase.from('incidente_acoes').insert(acoes.map((item) => ({ ...item, incidente_id: incidenteId, created_at: now, updated_at: now })));
    if (error) throw error;
  }
}

async function hydrateChildren(records: Incident[]) {
  if (!records.length) return records;
  const ids = records.map((item) => item.id);
  const supabase = createSupabaseAdminClient();
  const [{ data: witnesses, error: witnessError }, { data: actions, error: actionError }] = await Promise.all([
    supabase.from('incidente_testemunhas').select('*').in('incidente_id', ids).order('created_at', { ascending: true }),
    supabase.from('incidente_acoes').select('*').in('incidente_id', ids).order('created_at', { ascending: true }),
  ]);
  if (witnessError && !isMissingTable(witnessError, 'incidente_testemunhas')) throw witnessError;
  if (actionError && !isMissingTable(actionError, 'incidente_acoes')) throw actionError;

  const witnessRows = (witnessError ? [] : witnesses ?? []) as IncidentWitness[];
  const actionRows = (actionError ? [] : actions ?? []) as IncidentAction[];
  return records.map((record) => ({
    ...record,
    testemunhas: witnessRows.filter((item) => item.incidente_id === record.id),
    acoes: actionRows.filter((item) => item.incidente_id === record.id),
  }));
}

export const IncidentRepository = {
  async getAll(companyId: string): Promise<Incident[]> {
    const collaborators = await CollaboratorRepository.getAllByCompany(companyId);
    const { data, error } = await createSupabaseAdminClient()
      .from('incidentes')
      .select('*')
      .eq('companyId', companyId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });
    if (error && !isMissingTable(error, 'incidentes')) throw error;

    const records = error
      ? (await getDocuments<Partial<IncidentData & Incident>>(companyId)).map(buildDocumentIncident).filter((item) => !item.archived_at)
      : await hydrateChildren((data ?? []) as Incident[]);

    return attachCollaborators(records, collaborators);
  },

  async getBundle(companyId: string) {
    const [collaborators, incidents] = await Promise.all([
      CollaboratorRepository.getAllByCompany(companyId),
      this.getAll(companyId),
    ]);
    return { collaborators, incidents };
  },

  async create(data: IncidentData): Promise<string> {
    const now = nowIso();
    const { incident, testemunhas, acoes } = splitPayload(data);
    const payload = {
      ...incident,
      historico: appendHistory([], 'criacao', 'Incidente registrado.'),
      created_at: now,
      updated_at: now,
      archived_at: null,
    };

    const { data: created, error } = await createSupabaseAdminClient()
      .from('incidentes')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      if (isMissingTable(error, 'incidentes')) return createDocument(data, { ...payload, testemunhas, acoes });
      throw error;
    }

    await insertChildren(created.id as string, testemunhas, acoes);
    return created.id as string;
  },

  async update(id: string, data: IncidentData): Promise<void> {
    const now = nowIso();
    const current = (await this.getAll(data.companyId)).find((item) => item.id === id);
    const { incident, testemunhas, acoes } = splitPayload(data);
    const payload = {
      ...incident,
      historico: appendHistory(current?.historico, 'atualizacao', 'Incidente atualizado.'),
      updated_at: now,
    };

    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('incidentes').update(payload).eq('id', id).eq('companyId', data.companyId);
    if (error) {
      if (isMissingTable(error, 'incidentes')) {
        const rows = await getDocuments<Partial<IncidentData & Incident>>(data.companyId);
        const row = rows.find((item) => item.id === id);
        await updateDocument(id, data.companyId, data.titulo, { ...(row?.formData ?? {}), ...payload, testemunhas, acoes });
        return;
      }
      throw error;
    }

    const witnessDelete = await supabase.from('incidente_testemunhas').delete().eq('incidente_id', id);
    if (witnessDelete.error && !isMissingTable(witnessDelete.error, 'incidente_testemunhas')) throw witnessDelete.error;
    const actionDelete = await supabase.from('incidente_acoes').delete().eq('incidente_id', id);
    if (actionDelete.error && !isMissingTable(actionDelete.error, 'incidente_acoes')) throw actionDelete.error;
    await insertChildren(id, testemunhas, acoes);
  },

  async conclude(id: string, companyId: string, values: IncidentConclusionValues): Promise<void> {
    const now = nowIso();
    const current = (await this.getAll(companyId)).find((item) => item.id === id);
    const payload = {
      ...values,
      status: 'concluido',
      historico: appendHistory(current?.historico, 'conclusao', values.resumo_investigacao),
      updated_at: now,
    };
    const { error } = await createSupabaseAdminClient()
      .from('incidentes')
      .update(payload)
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'incidentes')) {
        const rows = await getDocuments<Partial<IncidentData & Incident>>(companyId);
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
      status: 'cancelado',
      archived_at: now,
      updated_at: now,
      historico: appendHistory(current?.historico, 'cancelamento', 'Incidente arquivado/cancelado.'),
    };
    const { error } = await createSupabaseAdminClient()
      .from('incidentes')
      .update(payload)
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'incidentes')) {
        const rows = await getDocuments<Partial<IncidentData & Incident>>(companyId);
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, row.documentName, { ...(row.formData ?? {}), ...payload });
        return;
      }
      throw error;
    }
  },

  buildNonconformity(companyId: string, incident: Incident): NonconformityFormValues & { companyId: string } {
    return {
      companyId,
      titulo: `NC gerada do incidente: ${incident.titulo}`,
      descricao: incident.causa_raiz || incident.causa_imediata || incident.descricao,
      data_identificacao: new Date().toISOString().slice(0, 10),
      hora_identificacao: '',
      local: incident.local,
      setor: incident.setor,
      colaborador_id: incident.colaborador_id || '',
      origem: 'incidente',
      origem_id: incident.id,
      inspecao_id: '',
      item_inspecao_id: '',
      gravidade: incident.gravidade,
      probabilidade: incident.probabilidade,
      nivel_risco: incident.nivel_risco,
      risco_associado: incident.tipo_ocorrencia,
      evidencia_url: incident.evidencia_url || incident.evidencia_final_url || '',
      foto_url: incident.foto_url || '',
      responsavel_correcao: incident.responsavel_investigacao || incident.responsavel_conclusao || '',
      prazo_correcao: incident.prazo_investigacao || '',
      acao_corretiva: incident.acao_corretiva || incident.correcao_realizada || '',
      acao_preventiva: incident.acao_preventiva || incident.prevencao_recomendada || '',
      causa_provavel: incident.causa_imediata || '',
      causa_raiz: incident.causa_raiz_confirmada || incident.causa_raiz || '',
      status: 'aberta',
      data_conclusao: '',
      validado_por: '',
      observacoes: `Criada a partir do incidente ${incident.titulo}.`,
      correcao_realizada: '',
      evidencia_correcao_url: '',
      data_validacao: '',
      validacao_status: 'pendente',
      motivo_reabertura: '',
    };
  },
};
