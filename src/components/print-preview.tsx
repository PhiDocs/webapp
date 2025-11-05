'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';

interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
}

// Represents the content to be rendered on a single page
interface PageContent {
    key: string;
    isFirstPage: boolean;
    // content can be a full component or just the analysis steps for subsequent pages
    content: React.ReactNode; 
}


// --- Sub-components for printing ---

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
          <p className="page-number-placeholder">&nbsp;</p>
        </div>
      </div>
    </footer>
  )
}

function FirstPageStaticContent({ data }: { data: SafetyFormValues }) {
    const teamMembers = data.teamMembers || [];
    return (
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
                  {Array.from({ length: Math.max(0, 10 - teamMembers.length) }).map((_: any, index: number) => (
                    <tr key={`empty-team-${index}`}>
                      <td className="h-10"></td><td></td><td></td><td></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </>
    );
}

function AnalysisTable({ steps, isContinuation }: { steps: any[], isContinuation: boolean }) {
     if (!steps || steps.length === 0) {
        return (
            <section className="mb-4 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
                A análise de procedimento operacional aparecerá aqui após ser gerada.
            </section>
        );
    }

    return (
        <section className='analysis-table-wrapper'>
          {!isContinuation && <h3 className="section-title">PROCEDIMENTO OPERACIONAL</h3>}
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
              {steps.map((step: any, index: number) => (
                <tr key={`proc-step-${step.item || index}`} className="procedural-step-row">
                  <td className="p-2 align-top text-center">{step.item}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{step.activity}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{step.potentialRisks}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{step.preventiveMeasures}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
    );
}

function SignatureSection() {
    return (
        <section className="signature-section mt-auto pt-8">
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
    )
}

function getShortDate(dateString: string) {
  if (!dateString) return '...';
  try {
    const date = new Date(dateString);
    // Adjust for timezone offset to prevent date changes
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida'
  }
}

const PAGE_CONTENT_HEIGHT_MM = 297 - 20 - 20; // A4 height minus 20mm top/bottom margin

// This is the main component that orchestrates the paginated preview
export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
  const [pages, setPages] = useState<PageContent[]>([]);
  const measurementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    
    // Function to create and measure a temporary element
    const measureContent = (node: React.ReactNode): number => {
        const measurementNode = measurementRef.current;
        if (!measurementNode) return 0;
        
        const tempDiv = document.createElement('div');
        measurementNode.appendChild(tempDiv);
        
        // This is a trick to render React nodes into a DOM element for measurement
        const root = (require('react-dom/client') as any).createRoot(tempDiv);
        root.render(node);
        const height = tempDiv.getBoundingClientRect().height;
        root.unmount();
        measurementNode.removeChild(tempDiv);
        
        return height;
    };


    const paginate = () => {
        const newPages: PageContent[] = [];
        const proceduralSteps = analysisData?.proceduralSteps || [];

        // --- Calculate First Page Content ---
        let currentPageHeight = 0;
        const pageContentHeightPx = PAGE_CONTENT_HEIGHT_MM * 3.78; // Approx conversion

        const headerHeight = measureContent(<PrintHeader data={formData} />);
        const firstPageStaticHeight = measureContent(<FirstPageStaticContent data={formData} />);
        const footerHeight = measureContent(<PrintFooter data={formData} />);
        const tableHeaderHeight = measureContent(
            <table className="analysis-table"><thead><tr><th>ITEM</th><th>ATIVIDADES</th><th>RISCOS POTENCIAIS</th><th>MEDIDAS PREVENTIVAS / RECOMENDAÇÕES DE SEGURANÇA</th></tr></thead></table>
        );
        const signatureHeight = measureContent(<SignatureSection />);

        currentPageHeight += headerHeight + firstPageStaticHeight + tableHeaderHeight;
        
        const firstPageRows: any[] = [];
        let remainingSteps = [...proceduralSteps];

        // Add rows to first page until it's full
        for (const step of remainingSteps) {
            const rowHeight = measureContent(<tr className="procedural-step-row"><AnalysisTable steps={[step]} isContinuation={true} /></tr>);
            if (currentPageHeight + rowHeight + signatureHeight + footerHeight > pageContentHeightPx) {
                break; // Page is full
            }
            firstPageRows.push(step);
            currentPageHeight += rowHeight;
        }

        newPages.push({
            key: `page-0`,
            isFirstPage: true,
            content: (
                <>
                    <FirstPageStaticContent data={formData} />
                    <AnalysisTable steps={firstPageRows} isContinuation={false} />
                    <SignatureSection />
                </>
            )
        });

        // Remove the steps that were added to the first page
        remainingSteps.splice(0, firstPageRows.length);


        // --- Calculate Subsequent Pages ---
        if (remainingSteps.length > 0) {
            let pageIndex = 1;
            let currentSubsequentPageRows: any[] = [];
            currentPageHeight = tableHeaderHeight + footerHeight; // Reset for new page

            for (const step of remainingSteps) {
                const rowHeight = measureContent(<tr className="procedural-step-row"><AnalysisTable steps={[step]} isContinuation={true} /></tr>);
                if (currentPageHeight + rowHeight > pageContentHeightPx) {
                    // Finalize previous page
                    newPages.push({
                        key: `page-${pageIndex}`,
                        isFirstPage: false,
                        content: <AnalysisTable steps={currentSubsequentPageRows} isContinuation={true} />
                    });
                    pageIndex++;
                    // Start new page
                    currentSubsequentPageRows = [step];
                    currentPageHeight = tableHeaderHeight + footerHeight + rowHeight;
                } else {
                    currentSubsequentPageRows.push(step);
                    currentPageHeight += rowHeight;
                }
            }

            // Add the last page
            if (currentSubsequentPageRows.length > 0) {
                newPages.push({
                    key: `page-${pageIndex}`,
                    isFirstPage: false,
                    content: <AnalysisTable steps={currentSubsequentPageRows} isContinuation={true} />
                });
            }
        }
        setPages(newPages);
    };

    if (formData.companyName) { // Only paginate when we have data
         // Using a timeout to ensure DOM is ready for measurement
        setTimeout(paginate, 100);
    } else {
         setPages([]); // Clear pages if form is reset
    }

  }, [formData, analysisData]);

  if (pages.length === 0) {
    return (
      <div className="print-page-container">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
          A pré-visualização do documento aparecerá aqui.
        </div>
        {/* Hidden container for measurement */}
        <div ref={measurementRef} style={{ position: 'absolute', opacity: 0, zIndex: -1, width: '210mm', background: 'white' }} className='page-content-wrapper' />
      </div>
    );
  }

  return (
    <>
      {pages.map((page) => (
          <div key={page.key} className="print-page-container">
            <div className="page-content-wrapper">
                {page.isFirstPage && <PrintHeader data={formData} />}
                <main className='print-main'>
                    {page.content}
                </main>
                <PrintFooter data={formData} />
            </div>
          </div>
      ))}
      {/* Hidden container for measurement */}
      <div ref={measurementRef} style={{ position: 'absolute', opacity: 0, zIndex: -1, width: '210mm', background: 'white' }} className='page-content-wrapper' />
    </>
  );
}
