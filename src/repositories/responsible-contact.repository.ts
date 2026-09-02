import type { ResponsibleContact, ResponsibleContactInput } from '@/lib/types';
import { createSupabaseAdminClient } from '@/supabase/server';

const TABLE = 'responsible_contacts';

function throwSupabaseError(error: unknown): never {
  if (error && typeof error === 'object') {
    const record = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [record.message, record.details, record.hint, record.code].filter(Boolean);
    throw new Error(parts.join(' ') || JSON.stringify(error));
  }

  throw new Error(String(error || 'Erro desconhecido no banco.'));
}

function sameContact(contact: ResponsibleContact, name: string, role: string) {
  return contact.name.trim().toLowerCase() === name.trim().toLowerCase()
    && contact.role.trim().toLowerCase() === role.trim().toLowerCase();
}

export const ResponsibleContactRepository = {
  async getAllByCompany(companyId: string): Promise<ResponsibleContact[]> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('companyId', companyId)
      .is('deletedAt', null)
      .order('name', { ascending: true });

    if (error) throwSupabaseError(error);
    return (data ?? []) as ResponsibleContact[];
  },

  /**
   * Grava o responsavel no cadastro reutilizavel da empresa.
   * Se a mesma pessoa (nome + funcao) ja existir, atualiza os dados de contato
   * em vez de duplicar o cadastro.
   */
  async save(companyId: string, input: ResponsibleContactInput): Promise<ResponsibleContact> {
    const supabase = createSupabaseAdminClient();
    const now = new Date().toISOString();
    const name = input.name.trim();
    const role = input.role.trim();

    const existingContacts = await this.getAllByCompany(companyId);
    const existing = existingContacts.find((contact) => sameContact(contact, name, role));

    if (existing) {
      const { data: updated, error } = await supabase
        .from(TABLE)
        .update({
          organization: input.organization ?? existing.organization ?? null,
          email: input.email ?? existing.email ?? null,
          phone: input.phone ?? existing.phone ?? null,
          signsByDefault: input.signsByDefault,
          isActive: true,
          updatedAt: now,
        })
        .eq('id', existing.id)
        .select('*')
        .single();

      if (error) throwSupabaseError(error);
      return updated as ResponsibleContact;
    }

    const { data: created, error } = await supabase
      .from(TABLE)
      .insert({
        companyId,
        name,
        role,
        organization: input.organization ?? null,
        email: input.email ?? null,
        phone: input.phone ?? null,
        signsByDefault: input.signsByDefault,
        isActive: input.isActive,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      .select('*')
      .single();

    if (error) throwSupabaseError(error);
    return created as ResponsibleContact;
  },
};
