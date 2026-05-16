'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { collaboratorFormSchema } from '@/lib/types';
import { CollaboratorRepository } from '@/repositories/collaborator.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';

const collaboratorServerSchema = collaboratorFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
});

type CollaboratorServerValues = z.infer<typeof collaboratorServerSchema>;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message && error.message !== '[object Object]') {
    return error.message;
  }

  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const messageParts = [
      record.message,
      record.details,
      record.hint,
      record.code,
      record.error,
      record.error_description,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (messageParts.length > 0) {
      return messageParts.join(' ');
    }

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Keep the fallback below when the object cannot be serialized.
    }
  }

  return fallback;
}

function normalizeDatabaseError(error: unknown, fallback: string) {
  const message = getErrorMessage(error, fallback);

  if (
    message.includes("Could not find the table 'public.colaboradores'") ||
    message.includes('relation "public.colaboradores" does not exist') ||
    message.includes('PGRST205')
  ) {
    return 'A tabela de colaboradores ainda nao foi criada no banco. Aplique a migracao supabase/migrations/20260512120000_create_collaborators.sql antes de cadastrar.';
  }

  return message;
}

function normalizeText(value?: string) {
  const trimmed = value?.trim();
  return trimmed || '';
}

function normalizePayload(data: CollaboratorServerValues): CollaboratorServerValues {
  return {
    ...data,
    nome_completo: data.nome_completo.trim(),
    cpf: data.cpf.trim(),
    rg: normalizeText(data.rg),
    telefone: normalizeText(data.telefone),
    email: normalizeText(data.email),
    endereco: normalizeText(data.endereco),
    foto_url: normalizeText(data.foto_url),
    matricula: normalizeText(data.matricula),
    empresa: normalizeText(data.empresa),
    setor: data.setor.trim(),
    funcao: data.funcao.trim(),
    tipo_contrato: normalizeText(data.tipo_contrato),
    gestor_responsavel: normalizeText(data.gestor_responsavel),
    local_trabalho: normalizeText(data.local_trabalho),
    turno_trabalho: normalizeText(data.turno_trabalho),
    atividades_realizadas: normalizeText(data.atividades_realizadas),
    riscos_associados: normalizeText(data.riscos_associados),
    observacoes_seguranca: normalizeText(data.observacoes_seguranca),
    observacoes_gerais: normalizeText(data.observacoes_gerais),
  };
}

async function validateDuplicate(data: CollaboratorServerValues, ignoreId?: string) {
  const duplicate = await CollaboratorRepository.findDuplicate(
    data.companyId,
    data.cpf,
    data.matricula,
    ignoreId
  );

  if (!duplicate) return null;

  if (duplicate.cpf === data.cpf) {
    return 'Ja existe um colaborador ativo com este CPF.';
  }

  return 'Ja existe um colaborador ativo com esta matricula.';
}

export async function getCollaborators(companyId: string) {
  if (!companyId) {
    return { success: false, error: 'ID da empresa nao fornecido.' };
  }

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const collaborators = await CollaboratorRepository.getAllByCompany(companyId);
    return { success: true, data: collaborators };
  } catch (e: unknown) {
    const error = new Error(normalizeDatabaseError(e, 'Erro desconhecido ao buscar colaboradores.'));
    await ErrorLogRepository.log(error, 'getCollaborators');
    return { success: false, error: error.message };
  }
}

export async function createCollaborator(data: CollaboratorServerValues) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (error: any) {
    return { success: false, error: error.message || 'Acesso negado.' };
  }

  const validation = collaboratorServerSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = Object.values(errors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  const payload = normalizePayload(validation.data);

  try {
    const duplicateError = await validateDuplicate(payload);
    if (duplicateError) {
      return { success: false, error: duplicateError };
    }

    const id = await CollaboratorRepository.create(payload);
    revalidatePath(`/company/${payload.companyId}`);
    return { success: true, id };
  } catch (e: unknown) {
    const error = new Error(normalizeDatabaseError(e, 'Erro desconhecido ao criar colaborador.'));
    await ErrorLogRepository.log(error, 'createCollaborator', data.email || data.cpf);
    return { success: false, error: error.message };
  }
}

export async function updateCollaborator(id: string, data: CollaboratorServerValues) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (error: any) {
    return { success: false, error: error.message || 'Acesso negado.' };
  }

  const validation = collaboratorServerSchema.safeParse(data);
  if (!validation.success) {
    const errors = validation.error.flatten().fieldErrors;
    const firstError = Object.values(errors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  const payload = normalizePayload(validation.data);

  try {
    const duplicateError = await validateDuplicate(payload, id);
    if (duplicateError) {
      return { success: false, error: duplicateError };
    }

    await CollaboratorRepository.update(id, payload);
    revalidatePath(`/company/${payload.companyId}`);
    return { success: true, id };
  } catch (e: unknown) {
    const error = new Error(normalizeDatabaseError(e, 'Erro desconhecido ao atualizar colaborador.'));
    await ErrorLogRepository.log(error, 'updateCollaborator', data.email || data.cpf);
    return { success: false, error: error.message };
  }
}

export async function archiveCollaborator(id: string, companyId: string) {
  if (!id || !companyId) {
    return { success: false, error: 'ID do colaborador ou da empresa nao fornecido.' };
  }

  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    await CollaboratorRepository.archive(id, companyId);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e: unknown) {
    const error = new Error(normalizeDatabaseError(e, 'Erro desconhecido ao arquivar colaborador.'));
    await ErrorLogRepository.log(error, 'archiveCollaborator');
    return { success: false, error: error.message };
  }
}
