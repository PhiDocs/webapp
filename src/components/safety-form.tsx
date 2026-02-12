'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import React, { useState } from 'react';
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
  const [isEditingWorkData, setIsEditingWorkData] = useState(false);
  const [activeAnalysisStep, setActiveAnalysisStep] = useState(0);

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


  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="documentType"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>
                    <FileText className="inline-block mr-2" /> {ptBr.safetyForm.documentType}
                  </FormLabel>
                  <FormControl>
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        <span className="font-semibold text-lg">
                          {field.value === DOCUMENT_TYPES.APR ? ptBr.documentType.apr : ptBr.documentType.pt}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
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
              )}
            />

            {documentType === DOCUMENT_TYPES.PT ? (
              <PTForm form={form} />
            ) : (
              isDataLoading ? <FormSkeleton /> :
                <div className="space-y-8">
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Briefcase className="mr-2" /> {ptBr.safetyForm.workData}
                    </h3>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsEditingWorkData(!isEditingWorkData)}
                    >
                      <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                  </div>

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
                            <SelectTrigger>
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

                  {isEditingWorkData && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-4 duration-300">
                      <FormField
                        control={form.control}
                        name="startDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{ptBr.safetyForm.startDate}</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
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
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="workLocationDetails"
                        render={({ field }) => (
                          <FormItem className="col-span-full">
                            <FormLabel>{ptBr.safetyForm.workLocation}</FormLabel>
                            <FormControl>
                              <Input placeholder={ptBr.safetyForm.workLocationPlaceholder} {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  )}

                  <Separator />

                  <FormField
                    control={form.control}
                    name="activityDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <BookOpen className="inline-block mr-2" /> {ptBr.safetyForm.activityDescription}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={ptBr.safetyForm.activityDescriptionPlaceholder}
                            className="resize-y min-h-[120px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <ShieldCheck className="mr-2" /> {ptBr.safetyForm.manualAnalysisTitle}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {ptBr.safetyForm.manualAnalysisDescription}
                  </p>

                  <div className="space-y-4">
                    {/* Tab Navigation */}
                    <div className="flex flex-wrap items-center gap-2">
                      {analysisStepFields.map((_, index) => (
                        <Button
                          key={index}
                          type="button"
                          variant={activeAnalysisStep === index ? "secondary" : "outline"}
                          size="sm"
                          onClick={() => setActiveAnalysisStep(index)}
                          className={cn(
                            activeAnalysisStep === index && "bg-secondary border-primary/20",
                            "min-w-[3rem]"
                          )}
                        >
                          {index + 1}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          appendAnalysisStep({ activity: '', potentialRisks: '', preventiveMeasures: '' });
                          setActiveAnalysisStep(analysisStepFields.length);
                        }}
                      >
                        <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.safetyForm.addAnalysisStep}
                      </Button>
                    </div>

                    {analysisStepFields.length === 0 && (
                      <div className="text-sm text-muted-foreground italic border border-dashed rounded-lg p-8 text-center">
                        {ptBr.safetyForm.manualAnalysisEmpty}
                      </div>
                    )}

                    {analysisStepFields.length > 0 && analysisStepFields[activeAnalysisStep] && (
                      <div key={analysisStepFields[activeAnalysisStep].id} className="rounded-lg border p-4 space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
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
                                  className="resize-y min-h-[80px]"
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
                                  className="resize-y min-h-[80px]"
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
                                  className="resize-y min-h-[80px]"
                                  {...field}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    disabled={isLoading}
                    className="w-full"
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
                  <Separator />

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Users className="mr-2" /> {ptBr.safetyForm.team}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendTeamMember({ employeeId: '', date: '', name: '', role: '', email: '', phone: '', useAssinafy: true, isManual: false, signatureData: '' })
                      }
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.actions.addMember}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {teamMemberFields.map((item, index) => (
                      <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-4">
                        <FormField
                          control={form.control}
                          name={`teamMembers.${index}.isManual`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Modo</FormLabel>
                              <FormControl>
                                <Tabs
                                  value={field.value ? 'manual' : 'employee'}
                                  onValueChange={(value) => {
                                    const isManual = value === 'manual';
                                    field.onChange(isManual);
                                    if (isManual) {
                                      form.setValue(`teamMembers.${index}.employeeId`, '');
                                      form.setValue(`teamMembers.${index}.name`, '');
                                      form.setValue(`teamMembers.${index}.role`, '');
                                      form.setValue(`teamMembers.${index}.email`, '');
                                      form.setValue(`teamMembers.${index}.phone`, '');
                                    }
                                  }}
                                >
                                  <TabsList>
                                    <TabsTrigger value="employee">Selecionar funcionário</TabsTrigger>
                                    <TabsTrigger value="manual">Preencher manualmente</TabsTrigger>
                                  </TabsList>
                                </Tabs>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <div className="flex items-start gap-2">
                          {!form.watch(`teamMembers.${index}.isManual`) ? (
                            <FormField
                              control={form.control}
                              name={`teamMembers.${index}.employeeId`}
                              render={({ field }) => (
                                <FormItem className="flex-grow">
                                  <FormLabel>{ptBr.safetyForm.teamName}</FormLabel>
                                  <Select onValueChange={(employeeId) => {
                                    field.onChange(employeeId);
                                    const employee = employees.find(e => e.id === employeeId);
                                    if (employee) {
                                      form.setValue(`teamMembers.${index}.name`, `${employee.firstName} ${employee.lastName}`);
                                      form.setValue(`teamMembers.${index}.role`, employee.roleName || '');
                                      form.setValue(`teamMembers.${index}.email`, employee.email || '');
                                      form.setValue(`teamMembers.${index}.phone`, employee.phone || '');
                                    }
                                  }} value={field.value}>
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder={ptBr.safetyForm.selectEmployeePlaceholder} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      {employees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                          {emp.firstName} {emp.lastName} ({emp.roleName})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          ) : (
                            <FormField
                              control={form.control}
                              name={`teamMembers.${index}.name`}
                              render={({ field }) => (
                                <FormItem className="flex-grow">
                                  <FormLabel>{ptBr.safetyForm.teamName}</FormLabel>
                                  <FormControl>
                                    <Input placeholder={ptBr.safetyForm.teamNamePlaceholder} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-8"
                            onClick={() => removeTeamMember(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        {form.watch(`teamMembers.${index}.isManual`) && (
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.role`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{ptBr.safetyForm.teamRole} (opcional)</FormLabel>
                                <FormControl>
                                  <Input placeholder={ptBr.safetyForm.teamRolePlaceholder} {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.useAssinafy`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-3">
                                <FormLabel>{ptBr.safetyForm.signatureMethod}</FormLabel>
                                <FormControl>
                                  <Tabs
                                    value={field.value ? 'assinafy' : 'system'}
                                    onValueChange={(value) => field.onChange(value === 'assinafy')}
                                  >
                                    <TabsList>
                                      <TabsTrigger value="assinafy">Assinafy (E-mail)</TabsTrigger>
                                      <TabsTrigger value="system">Assinatura no sistema</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.date`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{ptBr.safetyForm.teamDate}</FormLabel>
                                <FormControl><Input type="date" {...field} /></FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          {form.watch(`teamMembers.${index}.useAssinafy`) && (
                            <FormField
                              control={form.control}
                              name={`teamMembers.${index}.email`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {ptBr.auth.email}
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder={ptBr.auth.emailPlaceholder} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.phone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <MessageCircle className="h-4 w-4" />
                                  Telefone (opcional)
                                </FormLabel>
                                <FormControl>
                                  <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {form.watch(`teamMembers.${index}.useAssinafy`) ? (
                          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Assinatura por e-mail
                            </Badge>
                            A assinatura será enviada por e-mail via Assinafy.
                          </div>
                        ) : (
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.signatureData`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assinatura (opcional)</FormLabel>
                                <FormControl>
                                  <SignaturePad value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    ))}
                    <FormMessage>
                      {form.formState.errors.teamMembers?.root?.message}
                    </FormMessage>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <UserCheck className="mr-2" /> {ptBr.safetyForm.responsibles}
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendResponsible({
                          employeeId: '',
                          name: '',
                          role: '',
                          email: '',
                          phone: '',
                          useAssinafy: true,
                          signatureData: '',
                        })
                      }
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.actions.addResponsible}
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {responsibleFields.map((item, index) => (
                      <div key={item.id} className="flex flex-col gap-2 rounded-lg border p-4">
                        <div className="flex items-start gap-2">
                          <FormField
                            control={form.control}
                            name={`responsiblePersons.${index}.employeeId`}
                            render={({ field }) => (
                              <FormItem className='flex-grow'>
                                <FormLabel>{ptBr.safetyForm.responsibleName}</FormLabel>
                                <Select onValueChange={(employeeId) => {
                                  field.onChange(employeeId);
                                  const employee = employees.find(e => e.id === employeeId);
                                  if (employee) {
                                    form.setValue(`responsiblePersons.${index}.name`, `${employee.firstName} ${employee.lastName}`);
                                    form.setValue(`responsiblePersons.${index}.role`, employee.roleName || '');
                                    form.setValue(`responsiblePersons.${index}.email`, employee.email || '');
                                    form.setValue(`responsiblePersons.${index}.phone`, employee.phone || '');
                                  }
                                }} value={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder={ptBr.safetyForm.selectEmployeePlaceholder} />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {employees.map((emp) => (
                                      <SelectItem key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} ({emp.roleName})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="mt-8"
                            onClick={() => removeResponsible(index)}
                            disabled={responsibleFields.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name={`responsiblePersons.${index}.useAssinafy`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>{ptBr.safetyForm.signatureMethod}</FormLabel>
                                <FormControl>
                                  <Tabs
                                    value={field.value ? 'assinafy' : 'system'}
                                    onValueChange={(value) => field.onChange(value === 'assinafy')}
                                  >
                                    <TabsList>
                                      <TabsTrigger value="assinafy">Assinafy (E-mail)</TabsTrigger>
                                      <TabsTrigger value="system">Assinatura no sistema</TabsTrigger>
                                    </TabsList>
                                  </Tabs>
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          {form.watch(`responsiblePersons.${index}.useAssinafy`) && (
                            <FormField
                              control={form.control}
                              name={`responsiblePersons.${index}.email`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-2">
                                    <Mail className="h-4 w-4" />
                                    {ptBr.auth.email}
                                  </FormLabel>
                                  <FormControl>
                                    <Input placeholder={ptBr.auth.emailPlaceholder} {...field} />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}
                          <FormField
                            control={form.control}
                            name={`responsiblePersons.${index}.phone`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="flex items-center gap-2">
                                  <MessageCircle className="h-4 w-4" />
                                  Telefone (opcional)
                                </FormLabel>
                                <FormControl>
                                  <PhoneInput value={field.value} onChange={field.onChange} onBlur={field.onBlur} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        {form.watch(`responsiblePersons.${index}.useAssinafy`) ? (
                          <div className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              Assinatura por e-mail
                            </Badge>
                            A assinatura será enviada por e-mail via Assinafy.
                          </div>
                        ) : (
                          <FormField
                            control={form.control}
                            name={`responsiblePersons.${index}.signatureData`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Assinatura (opcional)</FormLabel>
                                <FormControl>
                                  <SignaturePad value={field.value} onChange={field.onChange} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </div>
                    ))}
                    <FormMessage>
                      {form.formState.errors.responsiblePersons?.root?.message}
                    </FormMessage>
                  </div>
                </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
