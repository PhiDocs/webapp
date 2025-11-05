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

const PAGE_CONTENT_HEIGHT_MM = 297 - 20 - 15 - 20; // A4 height minus top/bottom margin and footer

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

function ResponsiblesSection({ data }: { data: SafetyFormValues }) {
    return (
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
      <section className="mb-4 break-before-page">
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
            {/* Add empty rows to fill page if needed, up to a reasonable limit */}
            {Array.from({ length: Math.max(0, 15 - teamMembers.length) }).map((_: any, index: number) => (
              <tr key={`empty-team-${index}`}>
                <td className="h-10"></td><td></td><td></td><td></td>
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
          )}
        </section>
    );
}

function SignatureSection() {
    return (
        <section className="signature-section mt-auto pt-8 break-before-page">
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

  const allDocumentContent = useMemo(() => (
      <>
          <ResponsiblesSection data={formData} />
          <AnalysisTable steps={analysisData?.proceduralSteps || []} />
          <TeamSection data={formData} />
          <SignatureSection />
      </>
  ), [formData, analysisData]);


  useEffect(() => {
    const paginate = async () => {
        const measurementNode = measurementRef.current;
        if (!measurementNode) return;

        // 1. Render all content into the hidden measurement div to calculate heights
        const root = createRoot(measurementNode);
        root.render(
          <div className="page-content-wrapper" style={{ width: '210mm' }}>
             <PrintHeader data={formData} />
            {allDocumentContent}
          </div>
        );

        // Delay to allow for rendering and layout calculation
        await new Promise(resolve => setTimeout(resolve, 250));
        
        const newPages: {content: HTMLElement[], height: number}[] = [];
        let currentPageContent: HTMLElement[] = [];
        let currentPageHeight = 0;

        const pageContentHeightPx = PAGE_CONTENT_HEIGHT_MM * 3.78; 
        
        const headerElement = measurementNode.querySelector('.print-header') as HTMLElement;
        const headerHeight = headerElement ? headerElement.offsetHeight + 16 : 0; // 16 for pb-4

        // Start Page 1 with the main header
        currentPageContent.push(headerElement.cloneNode(true) as HTMLElement);
        currentPageHeight += headerHeight;

        // Get all other sections
        const allChildren = Array.from(measurementNode.querySelector('.page-content-wrapper')?.children || []).slice(1) as HTMLElement[];
        
        for (const child of allChildren) {
            const isTable = child.querySelector('.analysis-table');
            const childHeight = child.offsetHeight;
            const childMarginTop = parseInt(window.getComputedStyle(child).marginTop, 10);
            const totalChildHeight = childHeight + childMarginTop;

            if (isTable) {
                const table = isTable as HTMLTableElement;
                const tableTitle = child.querySelector('h3')!;
                const tableTitleHeight = tableTitle.offsetHeight + 4; // 4 for margin
                
                const thead = table.querySelector('thead')!;
                const theadHeight = thead.offsetHeight;
                
                const rows = Array.from(table.querySelectorAll('tbody tr'));

                let tempTableHeight = tableTitleHeight;
                let tempRows: HTMLElement[] = [];

                function startNewPage() {
                    newPages.push({ content: currentPageContent, height: currentPageHeight });
                    currentPageContent = [];
                    currentPageHeight = 0;
                }
                
                function addContentToPage(element: HTMLElement, height: number) {
                    currentPageContent.push(element);
                    currentPageHeight += height;
                }
                
                // Check if table title fits on current page
                if (currentPageHeight + tableTitleHeight > pageContentHeightPx) {
                    startNewPage();
                }
                addContentToPage(tableTitle.cloneNode(true) as HTMLElement, tableTitleHeight);
                
                // Create a new table for the rows on the current page
                let newTable = table.cloneNode(false) as HTMLTableElement;
                newTable.appendChild(thead.cloneNode(true));
                let newTbody = document.createElement('tbody');
                newTable.appendChild(newTbody);
                addContentToPage(newTable, theadHeight);
                tempTableHeight += theadHeight;

                for (const row of rows) {
                    const rowHeight = (row as HTMLElement).offsetHeight;
                    if (currentPageHeight + rowHeight > pageContentHeightPx) {
                        startNewPage();
                        
                        addContentToPage(tableTitle.cloneNode(true) as HTMLElement, tableTitleHeight);
                        newTable = table.cloneNode(false) as HTMLTableElement;
                        newTable.appendChild(thead.cloneNode(true));
                        newTbody = document.createElement('tbody');
                        newTable.appendChild(newTbody);
                        addContentToPage(newTable, theadHeight);
                    }
                    newTbody.appendChild(row.cloneNode(true));
                    currentPageHeight += rowHeight;
                }
            } else {
                 if (currentPageHeight + totalChildHeight > pageContentHeightPx && currentPageContent.length > 0) {
                    newPages.push({ content: currentPageContent, height: currentPageHeight });
                    currentPageContent = [child.cloneNode(true) as HTMLElement];
                    currentPageHeight = totalChildHeight;
                } else {
                    currentPageContent.push(child.cloneNode(true) as HTMLElement);
                    currentPageHeight += totalChildHeight;
                }
            }
        }

        if (currentPageContent.length > 0) {
            newPages.push({ content: currentPageContent, height: currentPageHeight });
        }
        
        const finalPages: PageContent[] = newPages.map((page, index) => {
            const pageHTML = page.content.map(el => el.outerHTML).join('');
            return {
                key: `page-${index}-${Date.now()}`,
                content: <div className='print-main' dangerouslySetInnerHTML={{ __html: pageHTML }} />
            }
        });
        
        setPages(finalPages);
        root.unmount();
    };

    // Use a timeout to ensure all data is ready before paginating
    const timer = setTimeout(paginate, 250);
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
      {pages.length > 0 ? pages.map((page, index) => (
          <div key={page.key} className="print-page-container">
            <div className="page-content-wrapper">
                <main className='print-main'>
                  {page.content}
                </main>
                <PrintFooter data={formData} />
            </div>
          </div>
      )) : (
          <div className="print-page-container">
             <div className="page-content-wrapper">
                <main className='print-main'>
                    <PrintHeader data={formData} />
                    <ResponsiblesSection data={formData} />
                    <AnalysisTable steps={[]} />
                </main>
                <PrintFooter data={formData} />
             </div>
          </div>
      )}
      {/* Hidden container for measurement */}
      <div ref={measurementRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100, opacity: 0 }} />
    </>
  );
}
