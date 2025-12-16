'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { CompanyRepository } from '@/repositories/company.repository';
import { companyFormSchema } from '@/lib/types';
import { ErrorLogRepository } from '@/repositories/error-log.repository';

/**
 * Busca todas as empresas.
 */
export async function getCompanies() {
    try {
        const companies = await CompanyRepository.getAll();
        return { success: true, data: companies };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'getCompanies');
        return { success: false, error: 'Falha ao buscar empresas.' };
    }
}

/**
 * Cria uma nova empresa.
 */
export async function createCompany(data: unknown) {
    const validation = companyFormSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors.name?.[0] };
    }

    try {
        await CompanyRepository.create(validation.data);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'createCompany');
        return { success: false, error: 'Falha ao criar empresa.' };
    }
}

/**
 * Atualiza uma empresa existente.
 */
export async function updateCompany(id: string, data: unknown) {
    const validation = companyFormSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors.name?.[0] };
    }

    try {
        await CompanyRepository.update(id, validation.data);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'updateCompany');
        return { success: false, error: 'Falha ao atualizar empresa.' };
    }
}

/**
 * Deleta uma empresa.
 */
export async function deleteCompany(id: string) {
    if (!id) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    
    try {
        await CompanyRepository.delete(id);
        revalidatePath('/admin');
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'deleteCompany');
        return { success: false, error: 'Falha ao deletar empresa.' };
    }
}
