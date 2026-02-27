'use server';

import { DocumentRepository } from '@/repositories/document.repository';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { SignatureDocumentRepository } from '@/repositories/signature-document.repository';
import type { SafetyFormValues, SavedDocument } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { DOCUMENT_TYPES } from '@/lib/constants';
import type { DocumentType } from '@/lib/constants';
import { requireAuth } from '@/server/auth-guard';
import { randomUUID } from 'crypto';

function buildDocumentName(formData: SafetyFormValues) {
  const base = formData.documentType === DOCUMENT_TYPES.APR ? 'APR' : 'PT';
  const date = new Date().toISOString().split('T')[0];
  const sanitizedWorkName = formData.workName ? formData.workName.replace(/\s+/g, '_') : '';
  if (formData.documentType === DOCUMENT_TYPES.APR && formData.documentNumber) {
    const revision = String(formData.revisionNumber || 1).padStart(2, '0');
    const workPart = sanitizedWorkName ? `_${sanitizedWorkName}` : '';
    return `${formData.documentNumber}_rev${revision}${workPart}_${date}`;
  }
  const workPart = sanitizedWorkName ? `_${sanitizedWorkName}` : '';
  return `${base}${workPart}_${date}`;
}

function formatAprNumber(sequence: number): string {
  return `APR-${sequence.toString().padStart(4, '0')}`;
}

const FINALIZED_STATUSES: SavedDocument['status'][] = ['completed', 'signed', 'certificated'];

// Firestore rejects `undefined` values at any nesting level.
// This recursively converts undefined → null so the data can be saved.
function sanitizeForFirestore(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore);
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    result[key] = sanitizeForFirestore(value);
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
    const isApr = formData.documentType === DOCUMENT_TYPES.APR;
    const formDataWithRevision: SafetyFormValues = { ...formData };
    const safeAnalysisData = sanitizeForFirestore(analysisData);
    const safeEquipmentData = sanitizeForFirestore(equipmentData);

    if (documentId) {
      const existing = await DocumentRepository.getById(documentId);
      if (!existing) {
        return { success: false, error: 'Documento não encontrado.' };
      }

      if (isApr) {
        formDataWithRevision.documentNumber = formData.documentNumber || existing.documentNumber || undefined;
        formDataWithRevision.revisionNumber = formData.revisionNumber || existing.revisionNumber || 1;
      }

      const safeFormData = sanitizeForFirestore(formDataWithRevision);
      const documentName = buildDocumentName(formDataWithRevision);

      // Atualizar documento existente
      await DocumentRepository.update(documentId, {
        formData: safeFormData,
        analysisData: safeAnalysisData,
        equipmentData: safeEquipmentData,
        documentName,
        documentType: formDataWithRevision.documentType as DocumentType,
        ...(isApr
          ? {
              documentNumber: formDataWithRevision.documentNumber,
              revisionNumber: formDataWithRevision.revisionNumber,
              documentSequence: existing.documentSequence,
              revisionGroupId: existing.revisionGroupId || existing.id,
            }
          : {}),
        updatedAt: now,
      });
      console.log('[saveDocument] Updated document:', documentId);
      return { success: true, documentId };
    }

    if (isApr) {
      const sequence = await DocumentRepository.reserveNextAprSequence(companyId);
      formDataWithRevision.documentNumber = formatAprNumber(sequence);
      formDataWithRevision.revisionNumber = 1;
      const safeFormData = sanitizeForFirestore(formDataWithRevision);
      const documentName = buildDocumentName(formDataWithRevision);
      const revisionGroupId = randomUUID();

      const newId = await DocumentRepository.create({
        companyId,
        documentType: formDataWithRevision.documentType as DocumentType,
        documentName,
        status: 'draft',
        documentNumber: formDataWithRevision.documentNumber,
        revisionNumber: formDataWithRevision.revisionNumber,
        documentSequence: sequence,
        revisionGroupId,
        formData: safeFormData,
        analysisData: safeAnalysisData,
        equipmentData: safeEquipmentData,
        createdAt: now,
        updatedAt: now,
      });

      console.log('[saveDocument] Created APR document with id:', newId);
      return { success: true, documentId: newId };
    }

    const safeFormData = sanitizeForFirestore(formDataWithRevision);
    const documentName = buildDocumentName(formDataWithRevision);

    // Criar novo documento
    const newId = await DocumentRepository.create({
      companyId,
      documentType: formDataWithRevision.documentType as DocumentType,
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
      status: 'pending',
      signatureDocumentId,
      updatedAt: new Date().toISOString(),
    });
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao atualizar status do documento.'));
    await ErrorLogRepository.log(error, 'markDocumentAsSent');
  }
}

export async function markDocumentAsCompleted(documentId: string) {
  try {
    const document = await DocumentRepository.getById(documentId);
    if (!document) {
      throw new Error('Documento não encontrado.');
    }
    await requireAuth({ matchCompanyId: document.companyId, requireCompany: true });
    await DocumentRepository.update(documentId, {
      status: 'completed',
      updatedAt: new Date().toISOString(),
    });
    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao atualizar status do documento.'));
    await ErrorLogRepository.log(error, 'markDocumentAsCompleted');
    return { success: false, error: error.message };
  }
}

export async function createDocumentRevision(documentId: string): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    if (!documentId) {
      return { success: false, error: 'ID do documento não fornecido.' };
    }

    const source = await DocumentRepository.getById(documentId);
    if (!source) {
      return { success: false, error: 'Documento não encontrado.' };
    }

    await requireAuth({ matchCompanyId: source.companyId, requireCompany: true });

    if (source.documentType !== DOCUMENT_TYPES.APR) {
      return { success: false, error: 'Somente APR permite revisão encadeada.' };
    }

    if (!FINALIZED_STATUSES.includes(source.status)) {
      return { success: false, error: 'Apenas documentos concluídos/assinados podem gerar revisão.' };
    }

    const revisionGroupId = source.revisionGroupId || source.id;
    const latest = await DocumentRepository.getLatestRevisionByGroupId(revisionGroupId);
    const newRevisionNumber = (latest?.revisionNumber || source.revisionNumber || 1) + 1;
    const documentNumber = source.documentNumber || formatAprNumber(source.documentSequence || 1);
    const now = new Date().toISOString();

    const revisionFormData: SafetyFormValues = {
      ...source.formData,
      documentType: DOCUMENT_TYPES.APR,
      documentNumber,
      revisionNumber: newRevisionNumber,
    };

    const newId = await DocumentRepository.create({
      companyId: source.companyId,
      documentType: DOCUMENT_TYPES.APR,
      documentName: buildDocumentName(revisionFormData),
      status: 'draft',
      documentNumber,
      revisionNumber: newRevisionNumber,
      documentSequence: source.documentSequence,
      revisionGroupId,
      sourceDocumentId: source.id,
      formData: sanitizeForFirestore(revisionFormData),
      analysisData: sanitizeForFirestore(source.analysisData),
      equipmentData: sanitizeForFirestore(source.equipmentData),
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, documentId: newId };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao criar revisão do documento.'));
    await ErrorLogRepository.log(error, 'createDocumentRevision');
    return { success: false, error: error.message };
  }
}

export async function createDocumentRevisionFromSignature(signatureDocumentId: string): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    if (!signatureDocumentId) {
      return { success: false, error: 'ID da assinatura não fornecido.' };
    }

    const signatureDoc = await SignatureDocumentRepository.getById(signatureDocumentId);
    if (!signatureDoc) {
      return { success: false, error: 'Documento de assinatura não encontrado.' };
    }

    await requireAuth({ matchCompanyId: signatureDoc.companyId, requireCompany: true });

    let source = await DocumentRepository.getBySignatureDocumentId(signatureDocumentId);
    if (!source) {
      source = await DocumentRepository.getLatestByCompanyAndDocumentName(signatureDoc.companyId, signatureDoc.documentName);
    }
    if (!source) {
      return { success: false, error: 'Não foi possível localizar o documento base para revisão.' };
    }

    if (!FINALIZED_STATUSES.includes(source.status) && (signatureDoc.status === 'signed' || signatureDoc.status === 'certificated')) {
      await DocumentRepository.update(source.id, {
        status: signatureDoc.status,
        updatedAt: new Date().toISOString(),
      });
    }

    return createDocumentRevision(source.id);
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro ao criar revisão a partir da assinatura.'));
    await ErrorLogRepository.log(error, 'createDocumentRevisionFromSignature');
    return { success: false, error: error.message };
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
