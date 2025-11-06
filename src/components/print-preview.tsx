'use client';

import React, { useMemo } from 'react';
import type { SafetyFormValues, PtFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { Logo } from '@/components/icons/logo';
import { PTPreview } from './pt-preview';


interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
}

function APRHeader({ data }: { data: SafetyFormValues }) {
  return (
    <header className="print-header avoid-break">
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
        <div className="flex flex-row gap-2 shrink-0">
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
  );
}

function PrintFooter() {
    const date = useMemo(() => new Date().toLocaleDateString('pt-BR'), []);
    return (
        <div className="print-footer avoid-break">
            <div className="footer-content-wrapper">
                <div className="flex justify-between items-center w-full text-xs text-gray-500">
                    <div className="text-left">
                        <p>Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
                    </div>
                    <div className="text-center">
                        <p>Data: {date}</p>
                    </div>
                    <div className="text-right">
                        {/* Page number is handled by PDF generation */}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResponsiblesSection({ data }: { data: SafetyFormValues }) {
  return (
    <section className="responsibles-section avoid-break">
      <h3 className="section-title">RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS</h3>
      <table className="w-full border-collapse border mt-1 analysis-table">
        <thead className='analysis-table-header'>
          <tr>
            <th className="text-left w-[40%]">NOME</th>
            <th className="text-left w-[30%]">FUNÇÃO</th>
            <th className="text-left w-[30%]">ASSINATURA</th>
          </tr>
        </thead>
        <tbody>
          {(data.responsiblePersons?.length > 0 ? data.responsiblePersons : [{ name: '', role: '', signature: '' }]).map((person, index: number) => (
            <tr key={`resp-${index}`} className="avoid-break">
              <td className="h-12">{person.name || '...'}</td>
              <td>{person.role || '...'}</td>
              <td>
                {person.signature && (
                  <img src={person.signature} alt="Assinatura" className="h-10 object-contain" />
                )}
              </td>
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
        <thead className='analysis-table-header'>
          <tr>
            <th className="text-left w-1/4">DATA</th>
            <th className="text-left w-1/4">NOME</th>
            <th className="text-left w-1/4">FUNÇÃO / EMPRESA</th>
            <th className="text-left w-1/4">ASSINATURA</th>
          </tr>
        </thead>
        <tbody>
          {teamMembers.map((member: any, index: number) => (
            <tr key={`team-${index}`} className="avoid-break">
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
  return (
     <section className='analysis-table-wrapper avoid-break'>
        <h3 className="section-title">PROCEDIMENTO OPERACIONAL</h3>
        <table className="w-full border-collapse text-xs analysis-table">
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
      </section>
  );
}

function EquipmentSection({ data }: { data: ProtectiveEquipmentOutput | null }) {
  if (!data) return null;

  return (
    <section className="equipment-section avoid-break">
      <table className="w-full border-collapse text-xs analysis-table">
        <thead className='analysis-table-header'>
          <tr>
            <th className="p-1 text-left w-1/2">EPI NECESSÁRIO A EXECUÇÃO DA ATIVIDADE</th>
            <th className="p-1 text-left w-1/2">EPC NECESSÁRIO A EXECUÇÃO DA ATIVIDADE</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="p-2 align-top">
              <ul className="list-disc pl-4 space-y-1">
                {data.epiItems.map((item, index) => <li key={`epi-${index}`}>{item}</li>)}
              </ul>
            </td>
            <td className="p-2 align-top">
              <ul className="list-disc pl-4 space-y-1">
                {data.epcItems.map((item, index) => <li key={`epc-${index}`}>{item}</li>)}
              </ul>
            </td>
          </tr>
          <tr>
            <td className="p-2 align-top text-xs"><strong>OBS.:</strong> {data.epiNote}</td>
            <td className="p-2 align-top text-xs"><strong>OBS.:</strong> {data.epcNote}</td>
          </tr>
        </tbody>
      </table>
    </section>
  )
}

function getShortDate(dateString: string | undefined) {
  if (!dateString) return '...';
  try {
    const date = new Date(dateString);
    // Adjust for timezone offset to prevent date from changing
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return 'Data inválida'
  }
}

export function APRPreviewContent({ formData, analysisData, equipmentData }: { formData: SafetyFormValues, analysisData: SafetyAnalysisOutput | null, equipmentData: ProtectiveEquipmentOutput | null }) {
    if (!formData) return null;

    const showAnalysis = analysisData && analysisData.proceduralSteps && analysisData.proceduralSteps.length > 0;

    return (
        <div className="page-content-wrapper">
            <APRHeader data={formData} />
            <main className='print-main'>
                <ResponsiblesSection data={formData} />

                {showAnalysis ? (
                   <AnalysisTable steps={analysisData.proceduralSteps} />
                ) : (
                    <section className='avoid-break'>
                        <h3 className="section-title">PROCEDIMENTO OPERACIONAL</h3>
                        <div className="text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
                            A análise de procedimento operacional aparecerá aqui após ser gerada.
                        </div>
                    </section>
                )}

                <EquipmentSection data={equipmentData} />
                <TeamSection data={formData} />
            </main>
            <PrintFooter />
        </div>
    );
}

export function PrintPreview({ formData, analysisData, equipmentData }: PrintPreviewProps) {
  const documentType = formData?.documentType;

  return (
      <div id="print-content-root">
           <div className="print-document-container">
              {documentType === 'APR' ? (
                  <APRPreviewContent formData={formData} analysisData={analysisData} equipmentData={equipmentData} />
              ) : (
                  <PTPreview formData={formData} />
              )}
          </div>
      </div>
  );
}
