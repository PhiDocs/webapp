import { NextResponse } from 'next/server';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import * as Sentry from '@sentry/nextjs';

type ClientErrorBody = {
  source?: string;
  message?: string;
  stack?: string;
  context?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClientErrorBody;
    const message = body.message?.trim() || 'Client error without message';
    const stackLines = [
      body.stack ? `stack: ${body.stack}` : null,
      body.context ? `context: ${body.context}` : null,
      body.url ? `url: ${body.url}` : null,
      body.userAgent ? `ua: ${body.userAgent}` : null,
      body.source ? `source: ${body.source}` : null,
      body.timestamp ? `client_timestamp: ${body.timestamp}` : null,
      body.metadata ? `metadata: ${JSON.stringify(body.metadata)}` : null,
    ].filter(Boolean);

    const error = new Error(message);
    if (stackLines.length > 0) {
      error.stack = stackLines.join('\n');
    }

    Sentry.withScope((scope) => {
      scope.setTag('source', body.source || 'client_error_route');
      scope.setTag('context', body.context || 'none');
      scope.setContext('request', {
        url: body.url,
        userAgent: body.userAgent,
        timestamp: body.timestamp,
      });
      if (body.metadata) {
        scope.setContext('metadata', body.metadata);
      }
      const sentryError = new Error(message);
      if (body.stack) {
        sentryError.stack = body.stack;
      }
      Sentry.captureException(sentryError);
    });

    await ErrorLogRepository.log(error, 'client-crash-report');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[client-errors] failed to persist client error:', error);
    Sentry.withScope((scope) => {
      scope.setTag('source', 'client_error_route_failure');
      if (error instanceof Error) {
        Sentry.captureException(error);
      } else {
        Sentry.captureException(new Error('Unknown error on /api/client-errors'));
      }
    });
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
