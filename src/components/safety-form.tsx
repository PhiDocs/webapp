'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import type { SafetyFormValues, Work, Employee, ResponsibleContact, ResponsibleContactInput, AprPtProject } from '@/lib/types';
import type { ProtectiveEquipmentOutput } from '@/server/ai-actions';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from "@/lib/utils";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  FileText,
  UserCheck,
  PlusCircle,
  Trash2,
  Briefcase,
  HardHat,
  Users,
  ShieldCheck,
  Pencil,
  Check,
  Loader2,
  CheckCircle2,
  Lightbulb,
} from 'lucide-react';
import { PTForm } from './pt-form';
import { PersonPicker, type PersonOption, type PickedPerson } from './person-picker';
import { CompanyStep, type EmpresaOpcao } from './company-step';
import { AprReview, type Pendencia } from './apr-review';
import { DocumentActivityPicker } from './document-activity-picker';
import { PtReview } from './pt-review';
import { pendenciasDaPt } from '@/lib/pt-rules';
import { AnalysisStepCard, type ItensDaEtapa, type ListaDaEtapa } from './analysis-step-card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES, PT_FIT_STATUS } from '@/lib/constants';
import { Skeleton } from './ui/skeleton';

interface SafetyFormProps {
  form: ReturnType<typeof useForm<SafetyFormValues>>;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  works: Work[];
  employees: Employee[];
  responsibleContacts?: ResponsibleContact[];
  onSaveResponsibleContact?: (data: ResponsibleContactInput) => Promise<boolean>;
  /** EPI e EPC vem da mesma geracao da analise e seguem para o PDF. */
  equipment?: ProtectiveEquipmentOutput | null;
  onEquipmentChange?: (next: ProtectiveEquipmentOutput) => void;
  /** Etapa 1: a "empresa da atividade" e o projeto APR/PT, que carrega razao
      social, CNPJ e logo do cliente. */
  projects?: AprPtProject[];
  selectedProjectId?: string;
  onSelectProject?: (projectId: string) => void;
  onCreateProject?: () => void;
  /** Empresas do projeto selecionado. Escolher uma preenche os dados do documento. */
  onSelectCompany?: (workId: string) => void;
  onCreateCompany?: () => void;
  /** Descricoes de atividades ja usadas, oferecidas como atalho na etapa 2. */
  recentActivities?: string[];
  /** Locais ja usados nesta empresa, oferecidos para reuso na etapa de contexto. */
  knownLocations?: string[];
  /** Atividades parecidas ja usadas antes. Referencia, nunca copia automatica. */
  similarActivities?: string[];
  /** Acoes da etapa de finalizacao, ja existentes na pagina. */
  onVisualizarDocumento?: () => void;
  onFinalizar?: () => Promise<boolean> | void;
  isFinalizando?: boolean;
  onEnviarAssinatura?: () => void;
  isEnviando?: boolean;
  isDataLoading: boolean;
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-1/3" />
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

/**
 * Mostra o conteudo direto na pagina durante o assistente, e dentro de uma
 * janela quando a pessoa clica em "Editar" na tela de revisao.
 */
function EnvoltorioEtapa({
  aberto,
  titulo,
  onFechar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  if (!aberto) return <>{children}</>;

  return (
    <Dialog open onOpenChange={(estaAberto) => { if (!estaAberto) onFechar(); }}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-h3">Editar: {titulo}</DialogTitle>
        </DialogHeader>

        {children}

        <div className="flex justify-end border-t border-[#cfcbc0] pt-4">
          <Button
            type="button"
            className="rounded-md bg-[#7a1f1f] text-white hover:bg-[#5f1818]"
            onClick={onFechar}
          >
            Concluir e voltar a revisao
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PT_STEPS = [
  { title: 'Empresa', description: 'Para quem e a permissao.' },
  { title: 'Atividade', description: 'Local, equipamento e horario.' },
  { title: 'Condicoes', description: 'Tipo de trabalho e precaucoes.' },
  { title: 'Participantes', description: 'Quem executa e quem vigia.' },
  { title: 'Assinaturas', description: 'Quem libera a atividade.' },
  { title: 'Revisao', description: 'Confira e emita a PT.' },
] as const;

const APR_STEPS = [
  { title: 'Empresa', description: 'Para quem e a atividade.' },
  { title: 'Atividade', description: 'O que sera realizado.' },
  { title: 'Contexto', description: 'Local, periodo e detalhes.' },
  { title: 'Participantes', description: 'Quem executa e quem responde.' },
  { title: 'Analise', description: 'Riscos, medidas, EPI e EPC.' },
  { title: 'Revisao', description: 'Confira antes de gerar.' },
  { title: 'Finalizacao', description: 'Rascunho, PDF ou assinatura.' },
] as const;

export function SafetyForm({
  form,
  onSubmit,
  isLoading,
  works,
  employees,
  responsibleContacts = [],
  onSaveResponsibleContact,
  equipment,
  onEquipmentChange,
  projects = [],
  selectedProjectId = '',
  onSelectProject,
  onCreateProject,
  onSelectCompany,
  onCreateCompany,
  recentActivities = [],
  knownLocations = [],
  similarActivities = [],
  onVisualizarDocumento,
  onFinalizar,
  isFinalizando = false,
  onEnviarAssinatura,
  isEnviando = false,
  isDataLoading,
}: SafetyFormProps) {

  const {
    fields: responsibleFields,
    append: appendResponsible,
    remove: removeResponsible,
  } = useFieldArray({
    control: form.control,
    name: 'responsiblePersons',
  });

  const {
    fields: teamMemberFields,
    append: appendTeamMember,
    remove: removeTeamMember,
  } = useFieldArray({
    control: form.control,
    name: 'teamMembers',
  });

  const {
    fields: analysisStepFields,
    append: appendAnalysisStep,
    remove: removeAnalysisStep,
  } = useFieldArray({
    control: form.control,
    name: 'analysisSteps',
  });

  const documentType = useWatch({ control: form.control, name: 'documentType' });
  const workId = useWatch({ control: form.control, name: 'workId' });
  const workName = useWatch({ control: form.control, name: 'workName' });
  const startDate = useWatch({ control: form.control, name: 'startDate' });
  const endDate = useWatch({ control: form.control, name: 'endDate' });
  const activityDescription = useWatch({ control: form.control, name: 'activityDescription' });
  const analysisSteps = useWatch({ control: form.control, name: 'analysisSteps' });
  const teamMembers = useWatch({ control: form.control, name: 'teamMembers' });
  const responsiblePersons = useWatch({ control: form.control, name: 'responsiblePersons' });
  const ptLocal = useWatch({ control: form.control, name: 'pt.ptLocalAtividade' });
  const ptColaboradores = useWatch({ control: form.control, name: 'pt.ptColaboradores' });
  const ptResponsaveis = useWatch({ control: form.control, name: 'pt.ptResponsaveis' });
  const ptData = useWatch({ control: form.control, name: 'pt.ptData' });
  const [isEditingWorkData, setIsEditingWorkData] = useState(false);
  const [activeAprStep, setActiveAprStep] = useState(0);
  // Nenhuma etapa nasce em edicao: a pessoa confere e so abre a que quiser mudar.
  const [editingAnalysisStep, setEditingAnalysisStep] = useState<number | null>(null);
  // Editar pela revisao abre a etapa numa janela, sem tirar a pessoa do lugar
  // nem obriga-la a percorrer as etapas seguintes de novo.
  const [editingSection, setEditingSection] = useState<number | null>(null);
  // A IA nao fecha APR sozinha: a revisao so libera a emissao apos confirmacao.
  const [analiseRevisada, setAnaliseRevisada] = useState(false);
  const [foiFinalizada, setFoiFinalizada] = useState(false);
  // Sem local conhecido, o campo ja nasce em modo de cadastro.
  const [cadastrandoLocal, setCadastrandoLocal] = useState(false);
  const [isSavingResponsibleContact, setIsSavingResponsibleContact] = useState(false);
  const [epiDraft, setEpiDraft] = useState('');
  const [epcDraft, setEpcDraft] = useState('');

  const patchEquipment = (patch: Partial<ProtectiveEquipmentOutput>) => {
    if (!equipment || !onEquipmentChange) return;
    onEquipmentChange({ ...equipment, ...patch });
  };

  const todayDate = new Date().toISOString().split('T')[0];

  const employeeOptions: PersonOption[] = (employees || []).map((employee) => ({
    id: employee.id,
    kind: 'employee' as const,
    name: `${employee.firstName} ${employee.lastName}`.trim(),
    role: employee.roleName || '',
    email: employee.email || '',
    phone: employee.phone || '',
    document: employee.cpf || '',
    organization: employee.subcontractorName || '',
  }));

  // Responsaveis salvos aparecem primeiro; um funcionario que ja esta salvo como
  // responsavel nao e listado duas vezes.
  const responsibleOptions: PersonOption[] = (() => {
    const contacts: PersonOption[] = responsibleContacts
      .filter((contact) => contact.isActive)
      .map((contact) => ({
        id: contact.id,
        kind: 'contact' as const,
        name: contact.name,
        role: contact.role,
        email: contact.email || '',
        phone: contact.phone || '',
      }));
    const seen = new Set(contacts.map((contact) => contact.name.trim().toLowerCase()));
    return [
      ...contacts,
      ...employeeOptions.filter((option) => !seen.has(option.name.trim().toLowerCase())),
    ];
  })();

  const hasAnyTeamMemberValue = (member?: {
    employeeId?: string;
    date?: string;
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    signatureData?: string;
  }) => Boolean(
    member?.employeeId
    || member?.date
    || member?.name
    || member?.role
    || member?.email
    || member?.phone
    || member?.signatureData
  );

  const hasAnyResponsibleValue = (person?: {
    employeeId?: string;
    name?: string;
    role?: string;
    email?: string;
    phone?: string;
    signatureData?: string;
  }) => Boolean(
    person?.employeeId
    || person?.name
    || person?.role
    || person?.email
    || person?.phone
    || person?.signatureData
  );

  useEffect(() => {
    const cleanedResponsibles = (responsiblePersons || []).filter(hasAnyResponsibleValue);
    if (cleanedResponsibles.length !== (responsiblePersons || []).length) {
      form.setValue('responsiblePersons', cleanedResponsibles, { shouldDirty: false, shouldValidate: false });
    }
  }, [form, responsiblePersons]);

  useEffect(() => {
    const cleanedTeamMembers = (teamMembers || []).filter(hasAnyTeamMemberValue);
    if (cleanedTeamMembers.length !== (teamMembers || []).length) {
      form.setValue('teamMembers', cleanedTeamMembers, { shouldDirty: false, shouldValidate: false });
    }
  }, [form, teamMembers]);


  const hasGeneratedAnalysis = Array.isArray(analysisSteps)
    && analysisSteps.some((step) => (step?.activity || step?.potentialRisks || step?.preventiveMeasures));
  const canFillActivity = Boolean(workId && workName && startDate && endDate);
  const canGenerateAnalysis = Boolean(activityDescription?.trim().length);
  const selectedProject = projects.find((project) => project.id === selectedProjectId) || null;

  // As empresas do projeto vem da tabela de obras, que ja guarda CNPJ, razao
  // social, logo e endereco. Nao ha entidade separada para empresa.
  const empresasDoProjeto: EmpresaOpcao[] = (works || [])
    .filter((obra) => !selectedProjectId || obra.projeto_id === selectedProjectId)
    .map((obra) => ({
      id: obra.id,
      nome: obra.name,
      razaoSocial: obra.razao_social || obra.nome_fantasia || obra.name,
      cnpj: obra.cnpj,
      logoUrl: obra.logo_empresa_url,
      detalhe: obra.address || obra.cidade || null,
    }));

  const empresaSelecionada = empresasDoProjeto.find((empresa) => empresa.id === workId) || null;
  const companyLabel = empresaSelecionada
    ? [empresaSelecionada.razaoSocial, empresaSelecionada.cnpj].filter(Boolean).join(' \u00b7 ')
    : '';
  const hasActivityDescription = (activityDescription || '').trim().length >= 10;

  // Cada etapa so libera a proxima quando tem o minimo para a seguinte fazer sentido.
  const ehPT = documentType === DOCUMENT_TYPES.PT;
  const ETAPAS = ehPT ? PT_STEPS : APR_STEPS;

  // A PT tem outro caminho: empresa, atividade, condicoes, participantes,
  // assinaturas e revisao.
  const ptStepReady = [
    Boolean(selectedProjectId && workId),
    Boolean(ptLocal?.trim() && ptData?.trim()),
    true,
    true,
    true,
    true,
  ];


  const aprStepReady = [
    Boolean(selectedProjectId && workId),
    hasActivityDescription,
    canFillActivity,
    true,
    hasGeneratedAnalysis,
    analiseRevisada,
    true,
  ];
  const canAdvanceAprStep = (ehPT ? ptStepReady : aprStepReady)[activeAprStep] ?? true;
  const passoVisivel = editingSection ?? activeAprStep;

  // Uma lista curta do que falta, cada item apontando para a etapa que resolve.
  // A PT tem regras proprias, num modulo separado e auditavel.
  const pendenciasPt = ehPT
    ? [
        ...(!selectedProjectId || !workId
          ? [{ texto: 'Selecione a empresa da permissao.', passo: 0 }]
          : []),
        ...pendenciasDaPt(form.getValues('pt') || {}),
      ]
    : [];

  const pendencias: Pendencia[] = [];
  if (!selectedProjectId) {
    pendencias.push({ texto: 'Selecione o projeto do documento.', passo: 0 });
  } else if (!workId) {
    pendencias.push({ texto: 'Selecione a empresa da atividade.', passo: 0 });
  }
  if (!hasActivityDescription) {
    pendencias.push({ texto: 'Descreva a atividade com pelo menos 10 caracteres.', passo: 1 });
  }
  if (!startDate || !endDate) {
    pendencias.push({ texto: 'Informe as datas de inicio e termino.', passo: 2 });
  } else if (new Date(endDate) < new Date(startDate)) {
    pendencias.push({ texto: 'A data de termino nao pode ser anterior a de inicio.', passo: 2 });
  }

  const responsaveisComNome = (responsiblePersons || []).filter((pessoa) => pessoa?.name?.trim());
  if (responsaveisComNome.length === 0) {
    pendencias.push({ texto: 'Adicione pelo menos um responsavel pela atividade.', passo: 3 });
  } else {
    const semFuncao = responsaveisComNome.filter((pessoa) => !pessoa?.role?.trim()).length;
    if (semFuncao > 0) {
      pendencias.push({ texto: `${semFuncao} responsavel(is) sem funcao informada.`, passo: 3 });
    }
  }

  // Cada forma de assinatura cobra o contato dela.
  const pessoasDoDocumento = [...(teamMembers || []), ...(responsiblePersons || [])]
    .filter((pessoa) => pessoa?.name?.trim());
  const metodoDaPessoa = (pessoa: { signatureMethod?: string; useAssinafy?: boolean }) =>
    pessoa.signatureMethod || (pessoa.useAssinafy === false ? 'manual' : 'email');

  const semEmailParaAssinar = pessoasDoDocumento
    .filter((pessoa) => metodoDaPessoa(pessoa) === 'email' && !pessoa?.email?.trim()).length;
  if (semEmailParaAssinar > 0) {
    pendencias.push({ texto: `${semEmailParaAssinar} pessoa(s) sem e-mail para assinatura.`, passo: 3 });
  }

  const semTelefoneParaAssinar = pessoasDoDocumento
    .filter((pessoa) => metodoDaPessoa(pessoa) === 'whatsapp' && !pessoa?.phone?.trim()).length;
  if (semTelefoneParaAssinar > 0) {
    pendencias.push({ texto: `${semTelefoneParaAssinar} pessoa(s) sem telefone para WhatsApp.`, passo: 3 });
  }

  const semDataDeParticipacao = (teamMembers || [])
    .filter((membro) => membro?.name?.trim() && !membro?.date).length;
  if (semDataDeParticipacao > 0) {
    pendencias.push({ texto: `${semDataDeParticipacao} membro(s) da equipe sem data de participacao.`, passo: 3 });
  }

  if (!hasGeneratedAnalysis) {
    pendencias.push({ texto: 'Gere a analise de risco da atividade.', passo: 4 });
  }

  // Etapas antigas so tem os dois campos de texto: cada linha vira um item.
  const paraItens = (valor: unknown): string[] => {
    if (Array.isArray(valor)) return valor.map((item) => String(item).trim()).filter(Boolean);
    if (typeof valor === 'string') return valor.split('\n').map((linha) => linha.trim()).filter(Boolean);
    return [];
  };

  const itensDaEtapa = (indice: number): ItensDaEtapa => {
    const etapa = analysisSteps?.[indice] as Record<string, unknown> | undefined;
    const riscos = paraItens(etapa?.risks);
    const medidas = paraItens(etapa?.measures);
    return {
      hazards: paraItens(etapa?.hazards),
      risks: riscos.length ? riscos : paraItens(etapa?.potentialRisks),
      consequences: paraItens(etapa?.consequences),
      measures: medidas.length ? medidas : paraItens(etapa?.preventiveMeasures),
      epis: paraItens(etapa?.epis),
      epcs: paraItens(etapa?.epcs),
    };
  };

  // Os dois campos de texto seguem sincronizados com as listas: e deles que o
  // PDF e os documentos ja emitidos dependem.
  const gravarLista = (indice: number, campo: ListaDaEtapa, itens: string[]) => {
    const atual = { ...itensDaEtapa(indice), [campo]: itens };
    form.setValue(`analysisSteps.${indice}.${campo}` as never, itens as never, { shouldDirty: true });
    form.setValue(
      `analysisSteps.${indice}.potentialRisks` as never,
      [
        ...atual.hazards.map((item) => `Perigo: ${item}`),
        ...atual.risks,
        ...atual.consequences.map((item) => `Consequencia: ${item}`),
      ].join('\n') as never,
      { shouldDirty: true },
    );
    form.setValue(
      `analysisSteps.${indice}.preventiveMeasures` as never,
      [
        ...atual.measures,
        ...(atual.epis.length ? [`EPI: ${atual.epis.join(', ')}`] : []),
        ...(atual.epcs.length ? [`EPC: ${atual.epcs.join(', ')}`] : []),
      ].join('\n') as never,
      { shouldDirty: true },
    );
  };

  const patchPerson = (
    field: 'teamMembers' | 'responsiblePersons',
    index: number,
    patch: Partial<PickedPerson>,
  ) => {
    Object.entries(patch).forEach(([key, value]) => {
      form.setValue(`${field}.${index}.${key}` as never, value as never, { shouldDirty: true });
    });
  };

  // A PT guarda RG/CPF, empresa e "apto" por pessoa; o seletor fala em
  // document / organization / fitness. Estas duas funcoes ligam os dois lados.
  const ptMembroParaPessoa = (membro: Record<string, unknown>): PickedPerson => ({
    name: String(membro?.name || ''),
    role: String(membro?.func || ''),
    document: String(membro?.rgCpf || ''),
    organization: String(membro?.empresa || ''),
    fitness: String(membro?.apto || PT_FIT_STATUS.YES),
    email: String(membro?.email || ''),
    phone: String(membro?.phone || ''),
    signatureMethod: (membro?.signatureMethod as never) || (membro?.useAssinafy === false ? 'manual' : 'email'),
    useAssinafy: membro?.useAssinafy !== false,
  });

  const pessoaParaPtMembro = (pessoa: PickedPerson) => ({
    name: pessoa.name,
    rgCpf: pessoa.document || '',
    func: pessoa.role || '',
    empresa: pessoa.organization || '',
    apto: (pessoa.fitness as never) || PT_FIT_STATUS.YES,
    email: pessoa.email || undefined,
    phone: pessoa.phone || undefined,
    signatureMethod: pessoa.signatureMethod,
    useAssinafy: pessoa.useAssinafy !== false,
  });

  const patchPtPessoa = (
    campo: 'pt.ptColaboradores' | 'pt.ptResponsaveis',
    indice: number,
    patch: Partial<PickedPerson>,
  ) => {
    const traduzido: Record<string, unknown> = { ...patch };
    if ('document' in patch) { traduzido.rgCpf = patch.document; delete traduzido.document; }
    if ('organization' in patch) { traduzido.empresa = patch.organization; delete traduzido.organization; }
    if ('fitness' in patch) { traduzido.apto = patch.fitness; delete traduzido.fitness; }
    if ('role' in patch && campo === 'pt.ptColaboradores') { traduzido.func = patch.role; delete traduzido.role; }

    Object.entries(traduzido).forEach(([chave, valor]) => {
      form.setValue(`${campo}.${indice}.${chave}` as never, valor as never, { shouldDirty: true });
    });
  };

  const handleAddPtResponsavel = async (pessoa: PickedPerson & { saveForReuse?: boolean }) => {
    if (pessoa.saveForReuse && onSaveResponsibleContact) {
      setIsSavingResponsibleContact(true);
      const salvou = await onSaveResponsibleContact({
        name: pessoa.name,
        role: pessoa.role || '',
        email: pessoa.email || null,
        phone: pessoa.phone || null,
        signsByDefault: pessoa.useAssinafy !== false,
        isActive: true,
      });
      setIsSavingResponsibleContact(false);
      if (!salvou) return;
    }

    const atuais = form.getValues('pt.ptResponsaveis') || [];
    form.setValue('pt.ptResponsaveis', [...atuais, {
      employeeId: pessoa.employeeId || undefined,
      name: pessoa.name,
      role: pessoa.role || '',
      email: pessoa.email || undefined,
      phone: pessoa.phone || undefined,
      signatureMethod: pessoa.signatureMethod,
      useAssinafy: pessoa.useAssinafy !== false,
      signatureData: pessoa.signatureData || undefined,
    }], { shouldDirty: true });
  };

  const handleAddTeamMember = (person: PickedPerson) => {
    appendTeamMember({
      employeeId: person.employeeId || undefined,
      date: person.date || todayDate,
      name: person.name,
      role: person.role || undefined,
      email: person.email || undefined,
      phone: person.phone || undefined,
      signatureMethod: person.signatureMethod,
      useAssinafy: person.useAssinafy !== false,
      isManual: Boolean(person.isManual),
      signatureData: person.signatureData || undefined,
    });
  };

  const handleAddResponsible = async (person: PickedPerson & { saveForReuse?: boolean }) => {
    if (person.saveForReuse && onSaveResponsibleContact) {
      setIsSavingResponsibleContact(true);
      const saved = await onSaveResponsibleContact({
        name: person.name,
        role: person.role || '',
        email: person.email || null,
        phone: person.phone || null,
        signsByDefault: person.useAssinafy !== false,
        isActive: true,
      });
      setIsSavingResponsibleContact(false);
      if (!saved) return;
    }

    // O documento guarda uma copia dos dados: alteracoes futuras no cadastro
    // nao podem mudar uma APR ja emitida.
    appendResponsible({
      employeeId: person.employeeId || undefined,
      name: person.name,
      role: person.role || '',
      email: person.email || undefined,
      phone: person.phone || undefined,
      signatureMethod: person.signatureMethod,
      useAssinafy: person.useAssinafy !== false,
      signatureData: person.signatureData || undefined,
    });
  };

  return (
    <Card className="w-full border-0 bg-transparent shadow-none">
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            {(
              <nav aria-label={`Etapas da ${documentType === DOCUMENT_TYPES.APR ? 'APR' : 'PT'}`} className="rounded-2xl border border-[#cfcbc0] bg-white p-4 shadow-sm md:p-5">
                <ol className="grid gap-2 md:grid-cols-4">
                  {ETAPAS.map((step, index) => {
                    const isActive = activeAprStep === index;
                    const isComplete = activeAprStep > index;
                    return (
                      <li key={step.title}>
                        <button
                          type="button"
                          disabled={index > activeAprStep && (ehPT ? ptStepReady : aprStepReady).slice(0, index).some((pronto) => !pronto)}
                          onClick={() => setActiveAprStep(index)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors',
                            isActive
                              ? 'border-[#7a1f1f] bg-[#f7f5f0] text-[#8a5a00]'
                              : 'border-transparent text-[#6e6a61] hover:border-[#cfcbc0] hover:bg-[#faf3e4]',
                          )}
                        >
                          <span className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                            isActive || isComplete ? 'bg-[#7a1f1f] text-white' : 'bg-[#ebe9e3] text-[#6e6a61]',
                          )}>
                            {isComplete ? 'OK' : index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold">{step.title}</span>
                            <span className="mt-0.5 block text-xs leading-4 opacity-80">{step.description}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </nav>
            )}

            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <div className="hidden mb-8">
                  <FormItem className="space-y-3">
                    <FormLabel>
                      <FileText className="inline-block mr-2" /> {ptBr.safetyForm.documentType}
                    </FormLabel>
                    <FormControl>
                      <div className="flex items-center justify-between rounded-lg border border-[#e8d9ae] bg-gradient-to-r from-[#faf3e4] via-[#faf3e4] to-transparent p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-[#7a1f1f]" />
                          <span className="font-semibold text-lg">
                            {field.value === DOCUMENT_TYPES.APR ? ptBr.documentType.apr : ptBr.documentType.pt}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            const newType = field.value === DOCUMENT_TYPES.APR ? DOCUMENT_TYPES.PT : DOCUMENT_TYPES.APR;
                            field.onChange(newType);
                          }}
                        >
                          Alterar para {field.value === DOCUMENT_TYPES.APR ? ptBr.documentType.pt : ptBr.documentType.apr}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                </div>
              )}
            />

            {documentType === DOCUMENT_TYPES.PT ? (
              <>
                {/* Etapa 1 da PT: a mesma escolha de empresa da APR. */}
                <div className={cn('mb-5', passoVisivel !== 0 && 'hidden')}>
                  <CompanyStep
                    empresas={empresasDoProjeto}
                    selectedId={workId || ''}
                    onSelect={(id) => onSelectCompany?.(id)}
                    onCreateNew={() => onCreateCompany?.()}
                    projetoNome={selectedProject?.nome_projeto}
                    temProjeto={Boolean(selectedProjectId)}
                    onEscolherProjeto={() => onSelectProject?.('')}
                  />
                </div>

                <PTForm
                  form={form}
                  passoVisivel={passoVisivel}
                  recentActivities={recentActivities}
                  similarActivities={similarActivities}
                />

                {/* Etapa: quem executa a atividade */}
                <div className={cn('mb-5', passoVisivel !== 3 && 'hidden')}>
                  <PersonPicker
                    title="Colaboradores"
                    subtitle="Quem vai executar a atividade. Todos assinam a permissao."
                    icon={<Users className="mr-2" />}
                    addLabel="Adicionar colaborador"
                    emptyHint="Escolha quem ja esta cadastrado ou cadastre na hora."
                    options={employeeOptions}
                    people={(ptColaboradores || []).map(ptMembroParaPessoa)}
                    withDocument
                    withFitness
                    onAdd={(pessoa) => {
                      const atuais = form.getValues('pt.ptColaboradores') || [];
                      form.setValue('pt.ptColaboradores', [...atuais, pessoaParaPtMembro(pessoa)], { shouldDirty: true });
                    }}
                    onPatch={(indice, patch) => patchPtPessoa('pt.ptColaboradores', indice, patch)}
                    onRemove={(indice) => {
                      const atuais = form.getValues('pt.ptColaboradores') || [];
                      form.setValue('pt.ptColaboradores', atuais.filter((_, i) => i !== indice), { shouldDirty: true });
                    }}
                  />
                </div>

                {/* Etapa: quem libera e assina */}
                <div className={cn('mb-5', passoVisivel !== 4 && 'hidden')}>
                  <PersonPicker
                    title="Liberacao e assinaturas"
                    subtitle="Gestor da area, responsavel pela atividade e SESMT. Todos assinam."
                    icon={<UserCheck className="mr-2" />}
                    addLabel="Adicionar responsavel"
                    emptyHint="Escolha quem ja esta cadastrado ou cadastre na hora."
                    options={responsibleOptions}
                    people={(ptResponsaveis || []) as never[]}
                    requireRole
                    canSaveContact={Boolean(onSaveResponsibleContact)}
                    isSavingContact={isSavingResponsibleContact}
                    onAdd={handleAddPtResponsavel}
                    onPatch={(indice, patch) => patchPtPessoa('pt.ptResponsaveis', indice, patch)}
                    onRemove={(indice) => {
                      const atuais = form.getValues('pt.ptResponsaveis') || [];
                      form.setValue('pt.ptResponsaveis', atuais.filter((_, i) => i !== indice), { shouldDirty: true });
                    }}
                  />
                </div>

                <div className={cn('mb-5', passoVisivel !== 5 && 'hidden')}>
                  <PtReview
                    values={form.getValues()}
                    companyLabel={companyLabel}
                    pendencias={pendenciasPt}
                    revisada={analiseRevisada}
                    onRevisadaChange={setAnaliseRevisada}
                    onEditStep={(passo) => setEditingSection(passo)}
                    onVisualizarDocumento={onVisualizarDocumento}
                    isFinalizando={isFinalizando}
                    jaFinalizado={foiFinalizada}
                    onFinalizar={async () => {
                      const salvou = await onFinalizar?.();
                      if (salvou !== false) setFoiFinalizada(true);
                    }}
                    onEnviarAssinatura={onEnviarAssinatura}
                    isEnviando={isEnviando}
                  />
                </div>
              </>
            ) : isDataLoading ? (
              <FormSkeleton />
            ) : (
              <EnvoltorioEtapa
                aberto={editingSection !== null}
                titulo={editingSection !== null ? APR_STEPS[editingSection].title : ''}
                onFechar={() => setEditingSection(null)}
              >
                <div className="space-y-8">
                  <div className={cn('mb-5', passoVisivel !== 0 && 'hidden')}>
                    <CompanyStep
                      empresas={empresasDoProjeto}
                      selectedId={workId || ''}
                      onSelect={(id) => onSelectCompany?.(id)}
                      onCreateNew={() => onCreateCompany?.()}
                      projetoNome={selectedProject?.nome_projeto}
                      temProjeto={Boolean(selectedProjectId)}
                      onEscolherProjeto={() => onSelectProject?.('')}
                    />
                  </div>

                  <div className={cn('mb-5', passoVisivel !== 2 && 'hidden')}>
                    <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white shadow-sm">
                      <div className="flex items-center justify-between gap-3 bg-[#111111] px-5 py-3 text-white">
                        <h3 className="flex min-w-0 items-center font-headline text-h3">
                          <Briefcase className="mr-2 shrink-0" />
                          <span className="truncate">{ptBr.safetyForm.workData}</span>
                        </h3>
                        {/* No celular so o lapis, para o botao encaixar no canto. */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label={isEditingWorkData ? 'Concluir edicao' : 'Editar dados'}
                          className="h-9 shrink-0 rounded-md px-2 text-white hover:bg-white/10 hover:text-white sm:px-3"
                          onClick={() => setIsEditingWorkData(!isEditingWorkData)}
                        >
                          <Pencil className="h-4 w-4 sm:mr-2" />
                          <span className="hidden sm:inline">Editar</span>
                        </Button>
                      </div>
                      <div className="space-y-4 px-5 pb-5 pt-4">

                      <FormField
                        control={form.control}
                        name="workLocationDetails"
                        render={({ field }) => {
                          const temConhecidos = knownLocations.length > 0;
                          const escolhendo = temConhecidos && !cadastrandoLocal;

                          return (
                            <FormItem>
                              <FormLabel>Local da atividade</FormLabel>

                              {escolhendo ? (
                                <Select onValueChange={(valor) => field.onChange(valor)} value={field.value || ''}>
                                  <FormControl>
                                    <SelectTrigger className="h-12 rounded-md border-[#cfcbc0] bg-white">
                                      <SelectValue placeholder="Escolha um local ja cadastrado" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {knownLocations.map((local) => (
                                      <SelectItem key={local} value={local}>
                                        {local}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : (
                                <FormControl>
                                  <Input
                                    className="h-12 rounded-md border-[#cfcbc0]"
                                    placeholder="Ex.: Pavimento 2 - Setor de producao"
                                    {...field}
                                  />
                                </FormControl>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (escolhendo) {
                                    field.onChange('');
                                    setCadastrandoLocal(true);
                                  } else {
                                    setCadastrandoLocal(false);
                                  }
                                }}
                                className="mt-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.07em] text-[#7a1f1f] transition-colors hover:text-[#5f1818]"
                              >
                                <PlusCircle className="h-3.5 w-3.5" />
                                {escolhendo ? 'Cadastrar novo local' : temConhecidos ? 'Escolher um local ja cadastrado' : 'Novo local'}
                              </button>

                              <FormDescription>
                                Este local sai no documento. Depois de salvo, ele fica disponivel
                                para os proximos documentos desta empresa.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{ptBr.safetyForm.startDate}</FormLabel>
                                <FormControl>
                                   <Input type="date" className="h-12 rounded-md border-[#cfcbc0]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="endDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{ptBr.safetyForm.endDate}</FormLabel>
                                <FormControl>
                                   <Input type="date" className="h-12 rounded-md border-[#cfcbc0]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className={cn('mb-5', passoVisivel !== 1 && 'hidden')}>
                    <DocumentActivityPicker
                      titulo="O que será realizado?"
                      icone={<BookOpen className="mr-2 inline-block text-white" />}
                      dica="Escreva com suas palavras. Quanto mais detalhe — altura, energia, equipamento, produto — melhor fica a análise. Exemplo: manutenção elétrica no quadro de distribuição do setor de produção."
                      placeholder={ptBr.safetyForm.activityDescriptionPlaceholder}
                      valor={activityDescription || ''}
                      onChange={(texto) => form.setValue('activityDescription', texto, { shouldDirty: true, shouldValidate: true })}
                      semelhantes={similarActivities}
                      recentes={recentActivities}
                    />
                  </div>

                  <div className={cn('mb-5', passoVisivel !== 4 && 'hidden')}>
                    <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white shadow-sm">
                      <div className="bg-[#111111] px-5 py-3 text-white">
                        <h3 className="flex items-center font-headline text-h3 text-white">
                          <Lightbulb className="mr-2 shrink-0" /> Análise de risco
                        </h3>
                      </div>
                      <div className="space-y-4 px-5 pb-5 pt-4">
                        {isLoading ? (
                          <div className="flex flex-col items-center gap-4 py-12 text-center">
                            <Loader2 className="h-7 w-7 animate-spin text-[#7a1f1f]" />
                            <div>
                              <p className="font-headline text-h3 text-[#111111]">Gerando os seus dados</p>
                              <p className="mx-auto mt-1 max-w-sm text-sm text-[#6e6a61]">
                                A IA está montando as etapas do procedimento, os riscos, as medidas de controle e os EPIs desta atividade.
                              </p>
                            </div>
                            <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-[#ebe9e3]">
                              <div className="barra-indeterminada h-full w-1/3 rounded-full bg-[#7a1f1f]" />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start gap-2 rounded-md border border-[#e8d9ae] bg-[#faf3e4] px-3 py-2 text-sm text-[#8a5a00]">
                              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0" />
                              <p>
                                <strong>O conteúdo abaixo é sugerido por inteligência artificial.</strong>{' '}
                                Ele é um ponto de partida e precisa ser revisado e validado por você,
                                responsável técnico, antes da emissão.
                              </p>
                            </div>

                            {hasGeneratedAnalysis && (
                              <div className="flex items-start gap-2 rounded-md border border-[#dde9e2] bg-[#eaf2ed] px-3 py-2 text-sm font-medium text-[#1b5e3f]">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                                Análise gerada. Confira etapa por etapa e ajuste o que precisar.
                              </div>
                            )}

                            <div className="flex justify-end">
                              <Button
                                type="button"
                                disabled={isLoading || !canGenerateAnalysis}
                                className="rounded-md bg-[#7a1f1f] px-6 text-white hover:bg-[#5f1818]"
                                onClick={async () => {
                                  const isValid = await form.trigger('activityDescription');
                                  if (isValid) {
                                    setAnaliseRevisada(false);
                                    setFoiFinalizada(false);
                                    onSubmit(form.getValues());
                                  }
                                }}
                              >
                                {hasGeneratedAnalysis ? 'Gerar novamente' : ptBr.actions.generateAnalysis}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                   <div className={cn('mb-5', passoVisivel !== 4 && 'hidden')}>
                    <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white shadow-sm">
                      <div className="flex flex-col gap-3 bg-[#111111] px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="flex items-center font-headline text-h3 text-white">
                          <ShieldCheck className="mr-2" /> {ptBr.safetyForm.manualAnalysisTitle}
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-white text-[#6e6a61] hover:bg-[#ebe9e3]"
                          onClick={() => {
                            appendAnalysisStep({ activity: '', potentialRisks: '', preventiveMeasures: '' });
                            setEditingAnalysisStep(analysisStepFields.length);
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.safetyForm.addAnalysisStep}
                        </Button>
                      </div>
                      <div className="space-y-4 px-5 py-5">
                        {analysisStepFields.length === 0 && (
                          <div className="mt-2 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-[#cfcbc0] px-8 py-10 text-center">
                            <FileText className="mb-3 h-12 w-12 text-[#6e6a61]/50" />
                            <p className="italic text-[#6e6a61]">{ptBr.safetyForm.manualAnalysisEmpty}</p>
                          </div>
                        )}

                        {/* Uma etapa so vira campo editavel quando a pessoa
                            clica no lapis daquela etapa. */}
                        <div className="space-y-3">
                          {analysisStepFields.map((field, index) => (
                            <AnalysisStepCard
                              key={field.id}
                              index={index}
                              activity={analysisSteps?.[index]?.activity || ''}
                              itens={itensDaEtapa(index)}
                              emEdicao={editingAnalysisStep === index}
                              onToggleEdit={() => setEditingAnalysisStep(editingAnalysisStep === index ? null : index)}
                              onRemove={() => {
                                removeAnalysisStep(index);
                                setEditingAnalysisStep(null);
                              }}
                              onChangeActivity={(valor) =>
                                form.setValue(`analysisSteps.${index}.activity` as never, valor as never, { shouldDirty: true })
                              }
                              onChangeLista={(campo, itens) => gravarLista(index, campo, itens)}
                            />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  {equipment && (
                    <div className={cn('mb-5', passoVisivel !== 4 && 'hidden')}>
                      <div className="overflow-hidden rounded-md border border-[#cfcbc0] bg-white">
                        <div className="flex items-center justify-between gap-3 bg-[#111111] px-5 py-3 text-white">
                          <h3 className="flex min-w-0 items-center font-headline text-h3">
                            <HardHat className="mr-2 shrink-0" />
                            <span className="truncate">EPI e EPC recomendados</span>
                          </h3>
                        </div>

                        <div className="grid gap-5 px-5 pb-5 pt-4 md:grid-cols-2">
                          {([
                            { chave: 'epiItems' as const, notaChave: 'epiNote' as const, titulo: 'EPI - Protecao Individual', rascunho: epiDraft, setRascunho: setEpiDraft },
                            { chave: 'epcItems' as const, notaChave: 'epcNote' as const, titulo: 'EPC - Protecao Coletiva', rascunho: epcDraft, setRascunho: setEpcDraft },
                          ]).map((grupo) => {
                            const itens = equipment[grupo.chave] || [];
                            const adicionar = () => {
                              const valor = grupo.rascunho.trim();
                              if (!valor) return;
                              patchEquipment({ [grupo.chave]: [...itens, valor] } as Partial<ProtectiveEquipmentOutput>);
                              grupo.setRascunho('');
                            };
                            return (
                              <div key={grupo.chave}>
                                <p className="label-oficial mb-2">{grupo.titulo}</p>
                                <ul className="space-y-1.5">
                                  {itens.map((item, index) => (
                                    <li key={`${item}-${index}`} className="flex items-start gap-2 rounded-md border border-[#e3e0d8] bg-[#f7f5f0] px-3 py-2 text-sm text-[#111111]">
                                      <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#1b5e3f]" />
                                      <span className="min-w-0 flex-1">{item}</span>
                                      {onEquipmentChange && (
                                        <button
                                          type="button"
                                          aria-label={`Remover ${item}`}
                                          className="text-[#7a1f1f] transition-colors hover:text-[#5f1818]"
                                          onClick={() => patchEquipment({ [grupo.chave]: itens.filter((_, i) => i !== index) } as Partial<ProtectiveEquipmentOutput>)}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </li>
                                  ))}
                                  {itens.length === 0 && (
                                    <li className="rounded-md border border-dashed border-[#cfcbc0] px-3 py-2 text-sm text-[#6e6a61]">
                                      Nada recomendado para esta atividade.
                                    </li>
                                  )}
                                </ul>

                                {onEquipmentChange && (
                                  <div className="mt-2 flex gap-2">
                                    <Input
                                      value={grupo.rascunho}
                                      onChange={(event) => grupo.setRascunho(event.target.value)}
                                      onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                          event.preventDefault();
                                          adicionar();
                                        }
                                      }}
                                      placeholder="Adicionar item..."
                                      className="h-9 text-sm"
                                    />
                                    <Button type="button" variant="outline" size="sm" className="h-9 shrink-0" onClick={adicionar}>
                                      <PlusCircle className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )}

                                {equipment[grupo.notaChave] && (
                                  <p className="mt-2 text-xs leading-5 text-[#6e6a61]">{equipment[grupo.notaChave]}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className={cn('mb-5 space-y-5', passoVisivel !== 3 && 'hidden')}>
                    <PersonPicker
                      title={ptBr.safetyForm.team}
                      subtitle="Quem vai executar a atividade. Todos assinam o documento."
                      icon={<Users className="mr-2" />}
                      addLabel={ptBr.actions.addMember}
                      emptyHint="Escolha quem ja esta cadastrado ou cadastre na hora."
                      options={employeeOptions}
                      people={teamMembers || []}
                      withDate
                      defaultDate={todayDate}
                      onAdd={handleAddTeamMember}
                      onPatch={(index, patch) => patchPerson('teamMembers', index, patch)}
                      onRemove={removeTeamMember}
                      errorMessage={form.formState.errors.teamMembers?.root?.message}
                    />

                    <PersonPicker
                      title={ptBr.safetyForm.responsibles}
                      subtitle="Quem acompanha, aprova e responde pela atividade. Todos assinam o documento."
                      icon={<UserCheck className="mr-2" />}
                      addLabel={ptBr.actions.addResponsible}
                      emptyHint="Escolha quem ja esta cadastrado ou cadastre na hora."
                      options={responsibleOptions}
                      people={responsiblePersons || []}
                      requireRole
                      canSaveContact={Boolean(onSaveResponsibleContact)}
                      isSavingContact={isSavingResponsibleContact}
                      onAdd={handleAddResponsible}
                      onPatch={(index, patch) => patchPerson('responsiblePersons', index, patch)}
                      onRemove={removeResponsible}
                      errorMessage={form.formState.errors.responsiblePersons?.root?.message}
                    />
                  </div>

                  <div className={cn('mb-5', passoVisivel !== 5 && 'hidden')}>
                    <AprReview
                      values={form.getValues()}
                      equipment={equipment}
                      companyLabel={companyLabel}
                      pendencias={pendencias}
                      analiseRevisada={analiseRevisada}
                      onAnaliseRevisadaChange={setAnaliseRevisada}
                      onEditStep={(passo) => setEditingSection(passo)}
                      onVisualizarDocumento={onVisualizarDocumento}
                      isFinalizando={isFinalizando}
                      jaFinalizado={foiFinalizada}
                      onFinalizar={async () => {
                        const salvou = await onFinalizar?.();
                        if (salvou !== false) setFoiFinalizada(true);
                      }}
                      onEnviarAssinatura={onEnviarAssinatura}
                      isEnviando={isEnviando}
                    />
                  </div>

                  <div className={cn('mb-5 rounded-md border border-[#cfcbc0] bg-white p-5 shadow-sm', passoVisivel !== 6 && 'hidden')}>
                    <h3 className="flex items-center font-headline text-h3 text-[#111111]">
                      <CheckCircle2 className="mr-2 text-[#1b5e3f]" /> Revisão e emissão
                    </h3>
                    <p className="mt-2 text-sm text-[#6e6a61]">
                      Confira os dados abaixo e use a pré-visualização ao lado antes de salvar ou gerar o documento.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="rounded-xl bg-[#f7f5f0] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a1f1f]">Contexto</p>
                        <p className="mt-1 text-sm font-medium text-[#111111]">{workName || 'Não informado'}</p>
                      </div>
                      <div className="rounded-xl bg-[#f7f5f0] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#7a1f1f]">Atividade</p>
                        <p className="mt-1 line-clamp-2 text-sm font-medium text-[#111111]">{activityDescription || 'Não informada'}</p>
                      </div>
                      <div className="rounded-xl bg-[#eaf2ed] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#1b5e3f]">Etapas de risco</p>
                        <p className="mt-1 text-sm font-medium text-[#111111]">{analysisSteps?.length || 0} cadastradas</p>
                      </div>
                      <div className="rounded-xl bg-[#ebe9e3] p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#6e6a61]">Pessoas</p>
                        <p className="mt-1 text-sm font-medium text-[#111111]">{(teamMembers || []).length} executoras · {(responsiblePersons || []).length} responsáveis</p>
                      </div>
                    </div>
                  </div>
                </div>
              </EnvoltorioEtapa>
            )}
            {(
              <>
                {/* No celular a navegacao fica fixa no rodape, ao alcance do polegar.
                    O espacador evita que ela cubra o fim do formulario. */}
                <div className="h-20 lg:hidden" aria-hidden="true" />

                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#cfcbc0] bg-[#f7f5f0] px-4 py-3 lg:static lg:z-auto lg:border-0 lg:border-t lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-5">
                  <div className="mx-auto flex max-w-[940px] items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={activeAprStep === 0}
                      className="h-12 flex-1 rounded-md border-[#cfcbc0] lg:h-11 lg:flex-none lg:px-6"
                      onClick={() => setActiveAprStep((current) => Math.max(0, current - 1))}
                    >
                      Voltar
                    </Button>

                    <span className="hidden text-sm text-[#6e6a61] lg:block lg:flex-1 lg:text-center">
                      Etapa {activeAprStep + 1} de {ETAPAS.length} &middot; {ETAPAS[activeAprStep].title}
                    </span>
                    <span className="text-center text-xs tabular-nums text-[#6e6a61] lg:hidden">
                      {activeAprStep + 1}/{ETAPAS.length}
                    </span>

                    {activeAprStep < ETAPAS.length - 1 ? (
                      <Button
                        type="button"
                        disabled={!canAdvanceAprStep}
                        className="h-12 flex-1 rounded-md bg-[#7a1f1f] text-white hover:bg-[#5f1818] lg:h-11 lg:flex-none lg:px-6"
                        onClick={() => setActiveAprStep((current) => Math.min(ETAPAS.length - 1, current + 1))}
                      >
                        Continuar
                      </Button>
                    ) : (
                      <span className="flex-1 text-right text-xs text-[#6e6a61] lg:text-sm">
                        Use os botões de emissão para salvar ou gerar o documento.
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
