import type {
  Collaborator,
  CostPrevention,
  CostPreventionFormValues,
  Epi,
  Incident,
  Inspection,
  Nonconformity,
  Training,
} from '@/lib/types';
import { CollaboratorRepository } from '@/repositories/collaborator.repository';
import { EpiRepository } from '@/repositories/epi.repository';
import { IncidentRepository } from '@/repositories/incident.repository';
import { InspectionRepository } from '@/repositories/inspection.repository';
import { NonconformityRepository } from '@/repositories/nonconformity.repository';
import { TrainingRepository } from '@/repositories/training.repository';
import { createSupabaseAdminClient } from '@/supabase/server';

type CostData = CostPreventionFormValues & { companyId: string };

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

function mapDocToCost(row: DocumentRow<Partial<CostPrevention>>): CostPrevention {
  const data = row.formData ?? {};
  return {
    id: row.id,
    companyId: data.companyId || '',
    descricao: data.descricao || row.documentName,
    categoria: data.categoria || 'outros',
    tipo_custo: data.tipo_custo || 'custo_real',
    valor: Number(data.valor || 0),
    data_custo: data.data_custo || '',
    fornecedor: data.fornecedor || '',
    setor: data.setor || '',
    colaborador_id: data.colaborador_id || '',
    epi_id: data.epi_id || '',
    treinamento_id: data.treinamento_id || '',
    inspecao_id: data.inspecao_id || '',
    nao_conformidade_id: data.nao_conformidade_id || '',
    incidente_id: data.incidente_id || '',
    origem: data.origem || 'manual',
    comprovante_url: data.comprovante_url || '',
    responsavel_registro: data.responsavel_registro || '',
    observacoes: data.observacoes || '',
    created_at: data.created_at || row.createdAt,
    updated_at: data.updated_at || row.updatedAt,
    archived_at: data.archived_at || null,
  };
}

async function getDocuments<T>(companyId: string): Promise<Array<DocumentRow<T>>> {
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .select('id, documentName, formData, createdAt, updatedAt')
    .eq('companyId', companyId)
    .eq('documentType', 'cost_prevention')
    .order('updatedAt', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Array<DocumentRow<T>>;
}

async function createDocument(companyId: string, documentName: string, formData: object) {
  const now = nowIso();
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .insert({ companyId, documentType: 'cost_prevention', documentName, status: 'draft', formData, analysisData: null, equipmentData: null, signatureDocumentId: null, createdAt: now, updatedAt: now })
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
    .eq('documentType', 'cost_prevention');
  if (error) throw error;
}

function attachRelations(costs: CostPrevention[], refs: {
  collaborators: Collaborator[];
  epis: Epi[];
  trainings: Training[];
  inspections: Inspection[];
  nonconformities: Nonconformity[];
  incidents: Incident[];
}) {
  return costs.map((cost) => ({
    ...cost,
    colaborador: refs.collaborators.find((item) => item.id === cost.colaborador_id) || null,
    epi: refs.epis.find((item) => item.id === cost.epi_id) || null,
    treinamento: refs.trainings.find((item) => item.id === cost.treinamento_id) || null,
    inspecao: refs.inspections.find((item) => item.id === cost.inspecao_id) || null,
    nao_conformidade: refs.nonconformities.find((item) => item.id === cost.nao_conformidade_id) || null,
    incidente: refs.incidents.find((item) => item.id === cost.incidente_id) || null,
  }));
}

export const CostPreventionRepository = {
  async getAll(companyId: string): Promise<CostPrevention[]> {
    const refs = await this.getReferences(companyId);
    const { data, error } = await createSupabaseAdminClient()
      .from('custos_prevencao')
      .select('*')
      .eq('companyId', companyId)
      .is('archived_at', null)
      .order('data_custo', { ascending: false });
    if (error && !isMissingTable(error, 'custos_prevencao')) throw error;
    const costs = error
      ? (await getDocuments<Partial<CostPrevention>>(companyId)).map(mapDocToCost).filter((item) => !item.archived_at)
      : ((data ?? []) as CostPrevention[]);
    return attachRelations(costs, refs);
  },

  async getReferences(companyId: string) {
    const [collaborators, epiBundle, trainingBundle, inspections, nonconformities, incidents] = await Promise.all([
      CollaboratorRepository.getAllByCompany(companyId),
      EpiRepository.getBundle(companyId),
      TrainingRepository.getBundle(companyId),
      InspectionRepository.getInspections(companyId),
      NonconformityRepository.getAll(companyId),
      IncidentRepository.getAll(companyId),
    ]);
    return {
      collaborators,
      epis: epiBundle.epis,
      trainings: trainingBundle.trainings,
      inspections,
      nonconformities,
      incidents,
    };
  },

  async getBundle(companyId: string) {
    const [references, costs] = await Promise.all([
      this.getReferences(companyId),
      this.getAll(companyId),
    ]);
    return { ...references, costs };
  },

  async create(data: CostData): Promise<string> {
    const now = nowIso();
    const payload = { ...data, created_at: now, updated_at: now, archived_at: null };
    const { data: created, error } = await createSupabaseAdminClient()
      .from('custos_prevencao')
      .insert(payload)
      .select('id')
      .single();
    if (error) {
      if (isMissingTable(error, 'custos_prevencao')) return createDocument(data.companyId, data.descricao, payload);
      throw error;
    }
    return created.id as string;
  },

  async update(id: string, data: CostData): Promise<void> {
    const now = nowIso();
    const payload = { ...data, updated_at: now };
    const { error } = await createSupabaseAdminClient()
      .from('custos_prevencao')
      .update(payload)
      .eq('id', id)
      .eq('companyId', data.companyId);
    if (error) {
      if (isMissingTable(error, 'custos_prevencao')) {
        const rows = await getDocuments<Partial<CostPrevention>>(data.companyId);
        const row = rows.find((item) => item.id === id);
        await updateDocument(id, data.companyId, data.descricao, { ...(row?.formData ?? {}), ...payload });
        return;
      }
      throw error;
    }
  },

  async archive(id: string, companyId: string): Promise<void> {
    const now = nowIso();
    const payload = { archived_at: now, updated_at: now };
    const { error } = await createSupabaseAdminClient()
      .from('custos_prevencao')
      .update(payload)
      .eq('id', id)
      .eq('companyId', companyId);
    if (error) {
      if (isMissingTable(error, 'custos_prevencao')) {
        const rows = await getDocuments<Partial<CostPrevention>>(companyId);
        const row = rows.find((item) => item.id === id);
        if (row) await updateDocument(id, companyId, row.documentName, { ...(row.formData ?? {}), ...payload });
        return;
      }
      throw error;
    }
  },
};
