'use server';
import { PDFDocument, StandardFonts, rgb, PDFFont } from 'pdf-lib';

export const runtime = 'nodejs';

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

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    const { width, height } = page.getSize();
    const margin = 40;
    
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // --- HEADER ---
    page.drawText(data.companyName || 'Nome da Empresa', {
      x: margin,
      y: height - margin,
      font: helveticaBold,
      size: 18,
      color: rgb(0.1, 0.1, 0.4),
    });
    page.drawText(`Serviços a executar: ${data.activityDescription || '...'}`, {
        x: margin,
        y: height - margin - 20,
        font: helvetica,
        size: 9,
    });
    
    // --- Dados da Obra ---
    let currentY = height - margin - 60;
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
    
    currentY -= 20;
    page.drawText(`Descrição da atividade: ${data.activityDescription || '...'}`, { x: margin + 5, y: currentY, font: helvetica, size: 9 });

    currentY -= 30;

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
    const respTableY = currentY;
    const respHeaders = ["NOME", "FUNÇÃO", "ASSINATURA"];
    const respColWidths = [(width - 2 * margin) * 0.4, (width - 2 * margin) * 0.3, (width - 2 * margin) * 0.3];
    
    let respX = margin;
    respHeaders.forEach((header, i) => {
        page.drawText(header, { x: respX + 5, y: currentY, font: helveticaBold, size: 9 });
        page.drawRectangle({ x: respX, y: currentY - 5, width: respColWidths[i], height: 20, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 1});
        respX += respColWidths[i];
    });

    currentY -= 25;
    data.responsiblePersons?.forEach((person: any) => {
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

    currentY -= 20;

    // --- Procedimento Operacional ---
    if (data.proceduralSteps && data.proceduralSteps.length > 0) {
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
        const procColWidths = [40, 150, 150, 175.28];
        const lineHeight = 12;

        let procHeaderX = margin;
        procHeaders.forEach((header, i) => {
            page.drawText(header, { x: procHeaderX + 5, y: currentY, font: helveticaBold, size: 8 });
            procHeaderX += procColWidths[i];
        });
        currentY -= (lineHeight + 5);

        for (const step of data.proceduralSteps) {
            const startY = currentY;
            let finalY = startY;

            let col1Y = await drawWrappedText(page, helvetica, step.item.toString(), margin + 5, currentY, procColWidths[0] - 10, lineHeight, 9);
            finalY = Math.min(finalY, col1Y);
            
            let col2Y = await drawWrappedText(page, helvetica, step.activity, margin + procColWidths[0] + 5, currentY, procColWidths[1] - 10, lineHeight, 9);
            finalY = Math.min(finalY, col2Y);

            let col3Y = await drawWrappedText(page, helvetica, step.potentialRisks, margin + procColWidths[0] + procColWidths[1] + 5, currentY, procColWidths[2] - 10, lineHeight, 9);
            finalY = Math.min(finalY, col3Y);

            let col4Y = await drawWrappedText(page, helvetica, step.preventiveMeasures, margin + procColWidths[0] + procColWidths[1] + procColWidths[2] + 5, currentY, procColWidths[3] - 10, lineHeight, 9);
            finalY = Math.min(finalY, col4Y);
            
            const rowHeight = startY - finalY + lineHeight;
            
            // Draw borders
            let borderX = margin;
            procColWidths.forEach(w => {
                 page.drawRectangle({ x: borderX, y: finalY - 5, width: w, height: startY - finalY + 15, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5});
                 borderX += w;
            });
            
            currentY = finalY - 10;
             if (currentY < margin + 100) {
              page = pdfDoc.addPage([595.28, 841.89]);
              currentY = height - margin;
            }
        }
    }


    const pdfBytes = await pdfDoc.save();

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="APR-${data.companyName?.replace(/ /g,"_")}-${data.date}.pdf"`,
      },
    });
  } catch (e:any) {
    console.error('Erro ao gerar PDF:', e);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor ao gerar PDF', details: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
