'use client';

import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { Logo } from '@/components/icons/logo';

interface PrintPreviewProps {
    formData: SafetyFormValues;
    analysisData: SafetyAnalysisOutput | null;
}

export function PrintPreview({ formData, analysisData }: PrintPreviewProps) {
    return <PrintPreviewContent formData={formData} analysisData={analysisData} />;
}

export function PrintPreviewContent({ formData, analysisData }: PrintPreviewProps) {
  const data = { ...formData, ...analysisData };
  const date = new Date().toLocaleDateString('pt-BR');

  const getShortDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Adjust for timezone offset by using UTC methods
      const utcDate = new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
      return utcDate.toLocaleDateString('pt-BR');
    } catch(e) {
        return 'Data inválida'
    }
  }

  return (
    <div className="print-container">
      <header className="flex items-start justify-between p-8 border-b">
        <div className="flex items-center gap-4">
          {data.companyLogo ? (
            <img src={data.companyLogo} alt="Company Logo" className="h-16 w-auto max-w-48 object-contain" />
          ) : (
            <Logo className="h-12 w-12 text-gray-700" />
          )}
          <div>
               <h1 className="text-xl font-bold text-gray-800">{data.companyName || 'Nome da Empresa'}</h1>
               <p className='text-xs max-w-md'>Serviços a executar: {data.activityDescription || '...'}</p>
          </div>
        </div>
        <div className="text-right flex flex-col gap-2">
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
                <p className='text-sm'>1 a 1</p>
            </div>
          </div>
        </div>
      </header>

      <main className="p-8">
         <section className="mb-4">
          <h3 className="section-title text-center">DADOS DA OBRA</h3>
          <table className="w-full border-collapse border info-grid">
            <tbody>
              <tr>
                <td className="border p-2 w-1/2"><strong className="font-semibold">NOME:</strong><br/>{data.workName || '...'}</td>
                <td className="border p-2 w-1/2"><strong className="font-semibold">ENDEREÇO:</strong><br/>{data.workAddress || '...'}</td>
              </tr>
              <tr>
                <td className="border p-2"><strong className="font-semibold">PREVISÃO DATA INICIO:</strong><br/>{getShortDate(data.startDate)}</td>
                <td className="border p-2"><strong className="font-semibold">PREVISÃO DATA TÉRMINO:</strong><br/>{getShortDate(data.endDate)}</td>
              </tr>
              <tr>
                <td colSpan={2} className="border p-2"><strong className="font-semibold">LOCAL DA OBRA / PAVIMENTO:</strong><br/>{data.workLocationDetails || '...'}</td>
              </tr>
               <tr>
                <td colSpan={2} className="border p-2"><strong className="font-semibold">Descrição da atividade:</strong><br/>{data.activityDescription || '...'}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className="mb-4">
          <h3 className="section-title text-center">RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS</h3>
           <table className="w-full border-collapse border mt-1">
             <thead>
              <tr>
                <th className="border p-2 text-left w-1/3">NOME</th>
                <th className="border p-2 text-left w-1/3">FUNÇÃO</th>
                <th className="border p-2 text-left w-1/3">ASSINATURA</th>
              </tr>
            </thead>
            <tbody>
              {data.responsiblePersons?.map((person, index) => (
                <tr key={index}>
                  <td className="border p-2 h-12">{person.name || '...'}</td>
                  <td className="border p-2">{person.role || '...'}</td>
                  <td className="border p-2"></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {data.teamMembers && (
          <section className="mb-4">
            <h3 className="section-title text-center">EQUIPE DE TRABALHO</h3>
             <table className="w-full border-collapse border mt-1">
              <thead>
                <tr>
                  <th className="border p-2 text-left w-1/4">DATA</th>
                  <th className="border p-2 text-left w-1/4">NOME</th>
                  <th className="border p-2 text-left w-1/4">FUNÇÃO / EMPRESA</th>
                  <th className="border p-2 text-left w-1/4">ASSINATURA</th>
                </tr>
              </thead>
               <tbody>
                  {data.teamMembers.split(',').map((member, index) => (
                    <tr key={index}>
                      <td className="border p-2 h-10"></td>
                      <td className="border p-2">{member.trim()}</td>
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                    </tr>
                  ))}
                  {/* Add empty rows for signature */}
                  {Array.from({ length: Math.max(0, 5 - data.teamMembers.split(',').length) }).map((_, index) => (
                    <tr key={`empty-${index}`}>
                      <td className="border p-2 h-10"></td>
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </section>
        )}
        
        {analysisData?.proceduralSteps && analysisData.proceduralSteps.length > 0 && (
          <section className="mb-4" style={{ pageBreakInside: 'avoid' }}>
            <h3 className="section-title text-center">PROCEDIMENTO OPERACIONAL</h3>
            <table className="w-full border-collapse border mt-1">
              <thead>
                <tr>
                  <th className="border p-2 text-left w-[5%]">ITEM</th>
                  <th className="border p-2 text-left w-[25%]">ATIVIDADES (Com suas respectivas etapas/passos)</th>
                  <th className="border p-2 text-left w-[25%]">RISCOS POTENCIAIS (O que poderá sair errado)</th>
                  <th className="border p-2 text-left w-[45%]">MEDIDAS PREVENTIVAS / RECOMENDAÇÕES DE SEGURANÇA (Evitar o acidente ou minimizar os danos, caso este ocorra)</th>
                </tr>
              </thead>
              <tbody>
                {analysisData.proceduralSteps.map((step, index) => (
                  <tr key={index}>
                    <td className="border p-2 text-center">{step.item}</td>
                    <td className="border p-2 whitespace-pre-wrap">{step.activity}</td>
                    <td className="border p-2 whitespace-pre-wrap">{step.potentialRisks}</td>
                    <td className="border p-2 whitespace-pre-wrap">{step.preventiveMeasures}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}


        <section className="mt-16">
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
      </main>

      <footer className="p-4 mt-auto text-center text-xs text-gray-500 border-t">
        <p>Organizar e arquivar este documento e suas revisões / Deve ser disponibilizado a qualquer tempo para a Inspeção do Trabalho - MTE</p>
        <p>&copy; {new Date().getFullYear()} {data.companyName}</p>
      </footer>
    </div>
  );
}
