import type { Content } from 'pdfmake/interfaces';
import type { PtSigner } from '@/lib/types';
import { SIGNATURE_TYPES } from '@/lib/constants';

/**
 * Checks if a string is a valid Base64 encoded data URL.
 */
export const isValidBase64 = (str: string | undefined): boolean => {
    if (!str || !str.includes(',') || !str.startsWith('data:image/')) return false;
    try {
        // Test decoding the Base64 part
        atob(str.split(',')[1]);
        return true;
    } catch (e) {
        console.error("Invalid Base64 string detected for PDF generation:", str.substring(0, 60) + "...");
        return false;
    }
}

/**
 * Formats a date string into a short 'pt-BR' format, handling timezone offsets.
 */
export function getShortDate(dateString: string | undefined | null): string {
    if (!dateString) return '...';
    try {
        const date = new Date(dateString);
        // Adjust for timezone to prevent date from shifting
        const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
        return zonedDate.toLocaleDateString('pt-BR');
    } catch (e) {
        return 'Data inválida';
    }
}

/**
 * Generates a content block for a signature to be used in pdfmake.
 * It handles typed, drawn, and uploaded signatures, with robust fallbacks.
 */
export const getSignatureContent = (signer: PtSigner | any): Content => {
    // Default fallback content to prevent pdfmake from crashing
    const fallbackContent: Content = { text: '', minHeight: 40, border: [false, false, false, true], borderColor: ['#000', '#000', '#000', '#000'] };

    if (!signer || !signer.signatureData || typeof signer.signatureData !== 'string') {
        return fallbackContent;
    }

    const { signatureData, signatureType } = signer;

    if (signatureType === SIGNATURE_TYPES.TYPED && signatureData.trim()) {
        return { 
            text: signatureData, 
            alignment: 'center', 
            margin: [0, 15, 0, 0], 
            border: [false, false, false, true], 
            borderColor: ['#000', '#000', '#000', '#000'], 
            italics: true, 
            fontSize: 16 
        };
    }
    
    if ((signatureType === SIGNATURE_TYPES.DRAW || signatureType === SIGNATURE_TYPES.UPLOAD) && isValidBase64(signatureData)) {
        return { 
            image: signatureData, 
            width: 120, 
            alignment: 'center', 
            margin: [0, 5, 0, 0] 
        };
    }

    // If none of the conditions are met, return the safe fallback content.
    return fallbackContent;
};

/**
 * Generates a checkbox canvas object for pdfmake.
 */
export const Checkbox = (checked: boolean): Content => ({
    canvas: [
      { type: 'rect', x: 0, y: 0, w: 8, h: 8, r: 1, lineColor: '#000', lineWidth: 0.5 },
      ...(checked ? [{ type: 'rect', x: 1.5, y: 1.5, w: 5, h: 5, color: '#000' }] : [])
    ]
});
