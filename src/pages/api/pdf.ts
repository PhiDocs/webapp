
import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';
import { renderToStaticMarkup } from 'react-dom/server';
import { PrintPreviewContent } from '@/components/print-preview';
import React from 'react';
import fs from 'fs';
import path from 'path';

// This function now reads CSS files directly from the filesystem.
const getCssFromFile = (filePath: string): string => {
    try {
      const fullPath = path.resolve(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        return fs.readFileSync(fullPath, 'utf-8');
      }
      console.warn(`CSS file not found at: ${fullPath}`);
      return '';
    } catch (error) {
      console.error(`Error reading CSS file from ${filePath}:`, error);
      return '';
    }
};


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const printData = req.body;

        // 2. Read CSS content directly from files
        // Note: These paths are relative to the project root.
        const globalsCss = getCssFromFile('src/app/globals.css');
        const printLayoutCss = getCssFromFile('src/app/print/print-layout.css');
        
        // 3. Render React component to static HTML
        const htmlContent = renderToStaticMarkup(
            React.createElement(PrintPreviewContent, {
                formData: printData,
                analysisData: printData,
            })
        );
        
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>${printData.documentType} - ${printData.companyName} - ${printData.date}</title>
                 <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                <link
                href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
                rel="stylesheet"
                />
                <style>${globalsCss.replace(/@tailwind/g, '/* @tailwind */')}</style>
                <style>${printLayoutCss}</style>
                <style>
                    body { font-family: 'Inter', sans-serif; }
                    .print-container { box-shadow: none; border: none; }
                </style>
            </head>
            <body>
                <div class="print-body">
                    ${htmlContent}
                </div>
            </body>
            </html>
        `;

        // 4. Launch Puppeteer
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        // 5. Set content and generate PDF
        await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '15mm',
                right: '15mm',
                bottom: '15mm',
                left: '15mm'
            }
        });

        await browser.close();

        // 6. Send PDF response
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="safety-document.pdf"');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF generation failed:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
}
