'use server';

const API_URL = process.env.ASSINAFY_API_URL!;
const API_KEY = process.env.ASSINAFY_API_KEY!;
const WORKSPACE_ID = process.env.ASSINAFY_WORKSPACE_ACCOUNT_ID!;

// ===== TIPOS =====
export type AssinafyDocumentStatus =
    | 'uploaded'
    | 'pending'
    | 'signed'
    | 'declined'
    | 'expired';

export type AssinafySignerInfo = {
    id: string;
    email: string;
    hasWhatsApp: boolean;
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
        return { documentId: data.id, status: data.status };
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
            throw new Error(`Erro ao criar signatário: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return { signerId: data.data.id };
    } catch (error) {
        console.error('Erro em createOrGetSigner:', error);
        throw error;
    }
}

// ===== SOLICITAR ASSINATURAS =====
export async function createAssignment(
    documentId: string,
    signers: AssinafySignerInfo[]
): Promise<AssinafyAssignmentResult> {
    try {
        const response = await fetch(
            `${API_URL}/documents/${documentId}/assignments`,
            {
                method: 'POST',
                headers: {
                    'X-Api-Key': API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    method: 'virtual',
                    signers: signers.map(s => ({
                        id: s.id,
                        verification_method: 'Email',
                        // Enviar por Email + WhatsApp se tiver telefone
                        notification_methods: s.hasWhatsApp
                            ? ['Email', 'WhatsApp']
                            : ['Email'],
                    })),
                }),
            }
        );

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro ao criar assignment: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return {
            assignmentId: data.id,
            signingUrls: data.signing_urls || [],
        };
    } catch (error) {
        console.error('Erro em createAssignment:', error);
        throw error;
    }
}

// ===== VERIFICAR STATUS DO DOCUMENTO =====
export async function getDocumentStatus(
    documentId: string
): Promise<AssinafyDocumentStatusResult> {
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
            status: data.status as AssinafyDocumentStatus,
            isClosed: data.is_closed || false,
        };
    } catch (error) {
        console.error('Erro em getDocumentStatus:', error);
        throw error;
    }
}

// ===== BAIXAR DOCUMENTO ASSINADO =====
export async function downloadSignedDocument(
    documentId: string
): Promise<Blob> {
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
