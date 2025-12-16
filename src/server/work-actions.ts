'use server';

import { revalidatePath } from 'next/cache';
import { WorkRepository } from '@/repositories/work.repository';
import { workFormSchema } from '@/lib/types';
import { ErrorLogRepository } from '@/repositories/error-log.repository';

/**
 * Busca todas as obras.
 */
export async function getWorks() {
    try {
        const works = await WorkRepository.getAll();
        return { success: true, data: works };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'getWorks');
        return { success: false, error: 'Falha ao buscar obras.' };
    }
}

/**
 * Cria uma nova obra.
 */
export async function createWork(data: unknown) {
    const validation = workFormSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await WorkRepository.create(validation.data);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'createWork');
        return { success: false, error: 'Falha ao criar obra.' };
    }
}

/**
 * Atualiza uma obra existente.
 */
export async function updateWork(id: string, data: unknown) {
    const validation = workFormSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        await WorkRepository.update(id, validation.data);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'updateWork');
        return { success: false, error: 'Falha ao atualizar obra.' };
    }
}

/**
 * Deleta uma obra.
 */
export async function deleteWork(id: string) {
    if (!id) {
        return { success: false, error: 'ID da obra não fornecido.' };
    }
    
    try {
        await WorkRepository.delete(id);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'deleteWork');
        return { success: false, error: 'Falha ao deletar obra.' };
    }
}
