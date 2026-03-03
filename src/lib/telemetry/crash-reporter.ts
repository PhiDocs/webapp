'use client';

import * as Sentry from '@sentry/nextjs';

type CrashPayload = {
  source: 'window.onerror' | 'unhandledrejection' | 'manual';
  message: string;
  stack?: string;
  context?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
};

function postClientError(payload: CrashPayload) {
  const body = JSON.stringify({
    ...payload,
    url: window.location.href,
    userAgent: window.navigator.userAgent,
    timestamp: new Date().toISOString(),
  });

  // keepalive allows fire-and-forget for page unload scenarios
  void fetch('/api/client-errors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    keepalive: true,
  }).catch((error) => {
    console.warn('[telemetry] failed to send client error:', error);
  });

  Sentry.withScope((scope) => {
    scope.setTag('source', payload.source);
    scope.setTag('context', payload.context || 'none');
    if (payload.metadata) {
      scope.setContext('metadata', payload.metadata);
    }
    const error = new Error(payload.message);
    if (payload.stack) {
      error.stack = payload.stack;
    }
    Sentry.captureException(error);
  });
}

export function reportClientError(payload: CrashPayload) {
  if (typeof window === 'undefined') return;
  postClientError(payload);
}

export function installGlobalCrashHandlers(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const onError = (event: ErrorEvent) => {
    postClientError({
      source: 'window.onerror',
      message: event.message || 'Unknown window error',
      stack: event.error?.stack,
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  };

  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = typeof reason === 'string'
      ? reason
      : (reason?.message ?? 'Unhandled promise rejection');
    const stack = reason?.stack;

    postClientError({
      source: 'unhandledrejection',
      message,
      stack,
    });
  };

  window.addEventListener('error', onError);
  window.addEventListener('unhandledrejection', onUnhandledRejection);

  return () => {
    window.removeEventListener('error', onError);
    window.removeEventListener('unhandledrejection', onUnhandledRejection);
  };
}
