import puppeteer from 'puppeteer';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { html } = await req.json();

    if (!html) {
      return NextResponse.json({ error: 'HTML content is required' }, { status: 400 });
    }

    // Recommended args for running in serverless environments
    const browser = await puppeteer.launch({
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // <- this one doesn't works in Windows
            '--disable-gpu'
        ]
    });
    const page = await browser.newPage();
    
    // Set content and wait for it to be fully loaded
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // To reflect CSS used for screens instead of print
    await page.emulateMediaType('screen');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
    });

    await browser.close();

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
      },
    });

  } catch (error: any) {
    console.error('Error generating PDF:', error);
    return NextResponse.json({ error: error.message || 'An unknown error occurred while generating the PDF.' }, { status: 500 });
  }
}
