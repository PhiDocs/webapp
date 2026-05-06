'use server';

import { DocumentRepository } from '@/repositories/document.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import type { SafetyFormValues, SavedDocument } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { DOCUMENT_TYPES } from '@/lib/constants';
import type { DocumentType } from '@/lib/constants';
import { requireAuth } from '@/server/auth-guard';

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
}: {
  companyId: string;
  documentId?: string;
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
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

    if (documentId) {
      // Atualizar documento existente
      await DocumentRepository.update(documentId, {
        formData: safeFormData,
        analysisData: safeAnalysisData,
        equipmentData: safeEquipmentData,
        documentName,
        documentType: formData.documentType as DocumentType,
        updatedAt: now,
      });
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
    await DocumentRepository.update(documentId, {
      status: 'sent',
      signatureDocumentId,
      updatedAt: new Date().toISOString(),
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
