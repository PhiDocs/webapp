'use server';

import { NextResponse } from 'next/server';

/**
 * Esta é a sua rota de API que atua como uma ponte para o n8n.
 * Ela recebe uma requisição POST do seu próprio aplicativo e a repassa
 * para o webhook do n8n que você configurar.
 */
export async function POST(request: Request) {
  /**
   * Passo 1: Substitua esta URL pela URL do seu webhook de *produção* do n8n.
   * Se estiver usando o ngrok para desenvolvimento, use a URL do ngrok aqui.
   */
  const N8N_WEBHOOK_URL = 'https://cf2551766b0f.ngrok-free.app/webhook/bafa018f-369f-4f8d-b192-1a0b0e7c3729';

  if (N8N_WEBHOOK_URL.includes('SEU_WEBHOOK_URL_DO_N8N')) {
    return NextResponse.json(
      {
        error: 'URL do webhook do n8n não configurada.',
        message: 'Por favor, edite o arquivo `src/app/api/n8n-webhook/route.ts` e substitua a URL do webhook de produção.',
      },
      { status: 500 }
    );
  }

  try {
    // Pega os dados enviados pelo seu app (a partir da função `handleGeneratePdf` ou do teste)
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
      try {
        // Tenta fazer o parse do JSON para obter uma mensagem mais estruturada
        const errorJson = JSON.parse(errorText);
         return NextResponse.json(
            { message: 'O n8n retornou um erro.', details: errorJson },
            { status: n8nResponse.status } 
        );
      } catch (e) {
        // Se não for JSON, retorna o texto do erro
        return NextResponse.json(
            { message: 'O n8n retornou um erro não-JSON.', details: errorText },
            { status: n8nResponse.status } 
        );
      }
    }
    
    const n8nData = await n8nResponse.json();

    // Retorna uma resposta de sucesso para o seu app
    return NextResponse.json({
      message: 'Dados enviados para o n8n com sucesso!',
      dataReceivedByN8n: n8nData,
    });

  } catch (error: any) {
    console.error('Erro interno no webhook (provavelmente fetch failed):', error.message);
    return NextResponse.json(
      { error: 'Ocorreu um erro no servidor ao tentar contatar o n8n.', details: error.message },
      { status: 500 }
    );
  }
}

    