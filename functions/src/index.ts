import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import puppeteer from "puppeteer";

const pdfFunctionSecret = defineSecret("PDF_FUNCTION_SECRET");

export const generatePdf = onRequest(
  {
    memory: "1GiB",
    timeoutSeconds: 120,
    region: "us-central1",
    maxInstances: 10,
    secrets: [pdfFunctionSecret],
  },
  async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    // Validate secret token
    const secret = pdfFunctionSecret.value();
    const authHeader = req.headers["x-pdf-secret"];
    if (!secret || authHeader !== secret) {
      res.status(401).send("Unauthorized");
      return;
    }

    const { html } = req.body;
    if (!html || typeof html !== "string") {
      res.status(400).send("Missing or invalid 'html' field in request body.");
      return;
    }

    let browser = null;
    try {
      browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      // Estas opcoes precisam ser identicas as de src/server/pdf-generator.ts.
      // Estavam divergentes: 10mm aqui contra 20/20/16/20 no local, ou seja, o
      // PDF de producao saia com margem diferente do que se via em dev.
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20mm",
          right: "20mm",
          bottom: "16mm",
          left: "20mm",
        },
        // So o Puppeteer sabe em quantas paginas o documento caiu.
        displayHeaderFooter: true,
        headerTemplate: "<span></span>",
        footerTemplate:
          '<div style="width:100%;padding:0 20mm;font-family:Arial,Helvetica,sans-serif;font-size:8px;color:#6e6a61;text-align:right;">' +
          'Pagina <span class="pageNumber"></span> de <span class="totalPages"></span>' +
          '</div>',
      });

      const base64 = Buffer.from(pdfBuffer).toString("base64");
      res.status(200).json({ pdf: base64 });
    } catch (error: any) {
      console.error("PDF generation error:", error);
      res.status(500).json({ error: error.message || "Failed to generate PDF" });
    } finally {
      if (browser) {
        await browser.close().catch(console.error);
      }
    }
  }
);
