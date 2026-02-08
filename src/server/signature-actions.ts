'use server';

import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { SignatureDocumentRepository } from '@/repositories/signature-document.repository';
import { generatePdfBuffer } from '@/server/pdf-generator';
import { createAssignment, createOrGetSigner, downloadSignedDocument, getDocumentStatus, uploadDocumentToAssinafy, waitForDocumentReady } from '@/server/assinafy-actions';
import type { Company, SafetyFormValues, SignatureDocument, SignatureSigner } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { DOCUMENT_TYPES } from '@/lib/constants';

function buildDocumentName(formData: SafetyFormValues) {
  const base = formData.documentType === DOCUMENT_TYPES.APR ? 'APR' : 'PT';
  const date = new Date().toISOString().split('T')[0];
  const workName = formData.workName ? `_${formData.workName.replace(/\s+/g, '_')}` : '';
  return `documento_${base}${workName}_${date}.pdf`;
}

type SignerInput = { name: string; email: string; phone?: string };

function getSignersFromForm(formData: SafetyFormValues): SignerInput[] {
  if (formData.documentType === DOCUMENT_TYPES.PT) {
    const ptSigners: SignerInput[] = [];
    const pt = formData.pt;

    // Colaboradores, vigias e resgatistas
    const allTeamMembers = [
      ...(pt.ptColaboradores || []),
      ...(pt.ptVigias || []),
      ...(pt.ptResgatistas || []),
    ];
    for (const member of allTeamMembers) {
      if (member.name && member.useAssinafy && member.email) {
        ptSigners.push({ name: member.name, email: member.email, phone: member.phone });
      }
    }

    // Signatários (gestor, responsável, SESMT)
    if (pt.ptGestorArea?.name && pt.ptGestorArea?.useAssinafy) {
      ptSigners.push({ name: pt.ptGestorArea.name, email: pt.ptGestorArea.email || '', phone: pt.ptGestorArea.phone });
    }
    if (pt.ptResponsavelAtividade?.name && pt.ptResponsavelAtividade?.useAssinafy) {
      ptSigners.push({ name: pt.ptResponsavelAtividade.name, email: pt.ptResponsavelAtividade.email || '', phone: pt.ptResponsavelAtividade.phone });
    }
    if (pt.ptSesmt?.name && pt.ptSesmt?.useAssinafy) {
      ptSigners.push({ name: pt.ptSesmt.name, email: pt.ptSesmt.email || '', phone: pt.ptSesmt.phone });
    }
    return ptSigners;
  }

  // APR: responsáveis + equipe de trabalho
  const responsibleSigners = (formData.responsiblePersons || [])
    .filter(p => p.name && p.useAssinafy)
    .map(p => ({ name: p.name, email: p.email || '', phone: p.phone }));

  const teamSigners = (formData.teamMembers || [])
    .filter(m => m.name && m.useAssinafy)
    .map(m => ({ name: m.name, email: m.email || '', phone: m.phone }));

  return [...responsibleSigners, ...teamSigners];
}

export async function sendDocumentForSignature({
  formData,
  analysisData,
  equipmentData,
  company,
}: {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
}): Promise<{ success: boolean; signatureDocumentId?: string; error?: string }> {
  try {
    if (!company?.id) {
      return { success: false, error: 'Empresa n\u00e3o identificada.' };
    }

    const signersInput = getSignersFromForm(formData);
    if (signersInput.length === 0) {
      return { success: false, error: 'Selecione pelo menos um signat\u00e1rio para assinar por e-mail.' };
    }
    const missingEmail = signersInput.find(s => !s.email);
    if (missingEmail) {
      return { success: false, error: 'Preencha o e-mail de todos os signat\u00e1rios.' };
    }

    const pdfBuffer = await generatePdfBuffer({ formData, analysisData, equipmentData, company });
    const documentName = buildDocumentName(formData);
    const pdfBlob = new Blob([pdfBuffer], { type: 'application/pdf' });

    const uploadResult = await uploadDocumentToAssinafy(pdfBlob, documentName);
    const assinafyDocumentId = uploadResult.documentId;
    await waitForDocumentReady(assinafyDocumentId);

    const signers: SignatureSigner[] = [];
    for (const signer of signersInput) {
      const signerResult = await createOrGetSigner(signer.name, signer.email, signer.phone);
      signers.push({
        name: signer.name,
        email: signer.email,
        phone: signer.phone,
        assinafySignerId: signerResult.signerId,
        status: 'pending',
      });
    }

    const assignmentResult = await createAssignment(
      assinafyDocumentId,
      signers.map(s => ({ id: s.assinafySignerId!, email: s.email }))
    );

    // Associar signing URLs a cada signatário
    const signingUrls = assignmentResult.signingUrls || [];
    for (const signer of signers) {
      const match = signingUrls.find(u => u.signer_id === signer.assinafySignerId);
      if (match) {
        signer.signingUrl = match.url;
      }
    }

    const signerEmails = signers.map(s => s.email.toLowerCase());

    const now = new Date().toISOString();
    const signatureDocument: Omit<SignatureDocument, 'id'> = {
      companyId: company.id,
      documentType: formData.documentType,
      documentName,
      assinafyDocumentId,
      assinafyAssignmentId: assignmentResult.assignmentId,
      status: 'pending',
      signers,
      signerEmails,
      createdAt: now,
      updatedAt: now,
      lastSyncedAt: now,
    };

    const signatureDocumentId = await SignatureDocumentRepository.create(signatureDocument);
    return { success: true, signatureDocumentId };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao enviar para assinatura.'));
    await ErrorLogRepository.log(error, 'sendDocumentForSignature');
    return { success: false, error: error.message };
  }
}

export async function getSignatureDocuments(companyId: string) {
  if (!companyId) {
    return { success: false, error: 'ID da empresa n\u00e3o fornecido.' };
  }

  try {
    const documents = await SignatureDocumentRepository.getByCompany(companyId);
    return { success: true, data: documents };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao buscar assinaturas.'));
    await ErrorLogRepository.log(error, 'getSignatureDocuments');
    return { success: false, error: error.message };
  }
}

export async function getSignatureDocumentsByEmail(email: string) {
  if (!email) {
    return { success: false, error: 'E-mail não fornecido.' };
  }

  try {
    const documents = await SignatureDocumentRepository.getBySignerEmail(email);
    return { success: true, data: documents };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao buscar documentos por e-mail.'));
    await ErrorLogRepository.log(error, 'getSignatureDocumentsByEmail');
    return { success: false, error: error.message };
  }
}

export async function refreshSignatureDocument(signatureDocumentId: string) {
  if (!signatureDocumentId) {
    return { success: false, error: 'ID do documento n\u00e3o fornecido.' };
  }

  try {
    const current = await SignatureDocumentRepository.getById(signatureDocumentId);
    if (!current) {
      return { success: false, error: 'Documento de assinatura n\u00e3o encontrado.' };
    }

    const statusResult = await getDocumentStatus(current.assinafyDocumentId);
    const now = new Date().toISOString();

    let updatedSigners = current.signers;
    if (statusResult.status === 'signed') {
      updatedSigners = current.signers.map(s => ({ ...s, status: 'signed' }));
    } else if (statusResult.status === 'declined') {
      updatedSigners = current.signers.map(s => ({ ...s, status: 'declined' }));
    }

    await SignatureDocumentRepository.update(signatureDocumentId, {
      status: statusResult.status,
      signers: updatedSigners,
      updatedAt: now,
      lastSyncedAt: now,
    });

    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao atualizar status.'));
    await ErrorLogRepository.log(error, 'refreshSignatureDocument');
    return { success: false, error: error.message };
  }
}

export async function downloadSignedPdf(signatureDocumentId: string) {
  if (!signatureDocumentId) {
    return { success: false, error: 'ID do documento n\u00e3o fornecido.' };
  }

  try {
    const current = await SignatureDocumentRepository.getById(signatureDocumentId);
    if (!current) {
      return { success: false, error: 'Documento de assinatura n\u00e3o encontrado.' };
    }

    const pdfBlob = await downloadSignedDocument(current.assinafyDocumentId);
    const arrayBuffer = await pdfBlob.arrayBuffer();
    return { success: true, data: { fileName: current.documentName, arrayBuffer } };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao baixar PDF.'));
    await ErrorLogRepository.log(error, 'downloadSignedPdf');
    return { success: false, error: error.message };
  }
}
