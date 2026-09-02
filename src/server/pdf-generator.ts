import React from 'react';
import { PrintPreview } from '@/components/print-preview';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';

const PDF_FUNCTION_URL = process.env.PDF_FUNCTION_URL || '';
const PDF_FUNCTION_SECRET = process.env.PDF_FUNCTION_SECRET || '';

const pdfStyles = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 9pt; line-height: 1.4; color: #1a1a1a; background: white; }
  .flex { display: flex; }
  .flex-col { flex-direction: column; }
  .flex-1 { flex: 1; }
  .items-start { align-items: flex-start; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .justify-center { justify-content: center; }
  .gap-2 { gap: 0.5rem; }
  .gap-4 { gap: 1rem; }
  .grid { display: grid; }
  .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .w-full { width: 100%; }
  .w-1\\/2 { width: 50%; }
  .w-1\\/3 { width: 33.333%; }
  .w-\\[40\\%\\] { width: 40%; }
  .w-\\[30\\%\\] { width: 30%; }
  .w-\\[5\\%\\] { width: 5%; }
  .w-\\[25\\%\\] { width: 25%; }
  .w-\\[45\\%\\] { width: 45%; }
  .min-w-0 { min-width: 0; }
  .min-w-\\[100px\\] { min-width: 100px; }
  .h-4 { height: 1rem; }
  .h-10 { height: 2.5rem; }
  .h-12 { height: 3rem; }
  .h-16 { height: 4rem; }
  .w-4 { width: 1rem; }
  .w-auto { width: auto; }
  .max-w-\\[120px\\] { max-width: 120px; }
  .shrink-0 { flex-shrink: 0; }
  .object-contain { object-fit: contain; }
  .mx-auto { margin-left: auto; margin-right: auto; }
  .mt-0 { margin-top: 0; }
  .mt-2 { margin-top: 0.5rem; }
  .mt-4 { margin-top: 1rem; }
  .mt-8 { margin-top: 2rem; }
  .mr-2 { margin-right: 0.5rem; }
  .mb-2 { margin-bottom: 0.5rem; }
  .p-1 { padding: 0.25rem; }
  .p-2 { padding: 0.5rem; }
  .p-4 { padding: 1rem; }
  .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
  .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
  .py-8 { padding-top: 2rem; padding-bottom: 2rem; }
  .pt-2 { padding-top: 0.5rem; }
  .pb-2 { padding-bottom: 0.5rem; }
  .pl-4 { padding-left: 1rem; }
  .space-y-1 > * + * { margin-top: 0.25rem; }
  .text-left { text-align: left; }
  .text-center { text-align: center; }
  .text-xs { font-size: 0.75rem; line-height: 1rem; }
  .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
  .text-lg { font-size: 1.125rem; line-height: 1.75rem; }
  .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
  .text-base { font-size: 1rem; line-height: 1.5rem; }
  .font-bold { font-weight: 700; }
  .font-semibold { font-weight: 600; }
  .font-normal { font-weight: 400; }
  .font-serif { font-family: Georgia, serif; }
  .italic { font-style: italic; }
  .uppercase { text-transform: uppercase; }
  .break-words { word-wrap: break-word; overflow-wrap: break-word; }
  .whitespace-pre-wrap { white-space: pre-wrap; }
  .list-disc { list-style-type: disc; }
  .border { border: 1px solid #ccc; }
  .border-b { border-bottom: 1px solid #ccc; }
  .border-t { border-top: 1px solid #ccc; }
  .border-dashed { border-style: dashed; }
  .border-2 { border-width: 2px; }
  .rounded-md { border-radius: 0.375rem; }
  .rounded-lg { border-radius: 0.5rem; }
  .rounded-t-md { border-top-left-radius: 0.375rem; border-top-right-radius: 0.375rem; }
  .bg-white { background-color: white; }
  .text-gray-500 { color: #6b7280; }
  .text-gray-700 { color: #374151; }
  .text-gray-800 { color: #1f2937; }
  .text-destructive { color: #dc2626; }
  .bg-destructive\\/10 { background-color: rgba(220, 38, 38, 0.1); }
  .border-destructive\\/30 { border-color: rgba(220, 38, 38, 0.3); }
  .inline-block { display: inline-block; }
  .block { display: block; }
  .hidden { display: none; }
  .align-top { vertical-align: top; }
  .border-collapse { border-collapse: collapse; }
  [colspan="2"] { grid-column: span 2; }

  .print-preview-wrapper { width: 100%; }
  .print-document-container,
  #print-content-root,
  div[id="print-content-root"] {
    width: 100% !important;
    min-height: auto !important;
    background: white;
    color: #1a1a1a;
    font-size: 9pt;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
  .print-only { display: block !important; }
  .page-content-wrapper { padding: 0; }
  .avoid-break { page-break-inside: avoid; }

  .section-title {
    font-size: 10pt;
    font-weight: bold;
    color: #000;
    background-color: #e0e0e0;
    padding: 0.3rem;
    text-align: center;
    border-top-left-radius: 0.375rem;
    border-top-right-radius: 0.375rem;
  }
  .section-content {
    border: 1px solid #ccc;
    border-top: none;
    padding: 0.5rem;
    border-bottom-left-radius: 0.375rem;
    border-bottom-right-radius: 0.375rem;
  }
  .info-grid { border-collapse: collapse; width: 100%; }
  .info-grid tr, .info-grid td {
    border: 1px solid #ccc;
    padding: 0.3rem 0.5rem;
    vertical-align: middle;
    word-wrap: break-word;
  }
  .info-grid strong {
    font-size: 7pt;
    font-weight: bold;
    text-transform: uppercase;
    display: block;
    margin-bottom: 0.1rem;
  }
  table.analysis-table { width: 100%; border-collapse: collapse; }
  table.analysis-table th, table.analysis-table td {
    border: 1px solid #ccc;
    padding: 0.4rem;
    text-align: left;
    vertical-align: top;
    word-wrap: break-word;
  }
  table.analysis-table th {
    background-color: #f2f2f2;
    font-weight: bold;
    color: #333;
  }
  table.analysis-table td { white-space: pre-wrap; }
  .text-xxs { font-size: 0.65rem; line-height: 0.8rem; }

  .pt-header-table th, .pt-header-table td { border: 1px solid #ccc; padding: 0.25rem; }
  .pt-checklist-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem; }
  .pt-checkbox { width: 0.75rem; height: 0.75rem; border: 1px solid #333; display: inline-block; margin-right: 0.25rem; }
  .pt-checkbox.checked { background-color: #333; }
`;

function buildHtml(componentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">
    <style>${pdfStyles}</style>
  </head>
  <body>
    ${componentHtml}
  </body>
</html>`;
}

async function generatePdfViaCloudFunction(html: string): Promise<Buffer> {
  if (!PDF_FUNCTION_URL) {
    throw new Error('PDF_FUNCTION_URL nao configurada. Verifique as variaveis de ambiente.');
  }

  const response = await fetch(PDF_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-PDF-Secret': PDF_FUNCTION_SECRET,
    },
    body: JSON.stringify({ html }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud Function retornou erro ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (!data.pdf) {
    throw new Error('Cloud Function nao retornou o PDF.');
  }

  return Buffer.from(data.pdf, 'base64');
}

/** Serverless (Vercel, Lambda) nao tem Chromium instalado no sistema. */
const ehServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * O navegador que gera o PDF.
 *
 * Local: o puppeteer completo, que traz o proprio Chromium.
 * Serverless: puppeteer-core + o Chromium enxuto do @sparticuz, que e o unico
 * que cabe e roda dentro de uma function. Sem isso o PDF simplesmente nao sai
 * na Vercel — e o PDF e o produto.
 */
async function createBrowserInstance() {
  if (ehServerless) {
    const chromium = (await import('@sparticuz/chromium')).default;
    const puppeteerCore = await import('puppeteer-core');
    return puppeteerCore.default.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch();
}

/**
 * Reaproveitado tambem pela rota do mapa de extintores, que antes chamava o
 * puppeteer completo direto e por isso tambem quebraria em serverless.
 */
export async function getOrCreatePdfBrowser() {
  const g: any = globalThis as any;

  if (!g.__pdfBrowserPromise) {
    g.__pdfBrowserPromise = createBrowserInstance();
    return g.__pdfBrowserPromise;
  }

  try {
    const browser = await g.__pdfBrowserPromise;
    if (browser?.connected) {
      return browser;
    }
  } catch {
    // recria abaixo
  }

  g.__pdfBrowserPromise = createBrowserInstance();
  return g.__pdfBrowserPromise;
}

async function generatePdfLocally(html: string): Promise<Buffer> {
  const g: any = globalThis as any;

  const renderPdf = async () => {
    const browser = await getOrCreatePdfBrowser();
    const page = await browser.newPage();

    try {
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '16mm', left: '20mm' },
        // A numeracao vem daqui porque so o Puppeteer sabe em quantas paginas o
        // documento acabou caindo. Antes o rodape trazia "Pagina 01 de 01"
        // escrito na mao, o que ficava errado em toda APR de varias paginas —
        // e paginacao errada e a primeira coisa que a fiscalizacao questiona.
        displayHeaderFooter: true,
        headerTemplate: '<span></span>',
        footerTemplate: `
          <div style="width:100%;padding:0 20mm;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#6e6a61;text-align:right;">
            Pagina <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>`,
      });
      return Buffer.from(pdfBuffer);
    } finally {
      await page.close().catch(() => undefined);
    }
  };

  try {
    return await renderPdf();
  } catch (error: any) {
    const message = String(error?.message || error || '');
    const recoverableBrowserError = [
      'Connection closed',
      'Target closed',
      'Session closed',
      'Browser has disconnected',
      'Protocol error',
    ].some((fragment) => message.includes(fragment));

    if (!recoverableBrowserError) {
      throw error;
    }

    try {
      const staleBrowser = await g.__pdfBrowserPromise;
      await staleBrowser?.close?.().catch(() => undefined);
    } catch {
      // ignora falha ao fechar a instancia antiga
    }

    g.__pdfBrowserPromise = null;
    return renderPdf();
  }
}

export async function generatePdfBuffer({
  formData,
  analysisData,
  equipmentData,
  company,
}: {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
}): Promise<Buffer> {
  const { renderToString } = await import('react-dom/server');
  const componentHtml = renderToString(
    React.createElement(PrintPreview, {
      formData,
      analysisData,
      equipmentData,
      company,
      renderMode: 'pdf',
    })
  );

  const fullHtml = buildHtml(componentHtml);

  // A funcao externa deixou de ser obrigatoria: o proprio processo gera o PDF,
  // local ou na Vercel. Ela continua disponivel como escape, mas so quando
  // configurada de proposito. Antes isto era `if (isProd)`, e como
  // PDF_FUNCTION_URL nunca foi definida, todo PDF em producao morria no throw.
  if (PDF_FUNCTION_URL) {
    return generatePdfViaCloudFunction(fullHtml);
  }

  return generatePdfLocally(fullHtml);
}
