'use client';

import React from 'react';
import type { SafetyFormValues, PtTeamMember } from '@/lib/types';
import { ptChecklistItems } from '@/lib/pt-checklist-data';

interface PTPreviewProps {
  formData: SafetyFormValues;
}

const CheckboxDisplay = ({ checked }: { checked: boolean }) => (
    <div className="w-3 h-3 border border-black flex items-center justify-center">
        {checked && <div className="w-[7px] h-[7px] bg-black"></div>}
    </div>
);

const TextLine = ({ label, value, className = '' }: { label: string, value: string | undefined, className?: string}) => (
    <div className={`flex items-end border-b border-black ${className}`}>
        <span className="text-xxs font-bold uppercase mr-1">{label}:</span>
        <span className="text-xs flex-1 text-left">{value || '...'}</span>
    </div>
);

const Section = ({ title, children, className = "" }: { title: string, children: React.ReactNode, className?: string }) => (
    <div className={`avoid-break ${className}`}>
        <h3 className="section-title text-xxs font-bold text-center bg-yellow-300 py-0.5">{title}</h3>
        {children}
    </div>
);

export function PTPreview({ formData }: PTPreviewProps) {
  const { pt: ptData, companyLogo, companyName } = formData;
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
                    <td rowSpan={2} className="w-1/4">
                        {/* Assuming a logo might be used */}
                         <img src={companyLogo || "/placeholder.svg"} alt="Logo" className="h-12 mx-auto" />
                    </td>
                    <td rowSpan={2} className="w-1/2 text-center">
                        <h1 className="text-lg font-bold">PERMISSÃO DE TRABALHO</h1>
                        <p className="text-xs font-bold text-red-600">Obrigatória estar junto a APT diariamente</p>
                    </td>
                    <td className="w-1/4 !p-0">
                        <div className="flex items-center text-xs p-1">
                            <span className='mr-2'>Empresa e/ou Setor</span>
                            <CheckboxDisplay checked={ptData.ptEmpresaSetor === 'Plaskaper'} /> <span className='mx-1'>Plaskaper</span>
                            <CheckboxDisplay checked={ptData.ptEmpresaSetor === 'KAF'} /> <span className='ml-1'>KAF</span>
                        </div>
                    </td>
                </tr>
                 <tr>
                    <td className="!p-0">
                        <div className='flex text-xs'>
                            <div className="flex-1 p-1 border-r border-black"><strong>DATA:</strong> {ptData.ptData}</div>
                            <div className="flex-1 p-1"><strong>HORA:</strong></div>
                        </div>
                    </td>
                </tr>
                 <tr>
                    <td colSpan={2} className='!p-1'>
                        <TextLine label="LOCAL DA ATIVIDADE" value={ptData.ptLocalAtividade} />
                    </td>
                    <td className='!p-1'>
                        <div className='flex text-xs'>
                            <div className="flex-1 p-1 border-r border-black"><strong>INÍCIO:</strong> {ptData.ptHoraInicio}</div>
                            <div className="flex-1 p-1"><strong>FIM:</strong> {ptData.ptHoraFim}</div>
                        </div>
                    </td>
                 </tr>
                 <tr>
                    <td colSpan={3} className='!p-1'><TextLine label="EQUIPAMENTO/ LINHA" value={ptData.ptEquipamentoLinha} /></td>
                 </tr>
                  <tr>
                    <td colSpan={3} className='!p-1'><TextLine label="DESCRIÇÃO DA TAREFA" value={ptData.ptDescricaoTarefa} /></td>
                 </tr>
            </tbody>
        </table>
      </header>

      <main className="print-main text-xs space-y-1">
        {ptChecklistItems.map(section => {
            const checkedItems = section.items.filter(item => checklist[item.id]);
            if (checkedItems.length === 0 && !section.alwaysShow) return null;

            return (
                <Section key={section.id} title={section.title}>
                    <div className={`grid ${section.columns === 2 ? 'grid-cols-2' : 'grid-cols-1'} gap-x-4 p-1 border border-black border-t-0`}>
                       {section.items.map(item => (
                           <div key={item.id} className="flex items-center space-x-1.5">
                               <CheckboxDisplay checked={!!checklist[item.id]} />
                               <span>{item.label}</span>
                           </div>
                       ))}
                    </div>
                </Section>
            );
        })}
        
        <Section title="TRABALHO EM ESPAÇO CONFINADO - AVALIAÇÃO FEITA PELO SESMT">
             <table className="w-full border-collapse info-grid text-xs">
                <thead>
                    <tr>
                        <th className='text-center'>Oxigênio</th>
                        <th className='text-center'>L.E.</th>
                        <th className='text-center'>H²S</th>
                        <th className='text-center'>CO²</th>
                        <th className='text-center w-1/4'>Observação</th>
                        <th className='text-center w-1/6'>Visto</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>{ptData.ptOxigenio}</td>
                        <td>{ptData.ptLE}</td>
                        <td>{ptData.ptH2S}</td>
                        <td>{ptData.ptCO2}</td>
                        <td>{ptData.ptObservacao}</td>
                        <td>{ptData.ptVisto}</td>
                    </tr>
                </tbody>
             </table>
        </Section>
        
        <Section title="Vigia:" className="!mt-2">
            <table className="w-full border-collapse info-grid text-xs">
                 <thead>
                    <tr>
                        <th className='w-1/3'>NOME</th>
                        <th className='w-1/4'>RG/CPF</th>
                        <th className='w-1/4'>FUNÇÃO</th>
                        <th className='w-1/6'>APTO</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                        <td>{ptData.ptVigia?.name}</td>
                        <td>{ptData.ptVigia?.rgCpf}</td>
                        <td>{ptData.ptVigia?.func}</td>
                        <td className='text-center'>
                           <CheckboxDisplay checked={ptData.ptVigia?.apto === 'sim'} /> Sim
                           <CheckboxDisplay checked={ptData.ptVigia?.apto === 'nao'} /> Não
                        </td>
                    </tr>
                 </tbody>
            </table>
        </Section>
         <Section title="Resgatistas:" className="!mt-2">
            <table className="w-full border-collapse info-grid text-xs">
                 <thead>
                    <tr>
                        <th className='w-1/3'>NOME</th>
                        <th className='w-1/4'>RG/CPF</th>
                        <th className='w-1/4'>FUNÇÃO</th>
                        <th className='w-1/4'>EMPRESA</th>
                        <th className='w-1/6'>APTO</th>
                    </tr>
                 </thead>
                 <tbody>
                    {(ptData.ptResgatistas || []).map((m, i) => (
                        <tr key={i}>
                            <td>{m.name}</td>
                            <td>{m.rgCpf}</td>
                            <td>{m.func}</td>
                            <td>{m.empresa}</td>
                             <td className='text-center'>
                               <CheckboxDisplay checked={m.apto === 'sim'} /> Sim
                               <CheckboxDisplay checked={m.apto === 'nao'} /> Não
                            </td>
                        </tr>
                    ))}
                 </tbody>
            </table>
        </Section>

        <Section title="ASSINATURAS" className="!mt-4">
             <div className="grid grid-cols-3 gap-2 pt-16 text-center border border-black border-t-0 text-xs">
                <div className='border-t border-black mx-4'>{ptData.ptGestorArea || 'Gestor da Área de Trabalho'}</div>
                <div className='border-t border-black mx-4'>{ptData.ptResponsavelAtividade || 'Responsável pela atividade'}</div>
                <div className='border-t border-black mx-4'>{ptData.ptSesmt || 'SESMT'}</div>
             </div>
        </Section>
      </main>
    </div>
  );
}
