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
 * @param payload - Os dados a serem enviados.
 * @param webhookUrl - A URL do webhook para a qual enviar os dados.
 */
export async function notifyN8n(payload: any, webhookUrl?: string) {
  if (!webhookUrl) {
    const errorMsg = "URL do Webhook não fornecida para a notificação.";
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
    const result = await N8nService.send(webhookUrl, payload);
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
