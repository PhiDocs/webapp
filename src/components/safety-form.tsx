'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import type { ChangeEvent } from 'react';
import type { SafetyFormValues } from '@/lib/types';
import { formSchema } from '@/lib/types';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Building2, FileText, MapPin, Users, Briefcase, UserCheck, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface SafetyFormProps {
  form: ReturnType<typeof useForm<SafetyFormValues>>;
  onSubmit: (data: SafetyFormValues) => void;
  isLoading: boolean;
  onNewReport: () => void;
}

export function SafetyForm({ form, onSubmit, isLoading, onNewReport }: SafetyFormProps) {
  const { toast } = useToast();
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "responsiblePersons"
  });

  const handleLogoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Please upload a logo smaller than 2MB.",
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        form.setValue('companyLogo', reader.result as string, { shouldValidate: true });
      };
      reader.readAsDataURL(file);
    }
  };


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
                    <FileText className="inline-block mr-2" /> Tipo de Documento
                  </FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={field.onChange}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="APR">APR</TabsTrigger>
                        <TabsTrigger value="APT">APT</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />
            <h3 className="text-lg font-semibold flex items-center"><Briefcase className="mr-2"/> Dados da Obra</h3>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="workName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Obra</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Neodent Supernova" {...field} />
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
                      <Input placeholder="e.g., Av. Juscelino Kubitschek" {...field} />
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
                    <FormLabel><MapPin className="inline-block mr-2" /> Local da Obra / Pavimento</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Pavimento 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            <Separator />
            <div className='flex items-center justify-between'>
              <h3 className="text-lg font-semibold flex items-center"><UserCheck className="mr-2"/> Responsáveis</h3>
              <Button type='button' variant='outline' size='sm' onClick={() => append({name: '', role: ''})}>
                <PlusCircle className='mr-2 h-4 w-4' /> Adicionar
              </Button>
            </div>
            
            <div className='space-y-4'>
            {fields.map((item, index) => (
              <div key={item.id} className='flex items-start gap-4'>
                <div className="grid grid-cols-1 gap-x-4 gap-y-2 md:grid-cols-2 flex-grow">
                  <FormField
                    control={form.control}
                    name={`responsiblePersons.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={index !== 0 ? "sr-only" : ""}>Nome</FormLabel>
                        <FormControl>
                          <Input placeholder="Nome do responsável" {...field} />
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
                        <FormLabel className={index !== 0 ? "sr-only" : ""}>Função</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Técnico de Segurança" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <Button type='button' variant='ghost' size='icon' className='mt-8' onClick={() => remove(index)} disabled={fields.length <= 1}>
                    <Trash2 className='h-4 w-4 text-destructive'/>
                </Button>
              </div>
            ))}
            <FormMessage>{form.formState.errors.responsiblePersons?.root?.message}</FormMessage>
            </div>


            <Separator />
            
            <FormField
              control={form.control}
              name="activityDescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><BookOpen className="inline-block mr-2" /> Descrição da Atividade</FormLabel>
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
              {isLoading ? 'Gerando Análise...' : 'Gerar Análise de Segurança'}
            </Button>

            <Separator />
            <h3 className="text-lg font-semibold flex items-center"><Building2 className="mr-2"/> Dados da Empresa e Equipe</h3>

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
                       <Input type="file" accept="image/png, image/jpeg" onChange={handleLogoChange} />
                    </FormControl>
                    <FormDescription>Max 2MB. PNG ou JPG.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="teamMembers"
              render={({ field }) => (
                <FormItem>
                  <FormLabel><Users className="inline-block mr-2" /> Equipe de Trabalho (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Liste os nomes dos membros da equipe envolvidos, separados por vírgulas."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button type="button" onClick={onNewReport} variant="outline" className="w-full">
                Começar Novo Relatório
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
