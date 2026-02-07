'use server';

const API_URL = process.env.ASSINAFY_API_URL;
const API_KEY = process.env.ASSINAFY_API_KEY;
const WORKSPACE_ID = process.env.ASSINAFY_WORKSPACE_ACCOUNT_ID;

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

export type AssinafyDocumentStatusResult = {
    status: AssinafyDocumentStatus;
    isClosed: boolean;
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
    documentName: string
): Promise<AssinafyUploadResult> {
    assertAssinafyConfig();
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
        console.error('Erro em uploadDocumentToAssinafy:', error);
        throw error;
    }
}

// ===== CRIAR/BUSCAR SIGNATÁRIO =====
export async function createOrGetSigner(
    name: string,
    email: string,
    whatsappPhone?: string
): Promise<AssinafySignerResult> {
    assertAssinafyConfig();
    try {
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
      console.error('Erro em createOrGetSigner:', error);
      throw error;
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
    signers: AssinafySignerInfo[]
): Promise<AssinafyAssignmentResult> {
    assertAssinafyConfig();
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
        console.error('Erro em createAssignment:', error);
        throw error;
    }
}

// ===== VERIFICAR STATUS DO DOCUMENTO =====
export async function getDocumentStatus(
    documentId: string
): Promise<AssinafyDocumentStatusResult> {
    assertAssinafyConfig();
    try {
        const response = await fetch(
            `${API_URL}/documents/${documentId}`,
            {
                method: 'GET',
                headers: { 'X-Api-Key': API_KEY },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao buscar status do documento: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return {
            status: (data.status || data?.data?.status) as AssinafyDocumentStatus,
            isClosed: data.is_closed || data?.data?.is_closed || false,
        };
    } catch (error) {
        console.error('Erro em getDocumentStatus:', error);
        throw error;
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

// ===== BAIXAR DOCUMENTO ASSINADO =====
export async function downloadSignedDocument(
    documentId: string
): Promise<Blob> {
    assertAssinafyConfig();
    try {
        const response = await fetch(
            `${API_URL}/documents/${documentId}/download/signed`,
            {
                method: 'GET',
                headers: { 'X-Api-Key': API_KEY },
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao baixar documento assinado: ${response.status} - ${errorText}`);
        }

        return await response.blob();
    } catch (error) {
        console.error('Erro em downloadSignedDocument:', error);
        throw error;
    }
}

// ===== REENVIAR CONVITE DE ASSINATURA =====
export async function resendAssignmentNotification(
    assignmentId: string
): Promise<{ success: boolean }> {
    assertAssinafyConfig();
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
        console.error('Erro em resendAssignmentNotification:', error);
        throw error;
    }
}
