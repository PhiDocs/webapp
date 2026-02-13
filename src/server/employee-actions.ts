'use server';

import { revalidatePath } from 'next/cache';
import { EmployeeRepository } from '@/repositories/employee.repository';
import { JobRoleRepository } from '@/repositories/job-role.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { z } from 'zod';
import { ptBr } from '@/lib/data/strings';
import { requireAuth } from '@/server/auth-guard';

// Server-side schema validation. Includes companyId.
const employeeServerSchema = z.object({
    firstName: z.string().min(1, ptBr.validations.firstName),
    lastName: z.string().min(1, ptBr.validations.lastName),
    email: z.string().email(ptBr.validations.invalidEmail),
    cpf: z.string().min(1, ptBr.validations.cpf),
    phone: z.string().optional(),
    roleId: z.string().optional(),
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
        await requireAuth({ matchCompanyId: companyId, requireCompany: true });
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
    try {
        await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
    } catch (error: any) {
        return { success: false, error: error.message || 'Acesso negado.' };
    }

    const validation = employeeServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        let finalRoleId = validation.data.roleId;

        // If roleId is missing or "new", creates the role
        if ((!finalRoleId || finalRoleId === 'new') && validation.data.roleName) {
            // Check if role already exists by name to avoid duplicates (optional optimization, but good practice)
            // For now, simpler: just create.
            finalRoleId = await JobRoleRepository.create({
                name: validation.data.roleName,
                companyId: validation.data.companyId,
                responsibilities: "",
                requiredCertificates: []
            });
        }

        if (!finalRoleId) {
            return { success: false, error: 'Função é obrigatória.' };
        }

        const hasSubcontractor = validation.data.subcontractorId && validation.data.subcontractorId !== 'N/A';
        const dataToSave = {
            ...validation.data,
            roleId: finalRoleId,
            subcontractorId: hasSubcontractor ? validation.data.subcontractorId : null,
            subcontractorName: hasSubcontractor ? (validation.data.subcontractorName ?? null) : null,
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
    try {
        await requireAuth({ role: 'admin', matchCompanyId: data.companyId, requireCompany: true });
    } catch (error: any) {
        return { success: false, error: error.message || 'Acesso negado.' };
    }

    const validation = employeeServerSchema.safeParse(data);
    if (!validation.success) {
        const errors = validation.error.flatten().fieldErrors;
        const firstError = Object.values(errors)[0]?.[0];
        return { success: false, error: firstError || 'Dados inválidos.' };
    }

    try {
        let finalRoleId = validation.data.roleId;

        if ((!finalRoleId || finalRoleId === 'new') && validation.data.roleName) {
            finalRoleId = await JobRoleRepository.create({
                name: validation.data.roleName,
                companyId: validation.data.companyId,
                responsibilities: "",
                requiredCertificates: []
            });
        }

        if (!finalRoleId) {
            return { success: false, error: 'Função é obrigatória.' };
        }

        const hasSubcontractor = validation.data.subcontractorId && validation.data.subcontractorId !== 'N/A';
        const dataToSave = {
            ...validation.data,
            roleId: finalRoleId,
            subcontractorId: hasSubcontractor ? validation.data.subcontractorId : null,
            subcontractorName: hasSubcontractor ? (validation.data.subcontractorName ?? null) : null,
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
        await requireAuth({ role: 'admin', matchCompanyId: companyId, requireCompany: true });
        await EmployeeRepository.delete(id, companyId);
        revalidatePath(`/company/${companyId}`);
        return { success: true };
    } catch (e: unknown) {
        const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao deletar funcionário.'));
        await ErrorLogRepository.log(error, 'deleteEmployee');
        return { success: false, error: error.message };
    }
}
