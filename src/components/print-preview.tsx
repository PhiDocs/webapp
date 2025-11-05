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

function PrintFooter({ data, page, totalPages }: { data: SafetyFormValues; page: number; totalPages: number; }) {
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
              <thead>
                <tr className='analysis-table-header'>
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

        measurementNode.innerHTML = '';
        const root = createRoot(measurementNode);
        
        root.render(
          <div style={{ width: '210mm' }}>
            <div className="page-content-wrapper">
                <PrintHeader data={formData} />
                {allDocumentContent}
            </div>
          </div>
        );

        await new Promise(resolve => setTimeout(resolve, 300));
        
        const newPages: {content: HTMLElement[], height: number}[] = [];
        let currentPageElements: HTMLElement[] = [];
        let currentPageHeight = 0;
        
        const headerElement = measurementNode.querySelector('.print-header') as HTMLElement;
        const headerHeight = headerElement?.offsetHeight || 0;

        // Page 1 starts with the main header
        currentPageElements.push(headerElement.cloneNode(true) as HTMLElement);
        currentPageHeight += headerHeight;
        
        const contentNodes = measurementNode.querySelectorAll<HTMLElement>('.page-content-wrapper > section');
        
        for (const section of Array.from(contentNodes)) {
            if (section.classList.contains('analysis-table-wrapper')) {
                const table = section.querySelector('.analysis-table');
                const title = section.querySelector('h3');
                if (!table || !title) continue;

                const titleHeight = title.offsetHeight;
                const thead = table.querySelector('thead');
                const theadHeight = thead?.offsetHeight || 0;
                
                if (currentPageHeight + titleHeight + theadHeight > PAGE_CONTENT_HEIGHT_PX) {
                  newPages.push({ content: currentPageElements, height: currentPageHeight });
                  currentPageElements = [];
                  currentPageHeight = 0;
                }

                let currentTableWrapper = document.createElement('section');
                currentTableWrapper.className = 'analysis-table-wrapper';
                
                let currentTitle = title.cloneNode(true) as HTMLElement;
                currentTableWrapper.appendChild(currentTitle);
                
                let currentTable = table.cloneNode(false) as HTMLTableElement;
                if (thead) currentTable.appendChild(thead.cloneNode(true));
                let currentTbody = document.createElement('tbody');
                currentTable.appendChild(currentTbody);

                currentTableWrapper.appendChild(currentTable);
                currentPageElements.push(currentTableWrapper);
                currentPageHeight += titleHeight + theadHeight;
                
                const rows = table.querySelectorAll('tbody tr');
                for (const row of Array.from(rows)) {
                    const rowHeight = (row as HTMLElement).offsetHeight;
                    if (currentPageHeight + rowHeight > PAGE_CONTENT_HEIGHT_PX) {
                      newPages.push({ content: currentPageElements, height: currentPageHeight });
                      currentPageElements = [];
                      currentPageHeight = 0;

                      currentTableWrapper = document.createElement('section');
                      currentTableWrapper.className = 'analysis-table-wrapper';
                      currentTitle = title.cloneNode(true) as HTMLElement;
                      currentTableWrapper.appendChild(currentTitle);
                      currentTable = table.cloneNode(false) as HTMLTableElement;
                      if (thead) currentTable.appendChild(thead.cloneNode(true));
                      currentTbody = document.createElement('tbody');
                      currentTable.appendChild(currentTbody);
                      currentTableWrapper.appendChild(currentTable);
                      currentPageElements.push(currentTableWrapper);
                      currentPageHeight += titleHeight + theadHeight;
                    }
                    currentTbody.appendChild(row.cloneNode(true));
                    currentPageHeight += rowHeight;
                }
            } else {
              const sectionHeight = section.offsetHeight;
              if (currentPageHeight + sectionHeight > PAGE_CONTENT_HEIGHT_PX) {
                newPages.push({ content: currentPageElements, height: currentPageHeight });
                currentPageElements = [];
                currentPageHeight = 0;
              }
              currentPageElements.push(section.cloneNode(true) as HTMLElement);
              currentPageHeight += sectionHeight;
            }
        }
        
        if (currentPageElements.length > 0) {
            newPages.push({ content: currentPageElements, height: currentPageHeight });
        }
        
        const finalPages: PageContent[] = newPages.map((page, index) => {
            const pageHTML = page.content.map(el => el.outerHTML).join('');
            return {
                key: `page-${index}-${Date.now()}`,
                content: (
                  <div className='page-content-wrapper'>
                    <main className='print-main' dangerouslySetInnerHTML={{ __html: pageHTML }} />
                    <PrintFooter data={formData} page={index + 1} totalPages={newPages.length} />
                  </div>
                )
            }
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
      {pages.length > 0 ? pages.map((page, index) => (
          <div key={page.key} className="print-page-container">
            {page.content}
          </div>
      )) : (
          <div className="print-page-container">
            <div className="page-content-wrapper">
                <PrintHeader data={formData} />
                <main className='print-main'>
                    <ResponsiblesSection data={formData} />
                    <AnalysisTable steps={[]} />
                </main>
                <PrintFooter data={formData} page={1} totalPages={1} />
            </div>
          </div>
      )}
      {/* Hidden container for measurement */}
      <div ref={measurementRef} style={{ position: 'absolute', top: '-9999px', left: '-9999px', zIndex: -100, opacity: 0, background: 'white' }} />
    </>
  );
}
