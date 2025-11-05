'use server';

import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';

// Helper to draw wrapped text
async function drawWrappedText(
  page: any,
  font: PDFFont,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  size: number
) {
  const words = text.replace(/\n/g, ' \n ').split(' ');
  let currentLine = '';
  let currentY = y;

  for (const word of words) {
    if (word === '\n') {
      page.drawText(currentLine, { x, y: currentY, font, size, color: rgb(0.2, 0.2, 0.2), lineHeight });
      currentY -= lineHeight;
      currentLine = '';
      continue;
    }
    const testLine = currentLine + (currentLine === '' ? '' : ' ') + word;
    const { width } = font.widthOfTextAtSize(testLine, size);

    if (width > maxWidth) {
      page.drawText(currentLine, { x, y: currentY, font, size, color: rgb(0.2, 0.2, 0.2), lineHeight });
      currentY -= lineHeight;
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  page.drawText(currentLine, { x, y: currentY, font, size, color: rgb(0.2, 0.2, 0.2), lineHeight });
  return currentY - lineHeight;
}


export async function generatePdfAction(data: any): Promise<{pdfBase64: string | null; error: string | null}> {
  try {
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const margin = 40;
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- HEADER ---
    if (data.companyLogo) {
        const imageBytes = Buffer.from(data.companyLogo.split(',')[1], 'base64');
        const image = await pdfDoc.embedPng(imageBytes);
        const imageDims = image.scaleToFit(120, 40);
        page.drawImage(image, {
            x: margin,
            y: height - margin - imageDims.height + 20,
            width: imageDims.width,
            height: imageDims.height,
        });
    }

    page.drawText(data.companyName || 'Nome da Empresa', {
      x: margin,
      y: height - margin,
      font: helveticaBold,
      size: 18,
      color: rgb(0.1, 0.1, 0.4),
    });
    
    await drawWrappedText(page, helvetica, `Serviços a executar: ${data.activityDescription || '...'}`, margin, height - margin - 25, width - margin * 2 - 150, 10, 9);
    
    // Header boxes (DATA, APR, etc)
    let headerBoxX = width - margin - 210;
    page.drawRectangle({x: headerBoxX, y: height-margin-15, width: 100, height: 25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('DATA', { x: headerBoxX + 35, y: height-margin-10, font: helveticaBold, size: 8 });
    page.drawText(new Date().toLocaleDateString('pt-BR'), { x: headerBoxX + 25, y: height-margin-25, font: helvetica, size: 9 });

    headerBoxX += 110;
    page.drawRectangle({x: headerBoxX, y: height-margin-15, width: 100, height: 25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('APR Nº', { x: headerBoxX + 30, y: height-margin-10, font: helveticaBold, size: 8 });
    
    headerBoxX = width - margin - 210;
    page.drawRectangle({x: headerBoxX, y: height-margin-45, width: 100, height: 25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('Revisão', { x: headerBoxX + 30, y: height-margin-40, font: helveticaBold, size: 8 });
    page.drawText('01', { x: headerBoxX + 45, y: height-margin-55, font: helvetica, size: 9 });

    headerBoxX += 110;
    page.drawRectangle({x: headerBoxX, y: height-margin-45, width: 100, height: 25, borderColor: rgb(0.5,0.5,0.5), borderWidth: 1});
    page.drawText('PÁGINAS', { x: headerBoxX + 25, y: height-margin-40, font: helveticaBold, size: 8 });
    
    // --- Dados da Obra ---
    let currentY = height - margin - 90;
    page.drawRectangle({
        x: margin,
        y: currentY - 15,
        width: width - margin * 2,
        height: 20,
        color: rgb(0.9, 0.9, 0.9)
    });
    page.drawText("DADOS DA OBRA", { x: width / 2 - 40, y: currentY - 10, font: helveticaBold, size: 11 });

    currentY -= 35;
    page.drawText(`NOME: ${data.workName || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    page.drawText(`ENDEREÇO: ${data.workAddress || '...'}`, { x: width / 2, y: currentY, font: helvetica, size: 9 });
    
    currentY -= 20;
    page.drawText(`PREVISÃO DATA INICIO: ${data.startDate || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    page.drawText(`PREVISÃO DATA TÉRMINO: ${data.endDate || '...'}`, { x: width / 2, y: currentY, font: helvetica, size: 9 });
    
    currentY -= 20;
    page.drawText(`LOCAL DA OBRA / PAVIMENTO: ${data.workLocationDetails || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });
    
    currentY -= 15;
    currentY = await drawWrappedText(page, helvetica, `Descrição da atividade: ${data.activityDescription || '...'}`, margin + 5, currentY, width - margin*2 -10, 11, 9);
    
    currentY -= 20;

    // --- Responsáveis ---
    page.drawRectangle({
        x: margin,
        y: currentY - 15,
        width: width - margin * 2,
        height: 20,
        color: rgb(0.9, 0.9, 0.9)
    });
    page.drawText("RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS", { x: width / 2 - 120, y: currentY - 10, font: helveticaBold, size: 11 });

    currentY -= 25;
    const respHeaders = ["NOME", "FUNÇÃO", "ASSINATURA"];
    const respColWidths = [(width - 2 * margin) * 0.4, (width - 2 * margin) * 0.3, (width - 2 * margin) * 0.3];
    
    let respX = margin;
    respHeaders.forEach((header, i) => {
        page.drawText(header, { x: respX + 5, y: currentY, font: helveticaBold, size: 9 });
        page.drawRectangle({ x: respX, y: currentY - 5, width: respColWidths[i], height: 20, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 1});
        respX += respColWidths[i];
    });

    currentY -= 25;
    if (data.responsiblePersons && data.responsiblePersons.length > 0) {
        data.responsiblePersons?.forEach((person: any) => {
             if (currentY < margin + 20) {
              page = pdfDoc.addPage([595.28, 841.89]);
              currentY = height - margin;
            }
            let colX = margin;
            page.drawText(person.name, { x: colX + 5, y: currentY, font: helvetica, size: 9 });
            colX += respColWidths[0];
            page.drawText(person.role, { x: colX + 5, y: currentY, font: helvetica, size: 9 });
            
            let rowX = margin;
            respColWidths.forEach(w => {
                page.drawRectangle({ x: rowX, y: currentY - 5, width: w, height: 20, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 1});
                rowX += w;
            })
            currentY -= 20;
        });
    }

    currentY -= 20;

    // --- Procedimento Operacional ---
    if (data.proceduralSteps && data.proceduralSteps.length > 0) {
        if (currentY < 150) {
            page = pdfDoc.addPage([595.28, 841.89]);
            currentY = height - margin;
        }

        page.drawRectangle({
            x: margin,
            y: currentY - 15,
            width: width - margin * 2,
            height: 20,
            color: rgb(0.9, 0.9, 0.9)
        });
        page.drawText("PROCEDIMENTO OPERACIONAL", { x: width / 2 - 70, y: currentY - 10, font: helveticaBold, size: 11 });

        currentY -= 25;
        
        const procHeaders = ["ITEM", "ATIVIDADES", "RISCOS POTENCIAIS", "MEDIDAS PREVENTIVAS"];
        const procColWidths = [40, (width - margin*2 - 40) * 0.25, (width - margin*2 - 40) * 0.25, (width - margin*2 - 40) * 0.5 ];
        const lineHeight = 10;

        let procHeaderX = margin;
        page.drawRectangle({ x: procHeaderX, y: currentY - 5, width: width-margin*2, height: 20, color: rgb(0.95,0.95,0.95)});

        procHeaders.forEach((header, i) => {
            page.drawRectangle({ x: procHeaderX, y: currentY - 5, width: procColWidths[i], height: 20, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5});
            page.drawText(header, { x: procHeaderX + 5, y: currentY, font: helveticaBold, size: 8 });
            procHeaderX += procColWidths[i];
        });
        currentY -= (lineHeight + 5);

        for (const step of data.proceduralSteps) {
             const fontHeight = 9;
             const linePadding = 5;
             const calcHeight = (text: string, font: PDFFont, size: number, maxWidth: number) => {
                const lines = text.split('\n').map(line => {
                    let wrappedLines = 1;
                    let currentLine = '';
                    const words = line.split(' ');
                    for (const word of words) {
                        const testLine = currentLine + (currentLine ? ' ' : '') + word;
                        if (font.widthOfTextAtSize(testLine, size) > maxWidth) {
                            wrappedLines++;
                            currentLine = word;
                        } else {
                            currentLine = testLine;
                        }
                    }
                    return wrappedLines;
                }).reduce((a,b) => a+b, 0);
                 
                return (lines || 1) * (size + 2); // line height approximation
             }
             
             const activityHeight = calcHeight(step.activity, helvetica, fontHeight, procColWidths[1] - 10);
             const risksHeight = calcHeight(step.potentialRisks, helvetica, fontHeight, procColWidths[2] - 10);
             const measuresHeight = calcHeight(step.preventiveMeasures, helvetica, fontHeight, procColWidths[3] - 10);
             
             const estimatedRowHeight = Math.max(activityHeight, risksHeight, measuresHeight, fontHeight) + linePadding * 2;

             if (currentY - estimatedRowHeight < margin) {
              page = pdfDoc.addPage([595.28, 841.89]);
              currentY = height - margin;
              
                let procHeaderX = margin;
                page.drawRectangle({ x: procHeaderX, y: currentY - 5, width: width-margin*2, height: 20, color: rgb(0.95,0.95,0.95)});
                procHeaders.forEach((header, i) => {
                    page.drawRectangle({ x: procHeaderX, y: currentY - 5, width: procColWidths[i], height: 20, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5});
                    page.drawText(header, { x: procHeaderX + 5, y: currentY, font: helveticaBold, size: 8 });
                    procHeaderX += procColWidths[i];
                });
                currentY -= (lineHeight + 5);
            }
            
            const startY = currentY;
            
            const y1 = await drawWrappedText(page, helvetica, step.item.toString(), margin + 5, startY - linePadding, procColWidths[0] - 10, lineHeight, fontHeight);
            const y2 = await drawWrappedText(page, helvetica, step.activity, margin + procColWidths[0] + 5, startY - linePadding, procColWidths[1] - 10, lineHeight, fontHeight);
            const y3 = await drawWrappedText(page, helvetica, step.potentialRisks, margin + procColWidths[0] + procColWidths[1] + 5, startY - linePadding, procColWidths[2] - 10, lineHeight, fontHeight);
            const y4 = await drawWrappedText(page, helvetica, step.preventiveMeasures, margin + procColWidths[0] + procColWidths[1] + procColWidths[2] + 5, startY - linePadding, procColWidths[3] - 10, lineHeight, fontHeight);
            
            const endY = Math.min(y1, y2, y3, y4);
            
            const rowHeight = startY - endY;
            
            let borderX = margin;
            procColWidths.forEach(w => {
                 page.drawRectangle({ x: borderX, y: endY - linePadding, width: w, height: rowHeight + linePadding, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5});
                 borderX += w;
            });
            
            currentY = endY - linePadding;
        }
    }


    const pageCount = pdfDoc.getPageCount();
    pdfDoc.getPages().forEach((p, i) => {
       p.drawText(`Página ${i + 1} de ${pageCount}`, { x: width-margin-60, y: height-margin-55, font: helvetica, size: 9 })
    })

    const finalPdfBytes = await pdfDoc.save()
    
    const pdfBase64 = Buffer.from(finalPdfBytes).toString('base64');
    
    return { pdfBase64, error: null };

  } catch (e:any) {
    console.error('Erro detalhado ao gerar PDF:', e);
    return { pdfBase64: null, error: e.message || 'Erro desconhecido ao gerar PDF.' };
  }
}
