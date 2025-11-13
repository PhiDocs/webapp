'use server';

import { NextResponse } from 'next/server';

/**
 * Rota de API que atua como um proxy para webhooks do n8n.
 * Recebe uma requisição POST do front-end e a repassa para uma URL de webhook.
 * - Se `webhookUrl` for fornecido no corpo, ele o usa (para testes no editor).
 * - Caso contrário, usa a URL de produção padrão.
 */
export async function POST(request: Request) {
  /**
   * Esta é a URL do seu webhook de *produção* do n8n.
   */
  const N8N_PRODUCTION_URL = 'https://brave-husky-69.hooks.n8n.cloud/webhook/bafa018f-369f-4f8d-b192-1a0b0e7c3729';

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Corpo da requisição inválido (não é JSON).' }, { status: 400 });
  }

  const { payload, webhookUrl } = body;
  const targetUrl = webhookUrl || N8N_PRODUCTION_URL;

  if (!targetUrl) {
    return NextResponse.json(
      {
        error: 'URL do webhook do n8n não configurada.',
        details: 'Nenhuma URL de produção ou de teste foi fornecida.',
      },
      { status: 500 }
    );
  }

  try {
    // Repassa o payload para o n8n
    const n8nResponse = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    // Tenta ler a resposta do n8n como JSON, independentemente do status
    let n8nData;
    try {
        n8nData = await n8nResponse.json();
    } catch (e) {
        // Se a resposta não for JSON (ex: vazia), usa o texto do status.
        n8nData = { message: n8nResponse.statusText || 'Resposta sem corpo JSON.' };
    }

    // Se a resposta do n8n não for 'ok' (ex: status 404, 500, 504), trata como erro
    if (!n8nResponse.ok) {
      console.error('Erro retornado pelo n8n:', n8nData);
      return NextResponse.json(
        { 
          message: 'O servidor do n8n retornou um erro.',
          status: n8nResponse.status,
          details: (n8nData as any).message || 'Nenhum detalhe adicional.',
        },
        { status: n8nResponse.status }
      );
    }

    // Se a resposta do n8n for bem-sucedida, repassa os dados para o front-end
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
