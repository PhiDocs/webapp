// Using objects as enums for better JS compatibility.
// See: https://www.sobyte.net/post/2021-08/typescript-enum/

export const DOCUMENT_TYPES = {
    APR: 'APR',
    PT: 'PT',
} as const;

export type DocumentType = typeof DOCUMENT_TYPES[keyof typeof DOCUMENT_TYPES];


export const SIGNATURE_TYPES = {
    TYPED: 'typed',
    DRAW: 'draw',
    UPLOAD: 'upload',
} as const;

export type SignatureType = typeof SIGNATURE_TYPES[keyof typeof SIGNATURE_TYPES];


export const N8N_EVENTS = {
    PDF_GENERATED: 'pdf_generated',
    DOCUMENT_SENT_FOR_SIGNATURE: 'document:sent_for_signature',
    DOCUMENT_FULLY_SIGNED: 'document:fully_signed',
    SIGNATURE_DECLINED: 'signature:declined',
} as const;

export type N8NEvent = typeof N8N_EVENTS[keyof typeof N8N_EVENTS];


export const PT_FIT_STATUS = {
    YES: 'sim',
    NO: 'nao',
    EMPTY: '',
} as const;

export type PTFitStatus = typeof PT_FIT_STATUS[keyof typeof PT_FIT_STATUS];
