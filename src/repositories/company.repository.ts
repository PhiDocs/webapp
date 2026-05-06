import type { Company } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

export const CompanyRepository = {
  async getById(id: string): Promise<Company | null> {
    const { data, error } = await createSupabaseAdminClient()
      .from('companies')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as Company | null;
  },

  async getAll(): Promise<Company[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('companies')
      .select('*')
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data ?? []) as Company[];
  },

  async create(data: { name: string }): Promise<string> {
    const { data: created, error } = await createSupabaseAdminClient()
      .from('companies')
      .insert({
      ...data,
      n8nProductionUrl: '',
      n8nTestUrl: '',
      createdAt: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  },

  async update(companyId: string, data: { [key: string]: any }): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('companies')
      .update(data)
      .eq('id', companyId);

    if (error) throw error;
  },

  async delete(companyId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('companies')
      .delete()
      .eq('id', companyId);

    if (error) throw error;
  },
};
