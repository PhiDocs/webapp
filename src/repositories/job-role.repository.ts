import type { JobRole } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

type JobRoleData = Omit<JobRole, 'id' | 'createdAt'>;

export const JobRoleRepository = {
  async getAllByCompany(companyId: string): Promise<JobRole[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('jobRoles')
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data ?? []) as JobRole[];
  },

  async create(data: JobRoleData): Promise<string> {
    const { data: created, error } = await createSupabaseAdminClient()
      .from('jobRoles')
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

  async update(jobRoleId: string, data: Partial<JobRoleData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating a job role.");
    }
    const { error } = await createSupabaseAdminClient()
      .from('jobRoles')
      .update(data)
      .eq('id', jobRoleId)
      .eq('companyId', data.companyId);

    if (error) throw error;
  },

  async delete(jobRoleId: string, companyId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('jobRoles')
      .update({
        deletedAt: new Date().toISOString()
      })
      .eq('id', jobRoleId)
      .eq('companyId', companyId);

    if (error) throw error;
  },
};
