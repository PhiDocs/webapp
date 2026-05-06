import type { SavedDocument } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

export type SavedDocumentCreate = Omit<SavedDocument, 'id'>;

export const DocumentRepository = {
  async create(data: SavedDocumentCreate): Promise<string> {
    const { data: created, error } = await createSupabaseAdminClient()
      .from('documents')
      .insert(data)
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  },

  async getByCompany(companyId: string): Promise<SavedDocument[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('documents')
      .select('*')
      .eq('companyId', companyId)
      .order('updatedAt', { ascending: false });

    if (error) throw error;
    return (data ?? []) as SavedDocument[];
  },

  async getById(id: string): Promise<SavedDocument | null> {
    const { data, error } = await createSupabaseAdminClient()
      .from('documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as SavedDocument | null;
  },

  async update(id: string, data: Partial<SavedDocument>): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('documents')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },
};
