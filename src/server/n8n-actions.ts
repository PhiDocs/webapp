'use server';

const N8N_ERROR_MESSAGES = {
  WEBHOOK_NOT_CONFIGURED: 'URL do webhook do n8n não configurada.',
  NO_URL_PROVIDED: 'Nenhuma URL de produção ou de teste foi fornecida.',
  RESPONSE_ERROR: 'O servidor do n8n retornou um erro.',
  NO_DETAILS: 'Nenhum detalhe adicional.',
  NO_JSON_RESPONSE: 'Resposta sem corpo JSON.',
  CONNECTION_ERROR: 'Falha na conexão com o servidor do n8n.',
};

/**
 * Envia um payload para um webhook do n8n.
 * Usa a URL de produção por padrão, mas pode receber uma URL de teste.
 */
export async function notifyN8n(payload: any, webhookUrl?: string) {
  const N8N_PRODUCTION_URL = process.env.N8N_PRODUCTION_URL;
  const targetUrl = webhookUrl || N8N_PRODUCTION_URL;

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
    const n8nResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let n8nData;
    try {
        n8nData = await n8nResponse.json();
    } catch (e) {
        n8nData = { message: n8nResponse.statusText || N8N_ERROR_MESSAGES.NO_JSON_RESPONSE };
    }

    if (!n8nResponse.ok) {
      console.error(N8N_ERROR_MESSAGES.RESPONSE_ERROR, n8nData);
      return {
        success: false,
        data: {
          message: N8N_ERROR_MESSAGES.RESPONSE_ERROR,
          status: n8nResponse.status,
          details: (n8nData as any).message || N8N_ERROR_MESSAGES.NO_DETAILS,
        },
      };
    }

    return {
      success: true,
      data: {
        message: 'Data sent to n8n successfully.',
        dataReceivedByN8n: n8nData,
      },
    };

  } catch (error: any) {
    console.error(N8N_ERROR_MESSAGES.CONNECTION_ERROR, error.message);
    return {
        success: false,
        data: {
            error: N8N_ERROR_MESSAGES.CONNECTION_ERROR,
            details: error.message
        }
    };
  }
}
