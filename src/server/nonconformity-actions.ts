'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { nonconformityConclusionSchema, nonconformityFormSchema, nonconformityReopenSchema } from '@/lib/types';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { NonconformityRepository } from '@/repositories/nonconformity.repository';
import { requireAuth } from '@/server/auth-guard';

const nonconformityServerSchema = nonconformityFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
});

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const message = record.message || record.details || record.error;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallback;
}

export async function getNonconformityModuleData(companyId: string) {
  if (!companyId) return { success: false, error: 'ID da empresa nao fornecido.' };

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const data = await NonconformityRepository.getBundle(companyId);
    return { success: true, data };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao buscar nao conformidades.');
    await ErrorLogRepository.log(new Error(message), 'getNonconformityModuleData');
    return { success: false, error: message };
  }
}

export async function createNonconformity(data: z.infer<typeof nonconformityServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = nonconformityServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await NonconformityRepository.create(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao criar nao conformidade.');
    await ErrorLogRepository.log(new Error(message), 'createNonconformity');
    return { success: false, error: message };
  }
}

export async function updateNonconformity(id: string, data: z.infer<typeof nonconformityServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = nonconformityServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await NonconformityRepository.update(id, validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao atualizar nao conformidade.');
    await ErrorLogRepository.log(new Error(message), 'updateNonconformity');
    return { success: false, error: message };
  }
}

export async function concludeNonconformity(id: string, companyId: string, data: z.infer<typeof nonconformityConclusionSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = nonconformityConclusionSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await NonconformityRepository.conclude(id, companyId, validation.data);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao concluir nao conformidade.');
    await ErrorLogRepository.log(new Error(message), 'concludeNonconformity');
    return { success: false, error: message };
  }
}

export async function reopenNonconformity(id: string, companyId: string, data: z.infer<typeof nonconformityReopenSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = nonconformityReopenSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await NonconformityRepository.reopen(id, companyId, validation.data);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao reabrir nao conformidade.');
    await ErrorLogRepository.log(new Error(message), 'reopenNonconformity');
    return { success: false, error: message };
  }
}

export async function archiveNonconformity(id: string, companyId: string) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    await NonconformityRepository.archive(id, companyId);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao arquivar nao conformidade.');
    await ErrorLogRepository.log(new Error(message), 'archiveNonconformity');
    return { success: false, error: message };
  }
}
