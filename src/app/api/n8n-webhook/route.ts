import { NextResponse } from 'next/server';

/**
 * Esta é a sua rota de API que atua como uma ponte para o n8n.
 * Ela recebe uma requisição POST do seu próprio aplicativo e a repassa
 * para o webhook do n8n que você configurar.
 */
export async function POST(request: Request) {
  /**
   * Passo 1: Substitua esta URL pela URL do seu webhook de *teste* do n8n.
   * Você pode encontrar essa URL no seu workflow do n8n, no nó "Webhook".
   * Quando estiver pronto para produção, troque pela URL de produção.
   */
  const N8N_WEBHOOK_URL = 'https://SEU_WEBHOOK_URL_DO_N8N.com/webhook/test';

  if (N8N_WEBHOOK_URL.includes('SEU_WEBHOOK_URL_DO_N8N')) {
    return NextResponse.json(
      {
        error: 'URL do webhook do n8n não configurada.',
        message: 'Por favor, edite o arquivo `src/app/api/n8n-webhook/route.ts` e substitua a URL do webhook.',
      },
      { status: 500 }
    );
  }

  try {
    // Pega os dados enviados pelo seu app (a partir da função `handleGeneratePdf`)
    const body = await request.json();

    // Envia os dados para o n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Verifica se o n8n recebeu os dados com sucesso
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('Erro ao enviar dados para o n8n:', errorText);
      return NextResponse.json(
        { error: 'Falha ao se comunicar com o n8n.', details: errorText },
        { status: n8nResponse.status }
      );
    }

    // Retorna uma resposta de sucesso para o seu app
    return NextResponse.json({
      message: 'Dados enviados para o n8n com sucesso!',
      dataReceivedByN8n: await n8nResponse.json(),
    });

  } catch (error: any) {
    console.error('Erro interno no webhook:', error);
    return NextResponse.json(
      { error: 'Ocorreu um erro no servidor.', details: error.message },
      { status: 500 }
    );
  }
}
