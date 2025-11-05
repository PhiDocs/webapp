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

const PAGE_CONTENT_HEIGHT_MM = 297 - 20 - 15; // A4 height minus top/bottom margin

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
     if (!steps || steps.length === 0) {
        return (
            <section className="mb-4 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
                A análise de procedimento operacional aparecerá aqui após ser gerada.
            </section>
        );
    }

    return (
        <section className='analysis-table-wrapper break-before-page'>
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
          <PrintHeader data={formData} />
          <ResponsiblesSection data={formData} />
          <AnalysisTable steps={analysisData?.proceduralSteps || []} />
          <TeamSection data={formData} />
          <SignatureSection />
      </>
  ), [formData, analysisData]);


  useEffect(() => {
    const paginate = async () => {
        const measurementNode = measurementRef.current;
        if (!measurementNode || !analysisData) return;

        // 1. Render all content into the hidden measurement div
        const root = createRoot(measurementNode);
        root.render(
          <div className="page-content-wrapper" style={{ width: '210mm', height: 'auto' }}>
            {allDocumentContent}
          </div>
        );

        // Delay to allow for rendering and layout calculation
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newPages: PageContent[] = [];
        let pageIndex = 0;
        const pageContentHeightPx = PAGE_CONTENT_HEIGHT_MM * 3.78; 

        // 2. Query all top-level children (sections)
        const allChildren = Array.from(measurementNode.querySelector('.page-content-wrapper')?.children || []) as HTMLElement[];
        let currentPageContent: HTMLElement[] = [];
        let currentPageHeight = 0;

        const headerHeight = (allChildren[0] as HTMLElement).offsetHeight;

        for (let i = 0; i < allChildren.length; i++) {
            const child = allChildren[i];
            const childHeight = child.offsetHeight;
            const childMarginTop = parseInt(window.getComputedStyle(child).marginTop, 10);
            const totalChildHeight = childHeight + childMarginTop;

            const isFirstPage = pageIndex === 0;
            const availableHeight = isFirstPage ? pageContentHeightPx : pageContentHeightPx - headerHeight;
            
            // Special handling for the main table
            if (child.querySelector('.analysis-table')) {
                const tableHeader = child.querySelector('h3')!;
                const table = child.querySelector('table')!;
                const tableHeaderHeight = tableHeader.offsetHeight + parseInt(window.getComputedStyle(tableHeader).marginBottom, 10);
                const tableTheadHeight = table.querySelector('thead')?.offsetHeight || 0;
                let tableCurrentHeight = tableHeaderHeight + tableTheadHeight;

                currentPageContent.push(tableHeader.cloneNode(true) as HTMLElement);
                const newTable = table.cloneNode(true) as HTMLTableElement;
                const newTbody = document.createElement('tbody');
                newTable.querySelector('tbody')!.remove();
                newTable.appendChild(newTbody);
                currentPageContent.push(newTable);


                const rows = Array.from(table.querySelectorAll('tbody tr'));
                for(const row of rows) {
                    const rowHeight = row.offsetHeight;
                    if (currentPageHeight + tableCurrentHeight + rowHeight > availableHeight) {
                        // Finalize current page
                        const pageContentHTML = currentPageContent.map(el => el.outerHTML).join('');
                        newPages.push({ key: `page-${pageIndex}`, content: <div dangerouslySetInnerHTML={{ __html: pageContentHTML }} /> });
                        pageIndex++;

                        // Start new page
                        currentPageContent = [];
                        currentPageHeight = 0;
                        tableCurrentHeight = tableHeaderHeight + tableTheadHeight;
                        
                        currentPageContent.push(tableHeader.cloneNode(true) as HTMLElement);
                        const newerTable = table.cloneNode(true) as HTMLTableElement;
                        const newerTbody = document.createElement('tbody');
                        newerTable.querySelector('tbody')!.remove();
                        newerTable.appendChild(newerTbody);
                        currentPageContent.push(newerTable);
                        newerTbody.appendChild(row.cloneNode(true));

                    } else {
                        newTbody.appendChild(row.cloneNode(true));
                        tableCurrentHeight += rowHeight;
                    }
                }
                 currentPageHeight += tableCurrentHeight;

            } else { // Handle other sections
                 if (currentPageHeight + totalChildHeight > availableHeight && currentPageContent.length > 0) {
                    // Finalize current page
                    const pageContentHTML = currentPageContent.map(el => el.outerHTML).join('');
                    newPages.push({ key: `page-${pageIndex}`, content: <div dangerouslySetInnerHTML={{ __html: pageContentHTML }} /> });
                    pageIndex++;
                    // Start new page
                    currentPageContent = [child.cloneNode(true) as HTMLElement];
                    currentPageHeight = totalChildHeight;
                } else {
                    currentPageContent.push(child.cloneNode(true) as HTMLElement);
                    currentPageHeight += totalChildHeight;
                }
            }
        }

        // Add the last remaining page
        if (currentPageContent.length > 0) {
            const pageContentHTML = currentPageContent.map(el => el.outerHTML).join('');
            newPages.push({ key: `page-${pageIndex}`, content: <div dangerouslySetInnerHTML={{ __html: pageContentHTML }} /> });
        }
        
        setPages(newPages);
        root.unmount();

    };

    if (formData.companyName && analysisData) {
        setPages([]);
        setTimeout(paginate, 100);
    } else {
         setPages([]); 
    }

  }, [formData, analysisData, allDocumentContent]);

  if (!analysisData) {
    return (
      <div className="print-page-container">
        <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
          A pré-visualização do documento aparecerá aqui após preencher o formulário e gerar a análise.
        </div>
      </div>
    );
  }


  return (
    <>
      {pages.map((page, index) => (
          <div key={page.key} className="print-page-container">
            <div className="page-content-wrapper">
                {index === 0 && <PrintHeader data={formData} />}
                 <main className='print-main'>
                    {page.content}
                 </main>
                <PrintFooter data={formData} />
            </div>
          </div>
      ))}
      {/* Hidden container for measurement */}
      <div ref={measurementRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100, opacity: 0 }} />
    </>
  );
}
