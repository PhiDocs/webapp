'use client';

import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { SafetyFormValues } from '@/lib/types';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { AlertTriangle, HardHat, ShieldCheck, Siren, FileDown, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Logo } from './icons/logo';

interface AnalysisResultProps {
  analysisData: SafetyAnalysisOutput;
  formData: SafetyFormValues;
}

export function AnalysisResult({ analysisData, formData }: AnalysisResultProps) {
  const { toast } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleGeneratePdf = () => {
    try {
      const printData = {
        ...formData,
        ...analysisData,
        date: new Date().toLocaleDateString('pt-BR'),
      };
      sessionStorage.setItem('printData', JSON.stringify(printData));
      window.open('/print', '_blank');
    } catch (error) {
      console.error('Failed to prepare data for PDF generation:', error);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Error',
        description:
          'Could not prepare data for PDF generation. Please check console for details.',
      });
    }
  };

  const sections = [
    {
      title: 'Riscos',
      value: 'risks',
      content: analysisData.risks,
      icon: <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />,
    },
    {
      title: 'Perigos',
      value: 'hazards',
      content: analysisData.hazards,
      icon: <Siren className="mr-2 h-5 w-5 text-red-500" />,
    },
    {
      title: 'Medidas Preventivas',
      value: 'preventiveMeasures',
      content: analysisData.preventiveMeasures,
      icon: <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />,
    },
    {
      title: 'Recomendações de EPI',
      value: 'epiRecommendations',
      content: analysisData.epiRecommendations,
      icon: <HardHat className="mr-2 h-5 w-5 text-blue-500" />,
    },
  ];

   const getShortDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    // add a day to date to fix timezone issue
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('pt-BR');
  }

  const PrintPreview = () => (
    <div className="bg-gray-200 p-4 rounded-lg">
      <div className="bg-white p-6 rounded shadow-lg text-sm text-gray-800">
        {/* Header */}
        <header className="flex items-start justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            {formData.companyLogo ? (
              <img src={formData.companyLogo} alt="Company Logo" className="h-12 w-auto max-w-40 object-contain" />
            ) : (
              <Logo className="h-10 w-10 text-gray-700" />
            )}
            <div>
              <h1 className="font-bold text-lg">{formData.companyName}</h1>
              <p className="text-xs max-w-xs">{analysisData.risks}</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
             <div className="flex gap-2">
              <div className="border p-1 text-center">
                <p className="text-xs font-bold">DATA</p>
                <p>{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
               <div className="border p-1 text-center">
                <p className="text-xs font-bold">APR Nº</p>
                <p>&nbsp;</p>
              </div>
            </div>
          </div>
        </header>

        {/* Work Data */}
        <section className="my-4">
          <h2 className="font-bold text-center bg-gray-200 py-1">DADOS DA OBRA</h2>
           <table className="w-full border-collapse border mt-1">
              <tbody>
                <tr>
                  <td className="border p-2"><strong className="font-semibold">NOME:</strong> {formData.workName}</td>
                  <td className="border p-2"><strong className="font-semibold">ENDEREÇO:</strong> {formData.workAddress}</td>
                </tr>
                <tr>
                  <td className="border p-2"><strong className="font-semibold">PREVISÃO DATA INICIO:</strong> {getShortDate(formData.startDate)}</td>
                  <td className="border p-2"><strong className="font-semibold">PREVISÃO DATA TÉRMINO:</strong> {getShortDate(formData.endDate)}</td>
                </tr>
                <tr>
                  <td colSpan={2} className="border p-2"><strong className="font-semibold">LOCAL DA OBRA / PAVIMENTO:</strong> {formData.workLocationDetails}</td>
                </tr>
                 <tr>
                  <td colSpan={2} className="border p-2"><strong className="font-semibold">Descrição da atividade:</strong> {formData.activityDescription}</td>
                </tr>
              </tbody>
            </table>
        </section>

         {/* Responsible */}
        <section className="my-4">
          <h2 className="font-bold text-center bg-gray-200 py-1">RESPONSÁVEL PELO ACOMPANHAMENTO DOS SERVIÇOS</h2>
           <table className="w-full border-collapse border mt-1">
               <thead>
                <tr>
                  <th className="border p-2 text-left">NOME</th>
                  <th className="border p-2 text-left">FUNÇÃO</th>
                  <th className="border p-2 text-left">ASSINATURA</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border p-2">{formData.responsibleName}</td>
                  <td className="border p-2">{formData.responsibleRole}</td>
                  <td className="border p-2"></td>
                </tr>
              </tbody>
            </table>
        </section>

         {/* Team */}
        {formData.teamMembers && (
          <section className="my-4">
            <h2 className="font-bold text-center bg-gray-200 py-1">EQUIPE DE TRABALHO</h2>
            <table className="w-full border-collapse border mt-1">
              <thead>
                <tr>
                  <th className="border p-2 text-left">DATA</th>
                  <th className="border p-2 text-left">NOME</th>
                  <th className="border p-2 text-left">FUNÇÃO / EMPRESA</th>
                  <th className="border p-2 text-left">ASSINATURA</th>
                </tr>
              </thead>
               <tbody>
                  {formData.teamMembers.split(',').map((member, index) => (
                    <tr key={index}>
                      <td className="border p-2"></td>
                      <td className="border p-2">{member.trim()}</td>
                      <td className="border p-2"></td>
                      <td className="border p-2"></td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );


  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Análise de Segurança Gerada por IA</CardTitle>
        <CardDescription>
          Esta é a análise baseada na atividade que você descreveu. Revise os detalhes antes de gerar o documento final.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['risks', 'hazards']} className="w-full">
          {sections.map(section => (
            <AccordionItem value={section.value} key={section.value}>
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center">
                  {section.icon}
                  {section.title}
                </div>
              </AccordionTrigger>
              <AccordionContent className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground whitespace-pre-wrap px-2">
                {section.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter className="flex-col sm:flex-row gap-2">
         <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                    <Eye className="mr-2 h-4 w-4" />
                    Pré-visualizar PDF
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Pré-visualização do Documento</DialogTitle>
                </DialogHeader>
                <div className="flex-grow overflow-auto">
                   <PrintPreview />
                </div>
                 <DialogFooter>
                    <Button onClick={() => setIsPreviewOpen(false)}>Fechar</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Button onClick={handleGeneratePdf} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <FileDown className="mr-2 h-4 w-4" />
          Gerar & Baixar PDF
        </Button>
      </CardFooter>
    </Card>
  );
}
