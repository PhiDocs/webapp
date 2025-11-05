'use server';

import { PDFDocument, StandardFonts, rgb, PDFFont, PageSizes } from 'pdf-lib';

async function drawWrappedText(opts: {
  page: any;
  font: PDFFont;
  text: string;
  x: number;
  y: number;
  maxWidth: number;
  lineHeight: number;
  size: number;
  color?: any;
}) {
  const { page, font, text, x, y, maxWidth, lineHeight, size, color = rgb(0.2, 0.2, 0.2) } = opts;
  const words = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/(\s+|\n)/);
  let currentLine = '';
  let currentY = y;
  const spaceWidth = font.widthOfTextAtSize(' ', size);

  for (const word of words) {
    if (word === '\n') {
      page.drawText(currentLine, { x, y: currentY, font, size, color, lineHeight });
      currentY -= lineHeight;
      currentLine = '';
      continue;
    }

    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const { width } = font.widthOfTextAtSize(testLine, size);

    if (width > maxWidth && currentLine.length > 0) {
      page.drawText(currentLine, { x, y: currentY, font, size, color, lineHeight });
      currentY -= lineHeight;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) {
    page.drawText(currentLine, { x, y: currentY, font, size, color, lineHeight });
    currentY -= lineHeight;
  }
  
  return currentY;
}

export async function generatePdfAction(data: any): Promise<{pdfBase64: string | null; error: string | null}> {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage(PageSizes.A4);
    const { width, height } = page.getSize();
    const margin = 40;
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let currentY = height - margin;

    // --- PAGE HEADER ---
    const drawPageHeader = async (page: any, pageNumber: number, totalPages: number) => {
        if (data.companyLogo) {
          try {
            const imageBytes = Buffer.from(data.companyLogo.split(',')[1], 'base64');
            const isPng = data.companyLogo.startsWith('data:image/png');
            const image = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

            const imageDims = image.scaleToFit(120, 50);
            page.drawImage(image, {
                x: margin,
                y: height - margin - imageDims.height,
                width: imageDims.width,
                height: imageDims.height,
            });
          } catch (e) {
              console.error("Could not embed company logo:", e);
          }
        }

        const headerTextY = height - margin - 15;
        page.drawText(data.companyName || 'Nome da Empresa', {
          x: margin + 130,
          y: headerTextY,
          font: helveticaBold,
          size: 16,
          color: rgb(0.1, 0.1, 0.4),
        });

        await drawWrappedText({page, font: helvetica, text: `Serviços a executar: ${data.activityDescription || '...'}`, x: margin + 130, y: headerTextY - 20, maxWidth: width - margin*2 - 250, lineHeight: 12, size: 9});

        let headerBoxX = width - margin - 210;
        page.drawRectangle({x: headerBoxX, y: height - margin, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
        page.drawText('DATA', { x: headerBoxX + 35, y: height - margin - 15, font: helveticaBold, size: 8 });
        page.drawText(data.date, { x: headerBoxX + 25, y: height - margin - 22, font: helvetica, size: 9 });

        headerBoxX += 110;
        page.drawRectangle({x: headerBoxX, y: height - margin, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
        page.drawText('APR Nº', { x: headerBoxX + 30, y: height - margin - 15, font: helveticaBold, size: 8 });
        
        headerBoxX = width - margin - 210;
        page.drawRectangle({x: headerBoxX, y: height - margin - 30, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
        page.drawText('Revisão', { x: headerBoxX + 30, y: height - margin - 45, font: helveticaBold, size: 8 });
        page.drawText('01', { x: headerBoxX + 45, y: height - margin - 52, font: helvetica, size: 9 });

        headerBoxX += 110;
        page.drawRectangle({x: headerBoxX, y: height - margin - 30, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
        page.drawText('PÁGINAS', { x: headerBoxX + 25, y: height - margin - 45, font: helveticaBold, size: 8 });
        page.drawText(`${pageNumber}/${totalPages}`, { x: headerBoxX + 40, y: height - margin - 52, font: helvetica, size: 9 });
    };

    await drawPageHeader(page, 1, 1);
    currentY -= 80;
    
    const checkNewPage = async (requiredHeight: number) => {
        if (currentY < margin + requiredHeight) {
            let currentPageIndex = pdfDoc.getPages().indexOf(page);
            page = pdfDoc.addPage(PageSizes.A4);
            await drawPageHeader(page, currentPageIndex + 2, currentPageIndex + 2); 
            currentY = height - margin - 80;
            return true;
        }
        return false;
    };
    
    // --- Dados da Obra ---
    page.drawRectangle({ x: margin, y: currentY, width: width - margin * 2, height: -20, color: rgb(0.9, 0.9, 0.9) });
    page.drawText("DADOS DA OBRA", { x: width / 2 - 40, y: currentY - 14, font: helveticaBold, size: 11, color: rgb(0.2,0.2,0.2) });
    currentY -= 25;
    
    await checkNewPage(60);
    const obraY1 = await drawWrappedText({page, font: helvetica, text: `NOME: ${data.workName || '...'}`, x: margin + 5, y: currentY, maxWidth: (width - margin*2)/2 - 10, lineHeight: 11, size: 9});
    await drawWrappedText({page, font: helvetica, text: `ENDEREÇO: ${data.workAddress || '...'}`, x: width/2, y: currentY, maxWidth: (width - margin*2)/2 - 10, lineHeight: 11, size: 9});
    currentY = obraY1 - 10;

    await checkNewPage(20);
    page.drawText(`PREVISÃO DATA INICIO: ${data.startDate ? new Date(data.startDate).toLocaleDateString('pt-BR') : '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    page.drawText(`PREVISÃO DATA TÉRMINO: ${data.endDate ? new Date(data.endDate).toLocaleDateString('pt-BR') : '...'}`, { x: width / 2, y: currentY, font: helvetica, size: 9 });
    currentY -= 20;

    await checkNewPage(20);
    page.drawText(`LOCAL DA OBRA / PAVIMENTO: ${data.workLocationDetails || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    currentY -= 15;
    
    await checkNewPage(30);
    currentY = await drawWrappedText({page, font: helvetica, text: `Descrição da atividade: ${data.activityDescription || '...'}`, x: margin + 5, y: currentY, maxWidth: width - margin*2 -10, lineHeight: 11, size: 9});
    
    currentY -= 20;

    // --- Responsáveis ---
    await checkNewPage(80);
    page.drawRectangle({ x: margin, y: currentY, width: width - margin * 2, height: -20, color: rgb(0.9, 0.9, 0.9) });
    page.drawText("RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS", { x: margin + 120, y: currentY - 14, font: helveticaBold, size: 11, color: rgb(0.2,0.2,0.2) });
    currentY -= 25;
    
    // --- Procedimento Operacional ---
    if (data.proceduralSteps && data.proceduralSteps.length > 0) {
        await checkNewPage(150);
        page.drawRectangle({ x: margin, y: currentY, width: width - margin * 2, height: -20, color: rgb(0.9, 0.9, 0.9) });
        page.drawText("PROCEDIMENTO OPERACIONAL", { x: width / 2 - 70, y: currentY - 14, font: helveticaBold, size: 11, color: rgb(0.2,0.2,0.2) });
        currentY -= 25;
        
        const procHeaders = ["ITEM", "ATIVIDADES", "RISCOS POTENCIAIS", "MEDIDAS PREVENTIVAS"];
        const procColWidths = [40, (width - margin*2 - 40) * 0.25, (width - margin*2 - 40) * 0.25, (width - margin*2 - 40) * 0.5 ];
        const lineHeight = 10;
        const fontSize = 8;
        const cellPadding = 5;

        // Draw header
        let procHeaderX = margin;
        procHeaders.forEach((header, i) => {
            page.drawText(header, { x: procHeaderX + cellPadding, y: currentY, font: helveticaBold, size: 8 });
            procHeaderX += procColWidths[i];
        });
        currentY -= (lineHeight + 5);

        for (const step of data.proceduralSteps) {
            const getTextHeight = (text: string, font: PDFFont, size: number, maxWidth: number) => {
                const words = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/(\s+|\n)/);
                let lineCount = 0;
                let currentLine = '';
                for (const word of words) {
                    if (word === '\n') {
                        lineCount++;
                        currentLine = '';
                        continue;
                    }
                    const testLine = currentLine ? `${currentLine} ${word}`: word;
                    if (font.widthOfTextAtSize(testLine, size) > maxWidth && currentLine.length > 0) {
                        lineCount++;
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                }
                return (lineCount + 1) * lineHeight;
            };

            const h1 = getTextHeight(String(step.item || ''), helvetica, fontSize, procColWidths[0] - cellPadding * 2);
            const h2 = getTextHeight(step.activity || '', helvetica, fontSize, procColWidths[1] - cellPadding * 2);
            const h3 = getTextHeight(step.potentialRisks || '', helvetica, fontSize, procColWidths[2] - cellPadding * 2);
            const h4 = getTextHeight(step.preventiveMeasures || '', helvetica, fontSize, procColWidths[3] - cellPadding * 2);
            const rowHeight = Math.max(h1, h2, h3, h4) + cellPadding * 2;

            if (await checkNewPage(rowHeight)) {
                 // Redraw header on new page
                let procHeaderX = margin;
                procHeaders.forEach((header, i) => {
                    page.drawText(header, { x: procHeaderX + cellPadding, y: currentY, font: helveticaBold, size: 8 });
                    procHeaderX += procColWidths[i];
                });
                currentY -= (lineHeight + 5);
            }
            
            const startY = currentY;
            const endY1 = await drawWrappedText({page, font: helvetica, text: String(step.item || ''), x: margin + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[0] - cellPadding*2, lineHeight, size: fontSize });
            const endY2 = await drawWrappedText({page, font: helvetica, text: step.activity || '', x: margin + procColWidths[0] + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[1] - cellPadding*2, lineHeight, size: fontSize });
            const endY3 = await drawWrappedText({page, font: helvetica, text: step.potentialRisks || '', x: margin + procColWidths[0] + procColWidths[1] + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[2] - cellPadding*2, lineHeight, size: fontSize });
            const endY4 = await drawWrappedText({page, font: helvetica, text: step.preventiveMeasures || '', x: margin + procColWidths[0] + procColWidths[1] + procColWidths[2] + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[3] - cellPadding*2, lineHeight, size: fontSize });
            
            const finalY = Math.min(endY1, endY2, endY3, endY4);
            currentY = finalY - cellPadding;
        }
    }


    const pages = pdfDoc.getPages();
    const pageCount = pages.length;
    pages.forEach((p, i) => {
       try {
        p.drawText(`Página ${i + 1} de ${pageCount}`, { x: width - margin - 100, y: 30, font: helvetica, size: 9 });
        // Correct the page number in the header box
        const headerBoxX = width - margin - 100;
        p.drawText(`${i + 1} de ${pageCount}`, { x: headerBoxX, y: height - margin - 52, font: helvetica, size: 9 });
       } catch(e) {
           console.error("Failed to add page number", e);
       }
    })

    const finalPdfBytes = await pdfDoc.save();
    const pdfBase64 = Buffer.from(finalPdfBytes).toString('base64');
    
    return { pdfBase64, error: null };

  } catch (e:any) {
    console.error('Erro detalhado ao gerar PDF:', e, e.stack);
    return { pdfBase64: null, error: `Erro no servidor ao gerar PDF: ${e.message}` };
  }
}
