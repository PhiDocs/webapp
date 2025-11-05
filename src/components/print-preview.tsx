'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';
import { createRoot } from 'react-dom/client';

interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
}

interface PageContent {
    key: string;
    content: React.ReactNode; 
}

const PAGE_CONTENT_HEIGHT_MM = 297 - 20 - 15 - 15; // A4 height minus top/bottom margin and footer height
const MM_TO_PX = 3.78;
const PAGE_CONTENT_HEIGHT_PX = PAGE_CONTENT_HEIGHT_MM * MM_TO_PX;

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

function PrintFooter({ page, totalPages }: { page: number; totalPages: number; }) {
  const date = new Date().toLocaleDateString('pt-BR');
  return (
    <footer className="print-footer pt-2 mt-auto text-xs text-gray-500 border-t">
      <div className="flex justify-between items-center w-full">
        <div className="text-left">
          <p>Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
        </div>
        <div className="text-center">
          <p>Data: {date}</p>
        </div>
        <div className="text-right">
          <p>Página {page} de {totalPages}</p>
        </div>
      </div>
    </footer>
  )
}

function ResponsiblesSection({ data }: { data: SafetyFormValues }) {
    return (
        <section className="mb-4 responsibles-section">
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
      <section className="mb-4 team-section">
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
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida'
  }
}

// This is the main component that orchestrates the paginated preview
export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
  const [pages, setPages] = useState<PageContent[]>([]);
  const measurementRef = useRef<HTMLDivElement>(null);

  const allDocumentContent = useMemo(() => {
    const proceduralSteps = analysisData?.proceduralSteps || [];
    
    // Split the content into what must be on the first page vs what can flow
    const firstPageContent = (
      <>
        <ResponsiblesSection data={formData} />
      </>
    );

    const flowingContent = (
        <>
            <AnalysisTable steps={proceduralSteps} />
            <TeamSection data={formData} />
            <SignatureSection />
        </>
    );

    return { firstPageContent, flowingContent, proceduralSteps };

  }, [formData, analysisData]);


  useEffect(() => {
    const paginate = async () => {
        const measurementNode = measurementRef.current;
        if (!measurementNode) return;

        // --- Render all content into the measurement div to calculate heights ---
        measurementNode.innerHTML = '';
        const root = createRoot(measurementNode);
        
        const FullRenderForMeasurement = (
            <div style={{ width: '210mm' }}>
                <div className="page-content-wrapper">
                    <PrintHeader data={formData} />
                    {allDocumentContent.firstPageContent}
                    {allDocumentContent.flowingContent}
                </div>
            </div>
        );
        root.render(FullRenderForMeasurement);

        // Wait for render
        await new Promise(resolve => setTimeout(resolve, 350));
        
        const newPages: {content: HTMLElement[], height: number}[] = [];
        let currentPageElements: HTMLElement[] = [];
        
        // --- Page 1 ---
        const headerEl = measurementNode.querySelector('.print-header') as HTMLElement;
        const respSectionEl = measurementNode.querySelector('.responsibles-section') as HTMLElement;

        if (!headerEl) return;
        
        const headerHeight = headerEl.offsetHeight;
        currentPageElements.push(headerEl.cloneNode(true) as HTMLElement);
        let currentPageHeight = headerHeight;

        if (respSectionEl) {
          const respHeight = respSectionEl.offsetHeight;
          if (currentPageHeight + respHeight <= PAGE_CONTENT_HEIGHT_PX) {
              currentPageElements.push(respSectionEl.cloneNode(true) as HTMLElement);
              currentPageHeight += respHeight;
          }
        }
       
        // --- Subsequent Pages & Content Flow ---
        const analysisTableWrapper = measurementNode.querySelector('.analysis-table-wrapper');
        const teamSectionEl = measurementNode.querySelector('.team-section');
        const signatureSectionEl = measurementNode.querySelector('.signature-section');

        const addContentToPage = (el: HTMLElement) => {
            const elHeight = el.offsetHeight;
            if (currentPageHeight + elHeight > PAGE_CONTENT_HEIGHT_PX && currentPageElements.length > 0) {
                newPages.push({ content: currentPageElements, height: currentPageHeight });
                currentPageElements = [];
                currentPageHeight = 0;
            }
            currentPageElements.push(el.cloneNode(true) as HTMLElement);
            currentPageHeight += elHeight;
        };

        if (analysisTableWrapper) {
            const titleEl = analysisTableWrapper.querySelector('h3') as HTMLElement;
            const tableEl = analysisTableWrapper.querySelector('.analysis-table') as HTMLTableElement;

            if (titleEl && tableEl) {
                // Keep title and table header together
                const titleHeight = titleEl.offsetHeight;
                const theadHeight = tableEl.querySelector('thead')?.offsetHeight || 0;
                const headerGroupHeight = titleHeight + theadHeight;
                
                let currentTableWrapper = document.createElement('section');
                currentTableWrapper.className = 'analysis-table-wrapper';
                currentTableWrapper.appendChild(titleEl.cloneNode(true));
                let currentTable = tableEl.cloneNode(false) as HTMLTableElement;
                const thead = tableEl.querySelector('thead');
                if (thead) currentTable.appendChild(thead.cloneNode(true));
                let currentTbody = document.createElement('tbody');
                currentTable.appendChild(currentTbody);
                currentTableWrapper.appendChild(currentTable);

                if (currentPageHeight + headerGroupHeight > PAGE_CONTENT_HEIGHT_PX) {
                    newPages.push({ content: currentPageElements, height: currentPageHeight });
                    currentPageElements = [];
                    currentPageHeight = 0;
                }
                currentPageElements.push(currentTableWrapper);
                currentPageHeight += headerGroupHeight;

                const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
                for (const row of rows) {
                    const rowHeight = (row as HTMLElement).offsetHeight;
                    if (currentPageHeight + rowHeight > PAGE_CONTENT_HEIGHT_PX) {
                        // Finish the current page
                        newPages.push({ content: currentPageElements, height: currentPageHeight });
                        
                        // Start a new page
                        currentPageElements = [];
                        currentPageHeight = 0;
                        
                        // Create a new table for the new page
                        currentTableWrapper = document.createElement('section');
                        currentTableWrapper.className = 'analysis-table-wrapper';
                        currentTableWrapper.appendChild(titleEl.cloneNode(true));
                        currentTable = tableEl.cloneNode(false) as HTMLTableElement;
                        if (thead) currentTable.appendChild(thead.cloneNode(true));
                        currentTbody = document.createElement('tbody');
                        currentTable.appendChild(currentTbody);
                        currentTableWrapper.appendChild(currentTable);

                        currentPageElements.push(currentTableWrapper);
                        currentPageHeight += headerGroupHeight;
                    }
                    currentTbody.appendChild(row.cloneNode(true));
                    currentPageHeight += rowHeight;
                }
            }
        }
        
        if (teamSectionEl) addContentToPage(teamSectionEl);
        if (signatureSectionEl) addContentToPage(signatureSectionEl);

        if (currentPageElements.length > 0) {
            newPages.push({ content: currentPageElements, height: currentPageHeight });
        }

        // --- Finalize and set pages for rendering ---
        const finalPages: PageContent[] = newPages.map((page, index) => {
            const pageHTML = page.content.map(el => el.outerHTML).join('');
            const isFirstPage = index === 0;

            const contentNode = (
                <div className='page-content-wrapper'>
                    {!isFirstPage && <div className='print-header-placeholder' style={{height: headerHeight}}></div>}
                    <main className='print-main' dangerouslySetInnerHTML={{ __html: pageHTML }} />
                    <PrintFooter page={index + 1} totalPages={newPages.length} />
                </div>
            )
            
            return {
                key: `page-${index}-${Date.now()}`,
                content: contentNode
            };
        });
        
        setPages(finalPages);
        root.unmount();
        if (measurementNode) measurementNode.innerHTML = '';
    };

    const timer = setTimeout(paginate, 350);
    return () => clearTimeout(timer);
    
  }, [formData, analysisData, allDocumentContent]);

  if (!formData.companyName && !analysisData) {
    return (
      <div className="print-page-container">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
          A pré-visualização do documento aparecerá aqui conforme você preenche o formulário.
        </div>
      </div>
    );
  }

  return (
    <>
      {pages.length > 0 ? pages.map((page) => (
          <div key={page.key} className="print-page-container">
            {page.content}
          </div>
      )) : (
          // Fallback for initial render
          <div className="print-page-container">
            <div className="page-content-wrapper">
                <PrintHeader data={formData} />
                <main className='print-main'>
                    <ResponsiblesSection data={formData} />
                    <AnalysisTable steps={[]} />
                </main>
                <PrintFooter page={1} totalPages={1} />
            </div>
          </div>
      )}
      {/* Hidden container for measurement */}
      <div ref={measurementRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100, opacity: 0, background: 'white' }} />
    </>
  );
}
