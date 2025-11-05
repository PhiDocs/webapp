'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';
import { createRoot, type Root } from 'react-dom/client';

interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
}

// --- Sub-components for printing ---

function PrintHeader({ data }: { data: SafetyFormValues }) {
  return (
    <header className="print-header">
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

function PrintFooter({ page, totalPages, date }: { page: number; totalPages: number; date: string }) {
  return (
    <footer className="print-footer mt-auto text-xs text-gray-500 border-t pt-2">
      <div className="flex justify-between items-center w-full">
        <div className="text-left">
          <p>Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
        </div>
        <div className="text-center">
          <p>Data: {date}</p>
        </div>
        <div className="text-right">
          <p>Página <span className='page-number'>{page}</span> de <span className='total-pages'>{totalPages}</span></p>
        </div>
      </div>
    </footer>
  )
}

function ResponsiblesSection({ data }: { data: SafetyFormValues }) {
    return (
        <section className="responsibles-section avoid-break">
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
                {(data.responsiblePersons?.length > 0 ? data.responsiblePersons : [{ name: '', role: '' }]).map((person: any, index: number) => (
                  <tr key={`resp-${index}`}>
                    <td className="h-12">{person.name || '...'}</td>
                    <td>{person.role || '...'}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
        </section>
    );
}

function TeamSection({ data }: { data: SafetyFormValues }) {
    const teamMembers = data.teamMembers || [];
     if (teamMembers.length === 0) return null;

    return (
      <section className="team-section avoid-break">
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
          </tbody>
        </table>
      </section>
    );
}

function AnalysisTable({ steps }: { steps: any[] }) {
    const hasSteps = steps && steps.length > 0;

    return (
        <section className='analysis-table-wrapper'>
          <h3 className="section-title">PROCEDIMENTO OPERACIONAL</h3>
           {!hasSteps && (
            <div className="text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
                A análise de procedimento operacional aparecerá aqui após ser gerada.
            </div>
          )}
          {hasSteps && (
            <table className="w-full border-collapse border mt-1 text-xs analysis-table">
              <thead className='analysis-table-header'>
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
          )}
        </section>
    );
}

function SignatureSection() {
    return (
        <section className="signature-section mt-auto pt-8 avoid-break">
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
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida'
  }
}


export function PrintPreviewContent({ formData, analysisData }: PrintPreviewProps) {
  const proceduralSteps = useMemo(() => analysisData?.proceduralSteps || [], [analysisData]);

  // We are creating a "full" render of all content here to measure it.
  return (
    <>
      <PrintHeader data={formData} />
      <main className='print-main'>
          <ResponsiblesSection data={formData} />
          <AnalysisTable steps={proceduralSteps} />
          <TeamSection data={formData} />
          <SignatureSection />
      </main>
    </>
  );
}


// This is the main component that orchestrates the paginated preview
export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
  const [pages, setPages] = useState<React.ReactNode[]>([]);
  const measurementRootRef = useRef<Root | null>(null);
  const date = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);

  useEffect(() => {
    // This function will be responsible for creating and destroying the measurement root
    const setupMeasurementRoot = () => {
        const measurementNode = document.getElementById('measurement-root');
        if (measurementNode) {
            if (!measurementRootRef.current) {
                measurementRootRef.current = createRoot(measurementNode);
            }
            return measurementNode;
        }
        return null;
    };

    const cleanupMeasurementRoot = () => {
        // Unmount and clean up is handled in the return of useEffect
    };

    const paginate = async () => {
      const measurementNode = setupMeasurementRoot();
      if (!measurementNode) return;

      const root = measurementRootRef.current!;

      // --- Define constants for pagination ---
      const pageHeightMm = 297;
      const contentPaddingTopMm = 20;
      const contentPaddingBottomMm = 20; 
      const mmToPx = 3.77952; // Conversion factor
      const maxContentHeightPx = (pageHeightMm - contentPaddingTopMm - contentPaddingBottomMm) * mmToPx;

      // --- Render all content into the measurement div to calculate heights ---
      
      const FullRenderForMeasurement = (
          <div style={{ width: '210mm' }}>
              <div className='page-content-wrapper'>
                  <PrintPreviewContent formData={formData} analysisData={analysisData} />
              </div>
          </div>
      );
      
      await new Promise<void>((resolve) => {
        root.render(FullRenderForMeasurement);
        // React 18 batches updates, so we need to wait a tick for the DOM to be updated
        setTimeout(resolve, 0);
      });

      await new Promise(resolve => setTimeout(resolve, 50)); // Extra wait for images/fonts

      const headerElement = measurementNode.querySelector('.print-header');
      const headerHeight = headerElement?.getBoundingClientRect().height || 0;
      
      const footerElement = document.createElement('div');
      footerElement.className = 'page-content-wrapper';
      const footerRoot = createRoot(footerElement);
      
      await new Promise<void>(resolve => {
        footerRoot.render(<PrintFooter page={1} totalPages={1} date={date} />);
        setTimeout(resolve, 20);
      });
      const footerHeight = footerElement.querySelector('.print-footer')?.getBoundingClientRect().height || 20;
      footerRoot.unmount();


      const allContentElements = Array.from(measurementNode.querySelectorAll('.print-main > *'));

      const newPagesContent: React.ReactElement[][] = [];
      let currentPageContent: React.ReactElement[] = [];
      let currentPageHeight = 0;

      // --- Page 1 ---
      let availableHeight = maxContentHeightPx - footerHeight;
      if (headerHeight > 0) {
        availableHeight -= headerHeight;
      }
      
      for (const el of allContentElements) {
        const isTable = el.classList.contains('analysis-table-wrapper');

        if (isTable) {
            const table = el.querySelector('table');
            if (!table) continue;

            const tableTitle = el.querySelector('.section-title');
            const titleHeight = tableTitle?.getBoundingClientRect().height || 0;

            const tableHeader = table.querySelector('thead');
            const tableHeaderHeight = tableHeader?.getBoundingClientRect().height || 0;

            const rows = Array.from(table.querySelectorAll('tbody tr'));
            let currentTableRowsForPage: React.ReactElement[] = [];

            // Check if title fits, if not, new page
            if (currentPageHeight + titleHeight > availableHeight) {
                newPagesContent.push([...currentPageContent]);
                currentPageContent = [];
                currentPageHeight = 0;
                availableHeight = maxContentHeightPx - footerHeight;
            }
            currentPageHeight += titleHeight;

             // Check if header fits, if not, new page
            if (currentPageHeight + tableHeaderHeight > availableHeight) {
                 newPagesContent.push([...currentPageContent]);
                 currentPageContent = [];
                 currentPageHeight = 0;
                 availableHeight = maxContentHeightPx - footerHeight;
            }
            // Header will be added to each page with a table
            const clonedHeader = tableHeader ? React.cloneElement(tableHeader as React.ReactElement) : null;

            for (const row of rows) {
                const rowHeight = row.getBoundingClientRect().height;
                 // If the current page can't even fit the header and one row, start a new page.
                const effectiveHeaderHeight = (currentTableRowsForPage.length === 0) ? tableHeaderHeight : 0;
                
                if (currentPageHeight + effectiveHeaderHeight + rowHeight > availableHeight) {
                    // Page is full, push what we have
                    if (currentTableRowsForPage.length > 0) {
                        currentPageContent.push(
                            <section key={`table-chunk-${newPagesContent.length}`} className='analysis-table-wrapper'>
                                <h3 className="section-title">PROCEDIMENTO OPERACIONAL</h3>
                                <table className='w-full border-collapse border mt-1 text-xs analysis-table'>
                                    {clonedHeader && <thead className='analysis-table-header'>{clonedHeader.props.children}</thead>}
                                    <tbody>{currentTableRowsForPage}</tbody>
                                </table>
                            </section>
                        );
                    }
                    newPagesContent.push([...currentPageContent]);

                    // Start new page
                    currentPageContent = [];
                    currentPageHeight = 0;
                    availableHeight = maxContentHeightPx - footerHeight;
                    currentTableRowsForPage = [];
                }

                currentPageHeight += rowHeight;
                currentTableRowsForPage.push(
                    <tr key={(row as HTMLElement).outerHTML + Math.random()} className="procedural-step-row" dangerouslySetInnerHTML={{ __html: (row as HTMLElement).innerHTML }} />
                );
            }

             // Add any remaining rows
            if (currentTableRowsForPage.length > 0) {
                 currentPageContent.push(
                    <section key={`table-chunk-final-${newPagesContent.length}`} className='analysis-table-wrapper'>
                        <h3 className="section-title">PROCEDIMENTO OPERACIONAL</h3>
                        <table className='w-full border-collapse border mt-1 text-xs analysis-table'>
                           {clonedHeader && <thead className='analysis-table-header'>{clonedHeader.props.children}</thead>}
                           <tbody>{currentTableRowsForPage}</tbody>
                       </table>
                    </section>
                );
            }

        } else { // Handle non-table sections
            const sectionHeight = el.getBoundingClientRect().height;
            if (currentPageHeight + sectionHeight > availableHeight) {
                // Section doesn't fit, start a new page
                newPagesContent.push([...currentPageContent]);
                currentPageContent = [];
                currentPageHeight = 0;
                availableHeight = maxContentHeightPx - footerHeight;
            }
            currentPageHeight += sectionHeight;
            currentPageContent.push(<div key={(el as HTMLElement).outerHTML + Math.random()} dangerouslySetInnerHTML={{ __html: (el as HTMLElement).outerHTML }} />);
        }
      }
      
      // Add the last page if it has content
      if (currentPageContent.length > 0) {
        newPagesContent.push([...currentPageContent]);
      }

      const totalPages = newPagesContent.length || 1;
      const finalPages = newPagesContent.length > 0 
        ? newPagesContent.map((pageContent, index) => (
            <div key={`page-${index}`} className="print-page-container" id={`print-page-${index}`}>
                <div className="page-content-wrapper">
                    {index === 0 && <PrintHeader data={formData} />}
                    <main className='print-main'>
                        {pageContent}
                    </main>
                    <PrintFooter page={index + 1} totalPages={totalPages} date={date} />
                </div>
            </div>
        ))
        : [(
            <div key="placeholder" className="print-page-container">
                 <div className="page-content-wrapper">
                    <PrintHeader data={formData} />
                    <main className="flex-grow flex items-center justify-center print-main">
                        <div className="text-center text-gray-500 italic p-8">
                            A pré-visualização do documento aparecerá aqui conforme você preenche o formulário. A análise de risco aparecerá após ser gerada.
                        </div>
                    </main>
                     <PrintFooter page={1} totalPages={1} date={date} />
                 </div>
            </div>
        )];
      
      setPages(finalPages);

      // Cleanup not really needed as root is reused, but good practice
      // cleanupMeasurementRoot();
    };

    paginate();
    
    return () => {
        if(measurementRootRef.current) {
            measurementRootRef.current.unmount();
            measurementRootRef.current = null;
        }
    };
    // This is intentional. Re-run pagination whenever formData or analysisData changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, analysisData, date]);

  return (
    <>
        <div id="measurement-root" style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '210mm' }}></div>
        {pages}
    </>
  );
}
