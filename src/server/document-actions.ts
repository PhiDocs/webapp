'use server';

import { DocumentRepository } from '@/repositories/document.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import type { SafetyFormValues, SavedDocument } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { DOCUMENT_TYPES } from '@/lib/constants';
import type { DocumentType } from '@/lib/constants';
import { requireAuth, getSession } from '@/server/auth-guard';
import { DocumentEventRepository } from '@/repositories/document-event.repository';
import { DOCUMENT_STATUS, podeEditarConteudo, resolverStatus } from '@/lib/document-status';

function buildDocumentName(formData: SafetyFormValues) {
  const base = formData.documentType === DOCUMENT_TYPES.APR ? 'APR' : 'PT';
  const date = new Date().toISOString().split('T')[0];
  const workName = formData.workName ? `_${formData.workName.replace(/\s+/g, '_')}` : '';
  return `${base}${workName}_${date}`;
}

// JSONB does not preserve undefined values. Convert them to null before saving.
function sanitizeForDatabase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForDatabase);
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeForDatabase(value);
  }
  return result;
}

export async function saveDocument({
  companyId,
  documentId,
  formData,
  analysisData,
  equipmentData,
  silencioso = false,
}: {
  companyId: string;
  documentId?: string;
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  /**
   * Guarda automatica. Nao entra na trilha de auditoria nem conta versao: a
   * trilha registra o que a pessoa decidiu fazer, nao o rascunho se salvando.
   */
  silencioso?: boolean;
}): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    console.log('[saveDocument] Called with companyId:', companyId, 'documentId:', documentId);
    if (!companyId) {
      console.log('[saveDocument] No companyId, aborting.');
      return { success: false, error: 'Empresa não identificada.' };
    }

    const now = new Date().toISOString();
    const documentName = buildDocumentName(formData);
    const safeFormData = sanitizeForDatabase(formData);
    const safeAnalysisData = sanitizeForDatabase(analysisData);
    const safeEquipmentData = sanitizeForDatabase(equipmentData);

    const sessao = await getSession();

    if (documentId) {
      const atual = await DocumentRepository.getById(documentId);
      if (!atual) {
        return { success: false, error: 'Documento nao encontrado.' };
      }

      // Depois de enviado para assinatura, o conteudo nao muda em silencio.
      const statusAtual = resolverStatus(atual as any);
      if (!podeEditarConteudo(statusAtual)) {
        await DocumentEventRepository.record({
          companyId,
          documentId,
          action: 'blocked_edit',
          userUid: sessao?.uid,
          userEmail: sessao?.email,
          documentStatus: statusAtual,
          version: (atual as any).version ?? 1,
          detail: 'Tentativa de alterar documento que ja saiu para assinatura.',
        });
        return {
          success: false,
          error: 'Este documento ja foi enviado para assinatura e nao pode mais ser alterado.',
        };
      }

      const versaoAtual = (atual as any).version ?? 1;
      const proximaVersao = silencioso ? versaoAtual : versaoAtual + 1;
      await DocumentRepository.update(documentId, {
        formData: safeFormData,
        analysisData: safeAnalysisData,
        equipmentData: safeEquipmentData,
        documentName,
        documentType: formData.documentType as DocumentType,
        updatedAt: now,
        version: proximaVersao,
      } as any);

      if (!silencioso) {
        await DocumentEventRepository.record({
          companyId,
          documentId,
          action: 'updated',
          userUid: sessao?.uid,
          userEmail: sessao?.email,
          documentStatus: statusAtual,
          version: proximaVersao,
        });
      }

      console.log('[saveDocument] Updated document:', documentId);
      return { success: true, documentId };
    }

    // Criar novo documento
    const newId = await DocumentRepository.create({
      companyId,
      documentType: formData.documentType as DocumentType,
      documentName,
      status: 'draft',
      formData: safeFormData,
      analysisData: safeAnalysisData,
      equipmentData: safeEquipmentData,
      createdAt: now,
      updatedAt: now,
      createdBy: sessao?.uid ?? null,
    } as any);

    await DocumentEventRepository.record({
      companyId,
      documentId: newId,
      action: 'created',
      userUid: sessao?.uid,
      userEmail: sessao?.email,
      documentStatus: DOCUMENT_STATUS.DRAFT,
      version: 1,
    });

    console.log('[saveDocument] Created new document with id:', newId);
    return { success: true, documentId: newId };
  } catch (e: unknown) {
    console.error('[saveDocument] Error:', e);
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao salvar documento.'));
    await ErrorLogRepository.log(error, 'saveDocument');
    return { success: false, error: error.message };
  }
}

export async function markDocumentAsSent(documentId: string, signatureDocumentId: string) {
  try {
    const document = await DocumentRepository.getById(documentId);
    if (!document) {
      throw new Error('Documento não encontrado.');
    }
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });
    const agora = new Date().toISOString();
    const sessao = await getSession();

    await DocumentRepository.update(documentId, {
      status: DOCUMENT_STATUS.AWAITING_SIGNATURE,
      signatureDocumentId,
      updatedAt: agora,
      lockedAt: agora,
    } as any);

    await DocumentEventRepository.record({
      companyId: document.companyId,
      documentId,
      action: 'sent_for_signature',
      userUid: sessao?.uid,
      userEmail: sessao?.email,
      documentStatus: DOCUMENT_STATUS.AWAITING_SIGNATURE,
      version: (document as any).version ?? 1,
      detail: `Documento de assinatura ${signatureDocumentId}.`,
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao atualizar status do documento.'));
    await ErrorLogRepository.log(error, 'markDocumentAsSent');
  }
}

export async function getDocuments(companyId: string): Promise<{ success: boolean; data?: SavedDocument[]; error?: string }> {
  try {
    if (!companyId) {
      return { success: false, error: 'ID da empresa não fornecido.' };
    }
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
    const documents = await DocumentRepository.getByCompany(companyId);
    return { success: true, data: documents };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao buscar documentos.'));
    await ErrorLogRepository.log(error, 'getDocuments');
    return { success: false, error: error.message };
  }
}

export async function getDocument(documentId: string): Promise<{ success: boolean; data?: SavedDocument; error?: string }> {
  try {
    if (!documentId) {
      return { success: false, error: 'ID do documento não fornecido.' };
    }
    const document = await DocumentRepository.getById(documentId);
    if (!document) {
      return { success: false, error: 'Documento não encontrado.' };
    }
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });
    return { success: true, data: document };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao buscar documento.'));
    await ErrorLogRepository.log(error, 'getDocument');
    return { success: false, error: error.message };
  }
}

export async function deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!documentId) {
      return { success: false, error: 'ID do documento não fornecido.' };
    }
    const document = await DocumentRepository.getById(documentId);
    if (!document) {
      return { success: false, error: 'Documento não encontrado.' };
    }
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });
    await DocumentRepository.delete(documentId);
    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao excluir documento.'));
    await ErrorLogRepository.log(error, 'deleteDocument');
    return { success: false, error: error.message };
  }
}

/** Trilha de auditoria de um documento, do mais recente para o mais antigo. */
export async function getDocumentEvents(documentId: string) {
  try {
    const document = await DocumentRepository.getById(documentId);
    if (!document) {
      return { success: false, error: 'Documento nao encontrado.' };
    }
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });

    const events = await DocumentEventRepository.listByDocument(documentId);
    return { success: true, data: events };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao buscar historico.'));
    await ErrorLogRepository.log(error, 'getDocumentEvents');
    return { success: false, error: error.message };
  }
}

/**
 * Marca o documento como revisado. E o passo entre o rascunho e o envio:
 * o conteudo esta pronto, mas ainda nao saiu para assinatura.
 */
export async function markDocumentInReview(documentId: string) {
  try {
    const document = await DocumentRepository.getById(documentId);
    if (!document) return { success: false, error: 'Documento nao encontrado.' };
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });

    const statusAtual = resolverStatus(document as any);
    if (!podeEditarConteudo(statusAtual)) {
      return { success: false, error: 'Este documento ja saiu para assinatura.' };
    }

    const sessao = await getSession();
    await DocumentRepository.update(documentId, {
      status: DOCUMENT_STATUS.IN_REVIEW,
      updatedAt: new Date().toISOString(),
    } as any);

    await DocumentEventRepository.record({
      companyId: document.companyId,
      documentId,
      action: 'in_review',
      userUid: sessao?.uid,
      userEmail: sessao?.email,
      documentStatus: DOCUMENT_STATUS.IN_REVIEW,
      version: (document as any).version ?? 1,
    });

    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao marcar revisao.'));
    await ErrorLogRepository.log(error, 'markDocumentInReview');
    return { success: false, error: error.message };
  }
}

/** Arquiva o documento apos todas as assinaturas. */
export async function completeDocument(documentId: string) {
  try {
    const document = await DocumentRepository.getById(documentId);
    if (!document) return { success: false, error: 'Documento nao encontrado.' };
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });

    const sessao = await getSession();
    await DocumentRepository.update(documentId, {
      status: DOCUMENT_STATUS.COMPLETED,
      updatedAt: new Date().toISOString(),
    } as any);

    await DocumentEventRepository.record({
      companyId: document.companyId,
      documentId,
      action: 'completed',
      userUid: sessao?.uid,
      userEmail: sessao?.email,
      documentStatus: DOCUMENT_STATUS.COMPLETED,
      version: (document as any).version ?? 1,
    });

    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao concluir documento.'));
    await ErrorLogRepository.log(error, 'completeDocument');
    return { success: false, error: error.message };
  }
}

/** Registra que um PDF foi gerado. Nao muda o status. */
export async function logPdfGenerated(documentId: string) {
  try {
    const document = await DocumentRepository.getById(documentId);
    if (!document) return { success: false };
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });
    const sessao = await getSession();

    await DocumentEventRepository.record({
      companyId: document.companyId,
      documentId,
      action: 'pdf_generated',
      userUid: sessao?.uid,
      userEmail: sessao?.email,
      documentStatus: document.status,
      version: (document as any).version ?? 1,
    });
    return { success: true };
  } catch {
    return { success: false };
  }
}
