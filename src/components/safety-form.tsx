'use client';

import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import React, { useState, useRef, type ChangeEvent } from 'react';
import type { SafetyFormValues } from '@/lib/types';
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
  BookOpen,
  Building2,
  FileText,
  MapPin,
  Users,
  Briefcase,
  UserCheck,
  PlusCircle,
  Trash2,
  Edit,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import SignatureCanvas from 'react-signature-canvas';
import { PTForm } from './pt-form';

interface SafetyFormProps {
  form: ReturnType<typeof useForm<SafetyFormValues>>;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  onNewReport: () => void;
}

function SignatureDialog({
  onSave,
  onClear,
}: {
  onSave: (dataUrl: string) => void;
  onClear: () => void;
}) {
  const sigPad = useRef<SignatureCanvas>(null);

  const handleSave = () => {
    if (sigPad.current) {
      const dataUrl = sigPad.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    if (sigPad.current) {
      sigPad.current.clear();
      onClear();
    }
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Assine no campo abaixo</DialogTitle>
      </DialogHeader>
      <div className="relative w-full h-48 border rounded-md bg-white">
        <SignatureCanvas
          ref={sigPad}
          penColor="black"
          canvasProps={{ className: 'w-full h-full' }}
        />
      </div>
      <DialogFooter className="sm:justify-between">
        <Button type="button" variant="outline" onClick={handleClear}>
          Limpar
        </Button>
        <DialogClose asChild>
          <Button type="button" onClick={handleSave}>
            Salvar Assinatura
          </Button>
        </DialogClose>
      </DialogFooter>
    </DialogContent>
  );
}

export function SafetyForm({
  form,
  onSubmit,
  isLoading,
  onNewReport,
}: SafetyFormProps) {
  const { toast } = useToast();
  const [isSignatureDialogOpen, setIsSignatureDialogOpen] = useState(false);
  const [currentSignatureIndex, setCurrentSignatureIndex] = useState<
    number | null
  >(null);

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
          title: 'Arquivo muito grande',
          description: 'Por favor, envie um logo menor que 2MB.',
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

  const handleOpenSignatureDialog = (index: number) => {
    setCurrentSignatureIndex(index);
    setIsSignatureDialogOpen(true);
  };

  const handleSaveSignature = (dataUrl: string) => {
    if (currentSignatureIndex !== null) {
      form.setValue(`responsiblePersons.${currentSignatureIndex}.signature`, dataUrl, {
        shouldValidate: true,
      });
    }
    setIsSignatureDialogOpen(false);
    setCurrentSignatureIndex(null);
  };

  const handleClearSignature = () => {
    if (currentSignatureIndex !== null) {
      form.setValue(`responsiblePersons.${currentSignatureIndex}.signature`, '', {
        shouldValidate: true,
      });
    }
  };

  const documentType = useWatch({ control: form.control, name: 'documentType' });


  return (
    <>
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
                      <FileText className="inline-block mr-2" /> Tipo de Documento
                    </FormLabel>
                    <FormControl>
                      <Tabs
                        value={field.value}
                        onValueChange={(value) => {
                            field.onChange(value);
                            // Reset other form parts if needed
                        }}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="APR">APR</TabsTrigger>
                          <TabsTrigger value="PT">PT</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {documentType === 'PT' ? (
                <PTForm form={form} />
              ) : (
                <div className="space-y-8">
                  <Separator />
                  <h3 className="text-lg font-semibold flex items-center">
                    <Building2 className="mr-2" /> Dados da Empresa
                  </h3>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Empresa</FormLabel>
                          <FormControl>
                            <Input placeholder="Sua Empresa Inc." {...field} />
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
                          <FormLabel>Logo da Empresa (Opcional)</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept="image/png, image/jpeg"
                              onChange={handleLogoChange}
                            />
                          </FormControl>
                          <FormDescription>Max 2MB. PNG ou JPG.</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Separator />
                  <h3 className="text-lg font-semibold flex items-center">
                    <Briefcase className="mr-2" /> Dados da Obra
                  </h3>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="workName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Obra</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Neodent Supernova"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="workAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Av. Juscelino Kubitschek"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Data de Início</FormLabel>
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
                          <FormLabel>Data de Término</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="workLocationDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          <MapPin className="inline-block mr-2" /> Local da Obra /
                          Pavimento
                        </FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Pavimento 2" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Separator />
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <UserCheck className="mr-2" /> Responsáveis
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendResponsible({ name: '', role: '', signature: '' })
                      }
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {responsibleFields.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 flex-grow">
                          <FormField
                            control={form.control}
                            name={`responsiblePersons.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? 'sr-only' : ''}>
                                  Nome
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Nome do responsável"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`responsiblePersons.${index}.role`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? 'sr-only' : ''}>
                                  Função
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Técnico de Segurança"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex items-center gap-1 mt-8">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSignatureDialog(index)}
                          >
                            <Edit className="mr-2 h-4 w-4" /> Assinar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeResponsible(index)}
                            disabled={responsibleFields.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
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
                          <BookOpen className="inline-block mr-2" /> Descrição da
                          Atividade
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Descreva a atividade de trabalho em detalhes. Ex: 'Instalação de tubulações de ar condicionado na fachada do 3º andar utilizando andaime'."
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
                      ? 'Gerando Análise...'
                      : 'Gerar Análise de Segurança'}
                  </Button>
                  <Separator />

                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center">
                      <Users className="mr-2" /> Equipe de Trabalho
                    </h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        appendTeamMember({ date: '', name: '', role: '' })
                      }
                    >
                      <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Membro
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {teamMemberFields.map((item, index) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className="grid grid-cols-1 gap-x-2 gap-y-2 sm:grid-cols-3 flex-grow">
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.date`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? 'sr-only' : ''}>
                                  Data
                                </FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.name`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? 'sr-only' : ''}>
                                  Nome
                                </FormLabel>
                                <FormControl>
                                  <Input placeholder="Nome do membro" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`teamMembers.${index}.role`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className={index !== 0 ? 'sr-only' : ''}>
                                  Função/Empresa
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="e.g., Eletricista"
                                    {...field}
                                  />
                                </FormControl>
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
              
              <Button
                type="button"
                onClick={onNewReport}
                variant="outline"
                className="w-full"
              >
                Começar Novo Relatório
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <Dialog open={isSignatureDialogOpen} onOpenChange={setIsSignatureDialogOpen}>
        <SignatureDialog
          onSave={handleSaveSignature}
          onClear={handleClearSignature}
        />
      </Dialog>
    </>
  );
}
