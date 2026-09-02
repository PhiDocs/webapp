import { createSupabaseAdminClient } from '@/supabase/server';

const TABLE = 'document_events';

export type DocumentEventAction =
  | 'created'
  | 'updated'
  | 'in_review'
  | 'pdf_generated'
  | 'sent_for_signature'
  | 'signature_synced'
  | 'signed'
  | 'declined'
  | 'completed'
  | 'cancelled'
  | 'blocked_edit';

export type DocumentEvent = {
  id: string;
  companyId: string;
  documentId: string;
  action: DocumentEventAction;
  userUid?: string | null;
  userEmail?: string | null;
  documentStatus?: string | null;
  version?: number | null;
  detail?: string | null;
  createdAt: string;
};

export type DocumentEventInput = Omit<DocumentEvent, 'id' | 'createdAt'>;

export const DocumentEventRepository = {
  /**
   * A trilha nunca derruba a operacao principal: se o registro falhar, a acao
   * do usuario continua valendo e o erro fica no console.
   */
  async record(input: DocumentEventInput): Promise<void> {
    try {
      const supabase = createSupabaseAdminClient();
      const { error } = await supabase.from(TABLE).insert({
        companyId: input.companyId,
        documentId: input.documentId,
        action: input.action,
        userUid: input.userUid ?? null,
        userEmail: input.userEmail ?? null,
        documentStatus: input.documentStatus ?? null,
        version: input.version ?? null,
        detail: input.detail ?? null,
      });
      if (error) console.warn('[document-events] falha ao registrar:', error.message);
    } catch (e) {
      console.warn('[document-events] falha ao registrar:', e);
    }
  },

  /**
   * Historico do documento, do mais recente para o mais antigo.
   * O limite existe para a tela nunca receber um historico gigante de uma vez.
   */
  async listByDocument(documentId: string, limite = 50): Promise<DocumentEvent[]> {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('documentId', documentId)
      .order('createdAt', { ascending: false })
      .limit(limite);

    if (error) throw new Error(error.message);
    return (data ?? []) as DocumentEvent[];
  },
};
