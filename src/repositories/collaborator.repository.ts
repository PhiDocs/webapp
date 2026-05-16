import type { Collaborator, CollaboratorAiRecommendations, CollaboratorFormValues } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

type CollaboratorData = CollaboratorFormValues & {
  companyId: string;
};

type CollaboratorDocumentRow = {
  id: string;
  documentName: string;
  formData: Partial<Collaborator> | null;
  createdAt: string;
  updatedAt: string;
};

function isMissingCollaboratorsTable(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const record = error as Record<string, unknown>;
  const message = [record.message, record.details, record.hint, record.code]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');

  return (
    message.includes("Could not find the table 'public.colaboradores'") ||
    message.includes('relation "public.colaboradores" does not exist') ||
    message.includes('PGRST205')
  );
}

function mapDocumentToCollaborator(row: CollaboratorDocumentRow): Collaborator {
  const formData = row.formData ?? {};

  return {
    nome_completo: formData.nome_completo || row.documentName || '',
    cpf: formData.cpf || '',
    rg: formData.rg || '',
    data_nascimento: formData.data_nascimento || '',
    telefone: formData.telefone || '',
    email: formData.email || '',
    endereco: formData.endereco || '',
    foto_url: formData.foto_url || '',
    matricula: formData.matricula || '',
    empresa: formData.empresa || '',
    setor: formData.setor || '',
    funcao: formData.funcao || '',
    data_admissao: formData.data_admissao || '',
    tipo_contrato: formData.tipo_contrato || '',
    status: formData.status || 'ativo',
    gestor_responsavel: formData.gestor_responsavel || '',
    local_trabalho: formData.local_trabalho || '',
    turno_trabalho: formData.turno_trabalho || '',
    atividades_realizadas: formData.atividades_realizadas || '',
    riscos_associados: formData.riscos_associados || '',
    aso_validade: formData.aso_validade || '',
    observacoes_seguranca: formData.observacoes_seguranca || '',
    observacoes_gerais: formData.observacoes_gerais || '',
    ai_recommendations: formData.ai_recommendations || null,
    id: row.id,
    companyId: formData.companyId || '',
    created_at: formData.created_at || row.createdAt,
    updated_at: formData.updated_at || row.updatedAt || row.createdAt,
    archived_at: formData.archived_at || null,
  };
}

function buildDocumentFormData(data: CollaboratorData, dates?: { createdAt?: string; updatedAt?: string; archivedAt?: string | null }) {
  const now = new Date().toISOString();
  return {
    ...data,
    created_at: dates?.createdAt || now,
    updated_at: dates?.updatedAt || now,
    archived_at: dates?.archivedAt ?? null,
  };
}

async function getCollaboratorDocuments(companyId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .select('id, documentName, formData, createdAt, updatedAt')
    .eq('companyId', companyId)
    .eq('documentType', 'collaborator')
    .order('updatedAt', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as CollaboratorDocumentRow[])
    .map(mapDocumentToCollaborator)
    .filter((collaborator) => !collaborator.archived_at);
}

async function getCollaboratorDocumentById(id: string, companyId: string) {
  const { data, error } = await createSupabaseAdminClient()
    .from('documents')
    .select('id, documentName, formData, createdAt, updatedAt')
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', 'collaborator')
    .maybeSingle();

  if (error) throw error;
  return data ? mapDocumentToCollaborator(data as CollaboratorDocumentRow) : null;
}

async function findDuplicateInDocuments(companyId: string, cpf: string, matricula?: string, ignoreId?: string) {
  const collaborators = await getCollaboratorDocuments(companyId);
  return collaborators.find((collaborator) => {
    if (ignoreId && collaborator.id === ignoreId) return false;
    if (collaborator.cpf === cpf) return true;
    return Boolean(matricula?.trim() && collaborator.matricula === matricula.trim());
  });
}

async function updateCollaboratorDocumentRecommendations(id: string, companyId: string, recommendations: CollaboratorAiRecommendations) {
  const supabase = createSupabaseAdminClient();
  const { data: current, error: fetchError } = await supabase
    .from('documents')
    .select('formData, createdAt')
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', 'collaborator')
    .single();

  if (fetchError) throw fetchError;

  const now = new Date().toISOString();
  const currentFormData = (current.formData ?? {}) as Partial<Collaborator>;
  const { error } = await supabase
    .from('documents')
    .update({
      formData: {
        ...currentFormData,
        ai_recommendations: recommendations,
        created_at: currentFormData.created_at || current.createdAt,
        updated_at: now,
      },
      updatedAt: now,
    })
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', 'collaborator');

  if (error) throw error;
}

async function createCollaboratorDocument(data: CollaboratorData) {
  const now = new Date().toISOString();
  const { data: created, error } = await createSupabaseAdminClient()
    .from('documents')
    .insert({
      companyId: data.companyId,
      documentType: 'collaborator',
      documentName: data.nome_completo,
      status: 'draft',
      formData: buildDocumentFormData(data, { createdAt: now, updatedAt: now }),
      analysisData: null,
      equipmentData: null,
      signatureDocumentId: null,
      createdAt: now,
      updatedAt: now,
    })
    .select('id')
    .single();

  if (error) throw error;
  return created.id;
}

async function updateCollaboratorDocument(id: string, data: Partial<CollaboratorData>) {
  if (!data.companyId) {
    throw new Error('companyId is required for updating a collaborator.');
  }

  const supabase = createSupabaseAdminClient();
  const { data: current, error: fetchError } = await supabase
    .from('documents')
    .select('id, documentName, formData, createdAt, updatedAt')
    .eq('id', id)
    .eq('companyId', data.companyId)
    .eq('documentType', 'collaborator')
    .single();

  if (fetchError) throw fetchError;

  const now = new Date().toISOString();
  const currentFormData = (current.formData ?? {}) as Partial<Collaborator>;
  const { error } = await supabase
    .from('documents')
    .update({
      documentName: data.nome_completo || current.documentName,
      formData: {
        ...currentFormData,
        ...data,
        created_at: currentFormData.created_at || current.createdAt,
        updated_at: now,
        archived_at: currentFormData.archived_at || null,
      },
      updatedAt: now,
    })
    .eq('id', id)
    .eq('companyId', data.companyId)
    .eq('documentType', 'collaborator');

  if (error) throw error;
}

async function archiveCollaboratorDocument(id: string, companyId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: current, error: fetchError } = await supabase
    .from('documents')
    .select('formData, createdAt')
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', 'collaborator')
    .single();

  if (fetchError) throw fetchError;

  const now = new Date().toISOString();
  const currentFormData = (current.formData ?? {}) as Partial<Collaborator>;
  const { error } = await supabase
    .from('documents')
    .update({
      formData: {
        ...currentFormData,
        status: 'desligado',
        created_at: currentFormData.created_at || current.createdAt,
        updated_at: now,
        archived_at: now,
      },
      updatedAt: now,
    })
    .eq('id', id)
    .eq('companyId', companyId)
    .eq('documentType', 'collaborator');

  if (error) throw error;
}

export const CollaboratorRepository = {
  async getById(id: string, companyId: string): Promise<Collaborator | null> {
    const { data, error } = await createSupabaseAdminClient()
      .from('colaboradores')
      .select('*')
      .eq('id', id)
      .eq('companyId', companyId)
      .maybeSingle();

    if (error) {
      if (isMissingCollaboratorsTable(error)) {
        return getCollaboratorDocumentById(id, companyId);
      }
      throw error;
    }

    return data as Collaborator | null;
  },

  async getAllByCompany(companyId: string): Promise<Collaborator[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('colaboradores')
      .select('*')
      .eq('companyId', companyId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingCollaboratorsTable(error)) {
        return getCollaboratorDocuments(companyId);
      }
      throw error;
    }

    return (data ?? []) as Collaborator[];
  },

  async findDuplicate(companyId: string, cpf: string, matricula?: string, ignoreId?: string) {
    let query = createSupabaseAdminClient()
      .from('colaboradores')
      .select('id,cpf,matricula')
      .eq('companyId', companyId)
      .is('archived_at', null);

    if (ignoreId) {
      query = query.neq('id', ignoreId);
    }

    const filters = [`cpf.eq.${cpf}`];
    if (matricula?.trim()) {
      filters.push(`matricula.eq.${matricula.trim()}`);
    }

    const { data, error } = await query.or(filters.join(',')).limit(1);

    if (error) {
      if (isMissingCollaboratorsTable(error)) {
        return findDuplicateInDocuments(companyId, cpf, matricula, ignoreId);
      }
      throw error;
    }

    return data?.[0] as { id: string; cpf: string; matricula?: string | null } | undefined;
  },

  async create(data: CollaboratorData): Promise<string> {
    const now = new Date().toISOString();
    const { data: created, error } = await createSupabaseAdminClient()
      .from('colaboradores')
      .insert({
        ...data,
        created_at: now,
        updated_at: now,
        archived_at: null,
      })
      .select('id')
      .single();

    if (error) {
      if (isMissingCollaboratorsTable(error)) {
        return createCollaboratorDocument(data);
      }
      throw error;
    }

    return created.id;
  },

  async update(id: string, data: Partial<CollaboratorData>): Promise<void> {
    if (!data.companyId) {
      throw new Error('companyId is required for updating a collaborator.');
    }

    const { error } = await createSupabaseAdminClient()
      .from('colaboradores')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('companyId', data.companyId);

    if (error) {
      if (isMissingCollaboratorsTable(error)) {
        await updateCollaboratorDocument(id, data);
        return;
      }
      throw error;
    }
  },

  async archive(id: string, companyId: string): Promise<void> {
    const now = new Date().toISOString();
    const { error } = await createSupabaseAdminClient()
      .from('colaboradores')
      .update({
        status: 'desligado',
        archived_at: now,
        updated_at: now,
      })
      .eq('id', id)
      .eq('companyId', companyId);

    if (error) {
      if (isMissingCollaboratorsTable(error)) {
        await archiveCollaboratorDocument(id, companyId);
        return;
      }
      throw error;
    }
  },

  async updateRecommendations(id: string, companyId: string, recommendations: CollaboratorAiRecommendations): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('colaboradores')
      .update({
        ai_recommendations: recommendations,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('companyId', companyId);

    if (error) {
      if (isMissingCollaboratorsTable(error)) {
        await updateCollaboratorDocumentRecommendations(id, companyId, recommendations);
        return;
      }
      throw error;
    }
  },
};
