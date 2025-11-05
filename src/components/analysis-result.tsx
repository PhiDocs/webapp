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
import { AlertTriangle, HardHat, ShieldCheck, Siren, FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AnalysisResultProps {
  analysisData: SafetyAnalysisOutput;
  formData: SafetyFormValues;
}

export function AnalysisResult({ analysisData, formData }: AnalysisResultProps) {
  const { toast } = useToast();

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
      title: 'Risks',
      value: 'risks',
      content: analysisData.risks,
      icon: <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" />,
    },
    {
      title: 'Hazards',
      value: 'hazards',
      content: analysisData.hazards,
      icon: <Siren className="mr-2 h-5 w-5 text-red-500" />,
    },
    {
      title: 'Preventive Measures',
      value: 'preventiveMeasures',
      content: analysisData.preventiveMeasures,
      icon: <ShieldCheck className="mr-2 h-5 w-5 text-green-500" />,
    },
    {
      title: 'EPI Recommendations',
      value: 'epiRecommendations',
      content: analysisData.epiRecommendations,
      icon: <HardHat className="mr-2 h-5 w-5 text-blue-500" />,
    },
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI-Generated Safety Analysis</CardTitle>
        <CardDescription>
          Here is the analysis based on the activity you described. Review the
          details before generating the final document.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={['risks', 'hazards', 'preventiveMeasures', 'epiRecommendations']} className="w-full">
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
      <CardFooter>
        <Button onClick={handleGeneratePdf} className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
          <FileDown className="mr-2 h-4 w-4" />
          Generate & Download PDF
        </Button>
      </CardFooter>
    </Card>
  );
}
