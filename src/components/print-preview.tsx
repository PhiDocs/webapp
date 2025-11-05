'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';

interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
}

const PAGE_HEIGHT_MM = 297;
const HEADER_HEIGHT_MM = 95; // Approximate height of the header section
const FOOTER_HEIGHT_MM = 25; // Approximate height of the footer section
const ROW_HEIGHT_MM = 10; // Approximate height of a table row

const MM_TO_PX = 3.78; // Conversion factor

// This component renders the raw, unpaginated content
export function PrintPreviewContent({ formData, analysisData, isFirstPage = false }: { formData: SafetyFormValues; analysisData: SafetyAnalysisOutput | null, isFirstPage?: boolean }) {
  const data = { ...formData, ...analysisData };
  const teamMembers = data.teamMembers || [];

  return (
    <>
      {isFirstPage && (
        <>
          <section className="mb-4">
            <h3 className="section-title">RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS</h3>
            <table className="w-full border-collapse border mt-1 analysis-table">
              <thead>
                <tr>
                  <th className="text-left w-[40%]">NOME</th>
                  <th className="text-left w-[30%]">FUNÇÃO</th>
                  <th className="text-left w-[30%]">ASSINATURA</th>
                </tr>
              </thead>
              <tbody>
                {data.responsiblePersons?.map((person: any, index: number) => (
                  <tr key={`resp-${index}`}>
                    <td className="h-12">{person.name || '...'}</td>
                    <td>{person.role || '...'}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {teamMembers.length > 0 && (
            <section className="mb-4 break-after-page">
              <h3 className="section-title">EQUIPE DE TRABALHO</h3>
              <table className="w-full border-collapse border mt-1 analysis-table">
                <thead>
                  <tr>
                    <th className="text-left w-1/4">DATA</th>
                    <th className="text-left w-1/4">NOME</th>
                    <th className="text-left w-1/4">FUNÇÃO / EMPRESA</th>
                    <th className="text-left w-1/4">ASSINATURA</th>
                  </tr>
                </thead>
                <tbody>
                  {teamMembers.map((member: any, index: number) => (
                    <tr key={`team-${index}`}>
                      <td className="h-10">{getShortDate(member.date)}</td>
                      <td>{member.name}</td>
                      <td>{member.role}</td>
                      <td></td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 15 - teamMembers.length) }).map((_: any, index: number) => (
                    <tr key={`empty-team-${index}`}>
                      <td className="h-10"></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
      )}

      {data?.proceduralSteps && data.proceduralSteps.length > 0 ? (
        <section className='analysis-table-wrapper'>
          <h3 className="section-title">PROCEDIMENTO OPERACIONAL</h3>
          <table className="w-full border-collapse border mt-1 text-xs analysis-table">
            <thead>
              <tr>
                <th className="p-1 text-left w-[5%]">ITEM</th>
                <th className="p-1 text-left w-[25%]">ATIVIDADES</th>
                <th className="p-1 text-left w-[25%]">RISCOS POTENCIAIS</th>
                <th className="p-1 text-left w-[45%]">MEDIDAS PREVENTIVAS / RECOMENDAÇÕES DE SEGURANÇA</th>
              </tr>
            </thead>
            <tbody>
              {data.proceduralSteps.map((step: any, index: number) => (
                <tr key={`proc-${index}`} className="procedural-step-row">
                  <td className="p-2 align-top text-center">{step.item}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{step.activity}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{step.potentialRisks}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{step.preventiveMeasures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
         isFirstPage && (
            <section className="mb-4 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
                A análise de procedimento operacional aparecerá aqui após ser gerada.
            </section>
         )
      )}
       {isFirstPage && (
          <section className="signature-section mt-auto pt-8 page-break-before">
            <h3 className="section-title">Assinaturas</h3>
            <div className="signature-grid">
                <div>
                    <div className="signature-line"></div>
                    <p className="signature-label">Responsável pela Segurança</p>
                </div>
                <div>
                    <div className="signature-line"></div>
                    <p className="signature-label">Gerente do Projeto</p>
                </div>
            </div>
        </section>
       )}
    </>
  );
}


function PrintHeader({ data }: { data: SafetyFormValues }) {
  return (
    <header className="print-header pb-4 border-b">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {data.companyLogo ? (
            <img src={data.companyLogo} alt="Company Logo" className="h-16 w-auto max-w-[120px] object-contain" />
          ) : (
            <Logo className="h-12 w-12 text-gray-700" />
          )}
          <div className='flex-1'>
            <h1 className="text-xl font-bold text-gray-800">{data.companyName || 'Nome da Empresa'}</h1>
            <p className='text-xs max-w-xs mt-2'>
              <strong className='font-semibold'>Serviços a executar:</strong> {data.activityDescription || '...'}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col gap-2 shrink-0">
          <div className='border p-1 text-center min-w-[100px]'>
            <p className='text-xs font-bold'>APR Nº</p>
            <p className='text-sm'>&nbsp;</p>
          </div>
          <div className='border p-1 text-center min-w-[100px]'>
            <p className='text-xs font-bold'>Revisão</p>
            <p className='text-sm'>01</p>
          </div>
        </div>
      </div>
      <section className="mt-4">
        <h3 className="section-title">DADOS DA OBRA</h3>
        <table className="w-full border-collapse border info-grid">
          <tbody>
            <tr>
              <td className="w-1/2"><strong>NOME:</strong>{data.workName || '...'}</td>
              <td className="w-1/2"><strong>ENDEREÇO:</strong>{data.workAddress || '...'}</td>
            </tr>
            <tr>
              <td><strong>PREVISÃO DATA INICIO:</strong>{getShortDate(data.startDate)}</td>
              <td><strong>PREVISÃO DATA TÉRMINO:</strong>{getShortDate(data.endDate)}</td>
            </tr>
            <tr>
              <td colSpan={2}><strong>LOCAL DA OBRA / PAVIMENTO:</strong>{data.workLocationDetails || '...'}</td>
            </tr>
            <tr>
              <td colSpan={2}><strong>Descrição da atividade:</strong>{data.activityDescription || '...'}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </header>
  )
}

function PrintFooter({ data }: { data: SafetyFormValues }) {
  const date = new Date().toLocaleDateString('pt-BR');
  return (
    <footer className="print-footer pt-2 mt-auto text-xs text-gray-500 border-t">
      <div className="flex justify-between items-end">
        <div className="text-left max-w-[40%]">
          <p>Organizar e arquivar este documento e suas revisões</p>
          <p>Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
        </div>
        <div className="text-center">
          <p>&copy; {new Date().getFullYear()} {data.companyName}</p>
        </div>
        <div className="text-right">
          <p>Data: {date}</p>
          {/* This placeholder is filled during PDF generation */}
          <p className="page-number-placeholder">&nbsp;</p>
        </div>
      </div>
    </footer>
  )
}

function getShortDate(dateString: string) {
  if (!dateString) return '...';
  try {
    const date = new Date(dateString);
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida'
  }
}

// We default to the new paginated component.
export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<React.ReactNode[]>([]);

  useEffect(() => {
    if (!analysisData || !contentRef.current) {
        // Render a single page if there is no analysis data yet
        setPages([
            <div key="page-initial" className="print-page-container">
                 <div className="page-content-wrapper">
                    <PrintHeader data={formData} />
                    <main className='print-main'>
                        <PrintPreviewContent formData={formData} analysisData={null} isFirstPage={true} />
                    </main>
                    <PrintFooter data={formData} />
                </div>
            </div>
        ]);
        return;
    }
    
    const pageHeightPx = (PAGE_HEIGHT_MM - 40) * MM_TO_PX; // 20mm top/bottom margin
    const contentElement = contentRef.current;
    
    // Temporarily render all content to measure it
    const allRows = Array.from(contentElement.querySelectorAll('.procedural-step-row'));
    
    const newPages = [];
    let currentPageRows = [];
    let currentPageHeight = 0;

    // First Page
    const firstPageContentHeight = HEADER_HEIGHT_MM * MM_TO_PX;
    currentPageHeight += firstPageContentHeight;

    for (const row of allRows) {
        const rowHeight = row.getBoundingClientRect().height;
        if (currentPageHeight + rowHeight > pageHeightPx) {
            newPages.push(currentPageRows);
            currentPageRows = [row];
            currentPageHeight = FOOTER_HEIGHT_MM * MM_TO_PX; // Reset height for new page
        } else {
            currentPageRows.push(row);
            currentPageHeight += rowHeight;
        }
    }
    newPages.push(currentPageRows);


    const proceduralSteps = analysisData.proceduralSteps || [];

    const pageComponents = newPages.map((pageRows, pageIndex) => {
        const rowIndexes = pageRows.map(row => allRows.indexOf(row));
        const pageSteps = rowIndexes.map(index => proceduralSteps[index]);
        
        const pageAnalysisData = { ...analysisData, proceduralSteps: pageSteps };

        return (
            <div key={`page-${pageIndex}`} className="print-page-container">
                <div className="page-content-wrapper">
                   {pageIndex === 0 && <PrintHeader data={formData} />}
                    <main className='print-main'>
                        <PrintPreviewContent formData={formData} analysisData={pageAnalysisData} isFirstPage={pageIndex === 0} />
                    </main>
                    <PrintFooter data={formData} />
                </div>
            </div>
        );
    });

    setPages(pageComponents);

  }, [formData, analysisData]);

  if (!formData.companyName && !analysisData) {
    return (
      <div className="print-page-container">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
          A pré-visualização do documento aparecerá aqui.
        </div>
      </div>
    );
  }

  return (
    <>
      {pages}
      {/* Hidden container for measurement */}
      <div ref={contentRef} style={{ position: 'absolute', opacity: 0, zIndex: -1, width: '210mm' }}>
         <PrintPreviewContent formData={formData} analysisData={analysisData} isFirstPage={true} />
      </div>
    </>
  );
}

export { PrintPreviewContent };
