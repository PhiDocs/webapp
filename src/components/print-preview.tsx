'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';

interface PrintPreviewProps {
    formData: SafetyFormValues & { date?: string };
    analysisData: SafetyAnalysisOutput | null;
}

// A simple hook to get the component's rendered height
const useElementHeight = (ref: React.RefObject<HTMLDivElement>) => {
    const [height, setHeight] = useState(0);
    useEffect(() => {
        if (ref.current) {
            setHeight(ref.current.offsetHeight);
        }
    }, [ref]);
    return height;
};

// Represents one physical A4 page in the preview
const Page = React.forwardRef<HTMLDivElement, { children: React.ReactNode }>(({ children }, ref) => {
    return (
        <div ref={ref} className="print-container">
            <div className="page-content-wrapper">
                {children}
            </div>
        </div>
    );
});
Page.displayName = 'Page';


export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
    const pageContainerRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<React.ReactNode[]>([]);
    
    // Re-paginate whenever data changes
    useEffect(() => {
        const paginate = () => {
            if (!pageContainerRef.current) return;

            const allElements = Array.from(pageContainerRef.current.children) as HTMLElement[];
            if (allElements.length === 0) return;

            const A4_PAGE_HEIGHT_PX = 1123; // 297mm at 96 DPI
            const PAGE_VERTICAL_MARGIN_PX = 150; // Approximation of top/bottom margins + header/footer
            const MAX_CONTENT_HEIGHT = A4_PAGE_HEIGHT_PX - PAGE_VERTICAL_MARGIN_PX;

            const newPages: React.ReactNode[][] = [];
            let currentPageElements: React.ReactNode[] = [];
            let currentHeight = 0;

            const header = getPageHeader(1, 1, formData); // Dummy header for height calculation
            const footer = getPageFooter(formData);
            
            const tempDiv = document.createElement('div');
            const reactRoot = require('react-dom/client').createRoot(tempDiv);
            reactRoot.render(header);
            const headerHeight = tempDiv.offsetHeight || 100;
            reactRoot.render(footer);
            const footerHeight = tempDiv.offsetHeight || 50;

            const maxContentHeight = A4_PAGE_HEIGHT_PX - headerHeight - footerHeight - 80; // 80 for padding

            allElements.forEach((el, index) => {
                const isTable = el.tagName.toLowerCase() === 'section' && el.querySelector('table.analysis-table');
                
                if (isTable) {
                    const table = el.querySelector('table.analysis-table')!;
                    const rows = Array.from(table.querySelectorAll('tbody tr'));
                    const tableHeader = table.querySelector('thead')!.cloneNode(true) as HTMLElement;
                    const sectionTitle = el.querySelector('.section-title')!.cloneNode(true) as HTMLElement;
                    
                    let currentTableRows: HTMLElement[] = [];
                    
                    rows.forEach((row, rowIndex) => {
                        const rowHeight = row.offsetHeight;
                        if (currentHeight + rowHeight > maxContentHeight && currentPageElements.length > 0) {
                            // Finish previous page
                            if(currentTableRows.length > 0) {
                                currentPageElements.push(
                                    <section key={`table-chunk-${newPages.length}`}>
                                        {sectionTitle.outerHTML}
                                        <table className="w-full border-collapse border mt-1 text-xs analysis-table">
                                           {tableHeader.outerHTML}
                                            <tbody>{currentTableRows.map(r => r.outerHTML).join('')}</tbody>
                                        </table>
                                    </section>
                                );
                            }
                            newPages.push(currentPageElements);
                            currentPageElements = [];
                            currentHeight = 0;
                            currentTableRows = [];
                        }
                        
                        if (currentTableRows.length === 0) {
                            currentHeight += (sectionTitle.offsetHeight + tableHeader.offsetHeight);
                        }

                        currentTableRows.push(row);
                        currentHeight += rowHeight;
                    });
                    
                     if(currentTableRows.length > 0) {
                        currentPageElements.push(
                           <section key={`table-chunk-${newPages.length}`}>
                                <div dangerouslySetInnerHTML={{ __html: sectionTitle.outerHTML }}/>
                                <table className="w-full border-collapse border mt-1 text-xs analysis-table">
                                    <thead dangerouslySetInnerHTML={{ __html: tableHeader.innerHTML }}/>
                                    <tbody dangerouslySetInnerHTML={{ __html: currentTableRows.map(r => r.outerHTML).join('') }}/>
                                </table>
                            </section>
                        );
                    }
                } else {
                    const elementHeight = el.offsetHeight;
                    if (currentHeight + elementHeight > maxContentHeight && currentPageElements.length > 0) {
                        newPages.push(currentPageElements);
                        currentPageElements = [ <div key={index} dangerouslySetInnerHTML={{ __html: el.outerHTML }} /> ];
                        currentHeight = elementHeight;
                    } else {
                        currentPageElements.push( <div key={index} dangerouslySetInnerHTML={{ __html: el.outerHTML }} /> );
                        currentHeight += elementHeight;
                    }
                }
            });

            if (currentPageElements.length > 0) {
                newPages.push(currentPageElements);
            }
            
            const totalPages = newPages.length;
            const finalPages = newPages.map((pageContent, i) => (
                 <div key={i} className="print-container page-break">
                    <div className="page-content-wrapper">
                        {getPageHeader(i + 1, totalPages, formData)}
                        <main className="print-main flex-grow flex flex-col">
                            {pageContent}
                        </main>
                        {getPageFooter(formData)}
                    </div>
                </div>
            ));
            
            setPages(finalPages);
        };
        
        // Use a timeout to allow the browser to render the initial content before we measure it
        const timer = setTimeout(paginate, 100);
        return () => clearTimeout(timer);

    }, [formData, analysisData]);

    const initialContent = getSections(formData, analysisData, formData.date || new Date().toLocaleDateString('pt-BR'));

    if (!formData.companyName && !analysisData) {
        return (
            <div className="print-container">
                <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
                    A pré-visualização do documento aparecerá aqui.
                </div>
            </div>
        );
    }
    
    // Render all content invisibly first to measure it
    // Then, render the paginated content
    return (
        <>
            <div ref={pageContainerRef} style={{ position: 'absolute', left: '-9999px', top: '0', width: '210mm' }}>
                {initialContent}
            </div>
            {pages.length > 0 ? pages : (
                 <div className="print-container">
                    <div className="page-content-wrapper">
                       <div className="flex h-full items-center justify-center">Calculando paginação...</div>
                    </div>
                 </div>
            )}
        </>
    );
}

function getPageHeader(pageNumber: number, totalPages: number, data: any) {
    const date = data.date || new Date().toLocaleDateString('pt-BR');
    return (
     <header className="print-header flex items-start justify-between pb-4 border-b">
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
            <div className='flex gap-2'>
              <div className='border p-1 text-center min-w-[100px]'>
                  <p className='text-xs font-bold'>DATA</p>
                  <p className='text-sm'>{date}</p>
              </div>
              <div className='border p-1 text-center min-w-[100px]'>
                  <p className='text-xs font-bold'>APR Nº</p>
                  <p className='text-sm'>&nbsp;</p>
              </div>
            </div>
             <div className='flex gap-2'>
              <div className='border p-1 text-center min-w-[100px]'>
                  <p className='text-xs font-bold'>Revisão</p>
                  <p className='text-sm'>01</p>
              </div>
              <div className='border p-1 text-center min-w-[100px]'>
                  <p className='text-xs font-bold'>PÁGINAS</p>
                  <p className='text-sm'>{pageNumber} de {totalPages}</p>
              </div>
            </div>
          </div>
        </header>
    )
}

function getPageFooter(data: any) {
    return (
        <footer className="print-footer pt-2 mt-auto text-center text-xs text-gray-500 border-t">
          <p>Organizar e arquivar este documento e suas revisões / Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
          <p>&copy; {new Date().getFullYear()} {data.companyName}</p>
        </footer>
    )
}

function getShortDate(dateString: string) {
    if (!dateString) return '...';
    try {
      const date = new Date(dateString);
      // add timezone offset
      const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
      return zonedDate.toLocaleDateString('pt-BR');
    } catch(e) {
        return 'Data inválida'
    }
}

function getSections(formData: any, analysisData: any, date: string) {
    const data = {...formData, ...analysisData};
    const teamMembers = data.teamMembers || [];

    return [
        <section key="s1" className="mb-4">
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
          </section>,
          <section key="s2" className="mb-4">
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
                  <tr key={index}>
                    <td className="h-12">{person.name || '...'}</td>
                    <td>{person.role || '...'}</td>
                    <td></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>,
          ... (teamMembers.length > 0 ? [
            <section key="s3" className="mb-4" style={{breakInside: 'avoid'}}>
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
                      <tr key={index}>
                        <td className="h-10">{getShortDate(member.date)}</td>
                        <td>{member.name}</td>
                        <td>{member.role}</td>
                        <td></td>
                      </tr>
                    ))}
                    {Array.from({ length: Math.max(0, 5 - teamMembers.length) }).map((_: any, index: number) => (
                      <tr key={`empty-${index}`}>
                        <td className="h-10"></td><td></td><td></td><td></td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            </section>
          ] : []),
          ... (data?.proceduralSteps && data.proceduralSteps.length > 0 ? [
            <section key="s4" className='page-break-before'>
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
                    <tr key={index}>
                      <td className="p-2 align-top text-center">{step.item}</td>
                      <td className="p-2 align-top whitespace-pre-wrap">{step.activity}</td>
                      <td className="p-2 align-top whitespace-pre-wrap">{step.potentialRisks}</td>
                      <td className="p-2 align-top whitespace-pre-wrap">{step.preventiveMeasures}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ] : [
            <section key="s-empty" className="mb-4 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
              A análise de procedimento operacional aparecerá aqui após ser gerada.
            </section>
          ]),
        <section key="s5" className="mt-auto pt-8 page-break-before">
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
    ];
}
