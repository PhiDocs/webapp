'use server';

import { N8nService } from '@/services/n8n.service';
import { ptBr } from '@/lib/data/strings';

const N8N_ERROR_MESSAGES = {
  WEBHOOK_NOT_CONFIGURED: ptBr.validations.n8nWebhookNotConfigured,
  NO_URL_PROVIDED: ptBr.validations.n8nNoUrlProvided,
  RESPONSE_ERROR: ptBr.validations.n8nResponseError,
  CONNECTION_ERROR: ptBr.validations.n8nConnectionError,
};


/**
 * Envia um payload para um webhook do n8n.
 * Usa a URL de produção por padrão, mas pode receber uma URL de teste.
 */
export async function notifyN8n(payload: any, webhookUrl?: string) {
  const n8nProductionUrl = process.env.N8N_PRODUCTION_URL;
  const targetUrl = webhookUrl || n8nProductionUrl;

  if (!targetUrl) {
    const errorMsg = N8N_ERROR_MESSAGES.WEBHOOK_NOT_CONFIGURED;
    console.error(errorMsg);
    return {
      success: false,
      data: {
        error: errorMsg,
        details: N8N_ERROR_MESSAGES.NO_URL_PROVIDED,
      },
    };
  }

  try {
    const result = await N8nService.send(targetUrl, payload);
    return { success: true, data: result };
  } catch (error: any) {
    console.error(N8N_ERROR_MESSAGES.CONNECTION_ERROR, error.message);
    return {
        success: false,
        data: {
            error: error.message || N8N_ERROR_MESSAGES.RESPONSE_ERROR,
            details: error.details || error.message,
            status: error.status
        }
    };
  }
}
