'use server';

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';

// Helper to draw wrapped text and return the new Y position
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
  const words = text.replace(/\r/g, '').split(/(\s+|\n)/);
  let currentLine = '';
  let currentY = y;

  for (const word of words) {
    if (word === '\n') {
      page.drawText(currentLine, { x, y: currentY, font, size, color, lineHeight });
      currentY -= lineHeight;
      currentLine = '';
      continue;
    }

    const testLine = currentLine + word;
    const { width } = font.widthOfTextAtSize(testLine, size);

    if (width > maxWidth && currentLine.length > 0) {
      page.drawText(currentLine, { x, y: currentY, font, size, color, lineHeight });
      currentY -= lineHeight;
      currentLine = word.trimStart();
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
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const margin = 40;
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    let currentY = height - margin;

    // --- HEADER ---
    if (data.companyLogo) {
      try {
        const imageBytes = Buffer.from(data.companyLogo.split(',')[1], 'base64');
        const isPng = data.companyLogo.startsWith('data:image/png');
        const image = isPng ? await pdfDoc.embedPng(imageBytes) : await pdfDoc.embedJpg(imageBytes);

        const imageDims = image.scaleToFit(120, 50);
        page.drawImage(image, {
            x: margin,
            y: currentY - imageDims.height,
            width: imageDims.width,
            height: imageDims.height,
        });
      } catch (e) {
          console.error("Could not embed company logo:", e);
      }
    }
    
    const headerTextY = currentY - 15;
    page.drawText(data.companyName || 'Nome da Empresa', {
      x: margin + 130,
      y: headerTextY,
      font: helveticaBold,
      size: 18,
      color: rgb(0.1, 0.1, 0.4),
    });
    
    await drawWrappedText({page, font: helvetica, text: `Serviços a executar: ${data.activityDescription || '...'}`, x: margin + 130, y: headerTextY - 20, maxWidth: width - margin*2 - 150, lineHeight: 12, size: 9});

    // Header boxes
    let headerBoxX = width - margin - 210;
    page.drawRectangle({x: headerBoxX, y: currentY, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('DATA', { x: headerBoxX + 35, y: currentY - 10, font: helveticaBold, size: 8 });
    page.drawText(new Date().toLocaleDateString('pt-BR'), { x: headerBoxX + 25, y: currentY - 22, font: helvetica, size: 9 });

    headerBoxX += 110;
    page.drawRectangle({x: headerBoxX, y: currentY, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('APR Nº', { x: headerBoxX + 30, y: currentY - 10, font: helveticaBold, size: 8 });
    
    headerBoxX = width - margin - 210;
    page.drawRectangle({x: headerBoxX, y: currentY - 30, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('Revisão', { x: headerBoxX + 30, y: currentY - 40, font: helveticaBold, size: 8 });
    page.drawText('01', { x: headerBoxX + 45, y: currentY - 52, font: helvetica, size: 9 });

    headerBoxX += 110;
    page.drawRectangle({x: headerBoxX, y: currentY - 30, width: 100, height: -25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('PÁGINAS', { x: headerBoxX + 25, y: currentY - 40, font: helveticaBold, size: 8 });
    
    currentY -= 80;
    
    // --- Dados da Obra ---
    page.drawRectangle({ x: margin, y: currentY - 2, width: width - margin * 2, height: 20, color: rgb(0.9, 0.9, 0.9) });
    page.drawText("DADOS DA OBRA", { x: width / 2 - 40, y: currentY + 4, font: helveticaBold, size: 11 });

    currentY -= 22;
    page.drawText(`NOME: ${data.workName || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    page.drawText(`ENDEREÇO: ${data.workAddress || '...'}`, { x: width / 2, y: currentY, font: helvetica, size: 9 });
    
    currentY -= 20;
    page.drawText(`PREVISÃO DATA INICIO: ${data.startDate || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    page.drawText(`PREVISÃO DATA TÉRMINO: ${data.endDate || '...'}`, { x: width / 2, y: currentY, font: helvetica, size: 9 });
    
    currentY -= 20;
    page.drawText(`LOCAL DA OBRA / PAVIMENTO: ${data.workLocationDetails || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    
    currentY -= 15;
    currentY = await drawWrappedText({page, font: helvetica, text: `Descrição da atividade: ${data.activityDescription || '...'}`, x: margin + 5, y: currentY, maxWidth: width - margin*2 -10, lineHeight: 11, size: 9});
    
    currentY -= 20;

    // --- Responsáveis ---
    page.drawRectangle({ x: margin, y: currentY - 2, width: width - margin * 2, height: 20, color: rgb(0.9, 0.9, 0.9) });
    page.drawText("RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS", { x: width / 2 - 120, y: currentY + 4, font: helveticaBold, size: 11 });

    currentY -= 12;
    const respHeaders = ["NOME", "FUNÇÃO", "ASSINATURA"];
    const respColWidths = [(width - 2 * margin) * 0.4, (width - 2 * margin) * 0.3, (width - 2 * margin) * 0.3];
    
    let respHeaderX = margin;
    page.drawRectangle({ x: respHeaderX, y: currentY - 5, width: width - margin * 2, height: 20, color: rgb(0.95, 0.95, 0.95), borderColor: rgb(0.5,0.5,0.5), borderWidth: 0.5});
    respHeaders.forEach((header, i) => {
        page.drawText(header, { x: respHeaderX + 5, y: currentY, font: helveticaBold, size: 9 });
        respHeaderX += respColWidths[i];
    });

    currentY -= 25;
    if (data.responsiblePersons && data.responsiblePersons.length > 0) {
        data.responsiblePersons?.forEach((person: any) => {
            if (currentY < margin + 40) {
              page = pdfDoc.addPage([595.28, 841.89]);
              currentY = height - margin;
            }
            let colX = margin;
            page.drawText(person.name || '', { x: colX + 5, y: currentY, font: helvetica, size: 9 });
            colX += respColWidths[0];
            page.drawText(person.role || '', { x: colX + 5, y: currentY, font: helvetica, size: 9 });
            
            let rowX = margin;
            respColWidths.forEach(w => {
                page.drawRectangle({ x: rowX, y: currentY - 5, width: w, height: 20, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5});
                rowX += w;
            })
            currentY -= 20;
        });
    }

    currentY -= 15;

    // --- Procedimento Operacional ---
    if (data.proceduralSteps && data.proceduralSteps.length > 0) {
        if (currentY < 150) {
            page = pdfDoc.addPage([595.28, 841.89]);
            currentY = height - margin;
        }

        page.drawRectangle({ x: margin, y: currentY -2, width: width - margin * 2, height: 20, color: rgb(0.9, 0.9, 0.9) });
        page.drawText("PROCEDIMENTO OPERACIONAL", { x: width / 2 - 70, y: currentY + 4, font: helveticaBold, size: 11 });

        currentY -= 12;
        
        const procHeaders = ["ITEM", "ATIVIDADES", "RISCOS POTENCIAIS", "MEDIDAS PREVENTIVAS"];
        const procColWidths = [40, (width - margin*2 - 40) * 0.25, (width - margin*2 - 40) * 0.25, (width - margin*2 - 40) * 0.5 ];
        const lineHeight = 10;
        const fontSize = 8;
        const cellPadding = 5;

        // Draw header
        let procHeaderX = margin;
        page.drawRectangle({ x: procHeaderX, y: currentY - 5, width: width-margin*2, height: 20, color: rgb(0.95,0.95,0.95), borderColor: rgb(0.5,0.5,0.5), borderWidth: 0.5});
        procHeaders.forEach((header, i) => {
            page.drawText(header, { x: procHeaderX + cellPadding, y: currentY, font: helveticaBold, size: 8 });
            procHeaderX += procColWidths[i];
        });
        currentY -= (20 + 5);

        for (const step of data.proceduralSteps) {
            const getTextHeight = (text: string, font: PDFFont, size: number, maxWidth: number) => {
                const words = text.replace(/\r/g, '').split(/(\s+|\n)/);
                let lineCount = 1;
                let currentLine = '';
                for (const word of words) {
                    if (word === '\n') {
                        lineCount++;
                        currentLine = '';
                        continue;
                    }
                    const testLine = currentLine + word;
                    if (font.widthOfTextAtSize(testLine, size) > maxWidth && currentLine.length > 0) {
                        lineCount++;
                        currentLine = word.trimStart();
                    } else {
                        currentLine = testLine;
                    }
                }
                return lineCount * lineHeight;
            };

            const h1 = getTextHeight(String(step.item || ''), helvetica, fontSize, procColWidths[0] - cellPadding * 2);
            const h2 = getTextHeight(step.activity || '', helvetica, fontSize, procColWidths[1] - cellPadding * 2);
            const h3 = getTextHeight(step.potentialRisks || '', helvetica, fontSize, procColWidths[2] - cellPadding * 2);
            const h4 = getTextHeight(step.preventiveMeasures || '', helvetica, fontSize, procColWidths[3] - cellPadding * 2);
            const rowHeight = Math.max(h1, h2, h3, h4) + cellPadding * 2;

            if (currentY - rowHeight < margin) {
                page = pdfDoc.addPage([595.28, 841.89]);
                currentY = height - margin;
              
                // Redraw header on new page
                let procHeaderX = margin;
                page.drawRectangle({ x: procHeaderX, y: currentY - 5, width: width-margin*2, height: 20, color: rgb(0.95,0.95,0.95), borderColor: rgb(0.5,0.5,0.5), borderWidth: 0.5});
                procHeaders.forEach((header, i) => {
                    page.drawText(header, { x: procHeaderX + cellPadding, y: currentY, font: helveticaBold, size: 8 });
                    procHeaderX += procColWidths[i];
                });
                currentY -= (20 + 5);
            }
            
            const startY = currentY;
            
            const y1 = await drawWrappedText({page, font: helvetica, text: String(step.item || ''), x: margin + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[0] - cellPadding*2, lineHeight, size: fontSize });
            const y2 = await drawWrappedText({page, font: helvetica, text: step.activity || '', x: margin + procColWidths[0] + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[1] - cellPadding*2, lineHeight, size: fontSize });
            const y3 = await drawWrappedText({page, font: helvetica, text: step.potentialRisks || '', x: margin + procColWidths[0] + procColWidths[1] + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[2] - cellPadding*2, lineHeight, size: fontSize });
            const y4 = await drawWrappedText({page, font: helvetica, text: step.preventiveMeasures || '', x: margin + procColWidths[0] + procColWidths[1] + procColWidths[2] + cellPadding, y: startY - cellPadding, maxWidth: procColWidths[3] - cellPadding*2, lineHeight, size: fontSize });
            
            const finalY = Math.min(y1, y2, y3, y4);
            const drawnRowHeight = startY - finalY;
            
            let borderX = margin;
            procColWidths.forEach(w => {
                 page.drawRectangle({ x: borderX, y: finalY - cellPadding, width: w, height: drawnRowHeight + cellPadding*2, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5});
                 borderX += w;
            });
            
            currentY = finalY - cellPadding;
        }
    }


    const pageCount = pdfDoc.getPageCount();
    pdfDoc.getPages().forEach((p, i) => {
       try {
        p.drawText(`Página ${i + 1} de ${pageCount}`, { x: width-margin-100, y: height-margin-52, font: helvetica, size: 9 })
       } catch(e) {
           // This can fail if the page number overlaps with the header box. Ignore.
       }
    })

    const finalPdfBytes = await pdfDoc.save()
    
    const pdfBase64 = Buffer.from(finalPdfBytes).toString('base64');
    
    return { pdfBase64, error: null };

  } catch (e:any) {
    console.error('Erro detalhado ao gerar PDF:', e, e.stack);
    return { pdfBase64: null, error: `Erro no servidor ao gerar PDF: ${e.message}` };
  }
}
