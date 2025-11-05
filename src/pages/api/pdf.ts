import type { NextApiRequest, NextApiResponse } from 'next';
import puppeteer from 'puppeteer';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    try {
        const printData = req.body;
        
        // Encode data to be passed as a URL parameter
        const dataParam = encodeURIComponent(JSON.stringify(printData));
        
        // Construct the URL to the print page
        const url = `${process.env.NODE_ENV === 'production' ? 'https://' + process.env.NEXT_PUBLIC_HOST : 'http://localhost:9002'}/print?data=${dataParam}`;

        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'] 
        });
        const page = await browser.newPage();
        
        await page.goto(url, { waitUntil: 'networkidle0' });

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

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="safety-document.pdf"');
        res.send(pdfBuffer);

    } catch (error) {
        console.error('PDF generation failed:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
}
