'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import React, { type ChangeEvent } from 'react';
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
  Building2,
  FileText,
  UserCheck,
  PlusCircle,
  Trash2,
  Briefcase,
  Users,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { PTForm } from './pt-form';
import { SignaturePad } from './signature-pad';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { ptBr } from '@/lib/data/strings';
import { DOCUMENT_TYPES, SIGNATURE_TYPES } from '@/lib/constants';
import { Skeleton } from './ui/skeleton';

interface SafetyFormProps {
  form: ReturnType<typeof useForm<SafetyFormValues>>;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  works: Work[];
  employees: Employee[];
  isDataLoading: boolean;
}

const SignatureField = ({ form, fieldPrefix }: { form: ReturnType<typeof useForm<SafetyFormValues>>, fieldPrefix: string }) => {
    const signatureType = useWatch({
      control: form.control,
      name: `${fieldPrefix}.signatureType` as any,
    });
  
    const handleFileUpload = (e: ChangeEvent<HTMLInputElement>, field: any) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1 * 1024 * 1024) { // 1MB limit
                form.setError(`${fieldPrefix}.signatureData` as any, { type: 'manual', message: ptBr.other.imageTooLarge });
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                field.onChange(reader.result as string);
                form.clearErrors(`${fieldPrefix}.signatureData` as any);
            };
            reader.readAsDataURL(file);
        }
    };
  
    return (
      <div className="col-span-full space-y-2 rounded-md border p-3">
        <FormField
          control={form.control}
          name={`${fieldPrefix}.signatureType` as any}
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-xs">{ptBr.safetyForm.signatureMethod}</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex items-center space-x-4"
                >
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value={SIGNATURE_TYPES.TYPED} /></FormControl>
                    <FormLabel className="font-normal text-sm">{ptBr.safetyForm.signatureTyped}</FormLabel>
                  </FormItem>
                  <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value={SIGNATURE_TYPES.DRAW} /></FormControl>
                    <FormLabel className="font-normal text-sm">{ptBr.safetyForm.signatureDraw}</FormLabel>
                  </FormItem>
                   <FormItem className="flex items-center space-x-2 space-y-0">
                    <FormControl><RadioGroupItem value={SIGNATURE_TYPES.UPLOAD} /></FormControl>
                    <FormLabel className="font-normal text-sm">{ptBr.safetyForm.signatureUpload}</FormLabel>
                  </FormItem>
                </RadioGroup>
              </FormControl>
            </FormItem>
          )}
        />
  
        <FormField
          control={form.control}
          name={`${fieldPrefix}.signatureData` as any}
          render={({ field }) => (
            <FormItem>
              {signatureType === SIGNATURE_TYPES.TYPED && (
                <FormControl>
                  <Input placeholder={ptBr.safetyForm.signatureTypedPlaceholder} {...field} />
                </FormControl>
              )}
              {signatureType === SIGNATURE_TYPES.DRAW && (
                <SignaturePad
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
              {signatureType === SIGNATURE_TYPES.UPLOAD && (
                 <FormControl>
                    <Input type="file" accept="image/png, image/jpeg" onChange={(e) => handleFileUpload(e, field)} />
                </FormControl>
              )}
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

export function SafetyForm({
  form,
  onSubmit,
  isLoading,
  works,
  employees,
  isDataLoading,
}: SafetyFormProps) {
  const { toast } = useToast();

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

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        // 2MB limit
        toast({
          variant: 'destructive',
          title: ptBr.toasts.errors.fileTooLarge,
          description: ptBr.toasts.errors.fileTooLargeDescription,
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('companyLogo', reader.result as string, {
          shouldValidate: true,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const documentType = useWatch({ control: form.control, name: 'documentType' });

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
                      <Tabs
                        value={field.value}
                        onValueChange={(value) => {
                            field.onChange(value);
                        }}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value={DOCUMENT_TYPES.APR}>{ptBr.documentType.apr}</TabsTrigger>
                          <TabsTrigger value={DOCUMENT_TYPES.PT}>{ptBr.documentType.pt}</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />
              <h3 className="text-lg font-semibold flex items-center">
                <Building2 className="mr-2" /> {ptBr.safetyForm.companyData}
              </h3>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ptBr.safetyForm.companyName}</FormLabel>
                      <FormControl>
                        <Input placeholder={ptBr.safetyForm.companyNamePlaceholder} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyLogo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{ptBr.safetyForm.companyLogo}</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/png, image/jpeg"
                          onChange={handleLogoChange}
                        />
                      </FormControl>
                      <FormDescription>{ptBr.safetyForm.companyLogoDescription}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {documentType === DOCUMENT_TYPES.PT ? (
                <PTForm form={form} />
              ) : (
                isDataLoading ? <FormSkeleton /> :
                <div className="space-y-8">
                  <Separator />
                  <h3 className="text-lg font-semibold flex items-center">
                    <Briefcase className="mr-2" /> {ptBr.safetyForm.workData}
                  </h3>

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
                                    form.setValue('activityDescription', work.activityDescription || '');
                                }
                            }} defaultValue={field.value}>
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
                        appendResponsible({ employeeId: '', name: '', role: '', signatureType: SIGNATURE_TYPES.TYPED, signatureData: '' })
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
                                            }
                                        }} defaultValue={field.value}>
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
                        <SignatureField form={form} fieldPrefix={`responsiblePersons.${index}`} />
                      </div>
                    ))}
                    <FormMessage>
                      {form.formState.errors.responsiblePersons?.root?.message}
                    </FormMessage>
                  </div>
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
                  <Button type="submit" disabled={isLoading} className="w-full">
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
                        appendTeamMember({ employeeId: '', date: '', name: '', role: '' })
                      }
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> {ptBr.actions.addMember}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {teamMemberFields.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2 flex-grow">
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
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.employeeId`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{ptBr.safetyForm.teamName}</FormLabel>
                                    <Select onValueChange={(employeeId) => {
                                        field.onChange(employeeId);
                                        const employee = employees.find(e => e.id === employeeId);
                                        if (employee) {
                                            form.setValue(`teamMembers.${index}.name`, `${employee.firstName} ${employee.lastName}`);
                                            form.setValue(`teamMembers.${index}.role`, employee.roleName || '');
                                        }
                                    }} defaultValue={field.value}>
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
                        </div>
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
                    ))}
                    <FormMessage>
                      {form.formState.errors.teamMembers?.root?.message}
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
