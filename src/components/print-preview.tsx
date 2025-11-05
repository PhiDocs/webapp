'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';

interface PrintPreviewProps {
    formData: SafetyFormValues & { date?: string };
    analysisData: SafetyAnalysisOutput | null;
}

// This component will render the raw, unpaginated content.
// The pagination logic will happen in the parent component.
function RenderContent({ formData, analysisData }: PrintPreviewProps) {
    const data = {...formData, ...analysisData};
    const teamMembers = data.teamMembers || [];
    const date = data.date || new Date().toLocaleDateString('pt-BR');

    return (
        <>
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
            </section>
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
              <section key="s3" className="mb-4">
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
                      {Array.from({ length: Math.max(0, 5 - teamMembers.length) }).map((_: any, index: number) => (
                        <tr key={`empty-team-${index}`}>
                          <td className="h-10"></td><td></td><td></td><td></td>
                        </tr>
                      ))}
                   </tbody>
                </table>
              </section>
            )}
            {data?.proceduralSteps && data.proceduralSteps.length > 0 ? (
              <section key="s4">
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
                      <tr key={`proc-${index}`}>
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
              <section key="s-empty" className="mb-4 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
                A análise de procedimento operacional aparecerá aqui após ser gerada.
              </section>
            )}
          <section key="s5" className="signature-section mt-auto pt-8">
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
        </>
    );
}


// This is the core component that handles pagination for the preview
export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
    const contentRef = useRef<HTMLDivElement>(null);
    const [pages, setPages] = useState<React.ReactNode[]>([]);
    
    // Re-paginate whenever data changes
    useEffect(() => {
        const paginateContent = () => {
            const contentElement = contentRef.current;
            if (!contentElement) return;

            // A4 page height in mm, converted to pixels (assuming 96 DPI, 1mm ~ 3.78px)
            // Page content height = 297mm - 20mm top margin - 20mm bottom margin = 257mm
            const A4_CONTENT_HEIGHT_PX = (297 - 40) * 3.78; 
            const totalContentHeight = contentElement.scrollHeight;
            const totalPages = Math.ceil(totalContentHeight / A4_CONTENT_HEIGHT_PX);

            const newPages = [];
            for (let i = 0; i < totalPages; i++) {
                const yOffset = -i * A4_CONTENT_HEIGHT_PX;
                
                newPages.push(
                    <div key={`page-${i}`} className="print-container">
                        <div className="page-content-wrapper">
                            {getPageHeader(i + 1, totalPages, formData)}
                            <main className="print-main">
                                <div style={{ transform: `translateY(${yOffset}px)` }}>
                                    <RenderContent formData={formData} analysisData={analysisData} />
                                </div>
                            </main>
                            {getPageFooter(formData)}
                        </div>
                    </div>
                );
            }
            setPages(newPages);
        };
        
        // Use a timeout to allow the browser to render the initial content before we measure it
        const timer = setTimeout(paginateContent, 100);
        return () => clearTimeout(timer);

    }, [formData, analysisData]);

    if (!formData.companyName && !analysisData) {
        return (
            <div className="print-container">
                <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
                    A pré-visualização do documento aparecerá aqui.
                </div>
            </div>
        );
    }
    
    return (
        <>
            {/* This invisible div is used to measure the total height of the content */}
            <div style={{ position: 'absolute', opacity: 0, zIndex: -10, pointerEvents: 'none', width: '210mm' }}>
                <div ref={contentRef}>
                    <RenderContent formData={formData} analysisData={analysisData} />
                </div>
            </div>
            
            {pages.length > 0 ? pages : (
                 <div className="print-container">
                    <div className="flex h-full items-center justify-center">Calculando paginação...</div>
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
