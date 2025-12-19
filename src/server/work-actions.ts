'use server';

import { revalidatePath } from 'next/cache';
import { WorkRepository } from '@/repositories/work.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { z } from 'zod';
import type { WorkClientFormValues } from '@/lib/types';


// Schema para validação do formulário no servidor. Inclui o companyId.
const workServerSchema = z.object({
  name: z.string().min(3, "O nome da obra deve ter pelo menos 3 caracteres."),
  address: z.string().min(5, "O endereço deve ter pelo menos 5 caracteres."),
  workLocationDetails: z.string().min(3, "O local da obra deve ter pelo menos 3 caracteres."),
  startDate: z.string().min(1, "A data de início é obrigatória."),
  endDate: z.string().min(1, "A data de término é obrigatória."),
  companyId: z.string().min(1, "ID da empresa é obrigatório."),
}).superRefine((data, ctx) => {
    if (data.startDate && data.endDate && new Date(data.endDate) < new Date(data.startDate)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "A data de término não pode ser anterior à data de início.",
            path: ['endDate'],
        });
    }
});


/**
 * Busca todas as obras de uma empresa.
 */
export async function getWorks(companyId: string) {
    if (!companyId) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    try {
        const works = await WorkRepository.getAllByCompany(companyId);
        return { success: true, data: works };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Falha ao buscar obras.'));
        console.error("Error fetching works: ", error);
        
        const specificError = e as { code?: string };
        if (specificError?.code === 'failed-precondition') {
             await ErrorLogRepository.log(new Error('Firestore index missing for getWorks'), 'getWorks-IndexMissing');
             return { success: false, error: 'Um índice do Firestore é necessário para esta consulta. Verifique os logs do servidor para o link de criação do índice.' };
        }
        await ErrorLogRepository.log(error, 'getWorks');
        return { success: false, error: 'Falha ao buscar obras.' };
    }
}

/**
 * Cria uma nova obra.
 */
export async function createWork(data: WorkClientFormValues & { companyId: string }) {
    const validation = workServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await WorkRepository.create(validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Falha ao criar obra.'));
        await ErrorLogRepository.log(error, 'createWork');
        return { success: false, error: 'Falha ao criar obra.' };
    }
}

/**
 * Atualiza uma obra existente.
 */
export async function updateWork(id: string, data: WorkClientFormValues & { companyId: string }) {
    const validation = workServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await WorkRepository.update(id, validation.data);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Falha ao atualizar obra.'));
        await ErrorLogRepository.log(error, 'updateWork');
        return { success: false, error: 'Falha ao atualizar obra.' };
    }
}

/**
 * Deleta uma obra.
 */
export async function deleteWork(id: string, companyId: string) {
    if (!id || !companyId) {
        return { success: false, error: 'ID da obra ou da empresa não fornecido.' };
    }
    
    try {
        await WorkRepository.delete(id);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Falha ao deletar obra.'));
        await ErrorLogRepository.log(error, 'deleteWork');
        return { success: false, error: 'Falha ao deletar obra.' };
    }
}
