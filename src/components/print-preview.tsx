'use client';

import React, { useRef, useEffect, useState } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';

interface PrintPreviewProps {
    formData: SafetyFormValues;
    analysisData: SafetyAnalysisOutput | null;
}

type PageContent = {
  id: number;
  sections: React.ReactNode[];
};

export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
    const [pages, setPages] = useState<PageContent[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);

    // This effect re-calculates the pages whenever the data changes
    useEffect(() => {
        if (!containerRef.current) return;
        
        const data = { ...formData, ...analysisData };
        const date = (data as any).date || new Date().toLocaleDateString('pt-BR');
        
        const allSections = getSections(data, date);

        const tempContainer = document.createElement('div');
        tempContainer.style.width = '210mm';
        tempContainer.style.height = '297mm';
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px'; // Hide off-screen
        tempContainer.style.top = '0';
        tempContainer.className = 'print-container';
        document.body.appendChild(tempContainer);
        
        const newPages: PageContent[] = [];
        let currentPageSections: React.ReactNode[] = [];
        
        const pageContentHeight = (297 - 2*15) * 3.77; // A4 height in mm to px, minus margins
        const headerFooterHeight = 150; // Approximate height for header and footer in px
        const maxContentHeight = pageContentHeight - headerFooterHeight;

        tempContainer.innerHTML = '';
        
        allSections.forEach((section, index) => {
            const sectionWrapper = document.createElement('div');
            const sectionNode = <div className="page-content-wrapper"><div className="print-main">{section}</div></div>;

            // This is a trick to measure the section's height
            const tempSectionDiv = document.createElement('div');
            const reactRoot = require('react-dom/client').createRoot(tempSectionDiv);
            reactRoot.render(section);
            
            // This is a rough estimation, real browser rendering might differ.
            // A more robust solution would involve more complex height calculations.
            let tempHeight = 0;
            // Hacky way to estimate height. This is not very reliable.
             if (React.isValidElement(section) && typeof section.type === 'string') {
                 // rough estimate
                if (section.type === 'section') {
                    if ((section.props.children as any)?.type === 'table') {
                       tempHeight += 50; // table header
                       tempHeight += ((section.props.children as any)?.props.children[1].props.children as any[]).length * 100; // rough row height
                    } else {
                       tempHeight += 150;
                    }
                }
             }

            const currentHeight = tempContainer.scrollHeight;
            
            if (currentHeight + tempHeight > maxContentHeight && currentPageSections.length > 0) {
                newPages.push({ id: newPages.length, sections: currentPageSections });
                currentPageSections = [section];
                tempContainer.innerHTML = ''; // Reset for next page
                 const tempSectionDiv = document.createElement('div');
                const reactRoot = require('react-dom/client').createRoot(tempSectionDiv);
                reactRoot.render(section);
            } else {
                currentPageSections.push(section);
                 const tempSectionDiv = document.createElement('div');
                const reactRoot = require('react-dom/client').createRoot(tempSectionDiv);
                reactRoot.render(section);
            }
        });
        
        if (currentPageSections.length > 0) {
            newPages.push({ id: newPages.length, sections: currentPageSections });
        }
        
        document.body.removeChild(tempContainer);
        setPages(newPages);

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
    
    if (pages.length === 0) {
        // Render a single page with all content if pagination fails
        const data = { ...formData, ...analysisData };
        const date = (data as any).date || new Date().toLocaleDateString('pt-BR');
        return (
            <div className="print-container">
                 <PageLayout pageNumber={1} totalPages={1} data={data} date={date}>
                    {getSections(data, date)}
                 </PageLayout>
            </div>
        )
    }

    return (
        <>
            {pages.map((page, i) => (
                <div key={page.id} className="print-container">
                    <PageLayout pageNumber={i + 1} totalPages={pages.length} data={{...formData, ...analysisData}} date={new Date().toLocaleDateString('pt-BR')}>
                       {page.sections}
                    </PageLayout>
                </div>
            ))}
        </>
    );
}


function PageHeader({ pageNumber, totalPages, data, date }: any) {
    return (
     <header className="print-header flex items-start justify-between p-8 border-b">
          <div className="flex items-start gap-4">
            {data.companyLogo ? (
              <img src={data.companyLogo} alt="Company Logo" className="h-16 w-auto max-w-[120px] object-contain" />
            ) : (
              <Logo className="h-12 w-12 text-gray-700" />
            )}
            <div className='flex-1'>
                 <h1 className="text-xl font-bold text-gray-800">{data.companyName || 'Nome da Empresa'}</h1>
                 <p className='text-xs max-w-xs mt-2'>
                  <strong>Serviços a executar:</strong> {data.activityDescription || '...'}
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

function PageFooter({data}: any) {
    return (
        <footer className="print-footer p-4 mt-auto text-center text-xs text-gray-500 border-t">
          <p>Organizar e arquivar este documento e suas revisões / Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
          <p>&copy; {new Date().getFullYear()} {data.companyName}</p>
        </footer>
    )
}

function PageLayout({ pageNumber, totalPages, data, date, children }: any) {
    return (
        <>
            <PageHeader pageNumber={pageNumber} totalPages={totalPages} data={data} date={date} />
            <main className="print-main p-8 flex-grow flex flex-col">
                {children}
            </main>
            <PageFooter data={data} />
        </>
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

function getSections(data: any, date: string) {
    const teamMembers = data.teamMembers || [];

    return [
        <section key="s1" className="mb-4">
            <h3 className="section-title">DADOS DA OBRA</h3>
            <table className="w-full border-collapse border info-grid">
              <tbody>
                <tr>
                  <td className="w-1/2"><strong className="font-semibold">NOME:</strong>{data.workName || '...'}</td>
                  <td className="w-1/2"><strong className="font-semibold">ENDEREÇO:</strong>{data.workAddress || '...'}</td>
                </tr>
                <tr>
                  <td><strong className="font-semibold">PREVISÃO DATA INICIO:</strong>{getShortDate(data.startDate)}</td>
                  <td><strong className="font-semibold">PREVISÃO DATA TÉRMINO:</strong>{getShortDate(data.endDate)}</td>
                </tr>
                <tr>
                  <td colSpan={2}><strong className="font-semibold">LOCAL DA OBRA / PAVIMENTO:</strong>{data.workLocationDetails || '...'}</td>
                </tr>
                 <tr>
                  <td colSpan={2}><strong className="font-semibold">Descrição da atividade:</strong>{data.activityDescription || '...'}</td>
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
            <section key="s4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
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
        <section key="s5" className="mt-auto pt-8" style={{breakBefore: 'page'}}>
            <div className="flex-grow"></div>
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
