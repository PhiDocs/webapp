import type { SignatureDocument } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

export type SignatureDocumentCreate = Omit<SignatureDocument, 'id'>;

export const SignatureDocumentRepository = {
  async create(data: SignatureDocumentCreate): Promise<string> {
    const { data: created, error } = await createSupabaseAdminClient()
      .from('signatureDocuments')
      .insert(data)
      .select('id')
      .single();

    if (error) throw error;
    return created.id;
  },

  async getByCompany(companyId: string): Promise<SignatureDocument[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('signatureDocuments')
      .select('*')
      .eq('companyId', companyId)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data ?? []) as SignatureDocument[];
  },

  async getById(id: string): Promise<SignatureDocument | null> {
    const { data, error } = await createSupabaseAdminClient()
      .from('signatureDocuments')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data as SignatureDocument | null;
  },

  async getBySignerEmail(email: string): Promise<SignatureDocument[]> {
    const { data, error } = await createSupabaseAdminClient()
      .from('signatureDocuments')
      .select('*')
      .contains('signerEmails', [email.toLowerCase()])
      .order('createdAt', { ascending: false });

    if (error) throw error;
    return (data ?? []) as SignatureDocument[];
  },

  async update(id: string, data: Partial<SignatureDocument>): Promise<void> {
    const { error } = await createSupabaseAdminClient()
      .from('signatureDocuments')
      .update(data)
      .eq('id', id);

    if (error) throw error;
  },
};
