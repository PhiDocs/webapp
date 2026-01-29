import { NextRequest, NextResponse } from 'next/server';
import { renderToString } from 'react-dom/server';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { PrintPreview } from '@/components/print-preview';
import { ErrorLogRepository } from '@/repositories/error-log.repository';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';

// Puppeteer launch options
const puppeteerOptions = process.env.NODE_ENV === 'production'
  ? { args: ['--no-sandbox'] }
  : {};

export async function POST(request: NextRequest) {
  try {
    const { formData, analysisData, equipmentData, company } = (await request.json()) as {
        formData: SafetyFormValues;
        analysisData: SafetyAnalysisOutput | null;
        equipmentData: ProtectiveEquipmentOutput | null;
        company: Company | null;
    };

    // 1. Read the global CSS file
    const cssPath = path.resolve(process.cwd(), 'src/app/globals.css');
    const css = await fs.readFile(cssPath, 'utf-8');

    // 2. Render the React component to an HTML string
    const componentHtml = renderToString(
      <PrintPreview
        formData={formData}
        analysisData={analysisData}
        equipmentData={equipmentData}
        company={company}
      />
    );

    // 3. Construct the full HTML document for Puppeteer
    // We include Tailwind CDN for utility classes and our own inlined global CSS for custom styles.
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <script src="https://cdn.tailwindcss.com"></script>
          <style>${css}</style>
          <style>
             /* Ensure the print-only styles are applied by default */
             .print-only {
                display: block !important;
             }
             .print-preview-wrapper, .print-document-container {
                box-shadow: none !important;
                border: none !important;
             }
          </style>
        </head>
        <body>
          ${componentHtml}
        </body>
      </html>
    `;

    // 4. Launch Puppeteer and generate the PDF
    const browser = await puppeteer.launch(puppeteerOptions);
    const page = await browser.newPage();
    
    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm',
      },
    });

    await browser.close();

    // 5. Return the PDF as a response
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
  }
}
