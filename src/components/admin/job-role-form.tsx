'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import type { JobRole, JobRoleFormValues } from '@/lib/types';
import { jobRoleFormSchema } from '@/lib/types';

interface JobRoleFormProps {
  onSubmit: (values: JobRoleFormValues) => void;
  defaultValues?: Partial<JobRole> | null;
  isPending: boolean;
}

export function JobRoleForm({ onSubmit, defaultValues, isPending }: JobRoleFormProps) {
  const form = useForm<JobRoleFormValues>({
    resolver: zodResolver(jobRoleFormSchema),
    defaultValues: {
      name: defaultValues?.name || '',
      responsibilities: defaultValues?.responsibilities || '',
      requiredCertificates: defaultValues?.requiredCertificates?.map(c => ({ value: c })) || [{ value: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "requiredCertificates",
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Cargo</FormLabel>
              <FormControl>
                <Input placeholder="Ex: Soldador" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="responsibilities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Responsabilidades</FormLabel>
              <FormControl>
                <Textarea placeholder="Descreva as principais responsabilidades do cargo" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div>
          <div className="flex justify-between items-center mb-2">
            <FormLabel>Certificados Necessários (Opcional)</FormLabel>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ value: '' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`requiredCertificates.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormControl>
                        <Input placeholder="Ex: NR-35" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(index)}
                        disabled={fields.length <= 1 && form.getValues(`requiredCertificates.${index}.value`) === ''}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
