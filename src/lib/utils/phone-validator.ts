/**
 * Valida se um telefone brasileiro é válido
 * Aceita: 11 dígitos (DDD + 9 + número) ou 10 dígitos (DDD + número fixo)
 */
export function isValidBrazilianPhone(phone: string): boolean {
    const cleaned = phone.replace(/\D/g, '');

    // Aceita 10 ou 11 dígitos
    return cleaned.length === 11 || cleaned.length === 10;
}

/**
 * Formata telefone para exibição
 * Exemplo: 41996639204 -> (41) 99663-9204
 */
export function formatPhoneDisplay(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (cleaned.length === 11) {
        // (41) 99663-9204
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }

    if (cleaned.length === 10) {
        // (41) 9663-9204
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }

    return phone;
}

/**
 * Remove formatação do telefone, deixando apenas números
 */
export function cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '');
}
