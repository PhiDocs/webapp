'use client';

import React from 'react';
import type { SafetyFormValues, PtSigner } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import { Logo } from '@/components/icons/logo';
import { PTPreview } from './pt-preview';
import { ClipboardList, UserCheck, ShieldCheck, HardHat, Construction } from 'lucide-react';


interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
}

const SignaturePreview = ({ signatureData, signatureType }: { signatureData?: string, signatureType?: string }) => {
    if (!signatureData) {
        return <div className="h-12 w-full border-b border-dashed"></div>;
    }

    if (signatureType === 'typed') {
        return <p className="font-serif italic text-lg text-center h-12 flex items-center justify-center">{signatureData}</p>;
    }

    if (signatureType === 'draw' || signatureType === 'upload') {
        return <img src={signatureData} alt="Assinatura" className="h-12 object-contain mx-auto" />;
    }

    return <div className="h-12 w-full border-b border-dashed"></div>;
};

function APRHeader({ data }: { data: SafetyFormValues }) {
  return (
    <header className="print-header avoid-break">
      <div className="flex items-start justify-between gap-4 border-b pb-2">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {data.companyLogo ? (
            <img src={data.companyLogo} alt="Company Logo" className="h-16 w-auto max-w-[120px] object-contain" />
          ) : (
             <Logo className="h-12 w-12 text-gray-700 no-print" />
          )}
          <div className='flex-1 min-w-0'>
            <h1 className="text-xl font-bold text-gray-800 break-words">{data.companyName || 'Nome da Empresa'}</h1>
            <p className='text-sm mt-2 font-bold'>
              APR - Analise Preliminar de Risco
            </p>
          </div>
        </div>
        <div className="flex flex-row gap-2 shrink-0">
          <div className='border p-1 text-center min-w-[100px] rounded-t-md'>
            <p className='text-xs font-bold'>APR Nº</p>
            <p className='text-sm'>&nbsp;</p>
          </div>
          <div className='border p-1 text-center min-w-[100px] rounded-t-md'>
            <p className='text-xs font-bold'>Revisão</p>
            <p className='text-sm'>01</p>
          </div>
        </div>
      </div>
    </header>
  );
}

function PrintFooter() {
    const [date, setDate] = React.useState('');
    React.useEffect(() => {
        setDate(new Date().toLocaleDateString('pt-BR'));
    }, []);

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
                       {/* Page numbers are now handled by pdfmake */}
                    </div>
                </div>
            </div>
        </div>
    );
}

const Section = ({ title, icon, children }: { title: string, icon: React.ElementType, children: React.ReactNode }) => {
    const Icon = icon;
    return (
        <section className="avoid-break mt-2">
            <h3 className="section-title">
                <Icon className="inline-block mr-2 h-4 w-4 no-print" />
                {title}
            </h3>
            <div className="section-content">
                {children}
            </div>
        </section>
    );
}


function ResponsiblesSection({ data }: { data: SafetyFormValues }) {
  return (
    <Section title="RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS" icon={UserCheck}>
      <table className="w-full border-collapse border mt-0 analysis-table">
        <thead className='analysis-table-header'>
          <tr>
            <th className="text-left w-[40%]">NOME</th>
            <th className="text-left w-[30%]">FUNÇÃO</th>
            <th className="text-left w-[30%]">ASSINATURA</th>
          </tr>
        </thead>
        <tbody>
          {(data.responsiblePersons?.length > 0 ? data.responsiblePersons : [{ name: '', role: '', signatureType: 'typed', signatureData: '' }]).map((person, index: number) => (
            <tr key={`resp-${index}`} className="avoid-break">
              <td className="h-16">{person.name || '...'}</td>
              <td>{person.role || '...'}</td>
               <td>
                <SignaturePreview signatureData={person.signatureData} signatureType={person.signatureType} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function TeamSection({ data }: { data: SafetyFormValues }) {
  const teamMembers = data.teamMembers || [];
  if (teamMembers.length === 0) return null;

  return (
    <Section title="EQUIPE DE TRABALHO" icon={UserCheck}>
      <table className="w-full border-collapse border mt-0 analysis-table">
        <thead className='analysis-table-header'>
          <tr>
            <th className="text-left w-1/3">DATA</th>
            <th className="text-left w-1/3">NOME</th>
            <th className="text-left w-1/3">FUNÇÃO / EMPRESA</th>
          </tr>
        </thead>
        <tbody>
          {teamMembers.map((member: any, index: number) => (
            <tr key={`team-${index}`} className="avoid-break">
              <td className="h-10">{getShortDate(member.date)}</td>
              <td>{member.name}</td>
              <td>{member.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function AnalysisTable({ steps }: { steps: any[] }) {
  return (
     <Section title="PROCEDIMENTO OPERACIONAL" icon={ShieldCheck}>
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
                  <td className="p-2 align-top">{step.activity}</td>
                  <td className="p-2 align-top">{step.potentialRisks}</td>
                  <td className="p-2 align-top whitespace-pre-wrap">{step.preventiveMeasures}</td>
                </tr>
              ))}
            </tbody>
        </table>
      </Section>
  );
}

function EquipmentSection({ data }: { data: ProtectiveEquipmentOutput | null }) {
  if (!data) return null;

  return (
    <div className='grid grid-cols-2 gap-4'>
        <Section title="EPI NECESSÁRIO" icon={HardHat}>
            <div className='p-2 border border-t-0 rounded-b-md'>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                    {data.epiItems.map((item, index) => <li key={`epi-${index}`}>{item}</li>)}
                </ul>
                <p className="text-xs italic mt-2"><strong>OBS.:</strong> {data.epiNote}</p>
            </div>
        </Section>
        <Section title="EPC NECESSÁRIO" icon={Construction}>
            <div className='p-2 border border-t-0 rounded-b-md'>
                <ul className="list-disc pl-4 space-y-1 text-sm">
                    {data.epcItems.map((item, index) => <li key={`epc-${index}`}>{item}</li>)}
                </ul>
                 <p className="text-xs italic mt-2"><strong>OBS.:</strong> {data.epcNote}</p>
            </div>
        </Section>
    </div>
  )
}

function getShortDate(dateString: string | undefined) {
  if (!dateString) return '...';
  try {
    const date = new Date(dateString);
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
                <Section title="DADOS DA OBRA" icon={ClipboardList}>
                     <table className="w-full border-collapse info-grid">
                        <tbody>
                            <tr>
                                <td className="w-1/2"><strong>NOME:</strong>{formData.workName || '...'}</td>
                                <td className="w-1/2"><strong>ENDEREÇO:</strong>{formData.workAddress || '...'}</td>
                            </tr>
                            <tr>
                                <td><strong>PREVISÃO DATA INICIO:</strong>{getShortDate(formData.startDate)}</td>
                                <td><strong>PREVISÃO DATA TÉRMINO:</strong>{getShortDate(formData.endDate)}</td>
                            </tr>
                            <tr>
                                <td colSpan={2}><strong>LOCAL DA OBRA / PAVIMENTO:</strong>{formData.workLocationDetails || '...'}</td>
                            </tr>
                            <tr>
                                <td colSpan={2}><strong>Descrição da atividade:</strong>{formData.activityDescription || '...'}</td>
                            </tr>
                        </tbody>
                    </table>
                </Section>
               
                <ResponsiblesSection data={formData} />

                {showAnalysis ? (
                   <AnalysisTable steps={analysisData.proceduralSteps} />
                ) : (
                    <Section title="PROCEDIMENTO OPERACIONAL" icon={ShieldCheck}>
                        <div className="text-center text-gray-500 italic py-8 border-2 border-dashed rounded-lg">
                            A análise de procedimento operacional aparecerá aqui após ser gerada.
                        </div>
                    </Section>
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
