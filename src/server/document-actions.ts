'use server';

import { DocumentRepository } from '@/repositories/document.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import type { SafetyFormValues, SavedDocument } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { DOCUMENT_TYPES } from '@/lib/constants';
import type { DocumentType } from '@/lib/constants';

function buildDocumentName(formData: SafetyFormValues) {
  const base = formData.documentType === DOCUMENT_TYPES.APR ? 'APR' : 'PT';
  const date = new Date().toISOString().split('T')[0];
  const workName = formData.workName ? `_${formData.workName.replace(/\s+/g, '_')}` : '';
  return `${base}${workName}_${date}`;
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
    if (!companyId) {
      return { success: false, error: 'Empresa não identificada.' };
    }

    const now = new Date().toISOString();
    const documentName = buildDocumentName(formData);

    if (documentId) {
      // Atualizar documento existente
      await DocumentRepository.update(documentId, {
        formData,
        analysisData,
        equipmentData,
        documentName,
        documentType: formData.documentType as DocumentType,
        updatedAt: now,
      });
      return { success: true, documentId };
    }

    // Criar novo documento
    const newId = await DocumentRepository.create({
      companyId,
      documentType: formData.documentType as DocumentType,
      documentName,
      status: 'draft',
      formData,
      analysisData,
      equipmentData,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, documentId: newId };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao salvar documento.'));
    await ErrorLogRepository.log(error, 'saveDocument');
    return { success: false, error: error.message };
  }
}

export async function markDocumentAsSent(documentId: string, signatureDocumentId: string) {
  try {
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
    await DocumentRepository.delete(documentId);
    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao excluir documento.'));
    await ErrorLogRepository.log(error, 'deleteDocument');
    return { success: false, error: error.message };
  }
}
