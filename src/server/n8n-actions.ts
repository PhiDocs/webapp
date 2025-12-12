'use server';

/**
 * Envia um payload para um webhook do n8n.
 * Usa a URL de produção por padrão, mas pode receber uma URL de teste.
 */
export async function notifyN8n(payload: any, webhookUrl?: string) {
  const N8N_PRODUCTION_URL = 'https://brave-husky-69.hooks.n8n.cloud/webhook/bafa018f-369f-4f8d-b192-1a0b0e7c3729';
  const targetUrl = webhookUrl || N8N_PRODUCTION_URL;

  if (!targetUrl) {
    const errorMsg = 'URL do webhook do n8n não configurada.';
    console.error(errorMsg);
    return {
      success: false,
      data: {
        error: errorMsg,
        details: 'Nenhuma URL de produção ou de teste foi fornecida.',
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
        n8nData = { message: n8nResponse.statusText || 'Resposta sem corpo JSON.' };
    }

    if (!n8nResponse.ok) {
      console.error('Erro retornado pelo n8n:', n8nData);
      return {
        success: false,
        data: {
          message: 'O servidor do n8n retornou um erro.',
          status: n8nResponse.status,
          details: (n8nData as any).message || 'Nenhum detalhe adicional.',
        },
      };
    }

    console.log('n8n notificado com sucesso!', n8nData);
    return {
      success: true,
      data: {
        message: 'Dados enviados para o n8n com sucesso!',
        dataReceivedByN8n: n8nData,
      },
    };

  } catch (error: any) {
    console.error('Falha de rede ao tentar contatar o n8n:', error.message);
    return {
        success: false,
        data: {
            error: 'Falha na conexão com o servidor do n8n.',
            details: error.message
        }
    };
  }
}
