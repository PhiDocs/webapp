'use client';

import React from 'react';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';

interface PrintPreviewProps {
    formData: SafetyFormValues;
    analysisData: SafetyAnalysisOutput | null;
}

// Helper to render pages
function Page({ children, isFirstPage }: { children: React.ReactNode, isFirstPage: boolean }) {
  return (
    <div className="print-container">
      <div className="page-content-wrapper">
        {children}
      </div>
    </div>
  );
}

// This is the core component that renders the content for preview AND for PDF generation
export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
    if (!formData.companyName && !analysisData) {
        return (
            <div className="print-container">
                <div className="flex h-full items-center justify-center p-8 text-center text-gray-500 italic">
                    A pré-visualização do documento aparecerá aqui.
                </div>
            </div>
        );
    }
    
    // We render the content in a sequence of pages. CSS will handle the rest.
    return (
      <>
        <Page isFirstPage={true}>
          <PrintHeader data={formData} />
          <main className="print-main">
            <PrintContent formData={formData} analysisData={analysisData} />
          </main>
          <PrintFooter data={formData} isFirstPage={true} />
        </Page>
      </>
    );
}

// This component renders the raw, unpaginated content
function PrintContent({ formData, analysisData }: {formData: SafetyFormValues, analysisData: SafetyAnalysisOutput | null}) {
    const data = {...formData, ...analysisData};
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
                    {Array.from({ length: Math.max(0, 15 - teamMembers.length) }).map((_: any, index: number) => (
                      <tr key={`empty-team-${index}`}>
                        <td className="h-10"></td><td></td><td></td><td></td>
                      </tr>
                    ))}
                 </tbody>
              </table>
            </section>
          )}

          {data?.proceduralSteps && data.proceduralSteps.length > 0 ? (
            <section className='analysis-table-wrapper'>
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
            <section className="mb-4 text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
              A análise de procedimento operacional aparecerá aqui após ser gerada.
            </section>
          )}
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
        </>
    );
}

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

function PrintFooter({ data, isFirstPage }: { data: SafetyFormValues, isFirstPage: boolean }) {
    const date = new Date().toLocaleDateString('pt-BR');
    return (
        <footer className="print-footer pt-2 mt-auto text-xs text-gray-500 border-t">
          <div className="flex justify-between items-end">
            <div className="text-left">
              <p>Organizar e arquivar este documento e suas revisões</p>
              <p>Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
            </div>
            <div className="text-center">
                 <p>&copy; {new Date().getFullYear()} {data.companyName}</p>
            </div>
            <div className="text-right">
                <p>Data: {date}</p>
                {/* This placeholder is filled during PDF generation */}
                <p className="page-number-placeholder">&nbsp;</p>
            </div>
          </div>
        </footer>
    )
}

// This component is now responsible for handling pagination and rendering multiple pages
function PaginatedPrintPreview({ formData, analysisData }: PrintPreviewProps) {
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
        <div className="print-container-wrapper">
             <div className="print-container" id="print-content-root">
                <div className='page-content-wrapper'>
                    <div className='print-header-wrapper'>
                        <PrintHeader data={formData} />
                    </div>
                    <main className='print-main'>
                        <PrintContent formData={formData} analysisData={analysisData} />
                    </main>
                    <div className='print-footer-wrapper'>
                       <PrintFooter data={formData} isFirstPage={true} />
                    </div>
                </div>
             </div>
        </div>
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

// We default to the new paginated component.
export { PaginatedPrintPreview as PrintPreview };
export { PrintContent as PrintPreviewContent } from './print-preview';

    