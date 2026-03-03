'use client';

import { trackEvent } from '@/lib/telemetry/analytics';

export function trackLoginSuccess(method: 'email_password') {
  void trackEvent('login_success', { method });
}

export function trackPdfDownloaded(params: { documentType?: string; documentId?: string; companyId?: string }) {
  void trackEvent('pdf_downloaded', params);
}

export function trackSignatureSent(params: { documentType?: string; documentId?: string; companyId?: string; signerCount?: number }) {
  void trackEvent('signature_sent', params);
}

export function trackRevisionCreated(params: { source: 'document' | 'signature'; documentId?: string; companyId?: string }) {
  void trackEvent('document_revision_created', params);
}

export function trackFormClearedAfterDownload(params: { documentId?: string; companyId?: string }) {
  void trackEvent('form_cleared_after_download', params);
}

export function trackApiError(params: { context: string; message: string }) {
  void trackEvent('api_error', params);
}

