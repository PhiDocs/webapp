'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import React, { useEffect, useState } from 'react';
import type { SafetyFormValues, Work, Employee } from '@/lib/types';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Users,
  ShieldCheck,
  Pencil,
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { PTForm } from './pt-form';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES } from '@/lib/constants';
import { Skeleton } from './ui/skeleton';
import { Badge } from './ui/badge';
import { PhoneInput } from './ui/phone-input';
import { Mail, MessageCircle } from 'lucide-react';
import { SignaturePad } from './signature-pad';

interface SafetyFormProps {
  form: ReturnType<typeof useForm<SafetyFormValues>>;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  works: Work[];
  employees: Employee[];
  isDataLoading: boolean;
}

export function SafetyForm({
  form,
  onSubmit,
  isLoading,
  works,
  employees,
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
  const activityDescription = useWatch({ control: form.control, name: 'activityDescription' });
  const analysisSteps = useWatch({ control: form.control, name: 'analysisSteps' });
  const teamMembers = useWatch({ control: form.control, name: 'teamMembers' });
  const responsiblePersons = useWatch({ control: form.control, name: 'responsiblePersons' });
  const [isEditingWorkData, setIsEditingWorkData] = useState(false);
  const [activeAnalysisStep, setActiveAnalysisStep] = useState(0);
  const [teamDraftError, setTeamDraftError] = useState('');
  const [responsibleDraftError, setResponsibleDraftError] = useState('');
  const [teamDraft, setTeamDraft] = useState<{
    employeeId: string;
    date: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    useAssinafy: boolean;
    isManual: boolean;
    signatureData: string;
  } | null>(null);
  const [responsibleDraft, setResponsibleDraft] = useState<{
    employeeId: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    useAssinafy: boolean;
    signatureData: string;
  } | null>(null);

  const todayDate = new Date().toISOString().split('T')[0];

  const createTeamDraft = (isManual = false) => ({
    employeeId: '',
    date: todayDate,
    name: '',
    role: '',
    email: '',
    phone: '',
    useAssinafy: true,
    isManual,
    signatureData: '',
  });

  const createResponsibleDraft = () => ({
    employeeId: '',
    name: '',
    role: '',
    email: '',
    phone: '',
    useAssinafy: true,
    signatureData: '',
  });

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

  const FormSkeleton = () => (
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


  const hasManualAnalysis = Array.isArray(analysisSteps)
    && analysisSteps.some((step) => (step?.activity || step?.potentialRisks || step?.preventiveMeasures));
  const hasTeamMembers = Array.isArray(teamMembers)
    && teamMembers.some((member) => (member?.employeeId || member?.name));
  const hasResponsibles = Array.isArray(responsiblePersons)
    && responsiblePersons.some((person) => (person?.employeeId || person?.name));
  const teamMemberChips = (teamMembers || []).filter((member) => member?.name);
  const responsibleChips = (responsiblePersons || []).filter((person) => person?.name);

  const handleConfirmTeamDraft = () => {
    if (!teamDraft) return;

    if (teamDraft.isManual) {
      if (!teamDraft.name.trim()) {
        setTeamDraftError('Informe o nome do membro.');
        return;
      }
    } else if (!teamDraft.employeeId) {
      setTeamDraftError('Selecione um funcionario.');
      return;
    }

    if (!teamDraft.date) {
      setTeamDraftError('Informe a data.');
      return;
    }

    if (teamDraft.useAssinafy && !teamDraft.email.trim()) {
      setTeamDraftError('Informe o e-mail para assinatura.');
      return;
    }

    appendTeamMember(teamDraft);
    setTeamDraft(null);
    setTeamDraftError('');
  };

  const handleConfirmResponsibleDraft = () => {
    if (!responsibleDraft) return;

    if (!responsibleDraft.employeeId) {
      setResponsibleDraftError('Selecione um funcionario.');
      return;
    }

    if (responsibleDraft.useAssinafy && !responsibleDraft.email.trim()) {
      setResponsibleDraftError('Informe o e-mail para assinatura.');
      return;
    }

    appendResponsible(responsibleDraft);
    setResponsibleDraft(null);
    setResponsibleDraftError('');
  };

  return (
    <Card className="w-full border-0 bg-transparent shadow-none">
      <CardContent className="p-0">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                      <div className="flex items-center justify-between rounded-lg border border-[#ead7ca] bg-gradient-to-r from-[#fff3e8] via-[#fff8f2] to-transparent p-4">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-[#f46e11]" />
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
              <PTForm form={form} />
            ) : isDataLoading ? (
              <FormSkeleton />
            ) : (
                <div className="space-y-8">
                  <div className="mb-5">
                    <div className="overflow-hidden rounded-md border border-[#e6cfc1] bg-white shadow-sm">
                      <div className="flex flex-col gap-3 bg-[#5f7394] px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="flex items-center font-headline text-h3">
                          <Briefcase className="mr-2" /> {ptBr.safetyForm.workData}
                        </h3>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-md text-white hover:bg-white/10 hover:text-white"
                          onClick={() => setIsEditingWorkData(!isEditingWorkData)}
                        >
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </Button>
                      </div>
                      <div className="space-y-4 px-5 pb-5 pt-4">

                      <FormField
                        control={form.control}
                        name="workId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ptBr.safetyForm.selectWork}</FormLabel>
                            <Select onValueChange={(workId) => {
                              field.onChange(workId);
                              const work = works.find(w => w.id === workId);
                              if (work) {
                                form.setValue('workName', work.name);
                                form.setValue('workAddress', work.address);
                                form.setValue('startDate', work.startDate.split('T')[0]);
                                form.setValue('endDate', work.endDate.split('T')[0]);
                                form.setValue('workLocationDetails', work.workLocationDetails);
                              }
                            }} value={field.value}>
                              <FormControl>
                                  <SelectTrigger className="h-12 rounded-md border-[#ccb4a6] bg-white">
                                    <SelectValue placeholder={ptBr.safetyForm.selectWorkPlaceholder} />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {works.map((work) => (
                                  <SelectItem key={work.id} value={work.id}>
                                    {work.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormDescription>{ptBr.safetyForm.workDetailsAutoFilled}</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
                          <FormField
                            control={form.control}
                            name="startDate"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{ptBr.safetyForm.startDate}</FormLabel>
                                <FormControl>
                                   <Input type="date" className="h-12 rounded-md border-[#ccb4a6]" {...field} />
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
                                   <Input type="date" className="h-12 rounded-md border-[#ccb4a6]" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {isEditingWorkData && (
                          <FormField
                            control={form.control}
                            name="workLocationDetails"
                            render={({ field }) => (
                              <FormItem className="animate-in fade-in slide-in-from-top-4 duration-300">
                                <FormLabel>{ptBr.safetyForm.workLocation}</FormLabel>
                                <FormControl>
                                   <Input className="h-12 rounded-md border-[#ccb4a6]" placeholder={ptBr.safetyForm.workLocationPlaceholder} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="overflow-hidden rounded-md border border-[#e6cfc1] bg-white shadow-sm">
                      <div className="bg-[#5f7394] px-5 py-3 text-white">
                        <FormLabel className="flex items-center font-headline text-h3 text-white">
                          <BookOpen className="inline-block mr-2" /> {ptBr.safetyForm.activityDescription}
                        </FormLabel>
                      </div>
                        <div className="space-y-4 px-5 pb-5 pt-4">
                       <FormField
                         control={form.control}
                         name="activityDescription"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Textarea
                                placeholder={ptBr.safetyForm.activityDescriptionPlaceholder}
                                className="min-h-[128px] resize-none rounded-md border-[#ccb4a6]"
                                {...field}
                              />
                            </FormControl>
                             <FormMessage />
                           </FormItem>
                         )}
                       />
                        <div className="flex justify-end">
                          <Button
                            type="button"
                            disabled={isLoading}
                            className="rounded-md bg-[#f46e11] px-6 text-white hover:bg-[#e96710]"
                            onClick={async () => {
                              const isValid = await form.trigger('activityDescription');
                              if (isValid) {
                                onSubmit(form.getValues());
                              }
                            }}
                          >
                            {isLoading ? ptBr.actions.generatingAnalysis : ptBr.actions.generateAnalysis}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="overflow-hidden rounded-md border border-[#e6cfc1] bg-white shadow-sm">
                      <div className="flex flex-col gap-3 bg-[#5f7394] px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="flex items-center font-headline text-h3 text-white">
                          <ShieldCheck className="mr-2" /> {ptBr.safetyForm.manualAnalysisTitle}
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="bg-white text-[#4f5f7a] hover:bg-[#eceef1]"
                          onClick={() => {
                            appendAnalysisStep({ activity: '', potentialRisks: '', preventiveMeasures: '' });
                            setActiveAnalysisStep(analysisStepFields.length);
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.safetyForm.addAnalysisStep}
                        </Button>
                      </div>
                      <div className="space-y-4 px-5 py-5">
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {analysisStepFields.map((_, index) => (
                            <Button
                              key={index}
                              type="button"
                              variant={activeAnalysisStep === index ? "secondary" : "outline"}
                              size="sm"
                              onClick={() => setActiveAnalysisStep(index)}
                              className={cn(
                                activeAnalysisStep === index && "border-[#b8c4d8] bg-[#e8edf6] text-[#203555]",
                                "min-w-[3rem]"
                              )}
                            >
                              {index + 1}
                            </Button>
                          ))}
                        </div>

                        {analysisStepFields.length === 0 && (
                           <div className="mt-2 flex flex-col items-center justify-center rounded-md border-2 border-dashed border-[#b99986] px-8 py-10 text-center">
                            <FileText className="mb-3 h-12 w-12 text-[#8c7165]/50" />
                            <p className="italic text-[#584237]">{ptBr.safetyForm.manualAnalysisEmpty}</p>
                          </div>
                        )}

                        {analysisStepFields.length > 0 && analysisStepFields[activeAnalysisStep] && (
                          <div key={analysisStepFields[activeAnalysisStep].id} className="mt-3 space-y-4 rounded-md border border-[#e6cfc1] bg-[#fbfbfc] p-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-semibold">
                                {ptBr.safetyForm.analysisStepLabel} {activeAnalysisStep + 1}
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  removeAnalysisStep(activeAnalysisStep);
                                  if (activeAnalysisStep > 0) {
                                    setActiveAnalysisStep(activeAnalysisStep - 1);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                            <FormField
                              control={form.control}
                              name={`analysisSteps.${activeAnalysisStep}.activity`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ptBr.safetyForm.analysisStepActivity}</FormLabel>
                                  <FormControl>
                                     <Textarea
                                       placeholder={ptBr.safetyForm.analysisStepActivityPlaceholder}
                                       className="min-h-[80px] resize-y rounded-md border border-[#ccb4a6] bg-white"
                                       {...field}
                                     />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`analysisSteps.${activeAnalysisStep}.potentialRisks`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ptBr.safetyForm.analysisStepRisks}</FormLabel>
                                  <FormControl>
                                     <Textarea
                                       placeholder={ptBr.safetyForm.analysisStepRisksPlaceholder}
                                       className="min-h-[80px] resize-y rounded-md border border-[#ccb4a6] bg-white"
                                       {...field}
                                     />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`analysisSteps.${activeAnalysisStep}.preventiveMeasures`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{ptBr.safetyForm.analysisStepMeasures}</FormLabel>
                                  <FormControl>
                                     <Textarea
                                       placeholder={ptBr.safetyForm.analysisStepMeasuresPlaceholder}
                                       className="min-h-[80px] resize-y rounded-md border border-[#ccb4a6] bg-white"
                                       {...field}
                                     />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  {analysisStepFields.length > 0 && (
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        disabled={isLoading}
                        className="rounded-md bg-[#f46e11] px-6 text-white hover:bg-[#e96710]"
                        onClick={async () => {
                          const isValid = await form.trigger('activityDescription');
                          if (isValid) {
                            onSubmit(form.getValues());
                          }
                        }}
                      >
                        {isLoading
                          ? ptBr.actions.generatingAnalysis
                          : ptBr.actions.generateAnalysis}
                      </Button>
                    </div>
                  )}
                  <div className="mb-5">
                    <div className="overflow-hidden rounded-md border border-[#e6cfc1] bg-white shadow-sm">
                      <div className="flex flex-col gap-3 bg-[#5f7394] px-5 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="flex items-center font-headline text-h3 text-white">
                          <Users className="mr-2" /> {ptBr.safetyForm.team}
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={Boolean(teamDraft)}
                          className="h-9 w-full justify-center rounded-md bg-background px-4 text-[#203555] hover:bg-background/90 sm:w-auto"
                          onClick={() => {
                            setTeamDraft(createTeamDraft(false));
                            setTeamDraftError('');
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.actions.addMember}
                        </Button>
                      </div>

                      <div className="space-y-4 px-5 pb-5 pt-4">
                        {teamMemberChips.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {teamMemberChips.map((member, index) => (
                              <div key={`${member.name}-${index}`} className="flex items-center gap-2 rounded-md border border-[#e6cfc1] bg-[#eef1f5] px-3 py-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4f5f7a] text-[10px] font-semibold text-white">
                                  {(member.name || 'U').slice(0, 1).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-[#191c1e]">
                                  {member.name}
                                </span>
                                <button
                                  type="button"
                                  className="ml-1 text-[#ba1a1a] transition-colors hover:text-[#93000a]"
                                  onClick={() => removeTeamMember(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {teamDraft && (
                          <div className="grid grid-cols-1 gap-4 rounded-md border border-[#e6cfc1] bg-[#fbfbfc] p-4">
                            <div className="flex flex-col gap-2">
                              <FormLabel>Modo</FormLabel>
                              <Tabs
                                value={teamDraft.isManual ? 'manual' : 'employee'}
                                onValueChange={(value) => {
                                  setTeamDraft(createTeamDraft(value === 'manual'));
                                  setTeamDraftError('');
                                }}
                              >
                                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-[#eceef1] p-1">
                                  <TabsTrigger value="employee">Selecionar funcionario</TabsTrigger>
                                  <TabsTrigger value="manual">Preencher manualmente</TabsTrigger>
                                </TabsList>
                              </Tabs>
                            </div>

                            {!teamDraft.isManual ? (
                              <>
                                <div>
                                  <FormLabel>{ptBr.safetyForm.teamName}</FormLabel>
                                  <Select
                                    value={teamDraft.employeeId}
                                    onValueChange={(employeeId) => {
                                      const employee = employees.find((emp) => emp.id === employeeId);
                                      if (!employee) return;
                                      setTeamDraft((current) => current ? {
                                        ...current,
                                        employeeId,
                                        name: `${employee.firstName} ${employee.lastName}`,
                                        role: employee.roleName || '',
                                        email: employee.email || '',
                                        phone: employee.phone || '',
                                        date: current.date || todayDate,
                                      } : current);
                                      setTeamDraftError('');
                                    }}
                                  >
                                    <SelectTrigger className="h-10 rounded-md border-[#ccb4a6] bg-white">
                                      <SelectValue placeholder={ptBr.safetyForm.selectEmployeePlaceholder} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                          {emp.firstName} {emp.lastName} ({emp.roleName})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                {teamDraft.employeeId && (
                                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                    <div>
                                      <FormLabel>{ptBr.safetyForm.teamDate}</FormLabel>
                                      <Input
                                        type="date"
                                        value={teamDraft.date}
                                        onChange={(event) => setTeamDraft((current) => current ? { ...current, date: event.target.value } : current)}
                                        className="h-10 rounded-md border-[#ccb4a6]"
                                      />
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                  <div>
                                    <FormLabel>{ptBr.safetyForm.teamName}</FormLabel>
                                    <Input
                                      className="h-10 rounded-md border-[#ccb4a6]"
                                      placeholder={ptBr.safetyForm.teamNamePlaceholder}
                                      value={teamDraft.name}
                                      onChange={(event) => setTeamDraft((current) => current ? { ...current, name: event.target.value } : current)}
                                    />
                                  </div>
                                  <div>
                                    <FormLabel>{ptBr.safetyForm.teamRole} (opcional)</FormLabel>
                                    <Input
                                      className="h-10 rounded-md border-[#ccb4a6]"
                                      placeholder={ptBr.safetyForm.teamRolePlaceholder}
                                      value={teamDraft.role}
                                      onChange={(event) => setTeamDraft((current) => current ? { ...current, role: event.target.value } : current)}
                                    />
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                  <div>
                                    <FormLabel>{ptBr.safetyForm.teamDate}</FormLabel>
                                    <Input
                                      type="date"
                                      value={teamDraft.date}
                                      onChange={(event) => setTeamDraft((current) => current ? { ...current, date: event.target.value } : current)}
                                      className="h-10 rounded-md border-[#ccb4a6]"
                                    />
                                  </div>
                                  {teamDraft.useAssinafy && (
                                    <div>
                                      <FormLabel className="flex items-center gap-2">
                                        <Mail className="h-4 w-4" />
                                        {ptBr.auth.email}
                                      </FormLabel>
                                      <Input
                                        className="h-10 rounded-md border-[#ccb4a6]"
                                        placeholder={ptBr.auth.emailPlaceholder}
                                        value={teamDraft.email}
                                        onChange={(event) => setTeamDraft((current) => current ? { ...current, email: event.target.value } : current)}
                                      />
                                    </div>
                                  )}
                                  <div>
                                    <FormLabel className="flex items-center gap-2">
                                      <MessageCircle className="h-4 w-4" />
                                      Telefone (opcional)
                                    </FormLabel>
                                    <PhoneInput
                                      value={teamDraft.phone}
                                      onChange={(value) => setTeamDraft((current) => current ? { ...current, phone: value } : current)}
                                    />
                                  </div>
                                </div>
                              </>
                            )}

                            {(teamDraft.isManual || teamDraft.employeeId) && (
                              <>
                                <div>
                                  <FormLabel>{ptBr.safetyForm.signatureMethod}</FormLabel>
                                  <Tabs
                                    value={teamDraft.useAssinafy ? 'assinafy' : 'system'}
                                    onValueChange={(value) => {
                                      setTeamDraft((current) => current ? { ...current, useAssinafy: value === 'assinafy' } : current);
                                      setTeamDraftError('');
                                    }}
                                  >
                                    <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0">
                                      <TabsTrigger className="min-h-[42px] whitespace-normal rounded-md border border-[#ccb4a6] px-3 py-2 text-center leading-4 data-[state=active]:border-[#9e4300] data-[state=active]:bg-[#9e4300] data-[state=active]:text-white" value="assinafy">PhiDocs Sign (E-mail)</TabsTrigger>
                                      <TabsTrigger className="min-h-[42px] whitespace-normal rounded-md border border-[#e6cfc1] bg-[#eceef1] px-3 py-2 text-center leading-4 text-[#584237] data-[state=active]:border-[#ccb4a6] data-[state=active]:bg-white" value="system">Assinatura no sistema</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </div>

                                {teamDraft.useAssinafy ? (
                                  <div className="flex flex-col gap-2 rounded-md border border-[#e6cfc1] px-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-start">
                                    <Badge variant="secondary" className="flex shrink-0 items-center gap-1 self-start">
                                      <Mail className="h-3 w-3" />
                                      Assinatura por e-mail
                                    </Badge>
                                    A assinatura sera enviada por e-mail via Assinafy.
                                  </div>
                                ) : (
                                  <div>
                                    <FormLabel>Assinatura (opcional)</FormLabel>
                                    <SignaturePad
                                      value={teamDraft.signatureData}
                                      onChange={(value) => setTeamDraft((current) => current ? { ...current, signatureData: value } : current)}
                                    />
                                  </div>
                                )}
                              </>
                            )}

                            {teamDraftError ? <p className="text-sm font-medium text-destructive">{teamDraftError}</p> : null}

                            <div className="flex flex-wrap justify-end gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-md border-[#ccb4a6]"
                                onClick={() => {
                                  setTeamDraft(null);
                                  setTeamDraftError('');
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                className="rounded-md bg-[#f46e11] text-white hover:bg-[#e96710]"
                                onClick={handleConfirmTeamDraft}
                              >
                                Confirmar membro
                              </Button>
                            </div>
                          </div>
                        )}

                        <FormMessage>
                          {form.formState.errors.teamMembers?.root?.message}
                        </FormMessage>
                      </div>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="overflow-hidden rounded-md border border-[#e6cfc1] bg-white shadow-sm">
                      <div className="flex items-center justify-between bg-[#5f7394] px-5 py-3 text-white">
                        <h3 className="flex items-center font-headline text-h3 text-white">
                          <UserCheck className="mr-2" /> {ptBr.safetyForm.responsibles}
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={Boolean(responsibleDraft)}
                          className="h-9 w-full justify-center rounded-md bg-background px-4 text-[#203555] hover:bg-background/90 sm:w-auto"
                          onClick={() => {
                            setResponsibleDraft(createResponsibleDraft());
                            setResponsibleDraftError('');
                          }}
                        >
                          <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.actions.addResponsible}
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 gap-4 px-5 pb-5 pt-4">
                        {responsibleChips.length > 0 && (
                          <div className="flex flex-wrap gap-3">
                            {responsibleChips.map((person, index) => (
                              <div key={`${person.name}-${index}`} className="flex items-center gap-2 rounded-md border border-[#e6cfc1] bg-[#eef1f5] px-3 py-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#4f5f7a] text-[10px] font-semibold text-white">
                                  {(person.name || 'U').slice(0, 1).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-[#191c1e]">
                                  {person.name}
                                </span>
                                <button
                                  type="button"
                                  className="ml-1 text-[#ba1a1a] transition-colors hover:text-[#93000a]"
                                  onClick={() => removeResponsible(index)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {responsibleDraft && (
                          <div className="grid grid-cols-1 gap-4 rounded-md border border-[#e6cfc1] bg-[#f7f9fc] p-4">
                            <div>
                              <FormLabel>{ptBr.safetyForm.responsibleName}</FormLabel>
                              <Select
                                value={responsibleDraft.employeeId}
                                onValueChange={(employeeId) => {
                                  const employee = employees.find((emp) => emp.id === employeeId);
                                  if (!employee) return;
                                  setResponsibleDraft((current) => current ? {
                                    ...current,
                                    employeeId,
                                    name: `${employee.firstName} ${employee.lastName}`,
                                    role: employee.roleName || '',
                                    email: employee.email || '',
                                    phone: employee.phone || '',
                                  } : current);
                                  setResponsibleDraftError('');
                                }}
                              >
                                <SelectTrigger className="h-10 rounded-md border-[#ccb4a6] bg-white">
                                  <SelectValue placeholder={ptBr.safetyForm.selectEmployeePlaceholder} />
                                </SelectTrigger>
                                <SelectContent>
                                  {employees.map((emp) => (
                                    <SelectItem key={emp.id} value={emp.id}>
                                      {emp.firstName} {emp.lastName} ({emp.roleName})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            {responsibleDraft.employeeId && (
                              <>
                                <div>
                                  <FormLabel>{ptBr.safetyForm.signatureMethod}</FormLabel>
                                  <Tabs
                                    value={responsibleDraft.useAssinafy ? 'assinafy' : 'system'}
                                    onValueChange={(value) => {
                                      setResponsibleDraft((current) => current ? { ...current, useAssinafy: value === 'assinafy' } : current);
                                      setResponsibleDraftError('');
                                    }}
                                  >
                                    <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0">
                                      <TabsTrigger className="min-h-[42px] whitespace-normal rounded-md border border-[#ccb4a6] px-3 py-2 text-center leading-4 data-[state=active]:border-[#9e4300] data-[state=active]:bg-[#9e4300] data-[state=active]:text-white" value="assinafy">PhiDocs Sign (E-mail)</TabsTrigger>
                                      <TabsTrigger className="min-h-[42px] whitespace-normal rounded-md border border-[#e6cfc1] bg-[#eceef1] px-3 py-2 text-center leading-4 text-[#584237] data-[state=active]:border-[#ccb4a6] data-[state=active]:bg-white" value="system">Assinatura no sistema</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </div>

                                {responsibleDraft.useAssinafy ? (
                                  <div className="flex flex-col gap-2 rounded-md border border-[#e6cfc1] px-3 py-3 text-sm text-muted-foreground sm:flex-row sm:items-start">
                                    <Badge variant="secondary" className="flex shrink-0 items-center gap-1 self-start">
                                      <Mail className="h-3 w-3" />
                                      Assinatura por e-mail
                                    </Badge>
                                    A assinatura sera enviada por e-mail via Assinafy.
                                  </div>
                                ) : (
                                  <div>
                                    <FormLabel>Assinatura (opcional)</FormLabel>
                                    <SignaturePad
                                      value={responsibleDraft.signatureData}
                                      onChange={(value) => setResponsibleDraft((current) => current ? { ...current, signatureData: value } : current)}
                                    />
                                  </div>
                                )}
                              </>
                            )}

                            {responsibleDraftError ? <p className="text-sm font-medium text-destructive">{responsibleDraftError}</p> : null}

                            <div className="flex flex-wrap justify-end gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-md border-[#ccb4a6]"
                                onClick={() => {
                                  setResponsibleDraft(null);
                                  setResponsibleDraftError('');
                                }}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="button"
                                className="rounded-md bg-[#f46e11] text-white hover:bg-[#e96710]"
                                onClick={handleConfirmResponsibleDraft}
                              >
                                Confirmar responsavel
                              </Button>
                            </div>
                          </div>
                        )}

                        <FormMessage>
                          {form.formState.errors.responsiblePersons?.root?.message}
                        </FormMessage>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
