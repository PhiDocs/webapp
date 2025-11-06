'use client';

import type { UseFormReturn, useFieldArray } from 'react-hook-form';
import type { SafetyFormValues } from '@/lib/types';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { ptChecklistItems } from '@/lib/pt-checklist-data';
import { Button } from './ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';

interface PTFormProps {
  form: UseFormReturn<SafetyFormValues>;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-base font-semibold text-primary bg-primary/10 p-2 rounded-md my-4">
      {children}
    </h3>
  );

const CheckboxField = ({ form, name, label }: { form: UseFormReturn<SafetyFormValues>, name: string, label: string }) => (
    <FormField
      control={form.control}
      name={name as any}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <FormLabel className="font-normal text-sm">{label}</FormLabel>
        </FormItem>
      )}
    />
  );


export function PTForm({ form }: PTFormProps) {
    const { control } = form;
    const { fields: resgatistasFields, append: appendResgatista, remove: removeResgatista } = useFieldArray({
        control,
        name: "pt.ptResgatistas",
    });

    return (
        <div className="space-y-6">
          <Separator />
          <h3 className="text-lg font-semibold">Preencha os Dados da Permissão de Trabalho (PT)</h3>
          
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  control={control}
                  name="pt.ptLocalAtividade"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Local da Atividade</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={control}
                  name="pt.ptEquipamentoLinha"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Equipamento / Linha</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <FormField
                  control={control}
                  name="pt.ptData"
                  render={({ field }) => (
                      <FormItem>
                          <FormLabel>Data</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                      </FormItem>
                  )}
              />
              <div className="grid grid-cols-2 gap-2">
                <FormField
                    control={control}
                    name="pt.ptHoraInicio"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Início</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={control}
                    name="pt.ptHoraFim"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fim</FormLabel>
                            <FormControl><Input type="time" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
          </div>
           <FormField
              control={control}
              name="pt.ptDescricaoTarefa"
              render={({ field }) => (
                  <FormItem>
                      <FormLabel>Descrição da Tarefa</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                  </FormItem>
              )}
          />

          {/* Checklist sections */}
          {ptChecklistItems.map((section) => (
            <div key={section.id}>
                <SectionTitle>{section.title}</SectionTitle>
                <div className={`grid grid-cols-1 ${section.columns === 2 ? 'md:grid-cols-2' : ''} ${section.columns === 3 ? 'md:grid-cols-3' : ''} gap-x-8 gap-y-3`}>
                    {section.items.map((item) => (
                       <CheckboxField key={item.id} form={form} name={`pt.ptChecklist.${item.id}`} label={item.label} />
                    ))}
                </div>
            </div>
          ))}

          {/* Confined Space Section */}
          <SectionTitle>Trabalho em Espaço Confinado - Avaliação</SectionTitle>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <FormField control={control} name="pt.ptOxigenio" render={({ field }) => (<FormItem><FormLabel>Oxigênio</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name="pt.ptLE" render={({ field }) => (<FormItem><FormLabel>L.E.</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name="pt.ptH2S" render={({ field }) => (<FormItem><FormLabel>H²S</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name="pt.ptCO2" render={({ field }) => (<FormItem><FormLabel>CO²</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name="pt.ptObservacao" render={({ field }) => (<FormItem><FormLabel>Observação</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name="pt.ptVisto" render={({ field }) => (<FormItem><FormLabel>Visto</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
          </div>

          {/* Vigia Section */}
          <SectionTitle>Vigia</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <FormField control={control} name="pt.ptVigia.name" render={({ field }) => (<FormItem><FormLabel>Nome</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name="pt.ptVigia.rgCpf" render={({ field }) => (<FormItem><FormLabel>RG/CPF</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField control={control} name="pt.ptVigia.func" render={({ field }) => (<FormItem><FormLabel>Função</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
            <FormField
                control={control}
                name="pt.ptVigia.apto"
                render={({ field }) => (
                    <FormItem className="space-y-3"><FormLabel>Apto</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="sim" /></FormControl><FormLabel className="font-normal">Sim</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="nao" /></FormControl><FormLabel className="font-normal">Não</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                    </FormItem>
                )}
            />
          </div>

          {/* Resgatistas Section */}
          <div className='flex items-center justify-between'>
            <SectionTitle>Resgatistas</SectionTitle>
            <Button type="button" variant="outline" size="sm" onClick={() => appendResgatista({ name: '', rgCpf: '', func: '', empresa: '', apto: '' })}>
                <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>
          <div className='space-y-4'>
            {resgatistasFields.map((item, index) => (
                <div key={item.id} className="flex items-start gap-2">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-grow">
                         <FormField control={control} name={`pt.ptResgatistas.${index}.name`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>Nome</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                         <FormField control={control} name={`pt.ptResgatistas.${index}.rgCpf`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>RG/CPF</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                         <FormField control={control} name={`pt.ptResgatistas.${index}.func`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>Função</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                         <FormField control={control} name={`pt.ptResgatistas.${index}.empresa`} render={({ field }) => (<FormItem><FormLabel className={index !== 0 ? 'sr-only' : ''}>Empresa</FormLabel><FormControl><Input {...field} /></FormControl></FormItem>)} />
                         <FormField
                            control={control}
                            name={`pt.ptResgatistas.${index}.apto`}
                            render={({ field }) => (
                                <FormItem className="space-y-2"><FormLabel className={index !== 0 ? 'sr-only' : ''}>Apto</FormLabel>
                                    <FormControl>
                                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex items-center space-x-4">
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="sim" /></FormControl><FormLabel className="font-normal">Sim</FormLabel></FormItem>
                                            <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="nao" /></FormControl><FormLabel className="font-normal">Não</FormLabel></FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                    </div>
                     <Button type="button" variant="ghost" size="icon" className="mt-8" onClick={() => removeResgatista(index)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </div>
            ))}
          </div>
          
           {/* Signatures */}
          <SectionTitle>Assinaturas</SectionTitle>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <FormField control={control} name="pt.ptGestorArea" render={({ field }) => (<FormItem><FormLabel>Gestor da Área</FormLabel><FormControl><Input {...field} placeholder="Nome do gestor" /></FormControl></FormItem>)} />
             <FormField control={control} name="pt.ptResponsavelAtividade" render={({ field }) => (<FormItem><FormLabel>Responsável pela Atividade</FormLabel><FormControl><Input {...field} placeholder="Nome do responsável" /></FormControl></FormItem>)} />
             <FormField control={control} name="pt.ptSesmt" render={({ field }) => (<FormItem><FormLabel>SESMT</FormLabel><FormControl><Input {...field} placeholder="Nome do SESMT" /></FormControl></FormItem>)} />
           </div>


        </div>
      );
}
