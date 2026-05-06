import type { Employee } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

type EmployeeData = Omit<Employee, 'id' | 'createdAt'>;

export const EmployeeRepository = {
  async getAllByCompany(companyId: string): Promise<Employee[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('employees')
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Employee[];
  },

  async create(data: EmployeeData): Promise<string> {
    const { data: created, error } = await createSupabaseAdminClient()
      .from('employees')
      .insert({
      ...data,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  },

  async update(employeeId: string, data: Partial<EmployeeData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating an employee.");
    }
    const { error } = await createSupabaseAdminClient()
      .from('employees')
      .update(data)
      .eq('id', employeeId)
      .eq('companyId', data.companyId);

    if (error) throw error;
  },

  async delete(employeeId: string, companyId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('employees')
      .update({
        deletedAt: new Date().toISOString()
      })
      .eq('id', employeeId)
      .eq('companyId', companyId);

    if (error) throw error;
  },
};
