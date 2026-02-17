import React from 'react';
import type { SafetyFormValues, PtTeamMember, Company } from '@/lib/types';
import { ptChecklistItems } from '@/lib/data/pt-checklist';
import { ptBr } from '@/lib/data/strings';
import { PT_FIT_STATUS } from '@/lib/constants';

interface PTPreviewProps {
  formData: SafetyFormValues;
  company: Company | null;
}


const CheckboxDisplay = ({ checked }: { checked: boolean }) => (
    <div className="w-3 h-3 border border-black flex items-center justify-center">
        {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
);

const Empty = () => <span className="italic text-gray-400">{ptBr.other.notFilled}</span>;

const TextLine = ({ label, value, className = '' }: { label: string, value: string | undefined, className?: string}) => (
    <div className={`flex items-end border-b border-black ${className}`}>
        <span className="text-xxs font-bold uppercase mr-1">{label}:</span>
        <span className="text-xs flex-1 text-left whitespace-pre-wrap break-words">{value || <Empty />}</span>
    </div>
);

const Section = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
    <div className={`avoid-break ${className}`}>
        <h3 className="section-title text-xxs font-bold text-center bg-gray-200 py-0.5">{title}</h3>
        {children}
    </div>
);

const TeamTable = ({ title, members, showEmpresa = false }: { title: string, members: PtTeamMember[], showEmpresa?: boolean }) => {
    if (!members || members.length === 0) return null;

    return (
        <Section title={title} className="!mt-2">
            <table className="w-full border-collapse info-grid text-xs">
                <thead className='text-center font-bold'>
                    <tr>
                        <td className='w-1/3'>{ptBr.ptForm.name}</td>
                        <td className='w-1/4'>{ptBr.ptForm.rgCpf}</td>
                        <td className='w-1/4'>{ptBr.ptForm.role}</td>
                        {showEmpresa && <td className='w-1/5'>{ptBr.ptForm.company}</td>}
                        <td className='w-1/6'>{ptBr.ptForm.isFit}</td>
                    </tr>
                </thead>
                <tbody>
                    {members.map((m, i) => (
                        <tr key={i} className='h-6'>
                            <td>{m.name || <Empty />}</td>
                            <td>{m.rgCpf || <Empty />}</td>
                            <td>{m.func || <Empty />}</td>
                            {showEmpresa && <td>{m.empresa || <Empty />}</td>}
                            <td className='text-center'>
                                <div className='flex items-center justify-center gap-2'>
                                    <CheckboxDisplay checked={m.apto === PT_FIT_STATUS.YES} /> {ptBr.ptForm.yes}
                                    <CheckboxDisplay checked={m.apto === PT_FIT_STATUS.NO} /> {ptBr.ptForm.no}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Section>
    );
};


export function PTPreview({ formData, company }: PTPreviewProps) {
  if (!formData?.pt) {
    return null; // or a placeholder component
  }

  const { pt: ptData } = formData;
  const checklist = ptData.ptChecklist || {};

  const getCheckedItems = (sectionId: string) => {
    return ptChecklistItems.find(s => s.id === sectionId)?.items.filter(item => checklist[item.id]) || [];
  }

  return (
    <div className="page-content-wrapper text-black">
      <header className="print-header avoid-break">
        <table className="w-full border-collapse info-grid">
            <tbody>
                <tr>
                    <td rowSpan={2} className="w-1/4 align-middle text-center">
                         {company?.logo ? (
                           <img src={company.logo} alt={ptBr.other.companyLogoAlt} className="h-16 w-auto max-w-[120px] object-contain mx-auto" />
                         ) : <div className="h-16 w-auto"></div>}
                    </td>
                    <td rowSpan={2} className="w-1/2 text-center">
                        <h1 className="text-lg font-bold">{ptBr.printPreview.pt.title}</h1>
                        <p className="text-xs font-bold text-red-600">{ptBr.printPreview.pt.subtitle}</p>
                    </td>
                    <td className="w-1/4 !p-1 text-center">
                        <span className='font-bold'>{company?.name || <Empty />}</span>
                    </td>
                </tr>
                 <tr>
                    <td className="!p-0">
                        <div className='flex text-xs'>
                            <div className="flex-1 p-1 border-r border-black"><strong>{ptBr.printPreview.pt.date}</strong> {ptData.ptData}</div>
                            <div className="flex-1 p-1"><strong>{ptBr.printPreview.pt.time}</strong></div>
                        </div>
                    </td>
                </tr>
                 <tr>
                    <td colSpan={2} className='!p-1'>
                        <TextLine label={ptBr.printPreview.pt.location} value={ptData.ptLocalAtividade} />
                    </td>
                    <td className='!p-1'>
                        <div className='flex text-xs'>
                            <div className="flex-1 p-1 border-r border-black"><strong>{ptBr.printPreview.pt.startTime}</strong> {ptData.ptHoraInicio}</div>
                            <div className="flex-1 p-1"><strong>{ptBr.printPreview.pt.endTime}</strong> {ptData.ptHoraFim}</div>
                        </div>
                    </td>
                 </tr>
                 <tr>
                    <td colSpan={3} className='!p-1'><TextLine label={ptBr.printPreview.pt.equipment} value={ptData.ptEquipamentoLinha} /></td>
                 </tr>
                  <tr>
                    <td colSpan={3} className='!p-1'><TextLine label={ptBr.printPreview.pt.taskDescription} value={ptData.ptDescricaoTarefa} /></td>
                 </tr>
            </tbody>
        </table>
      </header>

      <main className="print-main text-xs space-y-1">
        {ptChecklistItems.map(section => {
            const checkedItems = section.items.filter(item => checklist[item.id]);
            if (checkedItems.length === 0) return null;

            return (
                <Section key={section.id} title={ptBr.ptChecklist.titles[section.id as keyof typeof ptBr.ptChecklist.titles]}>
                    <div className={`grid ${section.columns === 3 ? 'grid-cols-3' : section.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-x-4 p-1 border border-black border-t-0`}>
                       {section.items.map(item => (
                           <div key={item.id} className="flex items-center space-x-1.5">
                               <CheckboxDisplay checked={!!checklist[item.id]} />
                               <span>{ptBr.ptChecklist.items[item.id as keyof typeof ptBr.ptChecklist.items]}</span>
                           </div>
                       ))}
                    </div>
                </Section>
            );
        })}

        <TeamTable title={ptBr.printPreview.pt.collaborators} members={ptData.ptColaboradores || []} showEmpresa={true} />
        
        {ptData.ptEnableEspacoConfinado && (
            <Section title={ptBr.printPreview.pt.confinedSpaceTitle}>
                <table className="w-full border-collapse info-grid text-xs">
                    <thead className='text-center'>
                        <tr className='font-bold'>
                            <td>{ptBr.printPreview.pt.oxygen}</td>
                            <td>{ptBr.printPreview.pt.le}</td>
                            <td>{ptBr.printPreview.pt.h2s}</td>
                            <td>{ptBr.printPreview.pt.co2}</td>
                            <td className='w-1/4'>{ptBr.printPreview.pt.observation}</td>
                        </tr>
                    </thead>
                    <tbody className='text-center'>
                        <tr className='h-6'>
                            <td>{ptData.ptOxigenio || <Empty />}</td>
                            <td>{ptData.ptLE || <Empty />}</td>
                            <td>{ptData.ptH2S || <Empty />}</td>
                            <td>{ptData.ptCO2 || <Empty />}</td>
                            <td>{ptData.ptObservacao || <Empty />}</td>
                        </tr>
                    </tbody>
                </table>
            </Section>
        )}
        
        {ptData.ptEnableVigia && (
            <TeamTable title={ptBr.printPreview.pt.lookouts} members={ptData.ptVigias || []} showEmpresa={false} />
        )}

        {ptData.ptEnableResgatistas && (
            <TeamTable title={ptBr.printPreview.pt.rescuers} members={ptData.ptResgatistas || []} showEmpresa={true} />
        )}

      </main>
    </div>
  );
}
