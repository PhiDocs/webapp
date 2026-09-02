'use server';

import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { SignatureDocumentRepository } from '@/repositories/signature-document.repository';
import { generatePdfBuffer } from '@/server/pdf-generator';
import { createAssignment, createOrGetSigner, downloadSignedDocument, getDocumentStatus, resendAssignmentNotification, uploadDocumentToAssinafy, waitForDocumentReady } from '@/server/assinafy-actions';
import type { Company, SafetyFormValues, SignatureDocument, SignatureSigner } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { DOCUMENT_TYPES } from '@/lib/constants';
import { requireAuth, getSession } from '@/server/auth-guard';
import { DocumentRepository } from '@/repositories/document.repository';
import { DocumentEventRepository } from '@/repositories/document-event.repository';
import { DOCUMENT_STATUS } from '@/lib/document-status';

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

    // Liberacao como lista (formato novo, igual ao da APR)
    for (const pessoa of pt.ptResponsaveis || []) {
      if (pessoa.name && pessoa.useAssinafy) {
        ptSigners.push({ name: pessoa.name, email: pessoa.email || '', phone: pessoa.phone });
      }
    }

    // Signatários nomeados (legado): so entram se a lista acima estiver vazia.
    const temListaDeResponsaveis = (pt.ptResponsaveis || []).some((pessoa) => pessoa.name);
    if (!temListaDeResponsaveis && pt.ptGestorArea?.name && pt.ptGestorArea?.useAssinafy) {
      ptSigners.push({ name: pt.ptGestorArea.name, email: pt.ptGestorArea.email || '', phone: pt.ptGestorArea.phone });
    }
    if (!temListaDeResponsaveis && pt.ptResponsavelAtividade?.name && pt.ptResponsavelAtividade?.useAssinafy) {
      ptSigners.push({ name: pt.ptResponsavelAtividade.name, email: pt.ptResponsavelAtividade.email || '', phone: pt.ptResponsavelAtividade.phone });
    }
    if (!temListaDeResponsaveis && pt.ptSesmt?.name && pt.ptSesmt?.useAssinafy) {
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
    await requireAuth({ matchCompanyId: company.id, requireCompany: true });

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
    await requireAuth({ matchCompanyId: companyId, requireCompany: true });
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
    const auth = await requireAuth();
    const normalizedEmail = email.toLowerCase();
    const authEmail = auth.email?.toLowerCase();
    if (auth.role !== 'admin' && (!authEmail || authEmail !== normalizedEmail)) {
      return { success: false, error: 'Acesso negado.' };
    }

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
    return { success: false, error: 'ID do documento não fornecido.' };
  }

  try {
    const current = await SignatureDocumentRepository.getById(signatureDocumentId);
    if (!current) {
      return { success: false, error: 'Documento de assinatura não encontrado.' };
    }
    await requireAuth({ matchCompanyId: current.companyId, requireCompany: true });

    console.log(`[refreshSignature] Atualizando documento ${signatureDocumentId}`);
    console.log(`[refreshSignature] assinafyDocumentId: ${current.assinafyDocumentId}`);

    // Buscar status do documento (inclui signatários e artifacts)
    const docStatus = await getDocumentStatus(current.assinafyDocumentId);
    console.log(`[refreshSignature] Status do documento: ${docStatus.status}, isClosed: ${docStatus.isClosed}`);
    console.log(`[refreshSignature] Signatários da API:`, JSON.stringify(docStatus.signers, null, 2));

    // Mapear status: "certificated" e "signed" = documento completo
    const isDocumentCompleted = docStatus.status === 'certificated' || docStatus.status === 'signed';
    const isDocumentDeclined = docStatus.status === 'declined';

    // Atualizar status individual dos signatários
    const updatedSigners = current.signers.map(signer => {
      // Encontrar o signatário correspondente na resposta da API (por signerId ou email)
      const match = docStatus.signers.find(
        as => as.signerId === signer.assinafySignerId || as.email.toLowerCase() === signer.email.toLowerCase()
      );

      if (match) {
        const newStatus = match.completed ? 'signed' as const : 'pending' as const;
        console.log(`[refreshSignature] Signatário ${signer.email}: ${signer.status} → ${newStatus} (completed: ${match.completed})`);
        return { ...signer, status: newStatus };
      }

      // Fallback: se o documento inteiro está completo/recusado, aplicar a todos
      if (isDocumentCompleted) {
        console.log(`[refreshSignature] Signatário ${signer.email}: ${signer.status} → signed (documento certificated)`);
        return { ...signer, status: 'signed' as const };
      }
      if (isDocumentDeclined) {
        console.log(`[refreshSignature] Signatário ${signer.email}: ${signer.status} → declined (documento declined)`);
        return { ...signer, status: 'declined' as const };
      }

      console.log(`[refreshSignature] Signatário ${signer.email}: sem match na API, mantendo ${signer.status}`);
      return signer;
    });

    // Normalizar status para salvar: "certificated" → "signed" no nosso banco
    const normalizedStatus = isDocumentCompleted ? 'signed' : docStatus.status;

    const now = new Date().toISOString();
    await SignatureDocumentRepository.update(signatureDocumentId, {
      status: normalizedStatus as any,
      signers: updatedSigners,
      updatedAt: now,
      lastSyncedAt: now,
    });

    // O status tambem passa a viver no documento, para a lista nao precisar
    // cruzar as duas tabelas em memoria para descobrir o estado.
    const documento = await DocumentRepository.getBySignatureDocumentId(signatureDocumentId);
    if (documento) {
      const novoStatus = isDocumentCompleted
        ? DOCUMENT_STATUS.SIGNED
        : isDocumentDeclined
          ? DOCUMENT_STATUS.DECLINED
          : DOCUMENT_STATUS.AWAITING_SIGNATURE;

      if (documento.status !== novoStatus) {
        await DocumentRepository.update(documento.id, { status: novoStatus, updatedAt: now } as any);
        const sessao = await getSession();
        await DocumentEventRepository.record({
          companyId: documento.companyId,
          documentId: documento.id,
          action: isDocumentCompleted ? 'signed' : isDocumentDeclined ? 'declined' : 'signature_synced',
          userUid: sessao?.uid,
          userEmail: sessao?.email,
          documentStatus: novoStatus,
          version: (documento as any).version ?? 1,
          detail: `Sincronizado com a Assinafy (${docStatus.status}).`,
        });
      }
    }

    console.log(`[refreshSignature] Documento ${signatureDocumentId} atualizado. Status API: ${docStatus.status} → Salvo: ${normalizedStatus}`);
    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao atualizar status.'));
    console.error('[refreshSignature] ERRO:', error.message);
    await ErrorLogRepository.log(error, 'refreshSignatureDocument');
    return { success: false, error: error.message };
  }
}

export async function resendSignatureNotification(signatureDocumentId: string) {
  if (!signatureDocumentId) {
    return { success: false, error: 'ID do documento não fornecido.' };
  }

  try {
    const current = await SignatureDocumentRepository.getById(signatureDocumentId);
    if (!current) {
      return { success: false, error: 'Documento de assinatura não encontrado.' };
    }
    await requireAuth({ matchCompanyId: current.companyId, requireCompany: true });

    if (current.status === 'signed') {
      return { success: false, error: 'Documento já foi assinado.' };
    }

    await resendAssignmentNotification(current.assinafyAssignmentId);
    return { success: true };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao reenviar convite.'));
    await ErrorLogRepository.log(error, 'resendSignatureNotification');
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
    await requireAuth({ matchCompanyId: current.companyId, requireCompany: true });

    const pdfBlob = await downloadSignedDocument(current.assinafyDocumentId);
    const arrayBuffer = await pdfBlob.arrayBuffer();
    return { success: true, data: { fileName: current.documentName, arrayBuffer } };
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error(String(e ?? 'Erro desconhecido ao baixar PDF.'));
    await ErrorLogRepository.log(error, 'downloadSignedPdf');
    return { success: false, error: error.message };
  }
}
