import type { AprPtProject, AprPtProjectFormValues } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';
import { DOCUMENT_TYPES } from '@/lib/constants';

const FALLBACK_DOCUMENT_PREFIX = 'APR_PT_PROJECT::';

function throwSupabaseError(error: unknown): never {
  if (error && typeof error === 'object') {
    const record = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [record.message, record.details, record.hint, record.code].filter(Boolean);
    throw new Error(parts.join(' ') || JSON.stringify(error));
  }

  throw new Error(String(error || 'Erro desconhecido no banco.'));
}

function isMissingProjectsTable(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const record = error as { message?: string; details?: string; hint?: string; code?: string };
  const message = [record.message, record.details, record.hint, record.code].filter(Boolean).join(' ');
  return message.includes('projetos_apr_pt') || message.includes('PGRST205');
}

function normalizeFallbackProject(document: any): AprPtProject {
  const project = document?.formData?.aprPtProject || document?.formData?.project || {};
  return {
    ...project,
    id: document.id,
    companyId: document.companyId,
    nome_projeto: project.nome_projeto || document.documentName?.replace(FALLBACK_DOCUMENT_PREFIX, '') || 'Projeto APR/PT',
    status: project.status || 'ativo',
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
    deletedAt: null,
  } as AprPtProject;
}

export const AprProjectRepository = {
  async getAllByCompany(companyId: string): Promise<AprPtProject[]> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from('projetos_apr_pt')
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error && isMissingProjectsTable(error)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('documents')
        .select('id,companyId,documentName,formData,createdAt,updatedAt')
        .eq('companyId', companyId)
        .eq('documentType', DOCUMENT_TYPES.APR)
        .like('documentName', `${FALLBACK_DOCUMENT_PREFIX}%`)
        .order('updatedAt', { ascending: false });

      if (fallbackError) throwSupabaseError(fallbackError);
      return (fallbackData ?? []).map(normalizeFallbackProject);
    }

    if (error) throwSupabaseError(error);
    return (data ?? []) as AprPtProject[];
  },

  async create(data: AprPtProjectFormValues): Promise<string> {
    const now = new Date().toISOString();
    const supabase = createSupabaseAdminClient();
    const { data: created, error } = await supabase
      .from('projetos_apr_pt')
      .insert({
        ...data,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .select('id')
      .single();

    if (error && isMissingProjectsTable(error)) {
      const { data: fallbackCreated, error: fallbackError } = await supabase
        .from('documents')
        .insert({
          companyId: data.companyId,
          documentType: DOCUMENT_TYPES.APR,
          documentName: `${FALLBACK_DOCUMENT_PREFIX}${data.nome_projeto}`,
          status: 'draft',
          formData: {
            aprPtProject: data,
            internalKind: 'apr_pt_project',
          },
          analysisData: null,
          equipmentData: null,
          createdAt: now,
          updatedAt: now,
        })
        .select('id')
        .single();

      if (fallbackError) throwSupabaseError(fallbackError);
      return fallbackCreated.id;
    }

    if (error) throwSupabaseError(error);
    return created.id;
  },
};
