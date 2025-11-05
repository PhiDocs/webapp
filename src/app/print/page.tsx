'use client';

import { useEffect, useState } from 'react';
import './print-layout.css';
import type { SafetyFormValues, ResponsiblePerson } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { PrintPreviewContent } from '@/components/print-preview';


type PrintData = SafetyFormValues & Partial<SafetyAnalysisOutput> & {
  date: string;
};

export default function PrintPage() {
  const [data, setData] = useState<PrintData | null>(null);

  useEffect(() => {
    const storedData = sessionStorage.getItem('printData');
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        // Ensure responsiblePersons is an array
        if (parsedData.responsibleName && !parsedData.responsiblePersons) {
            parsedData.responsiblePersons = [{name: parsedData.responsibleName, role: parsedData.responsibleRole}]
        }
        setData(parsedData);
      } catch (e) {
        console.error("Failed to parse print data", e);
      }
    }
  }, []);

  useEffect(() => {
    if (data) {
      document.title = `${data.documentType} - ${data.companyName} - ${data.date}`;
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-lg">Loading document for printing...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="print-bg">
        <PrintPreviewContent formData={data} analysisData={data} />
    </div>
  );
}
