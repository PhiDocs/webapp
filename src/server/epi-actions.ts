'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { epiDeliveryFormSchema, epiFormSchema } from '@/lib/types';
import { EpiRepository } from '@/repositories/epi.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';

const epiServerSchema = epiFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
});

const epiDeliveryServerSchema = epiDeliveryFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
});

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.details || record.error;
    if (typeof message === 'string' && message.trim()) return message;
    try {
      return JSON.stringify(error);
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export async function getEpiModuleData(companyId: string) {
  if (!companyId) return { success: false, error: 'ID da empresa nao fornecido.' };

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const data = await EpiRepository.getBundle(companyId);
    return { success: true, data };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao buscar entregas de EPI.');
    await ErrorLogRepository.log(new Error(message), 'getEpiModuleData');
    return { success: false, error: message };
  }
}

export async function createEpi(data: z.infer<typeof epiServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = epiServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await EpiRepository.createEpi(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao cadastrar EPI.');
    await ErrorLogRepository.log(new Error(message), 'createEpi');
    return { success: false, error: message };
  }
}

export async function createEpiDelivery(data: z.infer<typeof epiDeliveryServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = epiDeliveryServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await EpiRepository.createDelivery(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao registrar entrega de EPI.');
    await ErrorLogRepository.log(new Error(message), 'createEpiDelivery');
    return { success: false, error: message };
  }
}

export async function updateEpiDelivery(id: string, data: z.infer<typeof epiDeliveryServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = epiDeliveryServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await EpiRepository.updateDelivery(id, validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao atualizar entrega de EPI.');
    await ErrorLogRepository.log(new Error(message), 'updateEpiDelivery');
    return { success: false, error: message };
  }
}

export async function archiveEpiDelivery(id: string, companyId: string) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    await EpiRepository.archiveDelivery(id, companyId);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao cancelar entrega de EPI.');
    await ErrorLogRepository.log(new Error(message), 'archiveEpiDelivery');
    return { success: false, error: message };
  }
}

export async function getRequiredEpisForCollaborator(companyId: string, collaboratorId: string) {
  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const { collaborators, epis, mappings } = await EpiRepository.getBundle(companyId);
    const collaborator = collaborators.find((item) => item.id === collaboratorId);
    if (!collaborator) return { success: false, error: 'Colaborador nao encontrado.' };
    return { success: true, data: EpiRepository.getRequiredEpis(collaborator, epis, mappings) };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao buscar EPIs obrigatorios.');
    await ErrorLogRepository.log(new Error(message), 'getRequiredEpisForCollaborator');
    return { success: false, error: message };
  }
}
