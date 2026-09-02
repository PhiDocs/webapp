import type { Work, WorkFormValues } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

function throwSupabaseError(error: unknown): never {
  if (error && typeof error === 'object') {
    const record = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [record.message, record.details, record.hint, record.code].filter(Boolean);
    throw new Error(parts.join(' ') || JSON.stringify(error));
  }

  throw new Error(String(error || 'Erro desconhecido no banco.'));
}

export const WorkRepository = {
  async getAllByCompany(companyId: string): Promise<Work[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('works')
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('createdAt', { ascending: false });

    if (error) throwSupabaseError(error);
    return (data ?? []) as Work[];
  },

  async create(data: WorkFormValues): Promise<string> {
    const { data: created, error } = await createSupabaseAdminClient()
      .from('works')
      .insert({
      ...data,
      createdAt: new Date().toISOString(),
      deletedAt: null,
      })
      .select('id')
      .single();

    if (error) throwSupabaseError(error);
    return created.id;
  },

  async update(workId: string, data: Partial<WorkFormValues>): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('works')
      .update(data)
      .eq('id', workId);

    if (error) throwSupabaseError(error);
  },

  async delete(workId: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('works')
      .update({
        deletedAt: new Date().toISOString()
      })
      .eq('id', workId);

    if (error) throwSupabaseError(error);
  },
};
