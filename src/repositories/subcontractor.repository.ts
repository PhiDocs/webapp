import type { Subcontractor } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

type SubcontractorData = Omit<Subcontractor, 'id' | 'createdAt'>;

export const SubcontractorRepository = {
  async getAllByCompany(companyId: string): Promise<Subcontractor[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('subcontractors')
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Subcontractor[];
  },

  async create(data: SubcontractorData): Promise<string> {
    const { data: created, error } = await createSupabaseAdminClient()
      .from('subcontractors')
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

  async update(subcontractorId: string, data: Partial<SubcontractorData>): Promise<void> {
    if (!data.companyId) {
        throw new Error("companyId is required for updating a subcontractor.");
    }
    const { error } = await createSupabaseAdminClient()
      .from('subcontractors')
      .update(data)
      .eq('id', subcontractorId)
      .eq('companyId', data.companyId);

    if (error) throw error;
  },

  async delete(subcontractorId: string, companyId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('subcontractors')
      .update({
        deletedAt: new Date().toISOString()
      })
      .eq('id', subcontractorId)
      .eq('companyId', companyId);

    if (error) throw error;
  },
};
