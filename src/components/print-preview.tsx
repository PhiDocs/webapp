'use client';

import React, { useMemo, useEffect, useState, useRef } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';
import { createRoot } from 'react-dom/client';

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

function PrintFooter({ page, totalPages }: { page: number; totalPages: number; }) {
  const date = new Date().toLocaleDateString('pt-BR');
  return (
    <footer className="print-footer mt-auto text-xs text-gray-500 border-t">
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

  useEffect(() => {
    const paginate = async () => {
      // 1. Create a hidden div to do the measurement
      const measurementNode = document.createElement('div');
      measurementNode.style.position = 'absolute';
      measurementNode.style.left = '-9999px';
      measurementNode.style.top = '-9999px';
      measurementNode.style.width = '210mm';
      document.body.appendChild(measurementNode);

      if (!measurementRootRef.current) {
        measurementRootRef.current = createRoot(measurementNode);
      }
      const root = measurementRootRef.current;
      
      const FullRenderForMeasurement = (
        <div style={{ width: '210mm' }}>
            <div className='page-content-wrapper'>
                <PrintPreviewContent formData={formData} analysisData={analysisData} />
            </div>
        </div>
      );
      
      await new Promise<void>((resolve) => {
        root.render(FullRenderForMeasurement, () => resolve());
      });

      await new Promise(resolve => setTimeout(resolve, 50));

      const pageHeightMm = 297;
      const contentPaddingMm = 15 + 20; // top + bottom padding from CSS
      const maxContentHeight = (pageHeightMm - contentPaddingMm) * 3.7795; // mm to px

      const headerElement = measurementNode.querySelector('.print-header');
      const headerHeight = headerElement?.getBoundingClientRect().height || 0;
      
      const mainContentElements = Array.from(measurementNode.querySelectorAll('.print-main > *'));
      const footerHeight = 40; // Approximate footer height

      const newPages: React.ReactNode[] = [];
      let currentPageContent: React.ReactElement[] = [];
      let currentPageHeight = 0;

      // Page 1
      currentPageHeight += headerHeight;

      for (const el of mainContentElements) {
        const sectionHeight = el.getBoundingClientRect().height;
        const isTable = el.classList.contains('analysis-table-wrapper');

        if (isTable) {
            const table = el.querySelector('table');
            if (table) {
                const title = el.querySelector('.section-title');
                const titleHeight = title?.getBoundingClientRect().height || 0;
                const tableHeader = table.querySelector('thead');
                const tableHeaderHeight = tableHeader?.getBoundingClientRect().height || 0;
                const rows = Array.from(table.querySelectorAll('tbody tr'));
                
                let tableContentForPage: React.ReactElement[] = [];

                if (currentPageHeight + titleHeight + tableHeaderHeight + footerHeight > maxContentHeight) {
                     newPages.push([...currentPageContent]);
                     currentPageContent = [];
                     currentPageHeight = 0;
                }
                
                currentPageHeight += titleHeight;
                tableContentForPage.push(<h3 key="table-title" className="section-title">PROCEDIMENTO OPERACIONAL</h3>);

                currentPageHeight += tableHeaderHeight;

                for (const row of rows) {
                    const rowHeight = row.getBoundingClientRect().height;
                    if (currentPageHeight + rowHeight + tableHeaderHeight + footerHeight > maxContentHeight) {
                        tableContentForPage.push(<tbody key={`tbody-end-${newPages.length}`}>{rows.splice(0, tableContentForPage.filter(c => c.type === 'tr').length)}</tbody>);
                        
                        // Finish current page with what we have
                        currentPageContent.push(
                            <section key={`table-chunk-${newPages.length}`} className='analysis-table-wrapper'>
                                <table className='w-full border-collapse border mt-1 text-xs analysis-table'>
                                    {tableContentForPage}
                                </table>
                            </section>
                        );
                        newPages.push([...currentPageContent]);
                        
                        // Start new page
                        currentPageContent = [];
                        currentPageHeight = 0;
                        tableContentForPage = [];

                        currentPageHeight += tableHeaderHeight;
                    }
                    currentPageHeight += rowHeight;
                    // React doesn't like cloning elements directly, so we re-create them
                     tableContentForPage.push(
                        <tr key={row.outerHTML} className="procedural-step-row" dangerouslySetInnerHTML={{ __html: row.innerHTML }} />
                    );
                }

                // Add remaining rows of the table
                if (tableContentForPage.length > 0) {
                     const remainingRows = rows.slice(tableContentForpage.filter(c => c.type === 'tr').length);
                     const bodyContent = (
                         <tbody key={`tbody-final-${newPages.length}`}>
                             {tableContentForPage.filter(c => c.type === 'tr')}
                             {remainingRows.map((r, i) => <tr key={`rem-row-${i}`} className="procedural-step-row" dangerouslySetInnerHTML={{ __html: r.innerHTML }} />)}
                         </tbody>
                     );
                    currentPageContent.push(
                         <section key={`table-chunk-final-${newPages-length}`} className='analysis-table-wrapper'>
                            <table className='w-full border-collapse border mt-1 text-xs analysis-table'>
                               <thead className='analysis-table-header'>
                                  {React.cloneElement(tableHeader as React.ReactElement)}
                               </thead>
                               {bodyContent}
                           </table>
                         </section>
                    );
                }
            }
        } else {
            if (currentPageHeight + sectionHeight + footerHeight > maxContentHeight) {
                newPages.push([...currentPageContent]);
                currentPageContent = [];
                currentPageHeight = 0;
            }
            currentPageHeight += sectionHeight;
            currentPageContent.push(<div key={(el as HTMLElement).outerHTML} dangerouslySetInnerHTML={{ __html: (el as HTMLElement).outerHTML }} />);
        }
      }
      
      // Add the last page
      if (currentPageContent.length > 0) {
        newPages.push([...currentPageContent]);
      }

      const finalPages = newPages.map((pageContent, index) => (
        <div key={`page-${index}`} className="print-page-container" id={`print-page-${index}`}>
            <div className="page-content-wrapper">
                {index === 0 && <PrintHeader data={formData} />}
                <main className='print-main'>
                    {pageContent}
                </main>
                <PrintFooter page={index + 1} totalPages={newPages.length} />
            </div>
        </div>
      ));
      
      setPages(finalPages);

      // Cleanup
      document.body.removeChild(measurementNode);
    };

    if (formData.companyName) {
        paginate();
    } else {
        setPages([
            <div key="placeholder" className="print-page-container">
                 <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
                    A pré-visualização do documento aparecerá aqui conforme você preenche o formulário.
                </div>
            </div>
        ]);
    }
    
    // This is intentional. Re-run pagination whenever formData or analysisData changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, analysisData]);

  return <>{pages}</>;
}
