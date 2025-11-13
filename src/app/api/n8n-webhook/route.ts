'use server';

import { NextResponse } from 'next/server';

/**
 * Rota de API que atua como um proxy para o webhook do n8n.
 * Recebe uma requisição POST do front-end e a repassa para a URL do webhook
 * configurada, retornando a resposta ou o erro de forma clara.
 */
export async function POST(request: Request) {
  /**
   * Esta é a URL do seu webhook de *produção* do n8n.
   */
  const N8N_WEBHOOK_URL = 'https://little-goose-90.hooks.n8n.cloud/webhook/bafa018f-369f-4f8d-b192-1a0b0e7c3729';

  if (N8N_WEBHOOK_URL.includes('SEU_WEBHOOK_URL_DO_N8N_AQUI')) {
    return NextResponse.json(
      {
        error: 'URL do webhook do n8n não configurada.',
        details: 'Edite o arquivo `src/app/api/n8n-webhook/route.ts` e substitua a URL do webhook de produção.',
      },
      { status: 500 }
    );
  }

  try {
    // Pega o corpo da requisição enviada pelo front-end
    const body = await request.json();

    // Repassa a requisição para o n8n
    const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Se a resposta do n8n não for 'ok' (ex: status 404, 500), trata como erro
    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      let errorJson = {};
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // O corpo do erro não era JSON, usa o texto puro
        errorJson = { message: errorText };
      }
      
      console.error('Erro retornado pelo n8n:', errorJson);
      return NextResponse.json(
        { 
          message: 'O servidor do n8n retornou um erro.',
          details: (errorJson as any).message || errorText,
        },
        { status: n8nResponse.status }
      );
    }

    // Se a resposta do n8n for bem-sucedida, repassa os dados para o front-end
    const n8nData = await n8nResponse.json();
    return NextResponse.json({
      message: 'Dados enviados para o n8n com sucesso!',
      dataReceivedByN8n: n8nData,
    });

  } catch (error: any) {
    // Erro de rede (ex: URL inválida, problema de DNS, etc.)
    console.error('Falha de rede ao tentar contatar o n8n:', error.message);
    return NextResponse.json(
      { 
        error: 'Falha na conexão com o servidor do n8n.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
