'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { CompanyRepository } from '@/repositories/company.repository';
import { companySettingsFormSchema } from '@/lib/types';
import { ErrorLogRepository } from '@/repositories/error-log.repository';


/**
 * Fetch a company by ID.
 */
export async function getCompanyById(id: string) {
    if (!id) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    try {
        const company = await CompanyRepository.getById(id);
        if (!company) {
            return { success: false, error: 'Empresa não encontrada.' };
        }
        return { success: true, data: company };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'getCompanyById');
        return { success: false, error: 'Falha ao buscar empresa.' };
    }
}


/**
 * Fetch all companies.
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
 * Create a new company.
 */
export async function createCompany(data: unknown) {
    const validation = companySettingsFormSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        return { success: false, error: Object.values(errors).flat().join(', ') };
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
 * Update an existing company.
 */
export async function updateCompany(id: string, data: unknown) {
    const validation = companySettingsFormSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        return { success: false, error: Object.values(errors).flat().join(', ') };
    }

    try {
        await CompanyRepository.update(id, validation.data);
        revalidatePath(`/company/${id}`);
        revalidatePath('/reports');
        return { success: true };
    } catch (error: any) {
        await ErrorLogRepository.log(error, 'updateCompany');
        return { success: false, error: 'Falha ao atualizar empresa.' };
    }
}

/**
 * Delete a company.
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
