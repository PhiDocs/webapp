'use client';

import { useState, useEffect } from 'react';
import type { SafetyAnalysisOutput } from '@/ai/flows/generate-safety-analysis';
import type { ProtectiveEquipmentOutput } from '@/ai/flows/recommend-protective-equipment';
import type { SafetyFormValues, Work, Employee, Company } from '@/lib/types';
import { getSafetyAnalysis, getProtectiveEquipment } from '@/server/ai-actions';
import { notifyN8n } from '@/server/n8n-actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Header } from '@/components/header';
import { FormPanel } from '@/components/form-panel';
import { PreviewPanel } from '@/components/preview-panel';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES, N8N_EVENTS, PT_FIT_STATUS, SIGNATURE_TYPES } from '@/lib/constants';
import { PrintPreview } from '@/components/print-preview';
import { generatePdfOnClient } from '@/lib/pdf/generator';
import { UserNav } from '@/components/auth/user-nav';
import { useSession } from '@/components/auth/session-provider';
import { getWorks } from '@/server/work-actions';
import { getEmployees } from '@/server/employee-actions';
import { getCompanyById } from '@/server/company-actions';

export default function ReportsPage() {
  const { user } = useSession();
  const [analysis, setAnalysis] = useState<SafetyAnalysisOutput | null>(null);
  const [equipment, setEquipment] = useState<ProtectiveEquipmentOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'form' | 'preview'>('form');

  const [company, setCompany] = useState<Company | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const { toast } = useToast();

  const form = useForm<SafetyFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      documentType: DOCUMENT_TYPES.APR,
      workId: '',
      workName: '',
      workAddress: '',
      startDate: '',
      endDate: '',
      workLocationDetails: '',
      activityDescription: ptBr.defaultValues.activityDescription,
      responsiblePersons: [
        { employeeId: '', name: '', role: '', signatureType: SIGNATURE_TYPES.TYPED, signatureData: '' }
      ],
      teamMembers: [],
      pt: {
        ptLocalAtividade: ptBr.defaultValues.ptLocation,
        ptEquipamentoLinha: ptBr.defaultValues.ptEquipment,
        ptData: new Date().toISOString().split('T')[0],
        ptHoraInicio: '09:00',
        ptHoraFim: '17:00',
        ptDescricaoTarefa: ptBr.defaultValues.ptTaskDescription,
        ptChecklist: {
          trabalho_frio: true,
          eletricidade: true,
          ferramentas_manuais: true,
          parar_drenar: true,
          bloqueio_eqptos: true,
        },
        ptEnableEspacoConfinado: false,
        ptEnableVigia: false,
        ptEnableResgatistas: false,
        ptOxigenio: '',
        ptLE: '',
        ptH2S: '',
        ptCO2: '',
        ptObservacao: '',
        ptVisto: '',
        ptColaboradores: [
            { name: ptBr.defaultValues.collaborator1Name, rgCpf: ptBr.defaultValues.collaborator1Rg, func: ptBr.defaultValues.collaborator1Func, empresa: ptBr.defaultValues.collaborator1Company, apto: PT_FIT_STATUS.YES }
        ],
        ptVigias: [],
        ptResgatistas: [],
        ptGestorArea: {name: ptBr.defaultValues.areaManagerName, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.areaManagerName},
        ptResponsavelAtividade: {name: ptBr.defaultValues.activityResponsibleName, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.activityResponsibleName},
        ptSesmt: {name: ptBr.defaultValues.sesmtName, signatureType: SIGNATURE_TYPES.TYPED, signatureData: ptBr.defaultValues.sesmtName},
      },
    },
    mode: 'onChange',
  });

  const liveFormData = form.watch();
  
  useEffect(() => {
    if (user?.companyId) {
      const fetchData = async () => {
        setIsDataLoading(true);
        try {
          const [companyResult, worksResult, employeesResult] = await Promise.all([
            getCompanyById(user.companyId!),
            getWorks(user.companyId!),
            getEmployees(user.companyId!)
          ]);
          if (companyResult.success && companyResult.data) {
            setCompany(companyResult.data);
          } else {
            toast({ variant: 'destructive', title: "Erro ao buscar dados da empresa", description: companyResult.error });
          }
          if (worksResult.success && worksResult.data) {
            setWorks(worksResult.data);
          } else {
            toast({ variant: 'destructive', title: "Erro ao buscar obras", description: worksResult.error });
          }
          if (employeesResult.success && employeesResult.data) {
            setEmployees(employeesResult.data);
          } else {
            toast({ variant: 'destructive', title: "Erro ao buscar funcionários", description: employeesResult.error });
          }
        } catch (error: any) {
          toast({ variant: 'destructive', title: "Erro ao carregar dados da empresa", description: error.message });
        } finally {
          setIsDataLoading(false);
        }
      };
      fetchData();
    } else if (user && !user.companyId) {
      toast({ variant: 'destructive', title: "Usuário sem empresa", description: "Sua conta não está associada a uma empresa." });
      setIsDataLoading(false);
    }
  }, [user, toast]);


  const handleFormSubmit = async (data: SafetyFormValues) => {
    if (data.documentType !== DOCUMENT_TYPES.APR) return;

    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    setEquipment(null);

    try {
      const [analysisResult, equipmentResult] = await Promise.all([
          getSafetyAnalysis({ activityDescription: data.activityDescription! }),
          getProtectiveEquipment({ activityDescription: data.activityDescription! })
      ]);

      if (analysisResult.error || !analysisResult.data) {
        const errorMsg = analysisResult.error || ptBr.validations.safetyAnalysisFailed;
        setError(errorMsg);
        toast({
            variant: 'destructive',
            title: ptBr.toasts.errors.fetchAnalysis,
            description: errorMsg,
        });
      } else {
        setAnalysis(analysisResult.data);
      }
      
      if (equipmentResult.error || !equipmentResult.data) {
          const errorMsg = equipmentResult.error || ptBr.validations.equipmentRecommendationFailed;
          setError(errorMsg);
          toast({
              variant: 'destructive',
              title: ptBr.toasts.errors.fetchEpi,
              description: errorMsg,
          });
      } else {
          setEquipment(equipmentResult.data);
      }
    } catch (e: any) {
        const errorMsg = e.message || ptBr.errors.unexpectedError;
        setError(errorMsg);
        toast({
            variant: 'destructive',
            title: ptBr.toasts.errors.fetchAnalysis,
            description: errorMsg,
        });
    }

    setIsLoading(false);
    setMobileView('preview');
  };

  const handleNewReport = () => {
    setAnalysis(null);
    setEquipment(null);
    setError(null);
    form.reset();
  };

  const handlePrint = () => {
    setIsPrinting(true);
    try {
        const formData = form.getValues();
        const payload = {
            event: N8N_EVENTS.PDF_GENERATED,
            documentType: formData.documentType,
            companyData: company,
            formData: formData,
            analysisData: analysis,
            equipmentData: equipment,
        };
        // Notifica o n8n usando a URL de produção da empresa
        if (company?.n8nProductionUrl) {
            notifyN8n(payload, company.n8nProductionUrl);
        }
        generatePdfOnClient();
    } catch (error) {
        console.error("Failed to notify n8n:", error);
    }
    setTimeout(() => setIsPrinting(false), 2000);
  };

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col no-print">
        <Header
          mobileView={mobileView}
          setMobileView={setMobileView}
          onGeneratePdf={handlePrint}
          isDownloading={isPrinting}
          isAprReady={!!(liveFormData.documentType === DOCUMENT_TYPES.APR && analysis)}
          isPtReady={liveFormData.documentType === DOCUMENT_TYPES.PT}
        >
          <UserNav />
        </Header>

        <main className="flex-grow grid grid-cols-1 xl:grid-cols-2 h-[calc(100vh-65px)]">
          <div className="h-full no-print">
              <FormPanel
                  form={form}
                  onNewReport={handleNewReport}
                  onSubmit={handleFormSubmit}
                  isLoading={isLoading}
                  mobileView={mobileView}
                  works={works}
                  employees={employees}
                  isDataLoading={isDataLoading}
              />
          </div>
          <div className="h-full no-print bg-muted">
              <PreviewPanel
                  isLoading={isLoading}
                  error={error}
                  liveFormData={liveFormData}
                  analysisData={analysis}
                  equipmentData={equipment}
                  company={company}
                  mobileView={mobileView}
                  isDownloading={isPrinting}
                  onGeneratePdf={handlePrint}
                  isAprReady={!!(liveFormData.documentType === DOCUMENT_TYPES.APR && analysis)}
                  isPtReady={liveFormData.documentType === DOCUMENT_TYPES.PT}
              />
          </div>
        </main>
      </div>
      <div className="print-only">
        <PrintPreview
          formData={liveFormData}
          analysisData={analysis}
          equipmentData={equipment}
          company={company}
        />
      </div>
    </>
  );
}
