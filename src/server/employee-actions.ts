'use server';

import { revalidatePath } from 'next/cache';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { z } from 'zod';
import { ptBr } from '@/lib/data/strings';

// Server-side schema validation. Includes companyId.
const employeeServerSchema = z.object({
  firstName: z.string().min(1, ptBr.validations.firstName),
  lastName: z.string().min(1, ptBr.validations.lastName),
  email: z.string().email(ptBr.validations.invalidEmail),
  cpf: z.string().min(1, ptBr.validations.cpf),
  roleId: z.string().min(1, ptBr.validations.roleId),
  roleName: z.string(),
  subcontractorId: z.string().optional().nullable(),
  subcontractorName: z.string().optional().nullable(),
  companyId: z.string().min(1, "ID da empresa é obrigatório."),
});

type EmployeeServerValues = z.infer<typeof employeeServerSchema>;


/**
 * Fetch all employees for a company.
 */
export async function getEmployees(companyId: string) {
    if (!companyId) {
        return { success: false, error: 'ID da empresa não fornecido.' };
    }
    try {
        const employees = await EmployeeRepository.getAllByCompany(companyId);
        return { success: true, data: employees };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao buscar funcionários.'));
        await ErrorLogRepository.log(error, 'getEmployees');
        return { success: false, error: error.message };
    }
}

/**
 * Create a new employee.
 */
export async function createEmployee(data: EmployeeServerValues) {
    const validation = employeeServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        const dataToSave = {
            ...validation.data,
            subcontractorId: validation.data.subcontractorId === 'N/A' ? null : validation.data.subcontractorId,
            subcontractorName: validation.data.subcontractorId === 'N/A' ? null : validation.data.subcontractorName,
        };
        await EmployeeRepository.create(dataToSave);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao criar funcionário.'));
        await ErrorLogRepository.log(error, 'createEmployee', data.email);
        return { success: false, error: error.message };
    }
}

/**
 * Update an existing employee.
 */
export async function updateEmployee(id: string, data: EmployeeServerValues) {
    const validation = employeeServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        const dataToSave = {
            ...validation.data,
            subcontractorId: validation.data.subcontractorId === 'N/A' ? null : validation.data.subcontractorId,
            subcontractorName: validation.data.subcontractorId === 'N/A' ? null : validation.data.subcontractorName,
        };
        await EmployeeRepository.update(id, dataToSave);
        revalidatePath(`/company/${validation.data.companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao atualizar funcionário.'));
        await ErrorLogRepository.log(error, 'updateEmployee', data.email);
        return { success: false, error: error.message };
    }
}

/**
 * Delete an employee.
 */
export async function deleteEmployee(id: string, companyId: string) {
    if (!id || !companyId) {
        return { success: false, error: 'ID do funcionário ou da empresa não fornecido.' };
    }
    
    try {
        await EmployeeRepository.delete(id, companyId);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao deletar funcionário.'));
        await ErrorLogRepository.log(error, 'deleteEmployee');
        return { success: false, error: error.message };
    }
}
