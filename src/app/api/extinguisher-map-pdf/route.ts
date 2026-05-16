import { NextRequest, NextResponse } from 'next/server';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import { requireAuth } from '@/server/auth-guard';

async function createPdf(html: string): Promise<Buffer> {
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch();
  const page = await browser.newPage();

  try {
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' },
    });
    return Buffer.from(pdf);
  } finally {
    await page.close().catch(() => undefined);
    await browser.close().catch(() => undefined);
  }
}

export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get('content-length') || '0');
    if (contentLength > 12_000_000) {
      return NextResponse.json({ error: 'Payload muito grande para gerar o PDF do mapa.' }, { status: 413 });
    }

    try {
      await requireAuth();
    } catch (error: any) {
      return NextResponse.json({ error: error.message || 'Acesso negado.' }, { status: 401 });
    }

    const { html, filename } = await request.json() as { html?: string; filename?: string };
    if (!html) {
      return NextResponse.json({ error: 'HTML do mapa nao informado.' }, { status: 400 });
    }

    const pdf = await createPdf(html);

    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename || 'mapa-extintores.pdf'}"`,
      },
    });
  } catch (error: any) {
    await ErrorLogRepository.log(error, 'extinguisher-map-pdf-api');
    return NextResponse.json(
      { error: 'Falha ao gerar o PDF do mapa.', details: error?.message || String(error) },
      { status: 500 },
    );
  }
}
