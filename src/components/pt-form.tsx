'use client';

import type { UseFormReturn } from 'react-hook-form';
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
    const { formState: { errors } } = form;

    return (
        <div className="space-y-6">
          <Separator />
          <h3 className="text-lg font-semibold">Preencha os Dados da Permissão de Trabalho (PT)</h3>
          
          {/* Header Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                  control={form.control}
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
                  control={form.control}
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
                  control={form.control}
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
                    control={form.control}
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
                    control={form.control}
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
              control={form.control}
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
                <div className={`grid grid-cols-1 ${section.columns === 2 ? 'md:grid-cols-2' : ''} gap-x-8 gap-y-3`}>
                    {section.items.map((item) => (
                       <CheckboxField key={item.id} form={form} name={`pt.ptChecklist.${item.id}`} label={item.label} />
                    ))}
                </div>
            </div>
          ))}

        </div>
      );
}