import { NextRequest, NextResponse } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
import React from 'react';
import { PrintPreview } from '@/components/print-preview';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';

// Puppeteer launch options
const puppeteerOptions = process.env.NODE_ENV === 'production'
  ? { args: ['--no-sandbox', '--disable-setuid-sandbox'] }
  : {};

// Pre-compiled CSS for PDF generation (avoiding Tailwind CDN dependency)
const pdfStyles = `
  /* Reset and base styles */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 9pt; line-height: 1.4; color: #1a1a1a; background: white; }
  
  /* Utility classes */
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

  /* Print specific styles */
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
  
  /* PT specific styles */
  .pt-header-table th, .pt-header-table td { border: 1px solid #ccc; padding: 0.25rem; }
  .pt-checklist-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.25rem; }
  .pt-checkbox { width: 0.75rem; height: 0.75rem; border: 1px solid #333; display: inline-block; margin-right: 0.25rem; }
  .pt-checkbox.checked { background-color: #333; }
`;

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  
  try {
    const { formData, analysisData, equipmentData, company } = (await request.json()) as {
        formData: SafetyFormValues;
        analysisData: SafetyAnalysisOutput | null;
        equipmentData: ProtectiveEquipmentOutput | null;
        company: Company | null;
    };

    // 1. Render the React component to an HTML string
    const { renderToString } = await import('react-dom/server');
    const componentHtml = renderToString(
      React.createElement(PrintPreview, {
        formData,
        analysisData,
        equipmentData,
        company,
      })
    );

    // 2. Construct the full HTML document for Puppeteer with inline styles
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>${pdfStyles}</style>
        </head>
        <body>
          ${componentHtml}
        </body>
      </html>
    `;

    // 3. Launch Puppeteer and generate the PDF
    browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();
    
    await page.setContent(fullHtml, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    // 4. Return the PDF as a response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="documento_seguranca.pdf"`,
      },
    });

  } catch (e: any) {
    console.error("PDF Generation Error:", e);
    await ErrorLogRepository.log(e, 'generate-pdf-api');
    return NextResponse.json(
      { error: 'Falha ao gerar o PDF no servidor.', details: e.message },
      { status: 500 }
    );
  } finally {
    // Ensure browser is always closed
    if (browser) {
      await browser.close().catch(console.error);
    }
  }
}
