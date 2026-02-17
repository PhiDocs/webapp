'use server';

import { requireAuth } from '@/server/auth-guard';
import { ErrorLogRepository } from '@/repositories/error-log.repository';

const API_URL = process.env.ASSINAFY_API_URL ?? '';
const API_KEY = process.env.ASSINAFY_API_KEY ?? '';
const WORKSPACE_ID = process.env.ASSINAFY_WORKSPACE_ACCOUNT_ID ?? '';
const ALLOWED_EMAILS = (process.env.ASSINAFY_ALLOWED_EMAILS ?? '')
  .split(',')
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);
const ALLOWED_EMAIL_DOMAINS = (process.env.ASSINAFY_ALLOWED_EMAIL_DOMAINS ?? '')
  .split(',')
  .map(d => d.trim().toLowerCase())
  .filter(Boolean);
const ALLOWED_PHONE_PREFIXES = (process.env.ASSINAFY_ALLOWED_PHONE_PREFIXES ?? '')
  .split(',')
  .map(p => p.trim())
  .filter(Boolean);

function asError(err: unknown): Error {
  return err instanceof Error ? err : new Error(typeof err === 'string' ? err : JSON.stringify(err));
}

type AccessContext = { companyId?: string };

async function ensureAssinafyAccess(context?: AccessContext) {
  return requireAuth({ matchCompanyId: context?.companyId, requireCompany: true });
}

function isEmailAllowed(email: string): boolean {
  const normalized = email.toLowerCase();
  if (ALLOWED_EMAILS.length && ALLOWED_EMAILS.includes(normalized)) return true;
  if (ALLOWED_EMAIL_DOMAINS.length) {
    const domain = normalized.split('@')[1];
    if (!domain) return false;
    if (ALLOWED_EMAIL_DOMAINS.includes(domain)) return true;
    return false;
  }
  // Nenhuma allowlist configurada → permitir para ambientes de dev
  return true;
}

function isPhoneAllowed(phone?: string): boolean {
  if (!phone) return true; // não bloquear por falta
  if (ALLOWED_PHONE_PREFIXES.length === 0) return true;
  const digits = phone.replace(/\s+/g, '');
  return ALLOWED_PHONE_PREFIXES.some(prefix => digits.startsWith(prefix));
}

function assertAssinafyConfig() {
    if (!API_URL || !API_KEY || !WORKSPACE_ID) {
        const missing = [
            !API_URL && 'ASSINAFY_API_URL',
            !API_KEY && 'ASSINAFY_API_KEY',
            !WORKSPACE_ID && 'ASSINAFY_WORKSPACE_ACCOUNT_ID',
        ].filter(Boolean).join(', ');
        throw new Error(`Configuração Assinafy incompleta. Variáveis faltando no .env: ${missing}`);
    }
}

// ===== TIPOS =====
export type AssinafyDocumentStatus =
    | 'uploaded'
    | 'pending'
    | 'signed'
    | 'certificated'
    | 'declined'
    | 'expired'
    | 'metadata_processing';

export type AssinafySignerInfo = {
    id: string;
    email: string;
    hasWhatsApp?: boolean;
};

export type AssinafyUploadResult = {
    documentId: string;
    status: string;
};

export type AssinafySignerResult = {
    signerId: string;
};

export type AssinafyAssignmentResult = {
    assignmentId: string;
    signingUrls: Array<{ signer_id: string; url: string }>;
};

export type AssinafySignerStatus = {
    signerId: string;
    email: string;
    fullName: string;
    completed: boolean;
};

export type AssinafyDocumentStatusResult = {
    status: AssinafyDocumentStatus;
    isClosed: boolean;
    signers: AssinafySignerStatus[];
    certificatedUrl: string | null;
    rawResponse: any;
};

// ===== HELPER: FORMATAR TELEFONE =====
function formatPhoneToInternational(phone: string): string {
    // Remove tudo que não é número
    const cleaned = phone.replace(/\D/g, '');

    // Se já começa com 55, retorna com +
    if (cleaned.startsWith('55')) {
        return `+${cleaned}`;
    }

    // Se tem 11 dígitos (DDD + 9 + número), adiciona +55
    if (cleaned.length === 11) {
        return `+55${cleaned}`;
    }

    // Se tem 10 dígitos (DDD + número fixo), adiciona +55
    if (cleaned.length === 10) {
        return `+55${cleaned}`;
    }

    // Se tem 9 dígitos, assume que falta DDD e adiciona +55
    if (cleaned.length === 9) {
        // Não podemos adivinhar o DDD, retornar erro
        throw new Error('Telefone inválido: falta o DDD');
    }

    // Retorna como está se não conseguir formatar
    return `+${cleaned}`;
}

// ===== UPLOAD DE DOCUMENTO =====
export async function uploadDocumentToAssinafy(
    pdfBlob: Blob,
    documentName: string,
    context?: AccessContext
): Promise<AssinafyUploadResult> {
    assertAssinafyConfig();
    await ensureAssinafyAccess(context);
    try {
        const formData = new FormData();
        formData.append('file', pdfBlob, documentName);

        const response = await fetch(
            `${API_URL}/accounts/${WORKSPACE_ID}/documents`,
            {
                method: 'POST',
                headers: { 'X-Api-Key': API_KEY },
                body: formData,
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao fazer upload do documento: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const documentId =
            data?.id ||
            data?.data?.id ||
            data?.data?.document_id ||
            data?.data?.document?.id;

        if (!documentId) {
            console.error('Resposta inesperada no upload Assinafy:', data);
            throw new Error('Resposta de upload sem documentId.');
        }

        return { documentId, status: data.status || data?.data?.status };
    } catch (error) {
        const err = asError(error);
        console.error('Erro em uploadDocumentToAssinafy:', err);
        await ErrorLogRepository.log(err, 'assinafy-upload');
        throw err;
    }
}

// ===== CRIAR/BUSCAR SIGNATÁRIO =====
export async function createOrGetSigner(
    name: string,
    email: string,
    whatsappPhone?: string,
    context?: AccessContext
): Promise<AssinafySignerResult> {
    assertAssinafyConfig();
    await ensureAssinafyAccess(context);
    try {
        if (!isEmailAllowed(email)) {
            throw new Error('E-mail não permitido para assinatura.');
        }
        if (!isPhoneAllowed(whatsappPhone)) {
            throw new Error('Telefone não permitido para assinatura.');
        }

        // Formatar telefone para padrão internacional se fornecido
        const formattedPhone = whatsappPhone
            ? formatPhoneToInternational(whatsappPhone)
            : undefined;

        const body: any = {
            full_name: name,
            email: email,
        };

        if (formattedPhone) {
            body.whatsapp_phone_number = formattedPhone;
        }

        const response = await fetch(
            `${API_URL}/accounts/${WORKSPACE_ID}/signers`,
            {
                method: 'POST',
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            const message = (() => {
                try {
                    return JSON.parse(errorText)?.message as string | undefined;
                } catch {
                    return undefined;
                }
            })();

            if (response.status === 400 && message?.toLowerCase().includes('já existe')) {
                const existing = await findSignerByEmail(email);
                if (existing) {
                    return { signerId: existing.id };
                }
            }

            throw new Error(`Erro ao criar signatário: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return { signerId: data.data.id };
    } catch (error) {
      const err = asError(error);
      console.error('Erro em createOrGetSigner:', err);
      await ErrorLogRepository.log(err, 'assinafy-create-signer');
      throw err;
  }
}

async function findSignerByEmail(email: string): Promise<{ id: string } | null> {
    const perPage = 100;
    let page = 1;

    while (page <= 5) {
        const response = await fetch(
            `${API_URL}/accounts/${WORKSPACE_ID}/signers?search=${encodeURIComponent(email)}&per-page=${perPage}&page=${page}`,
            {
                method: 'GET',
                headers: {
                    'X-Api-Key': API_KEY,
                },
            }
        );

        if (!response.ok) {
            break;
        }

        const data = await response.json();
        const items = Array.isArray(data?.data) ? data.data : [];
        const match = items.find((s: any) => (s?.email || '').toLowerCase() === email.toLowerCase());
        if (match?.id) {
            return { id: match.id };
        }

        if (items.length < perPage) {
            break;
        }
        page += 1;
    }

    return null;
}

// ===== SOLICITAR ASSINATURAS =====
export async function createAssignment(
    documentId: string,
    signers: AssinafySignerInfo[],
    context?: AccessContext
): Promise<AssinafyAssignmentResult> {
    assertAssinafyConfig();
    await ensureAssinafyAccess(context);
    try {
        const endpoint = `${API_URL}/documents/${documentId}/assignments`;

        let lastErrorText = '';
        let lastStatus = 0;
        const maxAttempts = 10;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    method: 'virtual',
                    signerIds: signers.map(s => s.id),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const assignmentId = data?.id || data?.data?.id;
                if (!assignmentId) {
                    console.error('Resposta inesperada ao criar assignment:', data);
                    throw new Error('Resposta de assignment sem id.');
                }
                return {
                    assignmentId,
                    signingUrls: data.signing_urls || data?.data?.signing_urls || [],
                };
            }

            lastStatus = response.status;
            lastErrorText = await response.text();

            if (response.status === 400 && lastErrorText.includes('metadata_processing')) {
                await waitForDocumentReady(documentId, { timeoutMs: 120000, intervalMs: 3000 });
                continue;
            }

            throw new Error(`Erro ao criar assignment: ${response.status} - ${lastErrorText}`);
        }

        throw new Error(`Erro ao criar assignment: ${lastStatus} - ${lastErrorText}`);
    } catch (error) {
        const err = asError(error);
        console.error('Erro em createAssignment:', err);
        await ErrorLogRepository.log(err, 'assinafy-create-assignment');
        throw err;
    }
}

// ===== VERIFICAR STATUS DO DOCUMENTO =====
export async function getDocumentStatus(
    documentId: string
): Promise<AssinafyDocumentStatusResult> {
    assertAssinafyConfig();
    await ensureAssinafyAccess();
    try {
        const url = `${API_URL}/documents/${documentId}`;
        console.log(`[Assinafy] GET ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-Api-Key': API_KEY },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Assinafy] getDocumentStatus ERRO ${response.status}:`, errorText);
            throw new Error(`Erro ao buscar status do documento: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Assinafy] getDocumentStatus response body:`, JSON.stringify(data, null, 2));

        // A resposta da API vem em { status: 200, data: { ... } }
        const doc = data?.data || data;
        const status = doc.status as AssinafyDocumentStatus;
        const isClosed = doc.is_closed || false;

        // Extrair status dos signatários do assignment.summary.signers
        const summarySigners = doc?.assignment?.summary?.signers || [];
        const itemsMap = new Map<string, boolean>();
        for (const item of (doc?.assignment?.items || [])) {
            const signerId = item?.signer?.id;
            if (signerId) {
                itemsMap.set(signerId, item.completed === true);
            }
        }

        const signers: AssinafySignerStatus[] = summarySigners.map((s: any) => ({
            signerId: s.id || '',
            email: s.email || '',
            fullName: s.full_name || '',
            completed: s.completed === true || itemsMap.get(s.id) === true,
        }));

        // URL do PDF certificado (documento assinado)
        const certificatedUrl = doc?.artifacts?.certificated || null;

        console.log(`[Assinafy] Document ${documentId} → status: ${status}, isClosed: ${isClosed}, certificatedUrl: ${certificatedUrl ? 'sim' : 'não'}`);
        console.log(`[Assinafy] Signers:`, JSON.stringify(signers, null, 2));

        return { status, isClosed, signers, certificatedUrl, rawResponse: data };
    } catch (error) {
        const err = asError(error);
        console.error('[Assinafy] Erro em getDocumentStatus:', err);
        await ErrorLogRepository.log(err, 'assinafy-get-status');
        throw err;
    }
}

// ===== AGUARDAR PROCESSAMENTO =====
export async function waitForDocumentReady(
    documentId: string,
    {
        timeoutMs = 60000,
        intervalMs = 2000,
    }: { timeoutMs?: number; intervalMs?: number } = {}
): Promise<void> {
    await ensureAssinafyAccess();
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
        const statusResult = await getDocumentStatus(documentId);
        if (statusResult.status !== 'metadata_processing') {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    throw new Error('Timeout aguardando processamento do documento na Assinafy.');
}

// ===== BAIXAR DOCUMENTO ASSINADO (CERTIFICADO) =====
export async function downloadSignedDocument(
    documentId: string
): Promise<Blob> {
    assertAssinafyConfig();
    await ensureAssinafyAccess();
    try {
        // Usar artifacts.certificated da resposta do documento
        const url = `${API_URL}/documents/${documentId}/download/certificated`;
        console.log(`[Assinafy] Baixando PDF certificado: GET ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-Api-Key': API_KEY },
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Assinafy] downloadSignedDocument ERRO ${response.status}:`, errorText);
            throw new Error(`Erro ao baixar documento assinado: ${response.status} - ${errorText}`);
        }

        console.log(`[Assinafy] PDF certificado baixado com sucesso (${response.headers.get('content-length') || '?'} bytes)`);
        return await response.blob();
    } catch (error) {
        const err = asError(error);
        console.error('[Assinafy] Erro em downloadSignedDocument:', err);
        await ErrorLogRepository.log(err, 'assinafy-download-signed');
        throw err;
    }
}

// ===== REENVIAR CONVITE DE ASSINATURA =====
export async function resendAssignmentNotification(
    assignmentId: string
): Promise<{ success: boolean }> {
    assertAssinafyConfig();
    await ensureAssinafyAccess();
    try {
        const response = await fetch(
            `${API_URL}/assignments/${assignmentId}/resend`,
            {
                method: 'POST',
                headers: { 'X-Api-Key': API_KEY },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao reenviar convite: ${response.status} - ${errorText}`);
        }

        return { success: true };
    } catch (error) {
        const err = asError(error);
        console.error('Erro em resendAssignmentNotification:', err);
        await ErrorLogRepository.log(err, 'assinafy-resend');
        throw err;
    }
}
