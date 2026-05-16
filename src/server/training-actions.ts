'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { collaboratorTrainingFormSchema, trainingFormSchema } from '@/lib/types';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { TrainingRepository } from '@/repositories/training.repository';
import { requireAuth } from '@/server/auth-guard';

const trainingServerSchema = trainingFormSchema.extend({
  companyId: z.string().min(1, 'ID da empresa e obrigatorio.'),
});

const recordServerSchema = collaboratorTrainingFormSchema.extend({
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

export async function getTrainingModuleData(companyId: string) {
  if (!companyId) return { success: false, error: 'ID da empresa nao fornecido.' };

  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const data = await TrainingRepository.getBundle(companyId);
    return { success: true, data };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao buscar treinamentos.');
    await ErrorLogRepository.log(new Error(message), 'getTrainingModuleData');
    return { success: false, error: message };
  }
}

export async function createTraining(data: z.infer<typeof trainingServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = trainingServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await TrainingRepository.createTraining(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao cadastrar treinamento.');
    await ErrorLogRepository.log(new Error(message), 'createTraining');
    return { success: false, error: message };
  }
}

export async function createTrainingRecord(data: z.infer<typeof recordServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = recordServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    const id = await TrainingRepository.createRecord(validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true, id };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao registrar treinamento.');
    await ErrorLogRepository.log(new Error(message), 'createTrainingRecord');
    return { success: false, error: message };
  }
}

export async function updateTrainingRecord(id: string, data: z.infer<typeof recordServerSchema>) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
  } catch (e: any) {
    return { success: false, error: e.message || 'Acesso negado.' };
  }

  const validation = recordServerSchema.safeParse(data);
  if (!validation.success) {
    const firstError = Object.values(validation.error.flatten().fieldErrors)[0]?.[0];
    return { success: false, error: firstError || 'Dados invalidos.' };
  }

  try {
    await TrainingRepository.updateRecord(id, validation.data);
    revalidatePath(`/company/${validation.data.companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao atualizar treinamento.');
    await ErrorLogRepository.log(new Error(message), 'updateTrainingRecord');
    return { success: false, error: message };
  }
}

export async function archiveTrainingRecord(id: string, companyId: string) {
  try {
    await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
    await TrainingRepository.archiveRecord(id, companyId);
    revalidatePath(`/company/${companyId}`);
    return { success: true };
  } catch (e) {
    const message = errorMessage(e, 'Erro desconhecido ao cancelar treinamento.');
    await ErrorLogRepository.log(new Error(message), 'archiveTrainingRecord');
    return { success: false, error: message };
  }
}
