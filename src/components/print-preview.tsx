import React from 'react';
import type { SafetyFormValues, Company } from '@/lib/types';
import type { SafetyAnalysisOutput, ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { Logo } from '@/components/icons/logo';
import { PTPreview } from './pt-preview';
import { ClipboardList, UserCheck, ShieldCheck, HardHat, Construction, Users, AlertTriangle } from 'lucide-react';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES } from '@/lib/constants';


interface PrintPreviewProps {
  formData: SafetyFormValues;
  analysisData: SafetyAnalysisOutput | null;
  equipmentData: ProtectiveEquipmentOutput | null;
  company: Company | null;
  error?: string | null;
}

const Empty = () => <span className="italic text-gray-400">{ptBr.other.notFilled}</span>;

function APRHeader({ data, company }: { data: SafetyFormValues; company: Company | null }) {
  return (
    <header className="print-header avoid-break">
      <div className="flex items-start justify-between gap-4 border-b pb-2">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {company?.logo ? (
            <img src={company.logo} alt={ptBr.other.companyLogoAlt} className="h-16 w-auto max-w-[120px] object-contain" />
          ) : (
            <Logo className="h-12 w-12 text-gray-700" />
          )}
          <div className='flex-1 min-w-0'>
            <h1 className="text-xl font-bold text-gray-800 break-words">{company?.name || <Empty />}</h1>
            <p className='text-sm mt-2 font-bold'>
              {ptBr.printPreview.apr.title}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-1 items-end text-xs text-gray-600 shrink-0">
          <div className="px-3 py-1 border rounded-md bg-gray-50">
            <span className="font-semibold">{ptBr.printPreview.apr.aprNumber}</span> {data.documentType === DOCUMENT_TYPES.APR ? 'APR' : 'PT'} Nº {'01'}
          </div>
          <div className="px-3 py-1 border rounded-md bg-gray-50">
            <span className="font-semibold">{ptBr.printPreview.apr.review}</span> {'01'}
          </div>
        </div>
      </div>
    </header>
  );
}

function PrintFooter() {
  const date = new Date().toLocaleDateString('pt-BR');

  return (
    <footer className="print-footer avoid-break mt-4 text-xs text-gray-500 border-t pt-2">
      <div className="flex justify-between items-center w-full">
        <p>{ptBr.printPreview.footer.mte}</p>
        <p>{ptBr.printPreview.footer.date} {date}</p>
      </div>
    </footer>
  );
}

const Section = ({ title, icon, children, allowBreak = false }: { title: string, icon: React.ElementType, children: React.ReactNode, allowBreak?: boolean }) => {
  const Icon = icon;
  return (
    <section className={`${allowBreak ? '' : 'avoid-break'} mt-2`}>
      <h3 className="section-title flex items-center justify-center">
        <Icon className="inline-block mr-2 h-4 w-4" />
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
    <Section title={ptBr.printPreview.apr.responsibles} icon={UserCheck} allowBreak={true}>
      <table className="w-full border-collapse border mt-0 analysis-table">
        <thead>
          <tr>
            <th className="text-left w-[50%]">{ptBr.printPreview.apr.name}</th>
            <th className="text-left w-[50%]">{ptBr.printPreview.apr.role}</th>
          </tr>
        </thead>
        <tbody>
          {(data.responsiblePersons?.length > 0 ? data.responsiblePersons : [{ name: '', role: '' }]).map((person, index: number) => (
            <tr key={`resp-${index}`} className="avoid-break">
              <td className="h-10">{person.name || <Empty />}</td>
              <td>{person.role || <Empty />}</td>
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
    <Section title={ptBr.printPreview.apr.team} icon={Users} allowBreak={true}>
      <table className="w-full border-collapse border mt-0 analysis-table">
        <thead>
          <tr>
            <th className="text-left w-[30%]">{ptBr.printPreview.apr.date}</th>
            <th className="text-left w-[40%]">{ptBr.printPreview.apr.name}</th>
            <th className="text-left w-[30%]">{ptBr.printPreview.apr.role}</th>
          </tr>
        </thead>
        <tbody>
          {teamMembers.map((member: any, index: number) => (
            <tr key={`team-${index}`} className="avoid-break">
              <td className="h-10">{getShortDate(member.date) || <Empty />}</td>
              <td>{member.name || <Empty />}</td>
              <td>{member.role || <Empty />}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Section>
  );
}

function AnalysisTable({ steps }: { steps: any[] }) {
  return (
    <Section title={ptBr.printPreview.apr.operationalProcedure} icon={ShieldCheck} allowBreak={true}>
      <table className="w-full border-collapse text-xs analysis-table">
        <thead>
          <tr>
            <th className="p-1 text-left w-[5%]">{ptBr.printPreview.apr.item}</th>
            <th className="p-1 text-left w-[25%]">{ptBr.printPreview.apr.activities}</th>
            <th className="p-1 text-left w-[25%]">{ptBr.printPreview.apr.potentialRisks}</th>
            <th className="p-1 text-left w-[45%]">{ptBr.printPreview.apr.preventiveMeasures}</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step: any, index: number) => (
            <tr key={`proc-step-${step.item || index}`}>
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
    <div className='grid grid-cols-2 gap-4 avoid-break'>
      <Section title={ptBr.printPreview.apr.requiredEpi} icon={HardHat}>
        <div className='p-2'>
          <ul className="list-disc pl-4 space-y-1 text-sm">
            {data.epiItems.map((item, index) => <li key={`epi-${index}`}>{item}</li>)}
          </ul>
          <p className="text-xs italic mt-2"><strong>{ptBr.printPreview.apr.obs}</strong> {data.epiNote}</p>
        </div>
      </Section>
      <Section title={ptBr.printPreview.apr.requiredEpc} icon={Construction}>
        <div className='p-2'>
          <ul className="list-disc pl-4 space-y-1 text-sm">
            {data.epcItems.map((item, index) => <li key={`epc-${index}`}>{item}</li>)}
          </ul>
          <p className="text-xs italic mt-2"><strong>{ptBr.printPreview.apr.obs}</strong> {data.epcNote}</p>
        </div>
      </Section>
    </div>
  )
}

function getShortDate(dateString: string | undefined) {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const zonedDate = new Date(date.valueOf() + date.getTimezoneOffset() * 60 * 1000);
    return zonedDate.toLocaleDateString('pt-BR');
  } catch (e) {
    return ptBr.other.invalidDate;
  }
}

function APRPreviewContent({ formData, analysisData, equipmentData, company, error }: { formData: SafetyFormValues, analysisData: SafetyAnalysisOutput | null, equipmentData: ProtectiveEquipmentOutput | null, company: Company | null, error?: string | null }) {
  if (!formData) return null;

  const showAnalysis = !error && analysisData && analysisData.proceduralSteps && analysisData.proceduralSteps.length > 0;

  return (
    <div className="page-content-wrapper">
      <APRHeader data={formData} company={company} />
      <main className='print-main flex flex-col gap-4'>
        <Section title={ptBr.printPreview.apr.workData} icon={ClipboardList}>
          <table className="w-full border-collapse info-grid">
            <tbody>
              <tr>
                <td className="w-1/2"><strong>{ptBr.printPreview.apr.workName}</strong>{formData.workName || <Empty />}</td>
                <td className="w-1/2"><strong>{ptBr.printPreview.apr.workAddress}</strong>{formData.workAddress || <Empty />}</td>
              </tr>
              <tr>
                <td><strong>{ptBr.printPreview.apr.startDate}</strong>{getShortDate(formData.startDate) || <Empty />}</td>
                <td><strong>{ptBr.printPreview.apr.endDate}</strong>{getShortDate(formData.endDate) || <Empty />}</td>
              </tr>
              <tr>
                <td colSpan={2}><strong>{ptBr.printPreview.apr.workLocation}</strong>{formData.workLocationDetails || <Empty />}</td>
              </tr>
              <tr>
                <td colSpan={2}><strong>{ptBr.printPreview.apr.activityDescription}</strong>{formData.activityDescription || <Empty />}</td>
              </tr>
            </tbody>
          </table>
        </Section>



        {error ? (
          <Section title={ptBr.printPreview.apr.operationalProcedure} icon={AlertTriangle}>
            <div className="text-center text-destructive bg-destructive/10 border-2 border-dashed border-destructive/30 rounded-lg p-4">
              <h3 className="text-base font-semibold">{ptBr.previewPanel.error.title}</h3>
              <p className='mt-2 text-sm'>{error}</p>
            </div>
          </Section>
        ) : showAnalysis ? (
          <AnalysisTable steps={analysisData.proceduralSteps} />
        ) : (
          <Section title={ptBr.printPreview.apr.operationalProcedure} icon={ShieldCheck}>
            <div className="text-center py-8">
              <Empty />
            </div>
          </Section>
        )}

        {!error && <EquipmentSection data={equipmentData} />}

        <TeamSection data={formData} />
        <ResponsiblesSection data={formData} />
      </main>
      <PrintFooter />
    </div>
  );
}


export function PrintPreview({ formData, analysisData, equipmentData, company, error }: PrintPreviewProps) {
  const documentType = formData?.documentType;

  return (
    <div className="print-preview-wrapper">
      <div id="print-content-root" className="print-document-container w-[210mm] min-h-[297mm] bg-white shadow-lg rounded-lg text-gray-800 font-sans p-[15mm]">
        {documentType === DOCUMENT_TYPES.APR ? (
          <APRPreviewContent formData={formData} analysisData={analysisData} equipmentData={equipmentData} company={company} error={error} />
        ) : (
          <PTPreview formData={formData} company={company} />
        )}
      </div>
    </div>
  );
}
