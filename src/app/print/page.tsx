'use client';

import { useEffect, useState } from 'react';
import './print-layout.css';
import type { SafetyFormValues } from '@/lib/types';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import { PrintPreviewContent } from '@/components/print-preview';


type PrintData = SafetyFormValues & Partial<SafetyAnalysisOutput> & {
  date: string;
};

export default function PrintPage() {
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // This component is now only for rendering on the server for PDF generation.
    // The client-side logic has been removed.
    // We check for a query param to see if this is a direct render request.
    const urlParams = new URLSearchParams(window.location.search);
    const dataParam = urlParams.get('data');
    if (dataParam) {
      try {
        const parsedData = JSON.parse(decodeURIComponent(dataParam));
        setData(parsedData);
      } catch (e) {
        console.error("Failed to parse print data from URL", e);
        setError("Invalid data provided for printing.");
      }
    } else {
        setError("No data provided for printing.");
    }
  }, []);

  if (error) {
     return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-lg text-red-600">{error}</p>
        </div>
      </div>
    );
  }

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
    <html lang="en">
      <head>
        <title>{`${data.documentType} - ${data.companyName} - ${data.date}`}</title>
         <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
            body { 
                font-family: 'Inter', sans-serif;
                -webkit-font-smoothing: antialiased;
                -moz-osx-font-smoothing: grayscale;
            }
            .print-bg { background: white; padding: 0; }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
        ` }} />
      </head>
      <body className="print-body">
        <div className="print-bg">
            <PrintPreviewContent formData={data} analysisData={data} />
        </div>
      </body>
    </html>
  );
}
