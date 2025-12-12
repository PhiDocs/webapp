import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { generateAPRPages } from './templates/apr';
import { generatePTPages } from './templates/pt';
import { DOCUMENT_TYPES } from '@/lib/constants';

// Import pdfmake and fonts
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";

// pdfmake is expecting pdfMake.vfs to be populated, so we do it here
if (pdfMake.vfs) {
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
}

// Main PDF Generation Function (Server-Side)
export async function generatePdf(
  formData: SafetyFormValues,
  analysisData: SafetyAnalysisOutput | null,
  equipmentData: ProtectiveEquipmentOutput | null
): Promise<{ fileName: string; dataUrl: string }> {
  
  return new Promise((resolve, reject) => {
    try {
      const docDefinition: TDocumentDefinitions = {
        pageSize: 'A4',
        pageMargins: [25, 25, 25, 40], // [left, top, right, bottom]
        
        content: formData.documentType === DOCUMENT_TYPES.APR
            ? generateAPRPages(formData, analysisData, equipmentData)
            : generatePTPages(formData),

        footer: function (currentPage, pageCount) {
            return {
                columns: [
                    { text: formData.companyName || 'Safety Docs AI', alignment: 'left', margin: [25, 0, 0, 0] },
                    { text: `${currentPage} / ${pageCount}`, alignment: 'right', margin: [0, 0, 25, 0] }
                ],
                fontSize: 8,
                color: '#555',
                margin: [0, 20, 0, 0],
            };
        },
        styles: {
            h1: { fontSize: 16, bold: true },
            sectionTitle: { fontSize: 10, bold: true, background: '#E0E0E0', color: '#000', alignment: 'center', margin: [0, 0, 0, 0], fillColor: '#e0e0e0' },
            th: { bold: true, fontSize: 9, alignment: 'center', fillColor: '#f2f2f2' },
            thHeader: { bold: true, fontSize: 7, alignment: 'center' },
            label: { bold: true, fontSize: 7, textTransform: 'uppercase', color: '#555' },
            value: { fontSize: 9 },
            td: { fontSize: 9, alignment: 'left' },
            tdSmall: { fontSize: 8, alignment: 'left' },
            listItem: { fontSize: 9, margin: [0, 0, 0, 2] },
            cellPadding: { margin: [5, 5, 5, 5] },
        },
        defaultStyle: {
            fontSize: 10,
            lineHeight: 1.15,
            color: '#333',
            alignment: 'left'
        },
        layout: {
            sectionLayout: {
                 hLineWidth: () => 0.5,
                 vLineWidth: () => 0.5,
                 hLineColor: () => '#ccc',
                 vLineColor: () => '#ccc',
                 paddingLeft: () => 0,
                 paddingRight: () => 0,
                 paddingTop: (i, node) => i === 0 ? 0 : 5,
                 paddingBottom: () => 5,
            },
            boxLayout: {
                hLineWidth: (i, node) => (i === 0 || i === node.table.body.length) ? 0.5 : 0.5,
                vLineWidth: (i, node) => (i === 0 || i === node.table.widths?.length) ? 0.5 : 0.5,
                hLineColor: () => '#ccc',
                vLineColor: () => '#ccc',
                paddingLeft: (i) => 5,
                paddingRight: (i, node) => 5,
                paddingTop: () => 4,
                paddingBottom: () => 4,
            },
        }
      };

      const docName = formData.documentType === DOCUMENT_TYPES.APR ? DOCUMENT_TYPES.APR : DOCUMENT_TYPES.PT;
      const fileName = `${docName}-${(formData.companyName || 'doc').replace(/ /g, "_")}-${new Date().toLocaleDateString('pt-br').replace(/\//g, '-')}.pdf`;

      const pdfDoc = pdfMake.createPdf(docDefinition);
      
      pdfDoc.getDataUrl((dataUrl) => {
        resolve({ fileName, dataUrl });
      }, (err: any) => {
          // This second callback for errors is not standard in pdfmake,
          // but we keep the logic within the promise.
          reject(err);
      });

    } catch (error) {
      console.error("Error during PDF document definition:", error);
      reject(error);
    }
  });
}
